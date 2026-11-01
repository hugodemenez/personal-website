export type DayPoint = {
  label: string;
  pnl: number;
};

export type ChartKind = "bars" | "line" | "area";
export type ChartShape = "rounded" | "sharp" | "markers";
export type ChartPalette = "pnl" | "mint" | "ink" | "amber";
export type SeriesId = "weekday" | "equity" | "winrate" | "drawdown";

export const WEEKDAYS: DayPoint[] = [
  { label: "Mon", pnl: 1840 },
  { label: "Tue", pnl: -620 },
  { label: "Wed", pnl: 960 },
  { label: "Thu", pnl: 340 },
  { label: "Fri", pnl: -180 },
];

export const WINRATE: DayPoint[] = [
  { label: "Mon", pnl: 62 },
  { label: "Tue", pnl: 38 },
  { label: "Wed", pnl: 71 },
  { label: "Thu", pnl: 55 },
  { label: "Fri", pnl: 44 },
];

export const DRAWDOWN: DayPoint[] = [
  { label: "Mon", pnl: 0 },
  { label: "Tue", pnl: -8 },
  { label: "Wed", pnl: -18 },
  { label: "Thu", pnl: -11 },
  { label: "Fri", pnl: -4 },
];

export const TILE_PLOT = {
  width: 168,
  height: 46,
  left: 3,
  right: 3,
  top: 4,
  bottom: 4,
};

export function cloneDays(days: DayPoint[]): DayPoint[] {
  return days.map((day) => ({ ...day }));
}

export function nudgeDay(
  days: DayPoint[],
  label: string,
  delta: number,
): DayPoint[] {
  return days.map((day) =>
    day.label === label ? { ...day, pnl: day.pnl + delta } : day,
  );
}

export function smoothDays(days: DayPoint[]): DayPoint[] {
  return days.map((day, index, all) => {
    if (index === 0 || index === all.length - 1) return { ...day };
    const prev = all[index - 1];
    const next = all[index + 1];
    if (!prev || !next) return { ...day };
    return { ...day, pnl: (prev.pnl + day.pnl + next.pnl) / 3 };
  });
}

export function raiseDays(
  days: DayPoint[],
  amount: number,
  cap = 100,
): DayPoint[] {
  return days.map((day) => ({
    ...day,
    pnl: Math.min(cap, day.pnl + amount),
  }));
}

export type Plot = typeof TILE_PLOT;

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

export function seriesFor(id: SeriesId): DayPoint[] {
  switch (id) {
    case "weekday":
      return WEEKDAYS;
    case "equity":
      return cumulative(WEEKDAYS);
    case "winrate":
      return WINRATE;
    case "drawdown":
      return DRAWDOWN;
  }
}

function domain(values: number[]): { min: number; max: number } {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(max - min, 1);
  return { min: min - span * 0.06, max: max + span * 0.1 };
}

export function layoutSeries(
  days: DayPoint[],
  shape: ChartShape,
  plot: Plot = TILE_PLOT,
): PlotPoint[] {
  const { width, height, left, right, top, bottom } = plot;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const { min, max } = domain(days.map((day) => day.pnl));
  const span = max - min || 1;
  const zeroY = top + ((max - 0) / span) * innerH;
  const slot = innerW / Math.max(days.length, 1);
  const slim = shape === "markers";
  const barW = slot * (slim ? 0.28 : 0.5);

  return days.map((day, index) => {
    const x = left + slot * index + slot / 2;
    const y = top + ((max - day.pnl) / span) * innerH;
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
        height: Math.max(1.4, Math.abs(y - zeroY)),
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
    path += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return path;
}

export function areaPath(points: PlotPoint[], smooth: boolean): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points, smooth)} L ${last.x} ${last.zeroY} L ${first.x} ${first.zeroY} Z`;
}
