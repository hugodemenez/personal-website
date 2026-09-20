import type { VisitedPlace } from "@/server/location-data";
import { RESUME_PLACES, type ResumePlace } from "@/lib/resume-places";

export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 450;
export const MAP_PADDING = 18;

type LonLat = readonly [number, number];

interface Continent {
  name: string;
  ring: readonly LonLat[];
}

// Naive lon/lat silhouettes — recognizable continents, not a survey.
const CONTINENTS: readonly Continent[] = [
  {
    name: "North America",
    ring: [
      [-168, 63],
      [-154, 71],
      [-141, 70],
      [-126, 71],
      [-105, 73],
      [-88, 69],
      [-84, 63],
      [-70, 58],
      [-56, 54],
      [-53, 47],
      [-65, 44],
      [-70, 42],
      [-74, 40],
      [-76, 35],
      [-80, 25],
      [-89, 29],
      [-97, 26],
      [-104, 30],
      [-110, 24],
      [-115, 27],
      [-117, 33],
      [-124, 38],
      [-125, 48],
      [-132, 55],
      [-142, 60],
      [-154, 59],
      [-166, 64],
    ],
  },
  {
    name: "Greenland",
    ring: [
      [-72, 77],
      [-58, 82],
      [-40, 83],
      [-22, 80],
      [-20, 71],
      [-42, 60],
      [-53, 67],
      [-68, 75],
    ],
  },
  {
    name: "South America",
    ring: [
      [-80, 8],
      [-71, 12],
      [-60, 6],
      [-50, 1],
      [-35, -5],
      [-35, -16],
      [-41, -23],
      [-48, -26],
      [-54, -34],
      [-62, -39],
      [-67, -55],
      [-71, -51],
      [-74, -41],
      [-77, -18],
      [-81, -4],
    ],
  },
  {
    name: "Europe",
    ring: [
      [-12.2, 43.4],
      [-12.6, 40.8],
      [-12.4, 38.7],
      [-11.4, 36.4],
      [-7.2, 35.8],
      [-2.4, 36.6],
      [1.2, 38.4],
      [3.4, 41.8],
      [6.0, 43.0],
      [7.6, 43.5],
      [10.8, 41.4],
      [15.2, 37.8],
      [18.2, 40.2],
      [13.8, 45.4],
      [18.8, 42.0],
      [23.0, 37.2],
      [26.2, 38.2],
      [24.4, 41.0],
      [28.6, 45.2],
      [30.2, 54.0],
      [29.4, 69.2],
      [20.0, 70.4],
      [10.2, 63.0],
      [8.2, 58.2],
      [5.2, 53.0],
      [1.2, 51.0],
      [-6.4, 48.6],
      [0.8, 46.2],
      [-1.2, 43.3],
      [-7.4, 43.5],
    ],
  },
  {
    name: "Britain",
    ring: [
      [-6, 50],
      [-7, 55],
      [-4, 58],
      [0, 57],
      [1, 52],
      [-2, 50],
    ],
  },
  {
    name: "Iceland",
    ring: [
      [-24, 66],
      [-14, 66],
      [-18, 63],
    ],
  },
  {
    name: "Africa",
    ring: [
      [-5.8, 32.8],
      [-9.8, 31.6],
      [-16.8, 16.0],
      [-13.0, 6.0],
      [0.0, 6.0],
      [8.0, 4.0],
      [13.0, -6.0],
      [12.0, -17.0],
      [18.0, -34.0],
      [26.0, -34.0],
      [33.0, -27.0],
      [40.0, -12.0],
      [40.0, 0.0],
      [51.0, 11.0],
      [43.0, 12.0],
      [32.0, 28.8],
      [23.2, 31.2],
      [10.0, 31.6],
    ],
  },
  {
    name: "Madagascar",
    ring: [
      [44, -13],
      [50, -16],
      [47, -25],
      [43, -24],
    ],
  },
  {
    name: "Asia",
    ring: [
      [30, 69],
      [48, 72],
      [78, 73],
      [110, 72],
      [135, 71],
      [162, 66],
      [178, 66],
      [170, 60],
      [156, 58],
      [144, 46],
      [138, 36],
      [128, 33],
      [120, 26],
      [110, 16],
      [104, 2],
      [98, 8],
      [88, 21],
      [80, 22],
      [78, 9],
      [72, 8],
      [68, 22],
      [60, 25],
      [50, 27],
      [36, 30],
      [32, 37],
      [28, 42],
      [32, 48],
      [40, 46],
      [42, 52],
      [32, 60],
    ],
  },
  {
    name: "Japan",
    ring: [
      [131, 31],
      [136, 34],
      [141, 38],
      [145, 43],
      [140, 39],
    ],
  },
  {
    name: "Indonesia",
    ring: [
      [96, 4],
      [106, -6],
      [120, -8],
      [131, -4],
      [118, 1],
    ],
  },
  {
    name: "Australia",
    ring: [
      [114, -22],
      [114, -34],
      [126, -35],
      [137, -35],
      [142, -38],
      [150, -38],
      [153, -27],
      [145, -14],
      [132, -11],
      [121, -16],
    ],
  },
  {
    name: "New Zealand",
    ring: [
      [166, -46],
      [172, -41],
      [178, -37],
      [175, -42],
      [168, -47],
    ],
  },
];

