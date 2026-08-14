export interface ShapeActivity {
  id: string;
  date: string;
  title: string;
  description?: string | null;
  sportType: string;
  distance?: number | null;
  duration?: number | null;
  speed?: number | null;
  heartRate?: number | null;
  elevationGain?: number | null;
  completed: boolean;
  source?: string | null;
  externalId?: string | null;
  map?: string | null;
}

export interface RecentRun {
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  distanceLabel: string | null;
  durationLabel: string | null;
  paceLabel: string | null;
  mapPath: string | null;
  href: string | null;
}

export interface HeatmapEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  intensity: number;
}

export interface RouteHeatmap {
  width: number;
  height: number;
  edges: HeatmapEdge[];
  routeCount: number;
}

export interface PathSketch {
  width: number;
  height: number;
  path: string;
  traces: string[];
}

export interface DistinctPath {
  run: RecentRun;
  count: number;
  spanDays: number;
  sketch: PathSketch | null;
}

export const RECENT_RUN_LIMIT = 6;
export const DISTINCT_PATH_LIMIT = 8;
export const PATH_OVERLAP = 0.4;
export const WALKING_PACE_SEC_PER_KM = 9 * 60;
export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 40;
export const HEATMAP_WIDTH = 560;
export const HEATMAP_MAX_HEIGHT = 300;
export const PATH_SKETCH_WIDTH = 240;
export const PATH_SKETCH_HEIGHT = 80;
const MAP_PADDING = 2;
const SKETCH_PADDING = 14;
const MAX_MAP_POINTS = 180;
const MAX_SKETCH_TRACES = 8;
const CLUSTER_RADIUS_KM = 8;
const HEATMAP_GRID = 96;
const HEATMAP_PADDING = 10;

export function calendarDate(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? value;
}

