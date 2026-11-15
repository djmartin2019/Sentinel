'use server';

import { createHash, timingSafeEqual } from 'crypto';
import { headers } from 'next/headers';
import webpush, { WebPushError } from 'web-push';
import { prisma } from '@/lib/db';

export type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type Result = { ok: true } | { ok: false; error: string };

// ── PIN brute-force protection ───────────────────────────────────────────────
// In-memory is enough: a single dashboard container. Resets on restart.
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 50; // caps attackers rotating IPs
const WINDOW_MS = 15 * 60 * 1000;

type Bucket = { fails: number; resetAt: number };
const failsByIp = new Map<string, Bucket>();
const globalFails: Bucket = { fails: 0, resetAt: 0 };

function liveBucket(b: Bucket | undefined, now: number): Bucket {
  if (!b || now >= b.resetAt) return { fails: 0, resetAt: now + WINDOW_MS };
  return b;
}

/**
 * Traffic arrives Cloudflare → Apache → Next, so the TCP peer Apache sees (and
 * puts in X-Forwarded-For) is a Cloudflare edge. Cloudflare sends the real
 * visitor in CF-Connecting-IP. A request that bypasses Cloudflare could spoof
 * that header, but the global cap below still bounds total guesses.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const cf = h.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  // Apache appends the peer it saw as the LAST entry; earlier ones are client-supplied.
  const xff = h.get('x-forwarded-for');
  const last = xff?.split(',').map((s) => s.trim()).filter(Boolean).pop();
  return last || h.get('x-real-ip') || 'unknown';
}

function lockedOutFor(ip: string, now: number): number | null {
  const ipBucket = liveBucket(failsByIp.get(ip), now);
  const global = liveBucket(globalFails, now);
  if (ipBucket.fails >= MAX_FAILS_PER_IP) return ipBucket.resetAt - now;
  if (global.fails >= MAX_FAILS_GLOBAL) return global.resetAt - now;
  return null;
}

function recordFailure(ip: string, now: number) {
  const ipBucket = liveBucket(failsByIp.get(ip), now);
  ipBucket.fails++;
  failsByIp.set(ip, ipBucket);

  const global = liveBucket(globalFails, now);
  global.fails++;
  Object.assign(globalFails, global);

  // Keep the map from growing unbounded.
  if (failsByIp.size > 1000) {
    for (const [key, b] of failsByIp) if (now >= b.resetAt) failsByIp.delete(key);
  }
}

function pinMatches(input: string): boolean {
  const expected = process.env.ALERTS_PIN?.trim();
  if (!expected) return false;
  // Hash both sides so lengths match for timingSafeEqual.
  const a = createHash('sha256').update(input.trim()).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function isValidSubscription(sub: unknown): sub is SerializedSubscription {
  if (!sub || typeof sub !== 'object') return false;
  const s = sub as SerializedSubscription;
  return (
    typeof s.endpoint === 'string' &&
    s.endpoint.startsWith('https://') &&
    s.endpoint.length < 2048 &&
    typeof s.keys?.p256dh === 'string' &&
    typeof s.keys?.auth === 'string'
  );
}

function configureVapid(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

/**
 * Runtime config for the client. Fetched via server action (not a layout prop
 * or NEXT_PUBLIC_ var) so prerendered pages never bake in a build-time value.
 */
export async function getAlertsConfig(): Promise<{ publicKey: string | null; enabled: boolean }> {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || null;
  return { publicKey, enabled: Boolean(publicKey && process.env.ALERTS_PIN?.trim()) };
}

/** Whether this endpoint is registered server-side (it may have been pruned as expired). */
export async function isSubscribed(endpoint: string): Promise<boolean> {
  if (typeof endpoint !== 'string') return false;
  const row = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { id: true } });
  return Boolean(row);
}

export async function subscribeToAlerts(
  sub: SerializedSubscription,
  pin: string,
): Promise<Result> {
  if (!process.env.ALERTS_PIN?.trim()) {
    return { ok: false, error: 'Alerts are not configured on the server (ALERTS_PIN missing).' };
  }
  const ip = await clientIp();
  const now = Date.now();
  const lockedMs = lockedOutFor(ip, now);
  if (lockedMs !== null) {
    const mins = Math.ceil(lockedMs / 60_000);
    return { ok: false, error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
  }

  if (typeof pin !== 'string' || !pinMatches(pin)) {
    recordFailure(ip, now);
    return { ok: false, error: 'Incorrect PIN.' };
  }
  failsByIp.delete(ip);

  if (!isValidSubscription(sub)) return { ok: false, error: 'Invalid subscription.' };

  const userAgent = (await headers()).get('user-agent')?.slice(0, 300) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
  });
  return { ok: true };
}

export async function unsubscribeFromAlerts(endpoint: string): Promise<Result> {
  if (typeof endpoint !== 'string') return { ok: false, error: 'Invalid endpoint.' };
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}

/** Sends a test alert to one already-registered device only. */
export async function sendTestAlert(endpoint: string): Promise<Result> {
  if (!configureVapid()) {
    return { ok: false, error: 'VAPID keys are not configured on the server.' };
  }
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!sub) return { ok: false, error: 'This device is not subscribed.' };

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: '🔔 Sentinel alerts are on',
        body: "You'll be notified when a target goes down, recovers, or gets slow.",
        url: '/',
        tag: 'test',
      }),
      { TTL: 60, urgency: 'high' },
    );
    await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { lastSuccessAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return { ok: false, error: 'Subscription expired. Disable and re-enable alerts.' };
    }
    return { ok: false, error: 'Push service rejected the test message.' };
  }
}