export interface ProjectedPoint {
  x: number;
  y: number;
}

export function projectLocation(
  longitude: number,
  latitude: number
): ProjectedPoint {
  return {
    x: ((longitude + 180) / 360) * MAP_WIDTH,
    y: ((90 - latitude) / 180) * MAP_HEIGHT,
  };
}

function wobble(longitude: number, latitude: number, index: number): LonLat {
  const drift = Math.sin(index * 1.71 + longitude * 0.13 + latitude * 0.07);
  const drift2 = Math.cos(index * 2.27 + longitude * 0.05 - latitude * 0.11);
  return [longitude + drift * 0.55, latitude + drift2 * 0.4];
}

function closedSketchPath(points: ProjectedPoint[]): string {
  if (points.length < 3) return "";

  const ring = [...points, points[0], points[1]];
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 1; index < ring.length - 1; index += 1) {
    const point = ring[index];
    const next = ring[index + 1];
    path += ` Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${(
      (point.x + next.x) /
      2
    ).toFixed(2)} ${((point.y + next.y) / 2).toFixed(2)}`;
  }

  return `${path} Z`;
}

export interface ContinentPath {
  name: string;
  d: string;
}

export function continentRing(name: string): readonly LonLat[] | undefined {
  return CONTINENTS.find((continent) => continent.name === name)?.ring;
}

export function continentPaths(): ContinentPath[] {
  return CONTINENTS.map((continent) => {
    const points = continent.ring.map(([longitude, latitude], index) => {
      const [wobbledLongitude, wobbledLatitude] = wobble(
        longitude,
        latitude,
        index
      );
      return projectLocation(wobbledLongitude, wobbledLatitude);
    });

    return {
      name: continent.name,
      d: closedSketchPath(points),
    };
  });
}

export type StayKind = "habitual" | "casual";
export type PlaceMarkKind = StayKind | "wanted" | "resume";

export interface WantedPlace {
  name: string;
  latitude: number;
  longitude: number;
  span: "city" | "region";
}

export const WANTED_PLACES: readonly WantedPlace[] = [
  {
    name: "San Francisco",
    latitude: 37.77,
    longitude: -122.42,
    span: "city",
  },
  {
    name: "Canada",
    latitude: 55.4,
    longitude: -86.0,
    span: "region",
  },
];

export function stayKind(
  place: VisitedPlace,
  places: readonly VisitedPlace[]
): StayKind {
  if (place.isHomeBase && place.days === null) return "habitual";

  const maximum = Math.max(0, ...places.map((entry) => entry.days ?? 0));
  if (maximum === 0) return place.isCurrent ? "habitual" : "casual";
  return (place.days ?? 0) >= maximum * 0.55 ? "habitual" : "casual";
}

function createRandom(seed: string): () => number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function toSmoothPath(points: ProjectedPoint[]): string {
  if (points.length < 2) return "";

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    path += ` Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${(
      (point.x + next.x) /
      2
    ).toFixed(2)} ${((point.y + next.y) / 2).toFixed(2)}`;
  }

  const last = points[points.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
}

interface CircleScribble {
  drift?: number;
  scribble?: number;
  spiral?: number;
  steps?: number;
}

