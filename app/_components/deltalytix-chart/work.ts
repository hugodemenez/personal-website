import { createRandom } from "@/lib/seeded-random";
import type {
  ChartKind,
  ChartPalette,
  ChartShape,
  SeriesId,
} from "./series";

export const MAX_AGENTS = 8;
export const INITIAL_AGENTS = 1;
export const SPAWN_PER_CLICK = 1;

export const KINDS = ["bars", "line", "area"] as const satisfies readonly ChartKind[];
export const SHAPES = ["rounded", "sharp", "markers"] as const satisfies readonly ChartShape[];
export const PALETTES = ["pnl", "mint", "ink", "amber"] as const satisfies readonly ChartPalette[];

export type AgentKind = "lead" | "swarm";
export type WorkKind = "dart" | "select" | "click" | "shuffle";
export type BuildStage = "blank" | "kind" | "shape" | "color" | "done";
export type TuneLock = "series" | "kind" | "shape" | "palette";

export type PromptSpec = {
  id: string;
  label: string;
  series: SeriesId;
  kind: ChartKind;
  shape: ChartShape;
  palette: ChartPalette;
  lock: TuneLock;
};

export const PROMPTS: readonly PromptSpec[] = [
  {
    id: "weekday",
    label: "weekday P&L",
    series: "weekday",
    kind: "bars",
    shape: "rounded",
    palette: "pnl",
    lock: "series",
  },
  {
    id: "equity",
    label: "equity curve",
    series: "equity",
    kind: "area",
    shape: "rounded",
    palette: "mint",
    lock: "series",
  },
  {
    id: "winrate",
    label: "win rate",
    series: "winrate",
    kind: "bars",
    shape: "sharp",
    palette: "ink",
    lock: "series",
  },
  {
    id: "colors-mint",
    label: "colors: mint",
    series: "weekday",
    kind: "bars",
    shape: "rounded",
    palette: "mint",
    lock: "palette",
  },
  {
    id: "kind-area",
    label: "kind: area",
    series: "equity",
    kind: "area",
    shape: "sharp",
    palette: "pnl",
    lock: "kind",
  },
  {
    id: "kind-line",
    label: "kind: line",
    series: "equity",
    kind: "line",
    shape: "markers",
    palette: "amber",
    lock: "kind",
  },
  {
    id: "shapes-round",
    label: "shapes: rounded",
    series: "weekday",
    kind: "bars",
    shape: "rounded",
    palette: "amber",
    lock: "shape",
  },
  {
    id: "drawdown",
    label: "drawdown",
    series: "drawdown",
    kind: "area",
    shape: "sharp",
    palette: "ink",
    lock: "series",
  },
];

export type Station = {
  id: string;
  tileId: number;
  x: number;
  y: number;
};

