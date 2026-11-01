import { createRandom } from "@/lib/seeded-random";
import {
  cloneDays,
  seriesFor,
  type ChartKind,
  type ChartPalette,
  type ChartShape,
  type ChartStroke,
  type DayPoint,
  type SeriesId,
} from "./series";

export const CELL_COUNT = 4;
export const MAX_AGENTS = 4;

export type WorkKind = "spawn" | "dart" | "select" | "click" | "idle";

export type Action =
  | { type: "kind"; kind: ChartKind }
  | { type: "palette"; palette: ChartPalette }
  | { type: "shape"; shape: ChartShape }
  | { type: "stroke"; stroke: ChartStroke };

export type Job = {
  text: string;
  series: SeriesId;
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
  stroke: ChartStroke;
  days: DayPoint[];
  job: string | null;
  flash: boolean;
};

export type AgentSeed = {
  id: number;
  cellId: number;
  prompt: string;
  action: Action;
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
    text: "Switch this chart to a pie.",
    series: "weekday",
    action: { type: "kind", kind: "pie" },
  },
  {
    text: "Turn the equity series into a doughnut.",
    series: "equity",
    action: { type: "kind", kind: "doughnut" },
  },
  {
    text: "Redraw the win rate as a line chart.",
    series: "winrate",
    action: { type: "kind", kind: "line" },
  },
  {
    text: "Fill the drawdown series as an area chart.",
    series: "drawdown",
    action: { type: "kind", kind: "area" },
  },
  {
    text: "Try a mint palette on this cell.",
    series: "weekday",
    action: { type: "palette", palette: "mint" },
  },
  {
    text: "Use a soft stroke on this series.",
    series: "equity",
    action: { type: "stroke", stroke: "soft" },
  },
  {
    text: "Round the corners on this chart.",
    series: "winrate",
    action: { type: "shape", shape: "rounded" },
  },
  {
    text: "Warm this cell with an amber palette.",
    series: "drawdown",
    action: { type: "palette", palette: "amber" },
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
  stroke: ChartStroke = "thin",
): CellState {
  return {
    id,
    label,
    series,
    kind,
    shape,
    palette,
    stroke,
    days: cloneDays(seriesFor(series)),
    job: null,
    flash: false,
  };
}

export const INITIAL_CELLS: CellState[] = [
  cellFromSeries(1, "weekday", "weekday", "bars", "rounded", "pnl"),
  cellFromSeries(2, "equity", "equity", "area", "rounded", "mint"),
  cellFromSeries(3, "win rate", "winrate", "bars", "sharp", "ink"),
  cellFromSeries(4, "drawdown", "drawdown", "line", "sharp", "ink"),
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
  return JOBS.find((job) => job.text.toLowerCase() === needle) ?? JOBS[0]!;
}

export function applyAction(cell: CellState, action: Action): CellState {
  const days = cell.days.map((day) => ({ ...day }));
  switch (action.type) {
    case "kind":
      return { ...cell, days, kind: action.kind, flash: true };
    case "palette":
      return { ...cell, days, palette: action.palette, flash: true };
    case "shape":
      return { ...cell, days, shape: action.shape, flash: true };
    case "stroke":
      return { ...cell, days, stroke: action.stroke, flash: true };
  }
}

export function valuesUnchanged(before: CellState, after: CellState): boolean {
  return before.days.every(
    (day, index) => day.pnl === after.days[index]?.pnl && day.label === after.days[index]?.label,
  );
}

export function nextFreeCell(busy: readonly number[], cursor: number): number {
  for (let offset = 0; offset < CELL_COUNT; offset += 1) {
    const id = ((cursor - 1 + offset) % CELL_COUNT) + 1;
    if (!busy.includes(id)) return id;
  }
  return ((cursor - 1) % CELL_COUNT) + 1;
}

export function cellForSeries(
  cells: readonly CellState[],
  series: SeriesId,
): CellState {
  return cells.find((cell) => cell.series === series) ?? cells[0]!;
}

export function sampleStations(cellId: number): Station[] {
  const col = (cellId - 1) % 2;
  const row = Math.floor((cellId - 1) / 2);
  return [
    { id: "composer", cellId: 0, x: 120, y: 118 },
    { id: "plot", cellId, x: 80 + col * 200, y: 36 + row * 88 },
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
      target: "plot",
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
  const cellId = busy.includes(match.id) ? nextFreeCell(busy, match.id) : match.id;
  const existing = current.agents.find((agent) => agent.cellId === cellId);
  const rand = createRandom(`prompt-${current.nextId}-${prompt}`);
  const agent: AgentSeed = {
    id: current.nextId,
    cellId,
    prompt: job.text,
    action: job.action,
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
    const dest = stationById(own, agent.target) ?? plot;
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
    stationById(stations, "plot") ??
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
      stationById(stations, "plot") ??
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
    if (finished === "spawn") agent.target = "plot";
    const station =
      stationById(stations, agent.target) ?? stationById(stations, "plot");
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