export function spanDays(from: string, to: string): number {
  const start = Date.parse(`${calendarDate(from)}T00:00:00.000Z`);
  const end = Date.parse(`${calendarDate(to)}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;

  return Math.round(Math.abs(end - start) / 86_400_000) + 1;
}

export function formatRunDate(value: string): string {
  const date = calendarDate(value);
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) return date;

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function paceSecondsPerKm(
  meters: number,
  seconds: number
): number | null {
  if (meters < 100 || seconds <= 0) return null;
  return seconds / (meters / 1000);
}

export function formatPace(meters: number, seconds: number): string | null {
  const pace = paceSecondsPerKm(meters, seconds);
  if (pace === null) return null;

  const minutes = Math.floor(pace / 60);
  const remainder = Math.round(pace % 60);
  const rolled = remainder === 60;
  const displayMinutes = rolled ? minutes + 1 : minutes;
  const displaySeconds = rolled ? 0 : remainder;

  return `${displayMinutes}:${String(displaySeconds).padStart(2, "0")}/km`;
}

export function isWalkingActivity(activity: ShapeActivity): boolean {
  if (/\bwalk(?:ing)?\b/i.test(activity.title)) return true;

  if (typeof activity.speed === "number" && activity.speed > 0) {
    return activity.speed < 1.5;
  }

  if (
    typeof activity.distance === "number" &&
    typeof activity.duration === "number"
  ) {
    const pace = paceSecondsPerKm(activity.distance, activity.duration);
    return pace !== null && pace >= WALKING_PACE_SEC_PER_KM;
  }

  return false;
}

export function decodePolyline(encoded: string): Array<[number, number]> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<[number, number]> = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

function downsample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  const lastIndex = items.length - 1;
  const sampled: T[] = [];

  for (let i = 0; i < limit; i += 1) {
    sampled.push(items[Math.round((i * lastIndex) / (limit - 1))]);
  }

  return sampled;
}

function projectPoints(
  points: Array<[number, number]>,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number,
  padding: number
): string | null {
  if (points.length < 2) return null;

  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const aspect = lngSpan / latSpan;
  const boxAspect = innerWidth / innerHeight;

  let drawWidth = innerWidth;
  let drawHeight = innerHeight;
  let offsetX = padding;
  let offsetY = padding;

  if (aspect > boxAspect) {
    drawHeight = innerWidth / aspect;
    offsetY = padding + (innerHeight - drawHeight) / 2;
  } else {
    drawWidth = innerHeight * aspect;
    offsetX = padding + (innerWidth - drawWidth) / 2;
  }

  return points
    .map(([lat, lng], index) => {
      const x = offsetX + ((lng - bounds.minLng) / lngSpan) * drawWidth;
      const y = offsetY + ((bounds.maxLat - lat) / latSpan) * drawHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function polylineToSvgPath(
  encoded: string,
  width = MAP_WIDTH,
  height = MAP_HEIGHT
): string | null {
  const points = downsample(decodePolyline(encoded), MAX_MAP_POINTS);
  return projectPoints(points, boundsOf([points]), width, height, MAP_PADDING);
}

export function sketchRoutes(
  routes: Array<Array<[number, number]>>,
  width = PATH_SKETCH_WIDTH,
  height = PATH_SKETCH_HEIGHT
): PathSketch | null {
  const latest = routes[0];
  if (!latest || latest.length < 2) return null;

  const drawn = [latest, ...routes.slice(1, MAX_SKETCH_TRACES + 1)];
  const bounds = boundsOf(drawn);
  const path = projectPoints(
    downsample(latest, MAX_MAP_POINTS),
    bounds,
    width,
    height,
    SKETCH_PADDING
  );
  if (!path) return null;

  const traces = drawn
    .slice(1)
    .map((route) =>
      projectPoints(
        downsample(route, MAX_MAP_POINTS),
        bounds,
        width,
        height,
        SKETCH_PADDING
      )
    )
    .filter((trace): trace is string => Boolean(trace));

  return { width, height, path, traces };
}

function centroid(points: Array<[number, number]>): [number, number] {
  const sum = points.reduce(
    (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng] as [number, number],
    [0, 0]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

export function distanceKm(
  a: [number, number],
  b: [number, number]
): number {
  const dLat = (a[0] - b[0]) * 111.32;
  const dLng = (a[1] - b[1]) * 111.32 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function boundsOf(routes: Array<Array<[number, number]>>): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const route of routes) {
    for (const [lat, lng] of route) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function selectPrimaryRouteCluster(
  routes: Array<Array<[number, number]>>,
  radiusKm = CLUSTER_RADIUS_KM
): Array<Array<[number, number]>> {
  if (!routes.length) return [];

  const clusters: Array<{
    routes: Array<Array<[number, number]>>;
    center: [number, number];
  }> = [];

  for (const route of routes) {
    if (route.length < 2) continue;
    const routeCenter = centroid(route);
    let nearest: (typeof clusters)[number] | null = null;
    let nearestDistance = Infinity;

    for (const cluster of clusters) {
      const distance = distanceKm(routeCenter, cluster.center);
      if (distance < nearestDistance) {
        nearest = cluster;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= radiusKm) {
      nearest.routes.push(route);
      const n = nearest.routes.length;
      nearest.center = [
        (nearest.center[0] * (n - 1) + routeCenter[0]) / n,
        (nearest.center[1] * (n - 1) + routeCenter[1]) / n,
      ];
    } else {
      clusters.push({ routes: [route], center: routeCenter });
    }
  }

  return clusters[0]?.routes ?? [];
}

function walkGridLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visit: (x: number, y: number) => void
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    visit(x, y);
    if (x === x1 && y === y1) break;
    const doubled = err * 2;
    if (doubled > -dy) {
      err -= dy;
      x += sx;
    }
    if (doubled < dx) {
      err += dx;
      y += sy;
    }
  }
}

export function pathContainment(
  a: Array<[number, number]>,
  b: Array<[number, number]>,
  cols = 64
): number {
  if (a.length < 2 || b.length < 2) return 0;

  const { minLat, maxLat, minLng, maxLng } = boundsOf([a, b]);
  const latSpan = maxLat - minLat || 0.001;
  const lngSpan = maxLng - minLng || 0.001;
  const rows = Math.max(8, Math.round(cols * (latSpan / lngSpan)));

  const toSet = (points: Array<[number, number]>) => {
    const cells = new Set<string>();
    for (const [lat, lng] of downsample(points, 240)) {
      const x = Math.max(
        0,
        Math.min(cols - 1, Math.round(((lng - minLng) / lngSpan) * (cols - 1)))
      );
      const y = Math.max(
        0,
        Math.min(rows - 1, Math.round(((maxLat - lat) / latSpan) * (rows - 1)))
      );
      cells.add(`${x},${y}`);
    }
    return cells;
  };

  const aCells = toSet(a);
  const bCells = toSet(b);
  if (!aCells.size || !bCells.size) return 0;

  let intersection = 0;
  for (const cell of aCells) {
    if (bCells.has(cell)) intersection += 1;
  }

  return intersection / Math.min(aCells.size, bCells.size);
}

export function paintRouteHeatmap(
  routes: Array<Array<[number, number]>>,
  width = HEATMAP_WIDTH,
  maxHeight = HEATMAP_MAX_HEIGHT
): RouteHeatmap | null {
  if (!routes.length) return null;

  const { minLat, maxLat, minLng, maxLng } = boundsOf(routes);
  const latSpan = maxLat - minLat || 0.001;
  const lngSpan = maxLng - minLng || 0.001;
  const aspect = lngSpan / latSpan;
  const innerWidth = width - HEATMAP_PADDING * 2;
  const innerHeight = Math.min(maxHeight - HEATMAP_PADDING * 2, innerWidth / aspect);
  const height = Math.round(innerHeight + HEATMAP_PADDING * 2);
  const cols = HEATMAP_GRID;
  const rows = Math.max(2, Math.round(HEATMAP_GRID * (innerHeight / innerWidth)));
  const counts = new Map<string, { x1: number; y1: number; x2: number; y2: number; count: number }>();

  const toCell = (lat: number, lng: number): [number, number] => [
    Math.max(
      0,
      Math.min(cols - 1, Math.round(((lng - minLng) / lngSpan) * (cols - 1)))
    ),
    Math.max(
      0,
      Math.min(rows - 1, Math.round(((maxLat - lat) / latSpan) * (rows - 1)))
    ),
  ];

  const toPixel = (col: number, row: number): [number, number] => [
    HEATMAP_PADDING + (col / (cols - 1)) * innerWidth,
    HEATMAP_PADDING + (row / (rows - 1)) * innerHeight,
  ];

  for (const route of routes) {
    const cells = downsample(route, 400).map(([lat, lng]) => toCell(lat, lng));
    let previous: [number, number] | null = null;

    for (const cell of cells) {
      if (!previous) {
        previous = cell;
        continue;
      }

      let last: [number, number] | null = null;
      walkGridLine(previous[0], previous[1], cell[0], cell[1], (x, y) => {
        if (last && (last[0] !== x || last[1] !== y)) {
          const a = `${last[0]},${last[1]}`;
          const b = `${x},${y}`;
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const existing = counts.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            const [x1, y1] = toPixel(last[0], last[1]);
            const [x2, y2] = toPixel(x, y);
            counts.set(key, { x1, y1, x2, y2, count: 1 });
          }
        }
        last = [x, y];
      });

      previous = cell;
    }
  }

  const values = [...counts.values()];
  const maxCount = Math.max(0, ...values.map((edge) => edge.count));
  if (!maxCount) return null;

  const minCount = maxCount >= 3 ? 2 : 1;

  return {
    width,
    height,
    routeCount: routes.length,
    edges: values
      .filter((edge) => edge.count >= minCount)
      .map((edge) => ({
        x1: Number(edge.x1.toFixed(2)),
        y1: Number(edge.y1.toFixed(2)),
        x2: Number(edge.x2.toFixed(2)),
        y2: Number(edge.y2.toFixed(2)),
        intensity: edge.count / maxCount,
      }))
      .sort((a, b) => a.intensity - b.intensity),
  };
}

export function buildRouteHeatmapFromRoutes(
  routes: Array<Array<[number, number]>>,
  width = HEATMAP_WIDTH
): RouteHeatmap | null {
  return paintRouteHeatmap(selectPrimaryRouteCluster(routes), width);
}

export function buildRouteHeatmap(
  activities: ShapeActivity[]
): RouteHeatmap | null {
  const routes = selectRecentRuns(activities, Number.POSITIVE_INFINITY)
    .filter((activity) => activity.map)
    .map((activity) => decodePolyline(activity.map as string))
    .filter((points) => points.length >= 2);

  return buildRouteHeatmapFromRoutes(routes);
}

export function selectDistinctPaths(
  activities: ShapeActivity[],
  limit = DISTINCT_PATH_LIMIT
): DistinctPath[] {
  const mapped = selectRecentRuns(activities, Number.POSITIVE_INFINITY).filter(
    (activity) => activity.map
  );
  const clusters: Array<{
    activities: ShapeActivity[];
    routes: Array<Array<[number, number]>>;
    center: [number, number];
  }> = [];

  for (const activity of mapped) {
    const points = decodePolyline(activity.map as string);
    if (points.length < 2) continue;

    const routeCenter = centroid(points);
    let nearest: (typeof clusters)[number] | null = null;
    let nearestDistance = Infinity;

    for (const cluster of clusters) {
      const distance = distanceKm(routeCenter, cluster.center);
      if (distance < nearestDistance) {
        nearest = cluster;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= CLUSTER_RADIUS_KM) {
      nearest.activities.push(activity);
      nearest.routes.push(points);
      const n = nearest.routes.length;
      nearest.center = [
        (nearest.center[0] * (n - 1) + routeCenter[0]) / n,
        (nearest.center[1] * (n - 1) + routeCenter[1]) / n,
      ];
    } else {
      clusters.push({
        activities: [activity],
        routes: [points],
        center: routeCenter,
      });
    }
  }

  return clusters.slice(0, limit).map((cluster) => {
    const newest = cluster.activities[0];
    const oldest = cluster.activities[cluster.activities.length - 1];

    return {
      run: toRecentRun(newest),
      count: cluster.activities.length,
      spanDays: spanDays(oldest.date, newest.date),
      sketch: sketchRoutes(cluster.routes),
    };
  });
}

function activityScore(activity: ShapeActivity): number {
  return (
    (activity.map ? 4 : 0) +
    (typeof activity.heartRate === "number" ? 2 : 0) +
    (activity.source === "strava" ? 1 : 0)
  );
}

export function selectRecentRuns(
  activities: ShapeActivity[],
  limit = RECENT_RUN_LIMIT
): ShapeActivity[] {
  const chosen = new Map<string, ShapeActivity>();

  for (const activity of activities) {
    if (activity.sportType !== "run" || !activity.completed) continue;
    if (isWalkingActivity(activity)) continue;

    const distanceBucket =
      typeof activity.distance === "number"
        ? Math.round(activity.distance / 100)
        : "none";
    const key = `${calendarDate(activity.date)}:${distanceBucket}`;
    const existing = chosen.get(key);

    if (!existing || activityScore(activity) > activityScore(existing)) {
      chosen.set(key, activity);
    }
  }

  return [...chosen.values()]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
}

export function toRecentRun(activity: ShapeActivity): RecentRun {
  const distance =
    typeof activity.distance === "number" ? activity.distance : null;
  const duration =
    typeof activity.duration === "number" ? activity.duration : null;

  return {
    id: activity.id,
    title: activity.title,
    date: calendarDate(activity.date),
    dateLabel: formatRunDate(activity.date),
    distanceLabel: distance !== null ? formatDistance(distance) : null,
    durationLabel: duration !== null ? formatDuration(duration) : null,
    paceLabel:
      distance !== null && duration !== null
        ? formatPace(distance, duration)
        : null,
    mapPath: activity.map ? polylineToSvgPath(activity.map) : null,
    href:
      activity.source === "strava" && activity.externalId
        ? `https://www.strava.com/activities/${activity.externalId}`
        : null,
  };
}
