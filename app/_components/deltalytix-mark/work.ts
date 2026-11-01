import { createRandom } from "@/lib/seeded-random";

export const MAX_AGENTS = 8;
export const INITIAL_AGENTS = 1;
export const SPAWN_PER_CLICK = 2;
export const OVERLAY_PAD = 24;
export const LETTERS = 10;
export const STATION_GAP = 8;

export type AgentKind = "lead" | "swarm";
export type WorkKind = "dart" | "select" | "type" | "click" | "shuffle";
export type Side = "above" | "below" | "start" | "end";

export type Station = {
  x: number;
  y: number;
  side: Side;
  letter: number;
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
  pecks: number;
  station: number;
  ripple: number;
  wordW: number;
  wordH: number;
};

export type AgentPose = {
  x: number;
  y: number;
  tilt: number;
  scale: number;
  caret: number;
  ripple: number;
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

export function workStations(wordW: number, wordH: number): Station[] {
  const xs = [0.14, 0.38, 0.62, 0.86].map((t) => t * wordW);
  const stations: Station[] = xs.flatMap((x, i) => [
    { x, y: -STATION_GAP, side: "above" as const, letter: i },
    { x, y: wordH + STATION_GAP, side: "below" as const, letter: i },
  ]);
  stations.push({ x: -STATION_GAP, y: wordH * 0.3, side: "start", letter: 0 });
  stations.push({
    x: wordW + STATION_GAP,
    y: wordH * 0.7,
    side: "end",
    letter: LETTERS - 1,
  });
  return stations;
}

export function stationsOutsideWord(
  stations: Station[],
  wordW: number,
  wordH: number,
): boolean {
  return stations.every((station) => {
    const insideX = station.x >= 0 && station.x <= wordW;
    const insideY = station.y >= 0 && station.y <= wordH;
    return !(insideX && insideY);
  });
}

function towardWord(x: number, y: number, wordW: number, wordH: number) {
  const dx = wordW / 2 - x;
  const dy = wordH / 2 - y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function pickStation(
  current: number,
  count: number,
  rand: () => number,
): number {
  if (count <= 1) return 0;
  let next = current;
  for (let i = 0; i < 6 && next === current; i += 1) {
    next = Math.floor(rand() * count);
  }
  return next === current ? (current + 3) % count : next;
}

function durationFor(work: WorkKind, rand: () => number): number {
  switch (work) {
    case "dart":
      return 0.22 + rand() * 0.12;
    case "select":
      return 0.4 + rand() * 0.28;
    case "type":
      return 0.5 + rand() * 0.38;
    case "click":
      return 0.34;
    case "shuffle":
      return 0.12 + rand() * 0.06;
  }
}

function assignTarget(agent: AgentSeed, station: Station) {
  agent.fromX = agent.x;
  agent.fromY = agent.y;
  agent.toX = station.x;
  agent.toY = station.y;
}

export function createAgent(
  id: number,
  kind: AgentKind,
  wordW = 80,
  wordH = 16,
): AgentSeed {
  const stations = workStations(wordW, wordH);
  const rand = createRandom(`agent-${id}-${kind}`);
  const station = kind === "lead" ? 0 : pickStation(-1, stations.length, rand);
  const start = stations[station];
  const inward = towardWord(start.x, start.y, wordW, wordH);
  const agent: AgentSeed = {
    id,
    kind,
    size: kind === "swarm" ? 0.72 : 1,
    x: start.x - inward.x * 10,
    y: start.y - inward.y * 8,
    fromX: start.x - inward.x * 10,
    fromY: start.y - inward.y * 8,
    toX: start.x,
    toY: start.y,
    work: "dart",
    elapsed: 0,
    duration: durationFor("dart", rand),
    pecks: 5 + Math.floor(rand() * 3),
    station,
    ripple: 0,
    wordW,
    wordH,
  };
  return agent;
}

export function createInitialAgents(wordW = 80, wordH = 16): AgentSeed[] {
  return Array.from({ length: INITIAL_AGENTS }, (_, index) =>
    createAgent(index + 1, index === 0 ? "lead" : "swarm", wordW, wordH),
  );
}

export function spawnAgents(
  current: AgentSeed[],
  nextId: number,
  wordW: number,
  wordH: number,
): { agents: AgentSeed[]; nextId: number } {
  const room = Math.max(0, MAX_AGENTS - current.length);
  const n = Math.min(SPAWN_PER_CLICK, room);
  const added: AgentSeed[] = [];
  let id = nextId;
  for (let i = 0; i < n; i += 1) {
    added.push(createAgent(id, "swarm", wordW, wordH));
    id += 1;
  }
  return { agents: [...current, ...added], nextId: id };
}

export function nextWork(work: WorkKind, rand: () => number): WorkKind {
  switch (work) {
    case "dart":
      return "select";
    case "select":
      return rand() < 0.32 ? "click" : "type";
    case "type":
      return rand() < 0.42 ? "click" : rand() < 0.35 ? "shuffle" : "dart";
    case "click":
      return rand() < 0.28 ? "shuffle" : "dart";
    case "shuffle":
      return "select";
  }
}

function beginWork(agent: AgentSeed, work: WorkKind, rand: () => number) {
  const stations = workStations(agent.wordW, agent.wordH);
  agent.work = work;
  agent.elapsed = 0;
  agent.duration = durationFor(work, rand);
  if (work === "dart" || work === "shuffle") {
    agent.station = pickStation(agent.station, stations.length, rand);
    assignTarget(agent, stations[agent.station]);
  } else {
    const stay = stations[agent.station];
    agent.fromX = agent.x;
    agent.fromY = agent.y;
    agent.toX = stay.x;
    agent.toY = stay.y;
  }
  if (work === "type") {
    agent.pecks = 4 + Math.floor(rand() * 4);
  }
  if (work === "click") {
    agent.ripple = 0.001;
  }
}

export function resizeAgent(agent: AgentSeed, wordW: number, wordH: number) {
  const prev = workStations(agent.wordW, agent.wordH);
  const next = workStations(wordW, wordH);
  const from = prev[agent.station] ?? prev[0];
  const to = next[agent.station] ?? next[0];
  if (from && to) {
    agent.x += to.x - from.x;
    agent.y += to.y - from.y;
    agent.fromX += to.x - from.x;
    agent.fromY += to.y - from.y;
    agent.toX += to.x - from.x;
    agent.toY += to.y - from.y;
  }
  agent.wordW = wordW;
  agent.wordH = wordH;
}

export function poseAgent(agent: AgentSeed, still: boolean): AgentPose {
  const stations = workStations(agent.wordW, agent.wordH);
  const parked = stations[agent.station] ?? stations[0];
  if (still) {
    return {
      x: parked.x,
      y: parked.y,
      tilt: 0,
      scale: agent.size,
      caret: 0,
      ripple: 0,
    };
  }

  const t = agent.duration <= 0 ? 1 : clamp01(agent.elapsed / agent.duration);
  let x = agent.x;
  let y = agent.y;
  let tilt = 0;
  let scale = agent.size;
  let caret = 0;
  const inward = towardWord(agent.toX, agent.toY, agent.wordW, agent.wordH);

  if (agent.work === "dart" || agent.work === "shuffle") {
    const e = agent.work === "dart" ? dartEase(t) : t;
    x = agent.fromX + (agent.toX - agent.fromX) * e;
    y = agent.fromY + (agent.toY - agent.fromY) * e;
    tilt = Math.atan2(agent.toY - agent.fromY, agent.toX - agent.fromX) * 0.16;
    scale = agent.size * (1 + 0.04 * Math.sin(t * Math.PI));
  } else if (agent.work === "select") {
    x = agent.toX;
    y = agent.toY;
    scale = agent.size * (1 + 0.05 * Math.sin(t * Math.PI));
    caret = 0.35 + 0.25 * Math.sin(t * Math.PI);
  } else if (agent.work === "type") {
    const peck = Math.sin(t * agent.pecks * Math.PI) ** 2;
    x = agent.toX + inward.x * peck * 2.4;
    y = agent.toY + inward.y * peck * 2.4;
    scale = agent.size * (1 - 0.06 * peck);
    caret = 0.2 + 0.55 * peck;
  } else if (agent.work === "click") {
    const press = t < 0.28 ? t / 0.28 : 1 - (t - 0.28) / 0.72;
    x = agent.toX + inward.x * press * 1.4;
    y = agent.toY + inward.y * press * 1.4;
    scale = agent.size * (1 - 0.12 * Math.max(0, press));
    caret = 0.15;
  }

  return {
    x,
    y,
    tilt,
    scale,
    caret,
    ripple: agent.ripple,
  };
}

export function stepAgent(agent: AgentSeed, dt: number, still: boolean) {
  const rand = createRandom(`tick-${agent.id}-${agent.work}-${agent.station}`);
  if (still) {
    const parked = workStations(agent.wordW, agent.wordH)[agent.station];
    if (parked) {
      agent.x = parked.x;
      agent.y = parked.y;
    }
    agent.ripple = 0;
    return poseAgent(agent, true);
  }

  agent.elapsed += dt;
  if (agent.ripple > 0) {
    agent.ripple = Math.min(1, agent.ripple + dt / 0.42);
    if (agent.ripple >= 1) agent.ripple = 0;
  }

  if (agent.elapsed >= agent.duration) {
    const pose = poseAgent(agent, false);
    agent.x = pose.x;
    agent.y = pose.y;
    beginWork(agent, nextWork(agent.work, rand), rand);
  } else {
    const pose = poseAgent(agent, false);
    agent.x = pose.x;
    agent.y = pose.y;
  }

  return poseAgent(agent, false);
}
