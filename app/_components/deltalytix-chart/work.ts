import { createRandom } from "@/lib/seeded-random";
import type {
  ChartKind,
  ChartPalette,
  ChartShape,
  SeriesId,
} from "./series";

export const CELL_COUNT = 4;
export const MAX_AGENTS = 4;

export const KINDS = ["bars", "line", "area"] as const satisfies readonly ChartKind[];
export const SHAPES = ["rounded", "sharp", "markers"] as const satisfies readonly ChartShape[];
export const PALETTES = ["pnl", "mint", "ink", "amber"] as const satisfies readonly ChartPalette[];

export type WorkKind = "spawn" | "dart" | "select" | "click" | "idle";

export type Tweak = {
  kind?: ChartKind;
  shape?: ChartShape;
  palette?: ChartPalette;
};

export type Station = {
  id: string;
  cellId: number;
  x: number;
  y: number;
};

export type CellState = {
  id: number;
  label: string;
  series: SeriesId;
  kind: ChartKind;
  shape: ChartShape;
  palette: ChartPalette;
  job: string | null;
  flash: boolean;
};

export type AgentSeed = {
  id: number;
  cellId: number;
  prompt: string;
  tweak: Tweak;
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
  tweaksLeft: number;
};

export type AgentPose = {
  x: number;
  y: number;
  tilt: number;
  scale: number;
  ripple: number;
};

export type PlayPhase = "gap" | "send" | "work";

export const SCRIPT = [
  "colors: mint",
  "kind: line",
  "shapes: rounded",
  "kind: area",
] as const;

export const SEND_HOLD = 0.72;
export const GAP_HOLD = 0.55;
export const WORK_HOLD = 2.5;

export type ChartWork = {
  cells: CellState[];
  agents: AgentSeed[];
  nextId: number;
  cursor: number;
  beat: number;
  phase: PlayPhase;
  phaseElapsed: number;
  outgoing: string | null;
};

export const INITIAL_CELLS: CellState[] = [
  {
    id: 1,
    label: "weekday",
    series: "weekday",
    kind: "bars",
    shape: "rounded",
    palette: "pnl",
    job: null,
    flash: false,
  },
  {
    id: 2,
    label: "equity",
    series: "equity",
    kind: "area",
    shape: "rounded",
    palette: "mint",
    job: null,
    flash: false,
  },
  {
    id: 3,
    label: "win rate",
    series: "winrate",
    kind: "bars",
    shape: "sharp",
    palette: "ink",
    job: null,
    flash: false,
  },
  {
    id: 4,
    label: "drawdown",
    series: "drawdown",
    kind: "area",
    shape: "sharp",
    palette: "ink",
    job: null,
    flash: false,
  },
];

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function dartEase(t: number): number {
  const u = clamp01(t);
  if (u < 0.78) return 1.08 * (1 - (1 - u / 0.78) ** 3);
  return 1.08 - 0.08 * (1 - (1 - (u - 0.78) / 0.22) ** 2);
}

export function parsePrompt(text: string): Tweak {
  const value = text.trim().toLowerCase();
  const tweak: Tweak = {};
  if (/\barea\b/.test(value)) tweak.kind = "area";
  else if (/\bline\b|\bequity\b/.test(value)) tweak.kind = "line";
  else if (/\bbar\b|\bweekday\b|\bwin\b/.test(value)) tweak.kind = "bars";
  if (/\bmint\b|\bsage\b/.test(value)) tweak.palette = "mint";
  else if (/\bamber\b|\bgold\b|\bwarm\b/.test(value)) tweak.palette = "amber";
  else if (/\bink\b|\bmono\b|\bblack\b/.test(value)) tweak.palette = "ink";
  else if (/\bpnl\b|\bgreen\b|\bred\b/.test(value)) tweak.palette = "pnl";
  if (/\bround/.test(value)) tweak.shape = "rounded";
  else if (/\bsharp\b|\bsquare\b/.test(value)) tweak.shape = "sharp";
  else if (/\bmark\b|\bdot\b/.test(value)) tweak.shape = "markers";
  return tweak;
}

function cycle<T>(list: readonly T[], current: T, rand: () => number): T {
  const others = list.filter((item) => item !== current);
  return others[Math.floor(rand() * others.length)] ?? current;
}

