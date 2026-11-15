'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, Share, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAlertsConfig,
  isSubscribed,
  sendTestAlert,
  subscribeToAlerts,
  unsubscribeFromAlerts,
  type SerializedSubscription,
} from '@/app/actions/push';

type Status =
  | 'loading'
  | 'unsupported' // browser has no Push API
  | 'ios-install' // iOS Safari tab: push only works from the Home Screen app
  | 'server-off' // VAPID / PIN not configured on the server
  | 'denied' // user blocked notifications
  | 'off'
  | 'on';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function detectAlertsState(): Promise<{
  status: Status;
  publicKey: string | null;
  endpoint: string | null;
}> {
  const none = { publicKey: null, endpoint: null };
  if (isIos() && !isStandalone()) return { status: 'ios-install', ...none };
  if (!pushSupported()) return { status: 'unsupported', ...none };

  const config = await getAlertsConfig().catch(() => null);
  if (!config?.enabled || !config.publicKey) return { status: 'server-off', ...none };
  const { publicKey } = config;

  if (Notification.permission === 'denied') return { status: 'denied', publicKey, endpoint: null };

  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub && (await isSubscribed(sub.endpoint).catch(() => false))) {
    return { status: 'on', publicKey, endpoint: sub.endpoint };
  }
  return { status: 'off', publicKey, endpoint: null };
}

export default function AlertsPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    // Detect first, then set state once (never synchronously inside the effect).
    const next = await detectAlertsState();
    setStatus(next.status);
    if (next.publicKey) setPublicKey(next.publicKey);
    setEndpoint(next.endpoint);
  }, []);

  useEffect(() => {
    let alive = true;
    detectAlertsState().then((next) => {
      if (!alive) return;
      setStatus(next.status);
      if (next.publicKey) setPublicKey(next.publicKey);
      setEndpoint(next.endpoint);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setMessage(null);
    try {
      // Must run directly from the tap for iOS to show the permission prompt.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const result = await subscribeToAlerts(
        sub.toJSON() as SerializedSubscription,
        pin,
      );
      if (!result.ok) {
        // Don't leave an orphaned browser subscription behind a wrong PIN.
        await sub.unsubscribe().catch(() => {});
        setMessage({ tone: 'error', text: result.error });
        return;
      }
      setPin('');
      setEndpoint(sub.endpoint);
      setStatus('on');
      setMessage({ tone: 'ok', text: 'Alerts enabled on this device.' });
    } catch {
      setMessage({ tone: 'error', text: 'Could not enable alerts. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const ep = sub?.endpoint ?? endpoint;
      await sub?.unsubscribe().catch(() => {});
      if (ep) await unsubscribeFromAlerts(ep);
      setEndpoint(null);
      setStatus('off');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!endpoint) return;
    setBusy(true);
    setMessage(null);
    const result = await sendTestAlert(endpoint).catch(() => ({
      ok: false as const,
      error: 'Request failed.',
    }));
    setBusy(false);
    setMessage(
      result.ok
        ? { tone: 'ok', text: 'Test sent — it should arrive in a few seconds.' }
        : { tone: 'error', text: result.error },
    );
  }

  const on = status === 'on';
  const BellIcon = on ? BellRing : status === 'denied' ? BellOff : Bell;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMessage(null);
          if (!open) void refresh();
        }}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated/60 transition-colors hover:border-accent-cyan/40 hover:text-text-primary',
          on ? 'text-accent-cyan' : 'text-text-secondary',
        )}
        aria-label="Alerts"
        aria-expanded={open}
      >
        <BellIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {on && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-[0_0_6px_rgba(30,167,255,0.9)]" />
        )}
      </button>

      {open && (
        <div className="card absolute right-0 top-10 z-50 w-[min(320px,calc(100vw-2rem))] p-4 shadow-2xl shadow-black/60">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Alerts</h3>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[10px]',
                on
                  ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                  : 'border-border text-text-muted',
              )}
            >
              {on ? 'ON' : 'OFF'}
            </span>
          </div>

          <PanelBody
            status={status}
            pin={pin}
            setPin={setPin}
            busy={busy}
            onEnable={enable}
            onDisable={disable}
            onTest={test}
          />

          {message && (
            <p
              className={cn(
                'mt-3 text-xs',
                message.tone === 'ok' ? 'text-status-up' : 'text-status-down',
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PanelBody({
  status,
  pin,
  setPin,
  busy,
  onEnable,
  onDisable,
  onTest,
}: {
  status: Status;
  pin: string;
  setPin: (v: string) => void;
  busy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onTest: () => void;
}) {
  const muted = 'text-xs leading-relaxed text-text-muted';

  switch (status) {
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-text-muted" />;

    case 'unsupported':
      return <p className={muted}>This browser doesn&apos;t support push notifications.</p>;

    case 'ios-install':
      return (
        <div className="space-y-2">
          <p className={muted}>
            On iPhone, alerts only work from the installed app.
          </p>
          <ol className="space-y-1.5 text-xs text-text-secondary">
            <li className="flex items-center gap-2">
              <Share className="h-3.5 w-3.5 text-accent-cyan" /> Tap Share in Safari
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-accent-cyan" /> Add to Home Screen
            </li>
            <li className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-accent-cyan" /> Open Sentinel from the icon
            </li>
          </ol>
        </div>
      );

    case 'server-off':
      return (
        <p className={muted}>
          Alerts aren&apos;t configured on the server yet. Set <code className="font-mono">VAPID_*</code> and{' '}
          <code className="font-mono">ALERTS_PIN</code> in <code className="font-mono">.env</code>.
        </p>
      );

    case 'denied':
      return (
        <p className={muted}>
          Notifications are blocked for Sentinel. Re-enable them in your device or browser settings, then
          reopen this panel.
        </p>
      );

    case 'off':
      return (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onEnable();
          }}
        >
          <p className={muted}>
            Get notified when a target goes down, recovers, escalates, or stays slow.
          </p>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Alerts PIN"
            className="w-full rounded-md border border-border bg-bg-base px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-accent-cyan/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || pin.trim().length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-accent-cyan/40 bg-accent-cyan/15 px-3 py-2 text-sm font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/25 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enable alerts
          </button>
        </form>
      );

    case 'on':
      return (
        <div className="space-y-3">
          <p className={muted}>This device will receive outage, recovery, and slowness alerts.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onTest}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-accent-cyan/40 bg-accent-cyan/15 px-3 py-2 text-xs font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/25 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              Send test
            </button>
            <button
              type="button"
              onClick={onDisable}
              disabled={busy}
              className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-status-down/40 hover:text-status-down disabled:opacity-50"
            >
              Disable
            </button>
          </div>
        </div>
      );
  }
}
