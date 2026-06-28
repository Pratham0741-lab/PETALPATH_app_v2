import { Point } from '../store/writeStore';

export function getGuidePoints(guideName: string, w: number, h: number): Point[] {
  const points: Point[] = [];
  
  const sampleLinear = (x1: number, y1: number, x2: number, y2: number, count: number) => {
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      points.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      });
    }
  };

  switch (guideName) {
    case 'Standing Line':
      sampleLinear(w / 2, h * 0.15, w / 2, h * 0.85, 20);
      break;
    case 'Sleeping Line':
      sampleLinear(w * 0.15, h / 2, w * 0.85, h / 2, 20);
      break;
    case 'Left Slanting Line':
      sampleLinear(w * 0.75, h * 0.2, w * 0.25, h * 0.8, 20);
      break;
    case 'Right Slanting Line':
      sampleLinear(w * 0.25, h * 0.2, w * 0.75, h * 0.8, 20);
      break;
    case 'Big Curve': {
      const p0 = { x: w * 0.7, y: h * 0.2 };
      const p1 = { x: w * 0.2, y: h / 2 };
      const p2 = { x: w * 0.7, y: h * 0.8 };
      for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Small Curve': {
      const p0 = { x: w * 0.6, y: h * 0.3 };
      const p1 = { x: w * 0.3, y: h / 2 };
      const p2 = { x: w * 0.6, y: h * 0.7 };
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Semi Circle': {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const r = h * 0.3;
      for (let i = 0; i <= 18; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 18;
        points.push({
          x: cx - r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Reverse Semi Circle': {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const r = h * 0.3;
      for (let i = 0; i <= 18; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 18;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Zig-zag':
      sampleLinear(w * 0.15, h * 0.6, w * 0.325, h * 0.3, 10);
      sampleLinear(w * 0.325, h * 0.3, w * 0.5, h * 0.6, 10);
      sampleLinear(w * 0.5, h * 0.6, w * 0.675, h * 0.3, 10);
      sampleLinear(w * 0.675, h * 0.3, w * 0.85, h * 0.6, 10);
      break;
    case 'Spiral': {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.35;
      for (let i = 0; i < 72; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        const r = (maxR * i) / 72;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Loop': {
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const x = w * 0.15 + (w * 0.7) * t;
        const y = h * 0.5 + h * 0.15 * Math.sin(t * 3 * 2 * Math.PI) + h * 0.08 * Math.cos(t * 3 * 2 * Math.PI);
        points.push({ x, y });
      }
      break;
    }
    case 'Combined Curves': {
      const p0 = { x: w * 0.15, y: h * 0.5 };
      const p1 = { x: w * 0.325, y: h * 0.2 };
      const p2 = { x: w * 0.5, y: h * 0.5 };
      const p3 = { x: w * 0.675, y: h * 0.8 };
      const p4 = { x: w * 0.85, y: h * 0.5 };
      for (let i = 0; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      for (let i = 1; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p2.x + 2 * mt * t * p3.x + t * t * p4.x,
          y: mt * mt * p2.y + 2 * mt * t * p3.y + t * t * p4.y,
        });
      }
      break;
    }
    case 'Left Curve': {
      // Quadratic Bezier curve: M (w * 0.7) (h * 0.2) Q (w * 0.2) (h / 2) (w * 0.7) (h * 0.8)
      const p0 = { x: w * 0.7, y: h * 0.2 };
      const p1 = { x: w * 0.2, y: h / 2 };
      const p2 = { x: w * 0.7, y: h * 0.8 };
      for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Right Curve': {
      const p0 = { x: w * 0.3, y: h * 0.2 };
      const p1 = { x: w * 0.8, y: h / 2 };
      const p2 = { x: w * 0.3, y: h * 0.8 };
      for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Zigzag Pattern':
      sampleLinear(w * 0.15, h * 0.6, w * 0.325, h * 0.3, 10);
      sampleLinear(w * 0.325, h * 0.3, w * 0.5, h * 0.6, 10);
      sampleLinear(w * 0.5, h * 0.6, w * 0.675, h * 0.3, 10);
      sampleLinear(w * 0.675, h * 0.3, w * 0.85, h * 0.6, 10);
      break;
    case 'Wave Pattern': {
      const p0 = { x: w * 0.15, y: h * 0.5 };
      const p1 = { x: w * 0.325, y: h * 0.2 };
      const p2 = { x: w * 0.5, y: h * 0.5 };
      const p3 = { x: w * 0.675, y: h * 0.8 };
      const p4 = { x: w * 0.85, y: h * 0.5 };
      for (let i = 0; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      for (let i = 1; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p2.x + 2 * mt * t * p3.x + t * t * p4.x,
          y: mt * mt * p2.y + 2 * mt * t * p3.y + t * t * p4.y,
        });
      }
      break;
    }
    case 'Triangle':
      sampleLinear(w / 2, h * 0.2, w * 0.8, h * 0.8, 15);
      sampleLinear(w * 0.8, h * 0.8, w * 0.2, h * 0.8, 15);
      sampleLinear(w * 0.2, h * 0.8, w / 2, h * 0.2, 15);
      break;
    case 'Square':
      sampleLinear(w * 0.2, h * 0.2, w * 0.8, h * 0.2, 12);
      sampleLinear(w * 0.8, h * 0.2, w * 0.8, h * 0.8, 12);
      sampleLinear(w * 0.8, h * 0.8, w * 0.2, h * 0.8, 12);
      sampleLinear(w * 0.2, h * 0.8, w * 0.2, h * 0.2, 12);
      break;
    case 'Rectangle':
      sampleLinear(w * 0.15, h * 0.25, w * 0.85, h * 0.25, 14);
      sampleLinear(w * 0.85, h * 0.25, w * 0.85, h * 0.75, 12);
      sampleLinear(w * 0.85, h * 0.75, w * 0.15, h * 0.75, 14);
      sampleLinear(w * 0.15, h * 0.75, w * 0.15, h * 0.25, 12);
      break;
    case 'Oval': {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.35;
      const ry = h * 0.25;
      for (let i = 0; i < 36; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        points.push({
          x: cx + rx * Math.cos(angle),
          y: cy + ry * Math.sin(angle),
        });
      }
      break;
    }
    case 'Star': {
      const cx = w / 2;
      const cy = h / 2;
      const outerR = Math.min(w, h) * 0.35;
      const innerR = outerR * 0.4;
      const vertices: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        vertices.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      for (let i = 0; i < 10; i++) {
        const next = (i + 1) % 10;
        sampleLinear(vertices[i].x, vertices[i].y, vertices[next].x, vertices[next].y, 6);
      }
      break;
    }
    case 'Heart': {
      const sampleCubic = (p0: Point, p1: Point, p2: Point, p3: Point, count: number) => {
        for (let i = 0; i <= count; i++) {
          const t = i / count;
          const mt = 1 - t;
          points.push({
            x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
            y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
          });
        }
      };
      const start = { x: w / 2, y: h * 0.3 };
      const bottom = { x: w / 2, y: h * 0.85 };
      const l1 = { x: w * 0.2, y: h * 0.1 };
      const l2 = { x: w * 0.1, y: h * 0.55 };
      const r1 = { x: w * 0.8, y: h * 0.1 };
      const r2 = { x: w * 0.9, y: h * 0.55 };
      sampleCubic(start, l1, l2, bottom, 20);
      sampleCubic(bottom, r2, r1, start, 20);
      break;
    }
    case 'Diamond':
      sampleLinear(w / 2, h * 0.2, w * 0.8, h / 2, 12);
      sampleLinear(w * 0.8, h / 2, w / 2, h * 0.8, 12);
      sampleLinear(w / 2, h * 0.8, w * 0.2, h / 2, 12);
      sampleLinear(w * 0.2, h / 2, w / 2, h * 0.2, 12);
      break;
    case 'Pentagon': {
      const cx = w / 2;
      const cy = h / 2 + 10;
      const r = Math.min(w, h) * 0.32;
      const vertices: Point[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        vertices.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        sampleLinear(vertices[i].x, vertices[i].y, vertices[next].x, vertices[next].y, 10);
      }
      break;
    }
    case 'Hexagon': {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.32;
      const vertices: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        vertices.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        sampleLinear(vertices[i].x, vertices[i].y, vertices[next].x, vertices[next].y, 10);
      }
      break;
    }
    case 'Circle': {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.3;
      for (let i = 0; i < 36; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Letter A':
      sampleLinear(w / 2, h * 0.2, w * 0.25, h * 0.8, 12);
      sampleLinear(w / 2, h * 0.2, w * 0.75, h * 0.8, 12);
      sampleLinear(w * 0.35, h * 0.55, w * 0.65, h * 0.55, 8);
      break;
    case 'Number 1':
      sampleLinear(w * 0.4, h * 0.25, w / 2, h * 0.2, 6);
      sampleLinear(w / 2, h * 0.2, w / 2, h * 0.8, 18);
      sampleLinear(w * 0.35, h * 0.8, w * 0.65, h * 0.8, 8);
      break;
    default:
      // Square fallback
      sampleLinear(w * 0.2, h * 0.2, w * 0.8, h * 0.2, 10);
      sampleLinear(w * 0.8, h * 0.2, w * 0.8, h * 0.8, 10);
      sampleLinear(w * 0.8, h * 0.8, w * 0.2, h * 0.8, 10);
      sampleLinear(w * 0.2, h * 0.8, w * 0.2, h * 0.2, 10);
      break;
  }
  return points;
}

export function calculateTracingAccuracy(
  strokes: Point[][],
  guidePoints: Point[]
): number {
  if (strokes.length === 0 || guidePoints.length === 0) return 0;

  const userPoints = strokes.flat();
  if (userPoints.length === 0) return 0;

  // Maximum distance to consider a guide point as "traced" (matching width of stroke)
  const thresholdDistance = 35; // pixels
  let matchedCount = 0;

  guidePoints.forEach((gp) => {
    let hasClosePoint = false;
    for (let i = 0; i < userPoints.length; i++) {
      const up = userPoints[i];
      const dx = gp.x - up.x;
      const dy = gp.y - up.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= thresholdDistance) {
        hasClosePoint = true;
        break;
      }
    }
    if (hasClosePoint) {
      matchedCount++;
    }
  });

  const matchingRatio = matchedCount / guidePoints.length;

  // Penalize stray drawing to prevent cheating by coloring the whole canvas
  let strayCount = 0;
  userPoints.forEach((up) => {
    let minDistance = Infinity;
    for (let i = 0; i < guidePoints.length; i++) {
      const gp = guidePoints[i];
      const dx = gp.x - up.x;
      const dy = gp.y - up.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    if (minDistance > 55) {
      strayCount++;
    }
  });

  const strayRatio = strayCount / userPoints.length;
  // Net score: matching ratio minus a fraction of the stray ratio
  const netScore = Math.max(0, matchingRatio - strayRatio * 0.4);

  return Math.round(netScore * 100);
}

export function getStarsFromScore(score: number): number {
  if (score >= 80) return 3;
  if (score >= 60) return 2;
  if (score >= 40) return 1;
  return 0;
}
