import type { VisitedPlace } from "@/server/location-data";

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

function buildZoneStroke(
  origin: ProjectedPoint,
  random: () => number,
  length: number,
  lift: number,
  tilt: number,
  wander: number
): string {
  const start = -length / 2;
  const segments = 5;
  const points: ProjectedPoint[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const ease = Math.sin(progress * Math.PI);
    points.push({
      x:
        origin.x +
        start +
        length * progress +
        (random() - 0.5) * wander * ease,
      y:
        origin.y +
        tilt * (progress - 0.5) * length +
        (random() - 0.5) * lift * 0.45 * ease,
    });
  }

  return toSmoothPath(points);
}

export interface ZoneBrush {
  city: string;
  corePath: string;
  coreWidth: number;
  kind: StayKind;
  path: string;
  width: number;
  x: number;
  y: number;
}

const ZONE_STEP_DEGREES = 8;

export function zoneCenter(place: VisitedPlace): ProjectedPoint {
  return projectLocation(
    Math.round(place.longitude / ZONE_STEP_DEGREES) * ZONE_STEP_DEGREES,
    Math.round(place.latitude / ZONE_STEP_DEGREES) * ZONE_STEP_DEGREES
  );
}

export interface MapViewBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

const MIN_LON_SPAN = 48;
const MIN_LAT_SPAN = 32;
const VIEW_PADDING = 0.2;
const WORLD_ASPECT = MAP_WIDTH / MAP_HEIGHT;

export function mapViewBox(places: readonly VisitedPlace[]): MapViewBox {
  const coords = places.length
    ? places.map((place) => ({
        latitude: place.latitude,
        longitude: place.longitude,
      }))
    : [{ latitude: 38.72, longitude: -9.14 }];

  const west = Math.min(...coords.map((coord) => coord.longitude));
  const east = Math.max(...coords.map((coord) => coord.longitude));
  const south = Math.min(...coords.map((coord) => coord.latitude));
  const north = Math.max(...coords.map((coord) => coord.latitude));
  const lonMid = (west + east) / 2;
  const latMid = (south + north) / 2;

  let lonSpan = Math.max(east - west, MIN_LON_SPAN);
  let latSpan = Math.max(north - south, MIN_LAT_SPAN);

  if (lonSpan / latSpan < WORLD_ASPECT) lonSpan = latSpan * WORLD_ASPECT;
  if (lonSpan / latSpan > WORLD_ASPECT) latSpan = lonSpan / WORLD_ASPECT;

  lonSpan *= 1 + VIEW_PADDING * 2;
  latSpan *= 1 + VIEW_PADDING * 2;

  let viewWest = lonMid - lonSpan / 2;
  let viewEast = lonMid + lonSpan / 2;
  let viewSouth = latMid - latSpan / 2;
  let viewNorth = latMid + latSpan / 2;

  if (viewWest < -180) {
    viewEast = Math.min(180, viewEast - viewWest - 180);
    viewWest = -180;
  }
  if (viewEast > 180) {
    viewWest = Math.max(-180, viewWest - (viewEast - 180));
    viewEast = 180;
  }
  if (viewSouth < -90) {
    viewNorth = Math.min(90, viewNorth - viewSouth - 90);
    viewSouth = -90;
  }
  if (viewNorth > 90) {
    viewSouth = Math.max(-90, viewSouth - (viewNorth - 90));
    viewNorth = 90;
  }

  const topLeft = projectLocation(viewWest, viewNorth);
  const bottomRight = projectLocation(viewEast, viewSouth);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: Math.max(1, bottomRight.x - topLeft.x),
    height: Math.max(1, bottomRight.y - topLeft.y),
  };
}

export function zoneBrushes(
  places: readonly VisitedPlace[],
  viewWidth = MAP_WIDTH
): ZoneBrush[] {
  return places.map((place) => {
    const kind = stayKind(place, places);
    const origin = zoneCenter(place);
    const random = createRandom(`${place.city}|${place.country ?? ""}`);
    const length = viewWidth * (kind === "habitual" ? 0.17 : 0.125);
    const lift = viewWidth * (kind === "habitual" ? 0.052 : 0.038);
    const wander = viewWidth * 0.018;
    const tilt = (random() - 0.5) * 0.28;
    const path = buildZoneStroke(origin, random, length, lift, tilt, wander);
    const corePath = buildZoneStroke(
      origin,
      random,
      length * 0.78,
      lift * 0.7,
      tilt * 0.55,
      wander * 0.7
    );

    return {
      city: place.city,
      corePath,
      coreWidth: lift * 0.48,
      kind,
      path,
      width: lift,
      x: origin.x,
      y: origin.y,
    };
  });
}
