import { createRandom } from "@/lib/seeded-random";
import type { ChartKind, ChartPalette, ChartShape } from "./series";

export const MAX_AGENTS = 8;
export const INITIAL_AGENTS = 1;
export const SPAWN_PER_CLICK = 2;

export const KINDS = ["bars", "line", "area"] as const satisfies readonly ChartKind[];
export const SHAPES = ["rounded", "sharp", "markers"] as const satisfies readonly ChartShape[];
export const PALETTES = ["pnl", "mint", "ink", "amber"] as const satisfies readonly ChartPalette[];
export const TUNE_ORDER = ["shape", "color", "kind"] as const;

export type AgentKind = "lead" | "swarm";
export type WorkKind = "dart" | "select" | "click" | "shuffle";

export type Station = {
  id: string;
  x: number;
  y: number;
};

export type AgentSeed = {
  id: number;
  kind: AgentKind;
  size: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  work: WorkKind;
  elapsed: number;
  duration: number;
  station: number;
  ripple: number;
};

export type AgentPose = {
  x: number;
  y: number;
  tilt: number;
  scale: number;
  ripple: number;
};

export type ChartEdit = {
  kind: ChartKind;
  shape: ChartShape;
  palette: ChartPalette;
  flash: string | null;
};

export const DEFAULT_EDIT: ChartEdit = {
  kind: "bars",
  shape: "rounded",
  palette: "pnl",
  flash: null,
};

export const SAMPLE_STATIONS: Station[] = [
  { id: "shape", x: 72, y: 58 },
  { id: "color", x: 96, y: 86 },
  { id: "kind", x: 128, y: 114 },
  { id: "plot", x: 180, y: 168 },
];

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function dartEase(t: number): number {
  const u = clamp01(t);
  if (u < 0.78) {
    const p = u / 0.78;
    return 1.08 * (1 - (1 - p) ** 3);
  }
  const p = (u - 0.78) / 0.22;
  return 1.08 - 0.08 * (1 - (1 - p) ** 2);
}

function cycle<T>(list: readonly T[], current: T, rand: () => number): T {
  const others = list.filter((item) => item !== current);
  if (others.length === 0) return current;
  return others[Math.floor(rand() * others.length)] ?? current;
}

export function applyStationEdit(
  edit: ChartEdit,
  stationId: string,
  rand: () => number,
): ChartEdit {
  switch (stationId) {
    case "shape":
      return { ...edit, shape: cycle(SHAPES, edit.shape, rand), flash: "shape" };
    case "color":
      return { ...edit, palette: cycle(PALETTES, edit.palette, rand), flash: "color" };
    case "kind":
    case "plot":
      return { ...edit, kind: cycle(KINDS, edit.kind, rand), flash: stationId === "plot" ? "plot" : "kind" };
    default:
      return { ...edit, flash: null };
  }
}

export function nextTuneStation(
  currentId: string,
  stations: Station[],
  rand: () => number,
): number {
  const index = TUNE_ORDER.indexOf(currentId as (typeof TUNE_ORDER)[number]);
  const nextId =
    rand() < 0.16
      ? "plot"
      : TUNE_ORDER[index === -1 ? 0 : (index + 1) % TUNE_ORDER.length];
  const found = stations.findIndex((station) => station.id === nextId);
  return found >= 0 ? found : 0;
}

export function nextWork(work: WorkKind, rand: () => number): WorkKind {
  switch (work) {
    case "dart":
      return "select";
    case "select":
      return "click";
    case "click":
      return rand() < 0.28 ? "shuffle" : "dart";
    case "shuffle":
      return "select";
  }
}

function durationFor(work: WorkKind, rand: () => number): number {
  switch (work) {
    case "dart":
      return 0.26 + rand() * 0.16;
    case "select":
      return 0.36 + rand() * 0.22;
    case "click":
      return 0.32;
    case "shuffle":
      return 0.12 + rand() * 0.06;
  }
}

export function createAgent(
  id: number,
  kind: AgentKind,
  stations: Station[] = SAMPLE_STATIONS,
): AgentSeed {
  const rand = createRandom(`chart-agent-${id}-${kind}`);
  const station = kind === "lead" ? 0 : nextTuneStation("plot", stations, rand);
  const start = stations[station] ?? SAMPLE_STATIONS[0];
  return {
    id,
    kind,
    size: kind === "swarm" ? 0.78 : 1,
    x: start.x - 12,
    y: start.y - 8,
    fromX: start.x - 12,
    fromY: start.y - 8,
    toX: start.x,
    toY: start.y,
    work: "dart",
    elapsed: 0,
    duration: durationFor("dart", rand),
    station,
    ripple: 0,
  };
}

