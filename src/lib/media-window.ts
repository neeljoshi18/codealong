/** Seconds of YouTube downloaded for a first screen read. Keep small — no re-encode. */
export const MEDIA_WINDOW_SEC = 12;

export function windowStartFor(time: number): number {
  return Math.max(0, Math.floor(time / MEDIA_WINDOW_SEC) * MEDIA_WINDOW_SEC);
}
