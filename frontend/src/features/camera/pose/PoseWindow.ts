/**
 * "Mostly held" instead of "held perfectly": a pose counts once at least
 * `required` of the last `size` frames hit — 8 of 12 by default — over at least
 * `minSpanMs`. A frame where tracking blinked, or the child wobbled, no longer
 * throws away the progress.
 *
 * Frame-count and time both bound the window: at a high frame rate 12 frames
 * are too short to mean "held", so the window keeps frames until it spans
 * `minSpanMs` and judges the hit ratio over that.
 */
export interface PoseWindowConfig {
  size: number;
  required: number;
  minSpanMs: number;
}

export class PoseWindow {
  private frames: { hit: boolean; t: number }[] = [];

  constructor(private cfg: PoseWindowConfig) {}

  setConfig(cfg: PoseWindowConfig): void {
    this.cfg = cfg;
  }

  push(hit: boolean, t: number): void {
    this.frames.push({ hit, t });
    // Drop the oldest while we still have more than `size` frames covering the span.
    while (this.frames.length > this.cfg.size && t - this.frames[1].t >= this.cfg.minSpanMs) {
      this.frames.shift();
    }
  }

  /** Hits / frames currently in the window. */
  get hits(): number {
    return this.frames.reduce((n, f) => n + (f.hit ? 1 : 0), 0);
  }

  get length(): number {
    return this.frames.length;
  }

  isPassing(): boolean {
    const n = this.frames.length;
    if (n < this.cfg.size) return false;
    const span = this.frames[n - 1].t - this.frames[0].t;
    if (span < this.cfg.minSpanMs * 0.9) return false;
    return this.hits / n >= this.cfg.required / this.cfg.size;
  }

  reset(): void {
    this.frames = [];
  }
}