export function applyTweak(
  cell: CellState,
  tweak: Tweak,
  rand: () => number,
): CellState {
  if (tweak.palette && cell.palette !== tweak.palette) {
    return { ...cell, palette: tweak.palette, flash: true };
  }
  if (tweak.kind && cell.kind !== tweak.kind) {
    return { ...cell, kind: tweak.kind, flash: true };
  }
  if (tweak.shape && cell.shape !== tweak.shape) {
    return { ...cell, shape: tweak.shape, flash: true };
  }
  const dim = Math.floor(rand() * 3);
  if (dim === 0) return { ...cell, kind: cycle(KINDS, cell.kind, rand), flash: true };
  if (dim === 1) return { ...cell, shape: cycle(SHAPES, cell.shape, rand), flash: true };
  return { ...cell, palette: cycle(PALETTES, cell.palette, rand), flash: true };
}

export function nextFreeCell(busy: readonly number[], cursor: number): number {
  for (let offset = 0; offset < CELL_COUNT; offset += 1) {
    const id = ((cursor - 1 + offset) % CELL_COUNT) + 1;
    if (!busy.includes(id)) return id;
  }
  return ((cursor - 1) % CELL_COUNT) + 1;
}

export function sampleStations(cellId: number): Station[] {
  const col = (cellId - 1) % 2;
  const row = Math.floor((cellId - 1) / 2);
  return [
    { id: "composer", cellId: 0, x: 120, y: 118 },
    { id: "plot", cellId, x: 36 + col * 110, y: 22 + row * 44 },
  ];
}

function durationFor(work: WorkKind, rand: () => number): number {
  switch (work) {
    case "spawn":
      return 0.22;
    case "dart":
      return 0.36 + rand() * 0.1;
    case "select":
      return 0.28 + rand() * 0.16;
    case "click":
      return 0.28;
    case "idle":
      return 1;
  }
}

export function createInitialWork(): ChartWork {
  return {
    cells: INITIAL_CELLS.map((cell) => ({ ...cell })),
    agents: [],
    nextId: 1,
    cursor: 1,
    beat: 0,
    phase: "gap",
    phaseElapsed: 0,
    outgoing: null,
  };
}

export function createReducedWork(): ChartWork {
  const sent = submitPrompt(createInitialWork(), SCRIPT[0]);
  const agent = sent.agents[0];
  return {
    ...sent,
    phase: "work",
    phaseElapsed: 0,
    outgoing: SCRIPT[0],
    cells: sent.cells.map((cell) => {
      if (!agent || cell.id !== agent.cellId) return cell;
      return applyTweak({ ...cell, job: agent.prompt }, agent.tweak, () => 0.2);
    }),
    agents: sent.agents.map((item) => ({
      ...item,
      work: "idle" as const,
      station: 1,
    })),
  };
}

export function tickPlay(
  current: ChartWork,
  dt: number,
  composer: Station,
): ChartWork {
  current.phaseElapsed += dt;
  if (current.phase === "gap") {
    if (current.phaseElapsed < GAP_HOLD) return current;
    const text = SCRIPT[current.beat % SCRIPT.length] ?? SCRIPT[0];
    return {
      ...current,
      phase: "send",
      phaseElapsed: 0,
      outgoing: text,
    };
  }
  if (current.phase === "send") {
    if (current.phaseElapsed < SEND_HOLD) return current;
    const text = current.outgoing ?? SCRIPT[current.beat % SCRIPT.length] ?? SCRIPT[0];
    const spawned = submitPrompt(current, text, composer);
    return {
      ...spawned,
      phase: "work",
      phaseElapsed: 0,
      outgoing: text,
      beat: current.beat,
    };
  }
  const busy = current.agents.some((agent) => agent.work !== "idle");
  if (busy && current.phaseElapsed < WORK_HOLD) return current;
  if (!busy && current.phaseElapsed < 0.28) return current;
  return {
    ...current,
    phase: "gap",
    phaseElapsed: 0,
    beat: current.beat + 1,
    outgoing: null,
  };
}

export function submitPrompt(
  current: ChartWork,
  text: string,
  composer: Station = { id: "composer", cellId: 0, x: 120, y: 118 },
): ChartWork {
  const prompt = text.trim();
  if (!prompt) return current;
  const tweak = parsePrompt(prompt);
  const busy = current.agents
    .filter((agent) => agent.work !== "idle")
    .map((agent) => agent.cellId);
  const cellId = nextFreeCell(busy, current.cursor);
  const stations = sampleStations(cellId);
  const plot = stations[1] ?? stations[0];
  const existing = current.agents.find((agent) => agent.cellId === cellId);
  const rand = createRandom(`prompt-${current.nextId}-${prompt}`);
  const agent: AgentSeed = {
    id: current.nextId,
    cellId,
    prompt,
    tweak,
    size: 0.72,
    x: composer.x,
    y: composer.y,
    fromX: composer.x,
    fromY: composer.y,
    toX: composer.x,
    toY: composer.y,
    work: "spawn",
    elapsed: 0,
    duration: durationFor("spawn", rand),
    station: 0,
    ripple: 0,
    tweaksLeft: 2,
  };
  const agents = existing
    ? current.agents.map((item) => (item.cellId === cellId ? agent : item))
    : [...current.agents, agent].slice(-MAX_AGENTS);
  const cells = current.cells.map((cell) =>
    cell.id === cellId ? { ...cell, job: prompt, flash: false } : cell,
  );
  return {
    ...current,
    cells,
    agents,
    nextId: current.nextId + 1,
    cursor: (cellId % CELL_COUNT) + 1,
  };
}

