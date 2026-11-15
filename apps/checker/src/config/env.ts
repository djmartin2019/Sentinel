// Read lazily: index.ts loads the root .env at startup, and import order can
// put module top-level code ahead of that.

export type VapidConfig = {
    publicKey: string;
    privateKey: string;
    subject: string;
};

export function getVapidConfig(): VapidConfig | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim();
    if (!publicKey || !privateKey || !subject) return null;
    return { publicKey, privateKey, subject };
}
