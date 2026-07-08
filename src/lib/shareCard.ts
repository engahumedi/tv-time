import { triggerDownload } from './exporter';

export interface CardData {
  title: string;
  episodesLabel: string;
  episodes: string;
  timeLabel: string;
  time: string;
  showsLabel: string;
  shows: string;
  topShowLabel: string;
  topShow: string;
  brand: string;
}

/**
 * Draws a square, shareable summary card to a canvas and downloads it as PNG.
 * Pure canvas (no extra dependency) so it works offline.
 */
export function downloadShareCard(d: CardData, filename = 'showtrack.png'): void {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#141016');
  g.addColorStop(1, '#0a0a0b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // Coral glow
  const glow = ctx.createRadialGradient(S * 0.2, 0, 0, S * 0.2, 0, S * 0.8);
  glow.addColorStop(0, 'rgba(255,91,69,0.28)');
  glow.addColorStop(1, 'rgba(255,91,69,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  const pad = 90;
  ctx.textBaseline = 'alphabetic';

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 68px Inter, system-ui, sans-serif';
  ctx.fillText(d.title, pad, 180);

  // Big stat blocks
  const rows: [string, string][] = [
    [d.episodes, d.episodesLabel],
    [d.time, d.timeLabel],
    [d.shows, d.showsLabel],
  ];
  let y = 340;
  for (const [value, label] of rows) {
    ctx.fillStyle = '#ff8266';
    ctx.font = '800 110px Inter, system-ui, sans-serif';
    ctx.fillText(value, pad, y);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '600 34px Inter, system-ui, sans-serif';
    ctx.fillText(label.toUpperCase(), pad + 6, y + 46);
    y += 210;
  }

  // Top show
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  ctx.fillText(d.topShowLabel.toUpperCase(), pad, S - 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 52px Inter, system-ui, sans-serif';
  ctx.fillText(truncate(ctx, d.topShow, S - pad * 2), pad, S - 95);

  // Brand
  ctx.fillStyle = '#ff5b45';
  ctx.font = '800 34px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('▶ ' + d.brand, S - pad, 180);
  ctx.textAlign = 'left';

  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename);
  }, 'image/png');
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}