function buildCirclePath(
  origin: ProjectedPoint,
  radiusX: number,
  radiusY: number,
  random: () => number,
  turns: number,
  scribble: CircleScribble = {}
): string {
  const start = random() * Math.PI * 2;
  const steps = scribble.steps ?? 24;
  const points: ProjectedPoint[] = [];
  // A hand rarely stays on one radius — the loop opens or tightens as it goes.
  const spiral = (random() - 0.4) * (scribble.spiral ?? 0.22);
  const drift = scribble.drift ?? 3.2;
  const driftX = (random() - 0.5) * drift;
  const driftY = (random() - 0.5) * drift;
  const wobbleAmount = scribble.scribble ?? 0.26;

  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    const angle = start + progress * turns * Math.PI * 2;
    const wobble = 1 + (random() - 0.5) * wobbleAmount;
    const grow = 1 + spiral * progress;
    points.push({
      x: origin.x + driftX + Math.cos(angle) * radiusX * wobble * grow,
      y: origin.y + driftY + Math.sin(angle) * radiusY * wobble * grow,
    });
  }

  return toSmoothPath(points);
}

export interface ZoneCircle {
  detail?: string;
  global?: boolean;
  hitRadius: number;
  kind: PlaceMarkKind;
  label: string;
  path: string;
  radiusX?: number;
  radiusY?: number;
  width: number;
  x: number;
  y: number;
}

export const GLOBAL_MARK = {
  x: MAP_WIDTH / 2,
  y: MAP_HEIGHT / 2,
  radiusX: MAP_WIDTH / 2 - 16,
  radiusY: MAP_HEIGHT / 2 - 14,
} as const;

export const CIRCLE_DRAW_MS = 640;
export const CIRCLE_STAGGER_MS = 580;

export interface ClosestPlaceOptions {
  extra?: number;
  /**
   * When true (default), a global mark wins any tap that missed a local
   * circle — empty ocean and the big ring both select Foundever.
   * When false, only the ring annulus itself is hittable, so hover does
   * not pin the global mark across the whole map.
   */
  globalFallback?: boolean;
}

function nearGlobalRing(point: ProjectedPoint, circle: ZoneCircle, extra: number) {
  const radiusX = circle.radiusX ?? circle.hitRadius;
  const radiusY = circle.radiusY ?? circle.hitRadius;
  const norm = Math.hypot(
    (point.x - circle.x) / radiusX,
    (point.y - circle.y) / radiusY
  );
  const band = 0.16 + extra / Math.max(radiusX, radiusY);
  return Math.abs(norm - 1) <= band;
}

export function closestPlaceCircle(
  point: ProjectedPoint,
  circles: readonly ZoneCircle[],
  extraOrOptions: number | ClosestPlaceOptions = 0
): ZoneCircle | null {
  const extra =
    typeof extraOrOptions === "number"
      ? extraOrOptions
      : (extraOrOptions.extra ?? 0);
  const globalFallback =
    typeof extraOrOptions === "number"
      ? true
      : (extraOrOptions.globalFallback ?? true);

  let localBest: ZoneCircle | null = null;
  let localDistance = Infinity;
  let ringBest: ZoneCircle | null = null;
  let globalCircle: ZoneCircle | null = null;

  for (const circle of circles) {
    if (circle.global) {
      globalCircle = circle;
      if (nearGlobalRing(point, circle, extra)) ringBest = circle;
      continue;
    }

    const distance = Math.hypot(circle.x - point.x, circle.y - point.y);
    if (distance <= circle.hitRadius + extra && distance < localDistance) {
      localBest = circle;
      localDistance = distance;
    }
  }

  if (localBest) return localBest;
  if (globalFallback && globalCircle) {
    const distance = Math.hypot(
      globalCircle.x - point.x,
      globalCircle.y - point.y
    );
    if (distance <= globalCircle.hitRadius + extra) return globalCircle;
  }
  return ringBest;
}

export function drawOrder(circles: readonly ZoneCircle[]): ZoneCircle[] {
  const global = circles.filter((circle) => circle.global);
  const rest = circles
    .filter((circle) => !circle.global)
    .sort((left, right) => left.x - right.x || left.y - right.y);
  return [...global, ...rest];
}

const ZONE_STEP_DEGREES = 8;