export type AgentSeed = {
  id: number;
  kind: AgentKind;
  promptId: string;
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

export type TileState = {
  id: number;
  promptId: string;
  label: string;
  series: SeriesId;
  kind: ChartKind;
  shape: ChartShape;
  palette: ChartPalette;
  lock: TuneLock;
  stage: BuildStage;
  flash: boolean;
};

export type ChartWork = {
  agents: AgentSeed[];
  tiles: TileState[];
  nextId: number;
};

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

export function sampleStationsFor(tileId: number): Station[] {
  const col = (tileId - 1) % 2;
  const row = Math.floor((tileId - 1) / 2);
  const ox = 28 + col * 176;
  const oy = 64 + row * 118;
  return [
    { id: "prompt", tileId, x: ox + 36, y: oy + 10 },
    { id: "plot", tileId, x: ox + 84, y: oy + 48 },
  ];
}

export function pickPrompt(used: readonly string[], id: number): PromptSpec {
  const free = PROMPTS.filter((prompt) => !used.includes(prompt.id));
  const pool = free.length > 0 ? free : PROMPTS;
  return pool[(id - 1) % pool.length] ?? PROMPTS[0];
}

export function tileFromPrompt(
  id: number,
  prompt: PromptSpec,
  stage: BuildStage,
): TileState {
  const built = stage === "done";
  return {
    id,
    promptId: prompt.id,
    label: prompt.label,
    series: prompt.series,
    kind: built ? prompt.kind : "bars",
    shape: built ? prompt.shape : "sharp",
    palette: built ? prompt.palette : "ink",
    lock: prompt.lock,
    stage,
    flash: false,
  };
}

function cycle<T>(list: readonly T[], current: T, rand: () => number): T {
  const others = list.filter((item) => item !== current);
  if (others.length === 0) return current;
  return others[Math.floor(rand() * others.length)] ?? current;
}

export function applyTileWork(tile: TileState, rand: () => number): TileState {
  const prompt = PROMPTS.find((item) => item.id === tile.promptId) ?? PROMPTS[0];
  if (tile.stage === "blank") {
    return { ...tile, stage: "kind", kind: prompt.kind, series: prompt.series, flash: true };
  }
  if (tile.stage === "kind") {
    return { ...tile, stage: "shape", shape: prompt.shape, flash: true };
  }
  if (tile.stage === "shape") {
    return { ...tile, stage: "color", palette: prompt.palette, flash: true };
  }
  if (tile.stage === "color") {
    return { ...tile, stage: "done", flash: true };
  }

  if (tile.lock === "kind") {
    return rand() < 0.5
      ? { ...tile, shape: cycle(SHAPES, tile.shape, rand), flash: true }
      : { ...tile, palette: cycle(PALETTES, tile.palette, rand), flash: true };
  }
  if (tile.lock === "shape") {
    return rand() < 0.5
      ? { ...tile, kind: cycle(KINDS, tile.kind, rand), flash: true }
      : { ...tile, palette: cycle(PALETTES, tile.palette, rand), flash: true };
  }
  if (tile.lock === "palette") {
    return rand() < 0.5
      ? { ...tile, kind: cycle(KINDS, tile.kind, rand), flash: true }
      : { ...tile, shape: cycle(SHAPES, tile.shape, rand), flash: true };
  }
  return rand() < 0.5
    ? { ...tile, shape: cycle(SHAPES, tile.shape, rand), flash: true }
    : { ...tile, palette: cycle(PALETTES, tile.palette, rand), flash: true };
}

export function nextWork(work: WorkKind, rand: () => number): WorkKind {
  switch (work) {
    case "dart":
      return "select";
    case "select":
      return "click";
    case "click":
      return rand() < 0.3 ? "shuffle" : "dart";
    case "shuffle":
      return "select";
  }
}

function durationFor(work: WorkKind, rand: () => number): number {
  switch (work) {
    case "dart":
      return 0.28 + rand() * 0.16;
    case "select":
      return 0.34 + rand() * 0.2;
    case "click":
      return 0.3;
    case "shuffle":
      return 0.12 + rand() * 0.06;
  }
}

function pickOwnStation(current: number, count: number, rand: () => number): number {
  if (count <= 1) return 0;
  let next = current;
  for (let i = 0; i < 6 && next === current; i += 1) {
    next = Math.floor(rand() * count);
  }
  return next === current ? (current + 1) % count : next;
}

export function createAgent(
  id: number,
  kind: AgentKind,
  prompt: PromptSpec,
  stations: Station[] = sampleStationsFor(id),
): AgentSeed {
  const rand = createRandom(`chart-agent-${id}-${kind}`);
  const station = kind === "lead" ? Math.min(1, stations.length - 1) : 0;
  const start = stations[station] ?? sampleStationsFor(id)[0];
  return {
    id,
    kind,
    promptId: prompt.id,
    size: kind === "swarm" ? 0.78 : 1,
    x: start.x - 10,
    y: start.y - 8,
    fromX: start.x - 10,
    fromY: start.y - 8,
    toX: start.x,
    toY: start.y,
    work: "dart",
    elapsed: 0,
    duration: durationFor("dart", rand) + (id % 4) * 0.05,
    station,
    ripple: 0,
  };
}

export function createInitialWork(): ChartWork {
  const prompt = PROMPTS[0];
  const tile = tileFromPrompt(1, prompt, "done");
  const agent = createAgent(1, "lead", prompt);
  return { agents: [agent], tiles: [tile], nextId: 2 };
}

export function spawnWork(current: ChartWork): ChartWork {
  const room = Math.max(0, MAX_AGENTS - current.agents.length);
  const n = Math.min(SPAWN_PER_CLICK, room);
  const agents = [...current.agents];
  const tiles = [...current.tiles];
  let id = current.nextId;
  const used = tiles.map((tile) => tile.promptId);
  for (let i = 0; i < n; i += 1) {
    const prompt = pickPrompt(used, id);
    used.push(prompt.id);
    tiles.push(tileFromPrompt(id, prompt, "blank"));
    agents.push(createAgent(id, "swarm", prompt, sampleStationsFor(id)));
    id += 1;
  }
  return { agents, tiles, nextId: id };
}

export function relocateAgents(
  agents: AgentSeed[],
  stationsByTile: Map<number, Station[]>,
) {
  for (const agent of agents) {
    const stations = stationsByTile.get(agent.id) ?? [];
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
): { pose: AgentPose; edit: boolean } {
  const rand = createRandom(`chart-tick-${agent.id}-${agent.work}-${agent.station}`);
  if (still) {
    const parked = stations[agent.station];
    if (parked) {
      agent.x = parked.x;
      agent.y = parked.y;
    }
    agent.ripple = 0;
    return { pose: poseAgent(agent, true, stations), edit: false };
  }

  agent.elapsed += dt;
  if (agent.ripple > 0) {
    agent.ripple = Math.min(1, agent.ripple + dt / 0.42);
    if (agent.ripple >= 1) agent.ripple = 0;
  }

  let edit = false;
  if (agent.elapsed >= agent.duration) {
    const finished = agent.work;
    const station = stations[agent.station];
    if (station && finished === "click" && station.id === "plot") edit = true;
    const pose = poseAgent(agent, false, stations);
    agent.x = pose.x;
    agent.y = pose.y;
    const next = nextWork(finished, rand);
    agent.work = next;
    agent.elapsed = 0;
    agent.duration = durationFor(next, rand);
    if (next === "dart" || next === "shuffle") {
      agent.station = pickOwnStation(agent.station, stations.length, rand);
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

  return { pose: poseAgent(agent, false, stations), edit };
}
