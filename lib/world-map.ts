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
      [-10, 51],
      [-7, 58],
      [1, 59],
      [6, 62],
      [10, 70],
      [20, 70],
      [29, 69],
      [30, 60],
      [28, 46],
      [24, 38],
      [16, 38],
      [10, 36],
      [-5, 36],
      [-9, 38],
      [-9, 43],
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
      [-6, 35],
      [-11, 31],
      [-17, 15],
      [-13, 6],
      [0, 6],
      [8, 4],
      [13, -6],
      [12, -17],
      [18, -34],
      [26, -34],
      [33, -27],
      [40, -12],
      [40, 0],
      [51, 11],
      [43, 12],
      [33, 29],
      [24, 32],
      [10, 33],
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
  return [longitude + drift * 1.15, latitude + drift2 * 0.85];
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

export function markerRadius(days: number | null): number {
  if (days === null) return 4.2;
  return Math.min(11, 3.1 + Math.sqrt(days) * 1.15);
}

export function formatStay(place: VisitedPlace): string {
  if (place.isHomeBase && place.days === null) return "Home base";
  if (place.days === 1) return "1 day";
  return `${place.days ?? 0} days`;
}