export function createInitialAgents(
  stations: Station[] = SAMPLE_STATIONS,
): AgentSeed[] {
  return Array.from({ length: INITIAL_AGENTS }, (_, index) =>
    createAgent(index + 1, index === 0 ? "lead" : "swarm", stations),
  );
}

export function spawnAgents(
  current: AgentSeed[],
  nextId: number,
  stations: Station[] = SAMPLE_STATIONS,
): { agents: AgentSeed[]; nextId: number } {
  const room = Math.max(0, MAX_AGENTS - current.length);
  const n = Math.min(SPAWN_PER_CLICK, room);
  const added: AgentSeed[] = [];
  let id = nextId;
  for (let i = 0; i < n; i += 1) {
    added.push(createAgent(id, "swarm", stations));
    id += 1;
  }
  return { agents: [...current, ...added], nextId: id };
}

export function relocateAgents(agents: AgentSeed[], stations: Station[]) {
  for (const agent of agents) {
    const next = stations[agent.station] ?? stations[0];
    if (!next) continue;
    const dx = next.x - agent.toX;
    const dy = next.y - agent.toY;
    agent.x += dx;
    agent.y += dy;
    agent.fromX += dx;
    agent.fromY += dy;
    agent.toX = next.x;
    agent.toY = next.y;
  }
}

export function poseAgent(
  agent: AgentSeed,
  still: boolean,
  stations: Station[],
): AgentPose {
  const parked = stations[agent.station] ?? stations[0];
  if (still || !parked) {
    return {
      x: parked?.x ?? 0,
      y: parked?.y ?? 0,
      tilt: 0,
      scale: agent.size,
      ripple: 0,
    };
  }

  const t = agent.duration <= 0 ? 1 : clamp01(agent.elapsed / agent.duration);
  let x = agent.x;
  let y = agent.y;
  let tilt = 0;
  let scale = agent.size;

  if (agent.work === "dart" || agent.work === "shuffle") {
    const e = agent.work === "dart" ? dartEase(t) : t;
    x = agent.fromX + (agent.toX - agent.fromX) * e;
    y = agent.fromY + (agent.toY - agent.fromY) * e;
    tilt = Math.atan2(agent.toY - agent.fromY, agent.toX - agent.fromX) * 0.12;
    scale = agent.size * (1 + 0.05 * Math.sin(t * Math.PI));
  } else if (agent.work === "select") {
    x = agent.toX;
    y = agent.toY;
    scale = agent.size * (1 + 0.06 * Math.sin(t * Math.PI));
  } else if (agent.work === "click") {
    const press = t < 0.28 ? t / 0.28 : 1 - (t - 0.28) / 0.72;
    x = agent.toX;
    y = agent.toY + Math.max(0, press) * 1.6;
    scale = agent.size * (1 - 0.14 * Math.max(0, press));
  }

  return { x, y, tilt, scale, ripple: agent.ripple };
}

export function stepAgent(
  agent: AgentSeed,
  dt: number,
  still: boolean,
  stations: Station[],
): { pose: AgentPose; editStation: string | null } {
  const rand = createRandom(`chart-tick-${agent.id}-${agent.work}-${agent.station}`);
  if (still) {
    const parked = stations[agent.station];
    if (parked) {
      agent.x = parked.x;
      agent.y = parked.y;
    }
    agent.ripple = 0;
    return { pose: poseAgent(agent, true, stations), editStation: null };
  }

  agent.elapsed += dt;
  if (agent.ripple > 0) {
    agent.ripple = Math.min(1, agent.ripple + dt / 0.42);
    if (agent.ripple >= 1) agent.ripple = 0;
  }

  let editStation: string | null = null;
  if (agent.elapsed >= agent.duration) {
    const finished = agent.work;
    const station = stations[agent.station];
    if (station && finished === "click") editStation = station.id;
    const pose = poseAgent(agent, false, stations);
    agent.x = pose.x;
    agent.y = pose.y;
    const next = nextWork(finished, rand);
    agent.work = next;
    agent.elapsed = 0;
    agent.duration = durationFor(next, rand);
    if (next === "dart" || next === "shuffle") {
      agent.station = nextTuneStation(station?.id ?? "shape", stations, rand);
      const target = stations[agent.station] ?? station;
      if (target) {
        agent.fromX = agent.x;
        agent.fromY = agent.y;
        agent.toX = target.x;
        agent.toY = target.y;
      }
    } else if (station) {
      agent.fromX = agent.x;
      agent.fromY = agent.y;
      agent.toX = station.x;
      agent.toY = station.y;
    }
    if (next === "click") agent.ripple = 0.001;
  } else {
    const pose = poseAgent(agent, false, stations);
    agent.x = pose.x;
    agent.y = pose.y;
  }

  return { pose: poseAgent(agent, false, stations), editStation };
}
