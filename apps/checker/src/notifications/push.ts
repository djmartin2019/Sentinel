import webpush, { WebPushError } from "web-push";

import { getVapidConfig } from "../config/env";
import { prisma } from "../db/prisma";
import { logger } from "../logger/logger";

export type PushMessage = {
    title: string;
    body: string;
    /** Path opened when the notification is tapped. */
    url: string;
    /** Same tag replaces the previous notification (e.g. down → critical → recovered). */
    tag: string;
};

let configured: boolean | null = null;

function ensureConfigured(): boolean {
    if (configured !== null) return configured;
    const vapid = getVapidConfig();
    if (!vapid) {
        logger.warn(
            "Push notifications disabled: set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT",
        );
        configured = false;
        return false;
    }
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    configured = true;
    return true;
}

/**
 * Send a push to every subscribed device. Never throws — alerting must not
 * break the check cycle. Expired subscriptions (404/410) are removed.
 */
export async function notify(message: PushMessage): Promise<void> {
    try {
        if (!ensureConfigured()) return;

        const subs = await prisma.pushSubscription.findMany();
        if (subs.length === 0) return;

        const payload = JSON.stringify(message);

        await Promise.all(
            subs.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                        payload,
                        { TTL: 60 * 60, urgency: "high", topic: topicFor(message.tag) },
                    );
                    await prisma.pushSubscription.update({
                        where: { id: sub.id },
                        data: { lastSuccessAt: new Date() },
                    });
                } catch (err) {
                    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
                        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                        logger.info({ subId: sub.id }, "Removed expired push subscription");
                        return;
                    }
                    logger.error({ err, subId: sub.id }, "Push send failed");
                }
            }),
        );

        logger.info({ tag: message.tag, devices: subs.length }, `Push sent: ${message.title}`);
    } catch (err) {
        logger.error({ err }, "Push notify failed");
    }
}

/** Web Push `Topic` header must be ≤32 URL-safe chars; lets the push service collapse stale pending messages. */
function topicFor(tag: string): string {
    return tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
}

export function formatDuration(ms: number): string {
    const mins = Math.max(1, Math.round(ms / 60_000));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hours}h ${rem}m` : `${hours}h`;
}
