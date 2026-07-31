import { img } from './tmdb';

export interface ShareCardData {
  title: string;
  subtitle: string; // e.g. "S01 · E06" or "2019 · 153 min"
  caption?: string; // e.g. episode name (italic), optional
  posterPath?: string; // poster (2:3) preferred
  stillPath?: string; // still/backdrop (16:9) fallback
  rating?: number; // 0..5 stars, optional
  brand: string; // app name
  url: string; // site URL for the footer
}

/** Load an image with CORS so the canvas stays exportable; null on failure. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

/** Cover-fit draw of an image into a rect. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  im: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const ir = im.width / im.height;
  const r = w / h;
  let sx = 0, sy = 0, sw = im.width, sh = im.height;
  if (ir > r) {
    sw = im.height * r;
    sx = (im.width - sw) / 2;
  } else {
    sh = im.width / r;
    sy = (im.height - sh) / 2;
  }
  ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draw a shareable "I watched this episode" card (1200×630) and return a PNG
 * blob. Pure canvas (no dependency). Returns null if the browser taints the
 * canvas (blocks export) — the caller can fall back to a text-only share.
 */
export async function buildShareCard(d: ShareCardData): Promise<Blob | null> {
  const W = 1200, H = 630;
  const SCALE = 2; // render at 2× so the card stays crisp when scaled/zoomed
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE); // keep drawing in logical 1200×630 coordinates
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  try {
    await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* fonts optional */
  }

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#141016');
  bg.addColorStop(1, '#0a0a0b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.1, 0, W * 0.72, H * 0.1, W * 0.7);
  glow.addColorStop(0, 'rgba(201,162,75,0.20)');
  glow.addColorStop(1, 'rgba(201,162,75,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Artwork panel (left): show poster if available, else episode still.
  const px = 56, py = 56, pw = 320, ph = H - 112;
  const posterUrl = d.posterPath ? img(d.posterPath, 'w780') : d.stillPath ? img(d.stillPath, 'original') : null;
  const art = posterUrl ? await loadImage(posterUrl) : null;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 18);
  ctx.clip();
  if (art) {
    drawCover(ctx, art, px, py, pw, ph);
  } else {
    const p = ctx.createLinearGradient(px, py, px + pw, py + ph);
    p.addColorStop(0, '#2a2233');
    p.addColorStop(1, '#15131a');
    ctx.fillStyle = p;
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 18);
  ctx.stroke();

  // Right column
  const cx = px + pw + 56;
  const cw = W - cx - 56;
  ctx.textBaseline = 'alphabetic';

  // Brand tag
  ctx.fillStyle = '#c9a24b';
  ctx.font = '700 22px Geist, Inter, system-ui, sans-serif';
  ctx.fillText(d.brand.toUpperCase(), cx, 120);
  // letter-spaced feel via manual tracking is overkill; keep simple.

  // Show name (serif, wrap up to 2 lines)
  ctx.fillStyle = '#ffffff';
  const titleSize = d.title.length > 22 ? 64 : 78;
  ctx.font = `800 ${titleSize}px Fraunces, Georgia, serif`;
  const lines = wrap(ctx, d.title, cw, 2);
  let ty = 210;
  for (const ln of lines) {
    ctx.fillText(ln, cx, ty);
    ty += titleSize + 6;
  }

  // Season · Episode
  ctx.fillStyle = '#a8a29e';
  ctx.font = '600 30px Geist, Inter, system-ui, sans-serif';
  ctx.fillText(d.subtitle, cx, ty + 8);

  // Divider
  ctx.fillStyle = '#c9a24b';
  ctx.fillRect(cx, ty + 34, 64, 4);

  // Verdict: rating stars or "WATCHED"
  let vy = ty + 100;
  if (d.rating && d.rating > 0) {
    ctx.fillStyle = '#8a8a86';
    ctx.font = '700 22px Geist, Inter, system-ui, sans-serif';
    ctx.fillText('I RATED', cx, vy - 40);
    const star = 46;
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, cx + i * (star + 12) + star / 2, vy + star / 2 - 8, star / 2, i < d.rating ? '#c9a24b' : 'rgba(255,255,255,0.16)');
    }
    vy += 40;
  } else {
    ctx.fillStyle = '#f5f5f4';
    ctx.font = '800 40px Fraunces, Georgia, serif';
    ctx.fillText('WATCHED', cx, vy);
  }

  // Caption (muted, one line)
  if (d.caption) {
    ctx.fillStyle = '#c9c7c2';
    ctx.font = 'italic 500 26px Fraunces, Georgia, serif';
    ctx.fillText(ellipsize(ctx, d.caption, cw), cx, vy + 46);
  }

  // Footer
  ctx.fillStyle = '#6b6b66';
  ctx.font = '600 22px Geist, Inter, system-ui, sans-serif';
  ctx.fillText(d.url, cx, H - 56);

  try {
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  } catch {
    // A cross-origin image without CORS headers can taint the canvas and block
    // export — signal failure so the UI can show a friendly message.
    return null;
  }
}

/** Draw a 5-point star centred at (cx,cy) with the given outer radius. */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      if (lines.length === maxLines - 1) {
        cur = words.slice(i).join(' '); // dump the rest onto the final line
        break;
      }
      cur = words[i];
    } else {
      cur = next;
    }
  }
  lines.push(cur);
  const out = lines.slice(0, maxLines);
  out[out.length - 1] = ellipsize(ctx, out[out.length - 1], maxW);
  return out;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}