export function relocateAgents(
  agents: AgentSeed[],
  stationsByCell: Map<number, Station[]>,
  composer?: Station,
) {
  for (const agent of agents) {
    const own = stationsByCell.get(agent.cellId) ?? [];
    const plot = own.find((station) => station.id === "plot") ?? own[0];
    if ((agent.work === "spawn" || agent.work === "dart") && composer) {
      agent.fromX = composer.x;
      agent.fromY = composer.y;
      if (agent.work === "spawn") {
        agent.x = composer.x;
        agent.y = composer.y;
        agent.toX = composer.x;
        agent.toY = composer.y;
      } else if (plot) {
        agent.toX = plot.x;
        agent.toY = plot.y;
      }
      continue;
    }
    const stations = composer ? [composer, ...own] : own;
    const next = stations[agent.station] ?? plot ?? composer;
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
  const parked = stations[agent.station] ?? stations[stations.length - 1];
  if (still || !parked || agent.work === "idle") {
    return {
      x: parked?.x ?? agent.x,
      y: parked?.y ?? agent.y,
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

  if (agent.work === "spawn") {
    x = agent.fromX;
    y = agent.fromY;
    scale = agent.size * (0.35 + 0.75 * dartEase(t));
  } else if (agent.work === "dart") {
    const e = dartEase(t);
    x = agent.fromX + (agent.toX - agent.fromX) * e;
    y = agent.fromY + (agent.toY - agent.fromY) * e;
    tilt = Math.atan2(agent.toY - agent.fromY, agent.toX - agent.fromX) * 0.12;
    scale = agent.size * (1 + 0.05 * Math.sin(t * Math.PI));
  } else if (agent.work === "select") {
    x = agent.toX;
    y = agent.toY;
    scale = agent.size * (1 + 0.05 * Math.sin(t * Math.PI));
  } else if (agent.work === "click") {
    const press = t < 0.28 ? t / 0.28 : 1 - (t - 0.28) / 0.72;
    x = agent.toX;
    y = agent.toY + Math.max(0, press) * 1.4;
    scale = agent.size * (1 - 0.12 * Math.max(0, press));
  }

  return { x, y, tilt, scale, ripple: agent.ripple };
}

export function stepAgent(
  agent: AgentSeed,
  dt: number,
  still: boolean,
  stations: Station[],
): { pose: AgentPose; edit: boolean } {
  const rand = createRandom(`chart-tick-${agent.id}-${agent.work}-${agent.tweaksLeft}`);
  if (still) {
    const parked = stations[agent.station] ?? stations[stations.length - 1];
    if (parked) {
      agent.x = parked.x;
      agent.y = parked.y;
    }
    agent.work = "idle";
    agent.ripple = 0;
    return { pose: poseAgent(agent, true, stations), edit: false };
  }

  if (agent.work === "idle") {
    return { pose: poseAgent(agent, false, stations), edit: false };
  }

  agent.elapsed += dt;
  if (agent.ripple > 0) {
    agent.ripple = Math.min(1, agent.ripple + dt / 0.42);
    if (agent.ripple >= 1) agent.ripple = 0;
  }

  let edit = false;
  if (agent.elapsed >= agent.duration) {
    const finished = agent.work;
    if (finished === "spawn") agent.station = 1;
    const station = stations[agent.station];
    if (station?.id === "plot" && finished === "click" && agent.tweaksLeft > 0) {
      edit = true;
      agent.tweaksLeft -= 1;
    }
    const pose = poseAgent(agent, false, stations);
    agent.x = pose.x;
    agent.y = pose.y;
    const next: WorkKind =
      finished === "spawn"
        ? "dart"
        : finished === "dart"
          ? "select"
          : finished === "select"
            ? "click"
            : agent.tweaksLeft > 0
              ? "select"
              : "idle";
    agent.work = next;
    agent.elapsed = 0;
    agent.duration = durationFor(next, rand);
    if (station) {
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
