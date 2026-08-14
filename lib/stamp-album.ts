import { createRandom } from "./seeded-random";

export interface AlbumPiece {
  /** Leading gap before this stamp when it still fits on the row. */
  gap: number;
  height: number;
  rotate: number;
  seed: string;
  stackNudgeX: number;
  stackNudgeY: number;
  width: number;
}

export interface AlbumSlot {
  height: number;
  rotate: number;
  stacked: boolean;
  width: number;
  x: number;
  y: number;
  z: number;
}

const MIN_WIDTH = 58;
const MAX_WIDTH = 84;
const HEIGHT_RATIO = 2 / 3;
const ROW_TOP = 10;
const EDGE_PAD = 4;

/**
 * How a stamp wants to sit in the album — size, gap, and the nudge it uses
 * once the row is full and it has to land on the pile.
 */
export function getAlbumPiece(seed: string): AlbumPiece {
  const random = createRandom(`album:${seed}`);
  const width = MIN_WIDTH + random() * (MAX_WIDTH - MIN_WIDTH);

  return {
    gap: 8 + random() * 28,
    height: width * HEIGHT_RATIO,
    rotate: (random() - 0.5) * 16,
    seed,
    stackNudgeX: (random() - 0.5) * 22,
    stackNudgeY: (random() - 0.5) * 14,
    width,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fill the top of the tray left to right, leaving the seeded gaps. When the
 * next stamp no longer fits — gaps are not squeezed to make room — it stacks
 * on a stamp already in the row.
 */
export function layoutStampAlbum(
  seeds: string[],
  trayWidth: number
): AlbumSlot[] {
  if (trayWidth <= 0 || !seeds.length) return [];

  const pieces = seeds.map(getAlbumPiece);
  const firstInset = createRandom(`album-inset:${seeds[0]}`)() * 14;
  const slots: AlbumSlot[] = [];
  const row: AlbumSlot[] = [];
  let cursor = 0;
  let z = 1;

  for (const piece of pieces) {
    const nextX = row.length === 0 ? firstInset : cursor + piece.gap;
    const fits = nextX + piece.width <= trayWidth - EDGE_PAD;

    if (fits) {
      const slot: AlbumSlot = {
        height: piece.height,
        rotate: piece.rotate,
        stacked: false,
        width: piece.width,
        x: nextX,
        y: ROW_TOP,
        z: z++,
      };
      slots.push(slot);
      row.push(slot);
      cursor = nextX + piece.width;
      continue;
    }

    if (!row.length) {
      const width = Math.min(piece.width, Math.max(24, trayWidth - EDGE_PAD * 2));
      slots.push({
        height: width * HEIGHT_RATIO,
        rotate: piece.rotate,
        stacked: false,
        width,
        x: EDGE_PAD,
        y: ROW_TOP,
        z: z++,
      });
      row.push(slots[slots.length - 1]);
      cursor = EDGE_PAD + width;
      continue;
    }

    const hostIndex = Math.floor(
      createRandom(`album-host:${piece.seed}`)() * row.length
    );
    const host = row[hostIndex];
    const maxX = Math.max(0, trayWidth - piece.width - EDGE_PAD);

    slots.push({
      height: piece.height,
      rotate: piece.rotate,
      stacked: true,
      width: piece.width,
      x: clamp(host.x + piece.stackNudgeX, 0, maxX),
      y: ROW_TOP + piece.stackNudgeY,
      z: z++,
    });
  }

  return slots;
}

export const STAMP_ALBUM_HEIGHT = ROW_TOP + MAX_WIDTH * HEIGHT_RATIO + 12;