export function zoneCenter(place: {
  latitude: number;
  longitude: number;
}): ProjectedPoint {
  return projectLocation(
    Math.round(place.longitude / ZONE_STEP_DEGREES) * ZONE_STEP_DEGREES,
    Math.round(place.latitude / ZONE_STEP_DEGREES) * ZONE_STEP_DEGREES
  );
}

export function zoneCircles(places: readonly VisitedPlace[]): ZoneCircle[] {
  return places.map((place) => {
    const kind = stayKind(place, places);
    const origin = zoneCenter(place);
    const random = createRandom(place.country);
    const radius = kind === "habitual" ? 30 : 20;
    const stretch = 0.78 + random() * 0.16;
    // Habitual: almost two loops, the way a hand circles twice to mark a place.
    // Casual: once around and a little past the start.
    const turns = kind === "habitual" ? 1.38 + random() * 0.2 : 1.14 + random() * 0.14;

    return {
      hitRadius: Math.max(radius * 1.35, 36),
      kind,
      label: place.country,
      path: buildCirclePath(origin, radius, radius * stretch, random, turns),
      width: kind === "habitual" ? 2.7 : 1.85,
      x: origin.x,
      y: origin.y,
    };
  });
}

export function wantedCircles(
  places: readonly WantedPlace[] = WANTED_PLACES
): ZoneCircle[] {
  return places.map((place) => {
    const origin = zoneCenter(place);
    const random = createRandom(`wanted|${place.name}`);
    const radius = place.span === "region" ? 36 : 24;
    const stretch = 0.74 + random() * 0.18;
    // Unfinished on purpose — a place not yet gone around.
    const turns = 1.08 + random() * 0.12;

    return {
      hitRadius: Math.max(radius * 1.35, 36),
      kind: "wanted",
      label: place.name,
      path: buildCirclePath(origin, radius, radius * stretch, random, turns),
      width: place.span === "region" ? 2.15 : 1.95,
      x: origin.x,
      y: origin.y,
    };
  });
}

export function resumeRadius(span: ResumePlace["span"]): number {
  if (span === "global") return GLOBAL_MARK.radiusX;
  if (span === "region") return 28;
  return 22;
}

export function resumeCircles(
  places: readonly ResumePlace[] = RESUME_PLACES
): ZoneCircle[] {
  return places.map((place) => {
    const random = createRandom(`resume|${place.label}`);
    const turns = 1.1 + random() * 0.14;

    if (place.span === "global") {
      const origin = { x: GLOBAL_MARK.x, y: GLOBAL_MARK.y };
      return {
        detail: place.detail,
        global: true,
        hitRadius: Math.hypot(MAP_WIDTH / 2, MAP_HEIGHT / 2),
        kind: "resume" as const,
        label: place.label,
        path: buildCirclePath(
          origin,
          GLOBAL_MARK.radiusX,
          GLOBAL_MARK.radiusY,
          random,
          turns,
          { drift: 8, scribble: 0.055, spiral: 0.05, steps: 36 }
        ),
        radiusX: GLOBAL_MARK.radiusX,
        radiusY: GLOBAL_MARK.radiusY,
        width: 2.05,
        x: origin.x,
        y: origin.y,
      };
    }

    const origin = zoneCenter(place);
    const radius = resumeRadius(place.span);
    const stretch = 0.74 + random() * 0.18;

    return {
      detail: place.detail,
      hitRadius: Math.max(radius * 1.35, 36),
      kind: "resume" as const,
      label: place.label,
      path: buildCirclePath(origin, radius, radius * stretch, random, turns),
      width: 1.85,
      x: origin.x,
      y: origin.y,
    };
  });
}

export function applyResumeToStayCircles(
  stayCircles: readonly ZoneCircle[],
  places: readonly ResumePlace[] = RESUME_PLACES
): ZoneCircle[] {
  const stays = stayCircles.map((circle) => ({ ...circle }));
  const extras: ZoneCircle[] = [];

  for (const place of places) {
    const country = place.country;
    const match = country
      ? stays.find(
          (circle) => circle.label.toLowerCase() === country.toLowerCase()
        )
      : undefined;

    if (match) {
      match.detail = place.detail;
      continue;
    }

    const [circle] = resumeCircles([place]);
    if (circle) extras.push(circle);
  }

  return [...stays, ...extras];
}
