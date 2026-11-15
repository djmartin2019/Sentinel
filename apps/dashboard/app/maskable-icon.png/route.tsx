import { ImageResponse } from 'next/og';
import { HubIcon } from '@/lib/brand/HubGlyph';

// Android adaptive icon: keep the glyph inside the ~60% safe zone so any mask
// shape (circle, squircle, teardrop) leaves it intact. Kept out of app/icon.tsx
// so browsers don't pick it as a regular <link rel="icon">.
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(<HubIcon size={512} scale={0.56} />, {
    width: 512,
    height: 512,
  });
}
