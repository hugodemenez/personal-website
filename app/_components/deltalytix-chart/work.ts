import { createRandom } from "@/lib/seeded-random";
import {
  cloneDays,
  nudgeDay,
  raiseDays,
  seriesFor,
  smoothDays,
  type ChartKind,
  type ChartPalette,
  type ChartShape,
  type DayPoint,
  type SeriesId,
} from "./series";

export const CELL_COUNT = 4;
export const MAX_AGENTS = 4;

export type WorkKind = "spawn" | "dart" | "select" | "click" | "idle";

export type Action =
  | { type: "highlight"; day: string }
  | { type: "nudge"; day: string; delta: number }
  | { type: "smooth" }
  | { type: "extend"; day: string; delta: number }
  | { type: "raise"; amount: number }
  | { type: "fill" }
  | { type: "trough"; day: string; delta: number };

export type Job = {
  text: string;
  series: SeriesId;
  day: string;
  action: Action;
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
  days: DayPoint[];
  focus: string | null;
  job: string | null;
  flash: boolean;
};

export type AgentSeed = {
  id: number;
  cellId: number;
  prompt: string;
  action: Action;
  day: string;
  target: string;
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

export const JOBS: readonly Job[] = [
  {
    text: "highlight Friday",
    series: "weekday",
    day: "Fri",
    action: { type: "highlight", day: "Fri" },
  },
  {
    text: "smooth equity",
    series: "equity",
    day: "Wed",
    action: { type: "smooth" },
  },
  {
    text: "raise win rate",
    series: "winrate",
    day: "Tue",
    action: { type: "raise", amount: 16 },
  },
  {
    text: "deepen the trough",
    series: "drawdown",
    day: "Wed",
    action: { type: "trough", day: "Wed", delta: -14 },
  },
  {
    text: "lift Tuesday",
    series: "weekday",
    day: "Tue",
    action: { type: "nudge", day: "Tue", delta: 860 },
  },
  {
    text: "extend Friday",
    series: "equity",
    day: "Fri",
    action: { type: "extend", day: "Fri", delta: 420 },
  },
  {
    text: "fill the wins",
    series: "winrate",
    day: "Wed",
    action: { type: "fill" },
  },
  {
    text: "shallow Thursday",
    series: "drawdown",
    day: "Thu",
    action: { type: "trough", day: "Thu", delta: 8 },
  },
];

export const SCRIPT = JOBS.map((job) => job.text);

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

function cellFromSeries(
  id: number,
  label: string,
  series: SeriesId,
  kind: ChartKind,
  shape: ChartShape,
  palette: ChartPalette,
): CellState {
  return {
    id,
    label,
    series,
    kind,
    shape,
    palette,
    days: cloneDays(seriesFor(series)),
    focus: null,
    job: null,
    flash: false,
  };
}

export const INITIAL_CELLS: CellState[] = [
  cellFromSeries(1, "weekday", "weekday", "bars", "rounded", "pnl"),
  cellFromSeries(2, "equity", "equity", "area", "rounded", "mint"),
  cellFromSeries(3, "win rate", "winrate", "bars", "sharp", "ink"),
  cellFromSeries(4, "drawdown", "drawdown", "area", "sharp", "ink"),
];

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function dartEase(t: number): number {
  const u = clamp01(t);
  if (u < 0.78) return 1.08 * (1 - (1 - u / 0.78) ** 3);
  return 1.08 - 0.08 * (1 - (1 - (u - 0.78) / 0.22) ** 2);
}

export function jobFor(text: string): Job {
  const needle = text.trim().toLowerCase();
  return JOBS.find((job) => job.text === needle) ?? JOBS[0]!;
}

export function applyAction(cell: CellState, action: Action): CellState {
  switch (action.type) {
    case "highlight": {
      const again = cell.focus === action.day;
      return {
        ...cell,
        focus: action.day,
        days: again ? nudgeDay(cell.days, action.day, -140) : cloneDays(cell.days),
        flash: true,
      };
    }
    case "nudge":
      return {
        ...cell,
        focus: action.day,
        days: nudgeDay(cell.days, action.day, action.delta),
        flash: true,
      };
    case "smooth":
      return {
        ...cell,
        kind: cell.kind === "bars" ? "line" : cell.kind,
        shape: "rounded",
        days: smoothDays(cell.days),
        flash: true,
      };
    case "extend":
      return {
        ...cell,
        focus: action.day,
        days: nudgeDay(cell.days, action.day, action.delta),
        flash: true,
      };
    case "raise":
      return {
        ...cell,
        days: raiseDays(cell.days, action.amount, 100),
        flash: true,
      };
    case "fill":
      return {
        ...cell,
        kind: "area",
        shape: "rounded",
        days: raiseDays(cell.days, 6, 100),
        flash: true,
      };
    case "trough":
      return {
        ...cell,
        focus: action.day,
        days: nudgeDay(cell.days, action.day, action.delta),
        flash: true,
      };
  }
}

export function nextFreeCell(busy: readonly number[], cursor: number): number {
  for (let offset = 0; offset < CELL_COUNT; offset += 1) {
    const id = ((cursor - 1 + offset) % CELL_COUNT) + 1;
    if (!busy.includes(id)) return id;
  }
  return ((cursor - 1) % CELL_COUNT) + 1;
}

export function cellForSeries(cells: readonly CellState[], series: SeriesId): CellState {
  return cells.find((cell) => cell.series === series) ?? cells[0]!;
}

export function sampleStations(cellId: number, day = "Fri"): Station[] {
  const col = (cellId - 1) % 2;
  const row = Math.floor((cellId - 1) / 2);
  const plot = { id: "plot", cellId, x: 80 + col * 200, y: 28 + row * 64 };
  return [
    { id: "composer", cellId: 0, x: 120, y: 118 },
    plot,
    { ...plot, id: day },
    { ...plot, id: "Tue", x: plot.x - 24 },
    { ...plot, id: "Wed", x: plot.x },
    { ...plot, id: "Thu", x: plot.x + 16 },
    { ...plot, id: "Fri", x: plot.x + 32 },
  ];
}

export function stationById(
  stations: readonly Station[],
  id: string,
): Station | undefined {
  return stations.find((station) => station.id === id);
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
    cells: INITIAL_CELLS.map((cell) => ({
      ...cell,
      days: cloneDays(cell.days),
    })),
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
      return applyAction({ ...cell, job: agent.prompt }, agent.action);
    }),
    agents: sent.agents.map((item) => ({
      ...item,
      work: "idle" as const,
      target: item.day,
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
  const job = jobFor(prompt);
  const match = cellForSeries(current.cells, job.series);
  const busy = current.agents
    .filter((agent) => agent.work !== "idle")
    .map((agent) => agent.cellId);
  const cellId = busy.includes(match.id)
    ? nextFreeCell(busy, match.id)
    : match.id;
  const existing = current.agents.find((agent) => agent.cellId === cellId);
  const rand = createRandom(`prompt-${current.nextId}-${prompt}`);
  const agent: AgentSeed = {
    id: current.nextId,
    cellId,
    prompt: job.text,
    action: job.action,
    day: job.day,
    target: "composer",
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
    ripple: 0,
    tweaksLeft: 1,
  };
  const agents = existing
    ? current.agents.map((item) => (item.cellId === cellId ? agent : item))
    : [...current.agents, agent].slice(-MAX_AGENTS);
  const cells = current.cells.map((cell) =>
    cell.id === cellId ? { ...cell, job: job.text, flash: false } : cell,
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
    const plot = stationById(own, "plot") ?? own[0];
    const dest =
      stationById(own, agent.target) ?? stationById(own, agent.day) ?? plot;
    if ((agent.work === "spawn" || agent.work === "dart") && composer) {
      agent.fromX = composer.x;
      agent.fromY = composer.y;
      if (agent.work === "spawn") {
        agent.x = composer.x;
        agent.y = composer.y;
        agent.toX = composer.x;
        agent.toY = composer.y;
      } else if (dest) {
        agent.toX = dest.x;
        agent.toY = dest.y;
      }
      continue;
    }
    const next = dest ?? composer;
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
  const parked =
    stationById(stations, agent.target) ??
    stationById(stations, agent.day) ??
    stations[stations.length - 1];
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
    const parked =
      stationById(stations, agent.target) ??
      stationById(stations, agent.day) ??
      stations[stations.length - 1];
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
    if (finished === "spawn") agent.target = agent.day;
    const station =
      stationById(stations, agent.target) ??
      stationById(stations, agent.day) ??
      stationById(stations, "plot");
    if (station && station.id !== "composer" && finished === "click" && agent.tweaksLeft > 0) {
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
