/**
 * Shared requestAnimationFrame loop for decorative canvases.
 *
 * - Pauses while the canvas is scrolled out of view (IntersectionObserver)
 *   and while the tab is hidden, so off-screen animations cost nothing.
 * - Caps drawing at `maxFps` (default 60): per-frame animations otherwise run
 *   twice as fast — and twice as expensive — on 120 Hz phone screens.
 *
 * `draw` receives the rAF timestamp. After a pause, the first frame's
 * timestamp jumps forward; callers already clamp their per-frame delta.
 * Returns a cleanup function.
 */
export function runCanvasLoop(
  canvas: HTMLCanvasElement,
  draw: (timestamp: number) => void,
  { maxFps = 60 }: { maxFps?: number } = {},
): () => void {
  const minInterval = 1000 / maxFps - 1; // 1 ms slack for timer jitter
  let frame = 0;
  let last = 0;
  let onScreen = true;
  let pageVisible = document.visibilityState !== 'hidden';
  let stopped = false;

  const tick = (timestamp: number) => {
    frame = 0;
    if (stopped || !onScreen || !pageVisible) return;
    if (timestamp - last >= minInterval) {
      last = timestamp;
      draw(timestamp);
    }
    frame = requestAnimationFrame(tick);
  };

  const resume = () => {
    if (!stopped && !frame && onScreen && pageVisible) frame = requestAnimationFrame(tick);
  };

  const observer = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        resume();
      })
    : null;
  observer?.observe(canvas);

  const onVisibility = () => {
    pageVisible = document.visibilityState !== 'hidden';
    resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  resume();

  return () => {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
