import { ImageResponse } from 'next/og';
import { HubIcon } from '@/lib/brand/HubGlyph';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Full-bleed square; iOS applies its own rounded mask.
export default function AppleIcon() {
  return new ImageResponse(<HubIcon size={180} scale={0.72} />, size);
}
