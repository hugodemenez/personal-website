import { createRandom } from "@/lib/seeded-random";

export const MAX_AGENTS = 8;
export const INITIAL_AGENTS = 1;
export const SPAWN_PER_CLICK = 2;

export type AgentKind = "lead" | "swarm";
export type WorkKind = "dart" | "select" | "type" | "click" | "shuffle";

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
  pecks: number;
  station: number;
  ripple: number;
};

export type AgentPose = {
  x: number;
  y: number;
  tilt: number;
  scale: number;
  caret: number;
  ripple: number;
};

export type HeroEdit = {
  headline: string;
  sub: string;
  revenge: string;
  size: string;
  question: string;
  highlight: "start" | "features" | null;
  flash: string | null;
};

export const HEADLINES = [
  "One trading journal for every futures account.",
  "One trading journal for every funded account.",
  "One journal for every futures account.",
] as const;

export const SUBS = [
  "Import your brokers and funded accounts, then read P&L in one place.",
  "Import your brokers and prop accounts, then read P&L in one place.",
  "Connect your brokers and funded accounts, then read P&L in one place.",
] as const;

export const REVENGE = ["73%", "71%", "68%"] as const;
export const SIZES = ["40%", "35%", "50%"] as const;

export const QUESTIONS = [
  "What psychological patterns do you see in my losing trades? Are there specific market conditions where I consistently struggle?",
  "Where do I break my rules after a losing streak?",
  "What should I change after two losses in a row?",
] as const;

export const DEFAULT_EDIT: HeroEdit = {
  headline: HEADLINES[0],
  sub: SUBS[0],
  revenge: REVENGE[0],
  size: SIZES[0],
  question: QUESTIONS[0],
  highlight: null,
  flash: null,
};

export const SAMPLE_STATIONS: Station[] = [
  { id: "headline", x: 80, y: 36 },
  { id: "sub", x: 72, y: 84 },
  { id: "start", x: 44, y: 128 },
  { id: "features", x: 128, y: 128 },
  { id: "question", x: 120, y: 190 },
  { id: "stat", x: 96, y: 236 },
  { id: "composer", x: 110, y: 268 },
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

function pickStation(current: number, count: number, rand: () => number): number {
  if (count <= 1) return 0;
  let next = current;
  for (let i = 0; i < 6 && next === current; i += 1) {
    next = Math.floor(rand() * count);
  }
  return next === current ? (current + 1) % count : next;
}

function durationFor(work: WorkKind, rand: () => number): number {
  switch (work) {
    case "dart":
      return 0.24 + rand() * 0.14;
    case "select":
      return 0.38 + rand() * 0.28;
    case "type":
      return 0.52 + rand() * 0.36;
    case "click":
      return 0.34;
    case "shuffle":
      return 0.12 + rand() * 0.06;
  }
}

export function nextWork(work: WorkKind, rand: () => number): WorkKind {
  switch (work) {
    case "dart":
      return "select";
    case "select":
      return rand() < 0.34 ? "click" : "type";
    case "type":
      return rand() < 0.4 ? "click" : rand() < 0.4 ? "shuffle" : "dart";
    case "click":
      return rand() < 0.3 ? "shuffle" : "dart";
    case "shuffle":
      return "select";
  }
}

function nextCopy(list: readonly string[], current: string, rand: () => number): string {
  const others = list.filter((item) => item !== current);
  if (others.length === 0) return current;
  return others[Math.floor(rand() * others.length)] ?? current;
}

export function applyStationEdit(
  edit: HeroEdit,
  stationId: string,
  rand: () => number,
): HeroEdit {
  switch (stationId) {
    case "headline":
      return {
        ...edit,
        headline: nextCopy(HEADLINES, edit.headline, rand),
        highlight: null,
        flash: "headline",
      };
    case "sub":
      return {
        ...edit,
        sub: nextCopy(SUBS, edit.sub, rand),
        highlight: null,
        flash: "sub",
      };
    case "start":
      return { ...edit, highlight: "start", flash: "start" };
    case "features":
      return { ...edit, highlight: "features", flash: "features" };
    case "stat":
      return {
        ...edit,
        revenge: nextCopy(REVENGE, edit.revenge, rand),
        size: nextCopy(SIZES, edit.size, rand),
        highlight: null,
        flash: "stat",
      };
    case "question":
      return {
        ...edit,
        question: nextCopy(QUESTIONS, edit.question, rand),
        highlight: null,
        flash: "question",
      };
    default:
      return { ...edit, highlight: null, flash: null };
  }
}

export function shouldEmitEdit(work: WorkKind, rand: () => number): boolean {
  return (work === "type" || work === "click") && rand() < 0.55;
}

export function createAgent(
  id: number,
  kind: AgentKind,
  stations: Station[] = SAMPLE_STATIONS,
): AgentSeed {
  const rand = createRandom(`hero-agent-${id}-${kind}`);
  const station = kind === "lead" ? 0 : pickStation(-1, stations.length, rand);
  const start = stations[station] ?? SAMPLE_STATIONS[0];
  return {
    id,
    kind,
    size: kind === "swarm" ? 0.78 : 1,
    x: start.x - 14,
    y: start.y - 10,
    fromX: start.x - 14,
    fromY: start.y - 10,
    toX: start.x,
    toY: start.y,
    work: "dart",
    elapsed: 0,
    duration: durationFor("dart", rand),
    pecks: 5 + Math.floor(rand() * 3),
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
    caret = 0.4 + 0.25 * Math.sin(t * Math.PI);
  } else if (agent.work === "type") {
    const peck = Math.sin(t * agent.pecks * Math.PI) ** 2;
    x = agent.toX + peck * 1.6;
    y = agent.toY + peck * 2.2;
    scale = agent.size * (1 - 0.05 * peck);
    caret = 0.25 + 0.55 * peck;
  } else if (agent.work === "click") {
    const press = t < 0.28 ? t / 0.28 : 1 - (t - 0.28) / 0.72;
    x = agent.toX;
    y = agent.toY + Math.max(0, press) * 1.6;
    scale = agent.size * (1 - 0.14 * Math.max(0, press));
    caret = 0.12;
  }

  return { x, y, tilt, scale, caret, ripple: agent.ripple };
}

export function stepAgent(
  agent: AgentSeed,
  dt: number,
  still: boolean,
  stations: Station[],
): { pose: AgentPose; editStation: string | null } {
  const rand = createRandom(`hero-tick-${agent.id}-${agent.work}-${agent.station}`);
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
    if (station && shouldEmitEdit(finished, rand)) {
      editStation = station.id;
    }
    const pose = poseAgent(agent, false, stations);
    agent.x = pose.x;
    agent.y = pose.y;
    const next = nextWork(finished, rand);
    agent.work = next;
    agent.elapsed = 0;
    agent.duration = durationFor(next, rand);
    if (next === "dart" || next === "shuffle") {
      agent.station = pickStation(agent.station, stations.length, rand);
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
    if (next === "type") agent.pecks = 4 + Math.floor(rand() * 4);
    if (next === "click") agent.ripple = 0.001;
  } else {
    const pose = poseAgent(agent, false, stations);
    agent.x = pose.x;
    agent.y = pose.y;
  }

  return { pose: poseAgent(agent, false, stations), editStation };
}
