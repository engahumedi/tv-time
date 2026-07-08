import confetti from 'canvas-confetti';

/** Immediately clear any confetti still on screen (e.g. when navigating away). */
export function resetConfetti(): void {
  confetti.reset();
}

/** A subtle gold burst — used when finishing a season or a show. */
export function celebrate(intensity: 'small' | 'big' = 'small'): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e8b84b', '#f0c968', '#ffffff'];
  if (intensity === 'small') {
    confetti({
      particleCount: 45,
      spread: 60,
      startVelocity: 30,
      origin: { y: 0.7 },
      colors,
      scalar: 0.9,
    });
  } else {
    const end = Date.now() + 900;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}
