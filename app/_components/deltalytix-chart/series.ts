export type DayPoint = {
  label: string;
  pnl: number;
};

/** A compact futures week: mid-week strength, Tuesday fade, Friday give-back. */
export const WEEKDAYS: DayPoint[] = [
  { label: "Mon", pnl: 1840 },
  { label: "Tue", pnl: -620 },
  { label: "Wed", pnl: 960 },
  { label: "Thu", pnl: 340 },
  { label: "Fri", pnl: -180 },
];

export const PLOT = {
  width: 360,
  height: 188,
  left: 36,
  right: 14,
  top: 16,
  bottom: 28,
};

export type ChartKind = "bars" | "line" | "area";
export type ChartShape = "rounded" | "sharp" | "markers";
export type ChartPalette = "pnl" | "mint" | "ink" | "amber";

export type PlotPoint = {
  label: string;
  value: number;
  x: number;
  y: number;
  zeroY: number;
  bar: { x: number; y: number; width: number; height: number };
};

export function cumulative(days: DayPoint[] = WEEKDAYS): DayPoint[] {
  let sum = 0;
  return days.map((day) => {
    sum += day.pnl;
    return { label: day.label, pnl: sum };
  });
}

export function seriesForKind(kind: ChartKind): DayPoint[] {
  return kind === "bars" ? WEEKDAYS : cumulative(WEEKDAYS);
}

export function titleForKind(kind: ChartKind): string {
  switch (kind) {
    case "bars":
      return "P&L by weekday";
    case "line":
      return "Cumulative P&L";
    case "area":
      return "Equity";
  }
}

function domain(values: number[]): { min: number; max: number } {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(max - min, 1);
  return { min: min - span * 0.08, max: max + span * 0.14 };
}

export function layoutSeries(
  days: DayPoint[],
  shape: ChartShape,
): PlotPoint[] {
  const { width, height, left, right, top, bottom } = PLOT;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const { min, max } = domain(days.map((day) => day.pnl));
  const span = max - min || 1;
  const zeroY = top + ((max - 0) / span) * innerH;
  const slot = innerW / days.length;
  const slim = shape === "markers";
  const barW = slot * (slim ? 0.22 : 0.46);

  return days.map((day, index) => {
    const x = left + slot * index + slot / 2;
    const y = top + ((max - day.pnl) / span) * innerH;
    const barHeight = Math.max(2, Math.abs(y - zeroY));
    return {
      label: day.label,
      value: day.pnl,
      x,
      y,
      zeroY,
      bar: {
        x: x - barW / 2,
        y: day.pnl >= 0 ? y : zeroY,
        width: barW,
        height: barHeight,
      },
    };
  });
}

export function linePath(points: PlotPoint[], smooth: boolean): string {
  if (points.length === 0) return "";
  if (!smooth || points.length < 3) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return path;
}

export function areaPath(points: PlotPoint[], smooth: boolean): string {
  if (points.length === 0) return "";
  const line = linePath(points, smooth);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${last.zeroY} L ${first.x} ${first.zeroY} Z`;
}

export function formatPnl(value: number): string {
  const sign = value > 0 ? "+" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}${(value / 1000).toFixed(1)}k`;
  return `${sign}${value}`;
}
