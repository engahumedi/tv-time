import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

const VIEW = 280; // on-screen crop circle diameter (px)
const OUT = 512; // exported avatar size (px)
const MAX_ZOOM = 4;

/**
 * Circular avatar cropper: drag to reposition, wheel/slider to zoom, live
 * preview of exactly what will be saved. Exports a centred 512×512 JPEG.
 * Self-contained (canvas + pointer events) — no external dependency.
 */
export function AvatarCropModal({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (f: File) => void;
}) {
  const { t } = useTranslation();
  const [url] = useState(() => URL.createObjectURL(file));
  const imgRef = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1); // multiplier over the cover-fit base
  const [off, setOff] = useState({ x: 0, y: 0 }); // image top-left in viewport coords
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const base = nat ? VIEW / Math.min(nat.w, nat.h) : 1; // cover-fit scale
  const eff = base * zoom; // natural → display px
  const dispW = nat ? nat.w * eff : VIEW;
  const dispH = nat ? nat.h * eff : VIEW;

  function clampAt(z: number, o: { x: number; y: number }) {
    if (!nat) return o;
    const e = base * z;
    const minX = VIEW - nat.w * e;
    const minY = VIEW - nat.h * e;
    return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(0, Math.max(minY, o.y)) };
  }

  function onLoad() {
    const im = imgRef.current!;
    const w = im.naturalWidth;
    const h = im.naturalHeight;
    setNat({ w, h });
    const b = VIEW / Math.min(w, h);
    setOff({ x: (VIEW - w * b) / 2, y: (VIEW - h * b) / 2 }); // centre
  }

  function changeZoom(nz: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, nz));
    if (!nat) {
      setZoom(z);
      return;
    }
    // Keep the point under the viewport centre fixed while zooming.
    const c = VIEW / 2;
    const be = base * zoom;
    const ix = (c - off.x) / be;
    const iy = (c - off.y) / be;
    const ne = base * z;
    setOff(clampAt(z, { x: c - ix * ne, y: c - iy * ne }));
    setZoom(z);
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    setOff(clampAt(zoom, { x: drag.current.ox + dx, y: drag.current.oy + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    changeZoom(zoom - e.deltaY * 0.0015);
  }

  async function confirm() {
    if (!nat || busy) return;
    setBusy(true);
    try {
      const e = base * zoom;
      const srcX = -off.x / e;
      const srcY = -off.y / e;
      const srcSize = VIEW / e;
      const canvas = document.createElement('canvas');
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(imgRef.current!, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) {
        setBusy(false);
        return;
      }
      const cropped = new File([blob], `${(file.name.replace(/\.\w+$/, '') || 'avatar')}.jpg`, {
        type: 'image/jpeg',
      });
      onCropped(cropped);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/85 backdrop-blur-sm sm:items-center" onClick={onCancel}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong w-full max-w-sm rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('settings.crop_title')}</h2>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg" aria-label={t('common.cancel')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Crop viewport (circular, matches how avatars render) */}
        <div className="mx-auto" style={{ width: VIEW, maxWidth: '100%' }}>
          <div
            className="relative overflow-hidden rounded-full bg-navy-900 ring-2 ring-overlay/15"
            style={{ width: VIEW, height: VIEW, touchAction: 'none', cursor: 'grab' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <img
              ref={imgRef}
              src={url}
              alt=""
              onLoad={onLoad}
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: off.x, top: off.y, width: dispW, height: dispH }}
            />
          </div>
        </div>

        {/* Zoom control */}
        <div className="mt-4 flex items-center gap-3">
          <ZoomOut size={16} strokeWidth={1.9} className="shrink-0 text-muted" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-overlay/15 accent-gold"
            aria-label={t('settings.crop_zoom')}
          />
          <ZoomIn size={16} strokeWidth={1.9} className="shrink-0 text-muted" />
        </div>
        <p className="mt-2 text-center text-xs text-faint">{t('settings.crop_hint')}</p>

        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm">
            {t('common.cancel')}
          </button>
          <button onClick={confirm} disabled={busy || !nat} className="btn-gold flex-1 text-sm">
            {t('settings.crop_apply')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
