import { ImageResponse } from 'next/og';
import { HubIcon } from '@/lib/brand/HubGlyph';

// Served at /icon/<id>. 32 = browser tab, 192/512 = PWA manifest.
const SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((s) => ({
    id: String(s),
    size: { width: s, height: s },
    contentType: 'image/png',
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  // Tiny favicons read better with the glyph filling more of the canvas.
  const tiny = size <= 32;
  return new ImageResponse(<HubIcon size={size} scale={tiny ? 0.92 : 0.76} glow={!tiny} />, {
    width: size,
    height: size,
  });
}
