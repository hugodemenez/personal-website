export const MAX_AGENTS = 8;
export const INITIAL_AGENTS = 1;
export const SPAWN_PER_CLICK = 2;
export const PATH_PAD = 9;
export const PATH_RADIUS = 8;
export const OVERLAY_PAD = 18;

export type AgentKind = "lead" | "swarm";

export type AgentSeed = {
  id: number;
  kind: AgentKind;
  t: number;
  speed: number;
  wobblePhase: number;
  wobbleAmp: number;
  size: number;
};

export type Pose = {
  x: number;
  y: number;
  angle: number;
};

export function wrap01(t: number): number {
  return ((t % 1) + 1) % 1;
}

export function clampRadius(width: number, height: number, radius: number): number {
  if (width <= 0 || height <= 0) return 0;
  return Math.max(0, Math.min(radius, width / 2, height / 2));
}

export function roundedRectPerimeter(
  width: number,
  height: number,
  radius: number,
): number {
  const r = clampRadius(width, height, radius);
  return 2 * (width + height) - 8 * r + 2 * Math.PI * r;
}

/** Clockwise pose on a rounded rectangle whose top-left is (0, 0).
 *  t = 0 sits at the start of the top edge. */
export function poseOnRoundedRect(
  width: number,
  height: number,
  radius: number,
  t: number,
): Pose {
  const r = clampRadius(width, height, radius);
  const straightX = Math.max(0, width - 2 * r);
  const straightY = Math.max(0, height - 2 * r);
  const arc = r > 0 ? (Math.PI / 2) * r : 0;
  const lengths = [
    straightX,
    arc,
    straightY,
    arc,
    straightX,
    arc,
    straightY,
    arc,
  ];
  const total = lengths.reduce((sum, len) => sum + len, 0);
  if (total === 0) {
    return { x: 0, y: 0, angle: 0 };
  }

  let d = wrap01(t) * total;
  const take = (len: number) => {
    if (d <= len) return true;
    d -= len;
    return false;
  };

  if (take(lengths[0])) {
    return { x: r + d, y: 0, angle: 0 };
  }

  if (take(lengths[1])) {
    const a = -Math.PI / 2 + (arc === 0 ? 0 : (d / arc) * (Math.PI / 2));
    return {
      x: width - r + r * Math.cos(a),
      y: r + r * Math.sin(a),
      angle: a + Math.PI / 2,
    };
  }

  if (take(lengths[2])) {
    return { x: width, y: r + d, angle: Math.PI / 2 };
  }

  if (take(lengths[3])) {
    const a = arc === 0 ? 0 : (d / arc) * (Math.PI / 2);
    return {
      x: width - r + r * Math.cos(a),
      y: height - r + r * Math.sin(a),
      angle: a + Math.PI / 2,
    };
  }

  if (take(lengths[4])) {
    return { x: width - r - d, y: height, angle: Math.PI };
  }

  if (take(lengths[5])) {
    const a = Math.PI / 2 + (arc === 0 ? 0 : (d / arc) * (Math.PI / 2));
    return {
      x: r + r * Math.cos(a),
      y: height - r + r * Math.sin(a),
      angle: a + Math.PI / 2,
    };
  }

  if (take(lengths[6])) {
    return { x: 0, y: height - r - d, angle: -Math.PI / 2 };
  }

  const a = Math.PI + (arc === 0 ? 0 : (d / arc) * (Math.PI / 2));
  return {
    x: r + r * Math.cos(a),
    y: r + r * Math.sin(a),
    angle: a + Math.PI / 2,
  };
}

export function roamPose(
  width: number,
  height: number,
  radius: number,
  seed: AgentSeed,
  t: number,
  time: number,
  still: boolean,
): Pose {
  const pose = poseOnRoundedRect(width, height, radius, t);
  if (still) return pose;

  const wobble = Math.sin(time * 1.35 + seed.wobblePhase) * seed.wobbleAmp;
  const outward = pose.angle - Math.PI / 2;
  return {
    x: pose.x + Math.cos(outward) * wobble,
    y: pose.y + Math.sin(outward) * wobble,
    angle: pose.angle + Math.sin(time * 0.85 + seed.wobblePhase) * 0.16,
  };
}

export function createAgent(id: number, kind: AgentKind): AgentSeed {
  const swarm = kind === "swarm";
  return {
    id,
    kind,
    t: swarm ? wrap01(id * 0.37 + 0.08) : 0.14,
    speed: swarm ? 0.2 + (id % 5) * 0.035 : 0.16,
    wobblePhase: id * 1.73,
    wobbleAmp: swarm ? 2.1 : 3,
    size: swarm ? 0.68 : 1,
  };
}

export function createInitialAgents(): AgentSeed[] {
  return Array.from({ length: INITIAL_AGENTS }, (_, index) =>
    createAgent(index + 1, index === 0 ? "lead" : "swarm"),
  );
}

export function spawnAgents(
  current: AgentSeed[],
  nextId: number,
): { agents: AgentSeed[]; nextId: number } {
  const room = Math.max(0, MAX_AGENTS - current.length);
  const n = Math.min(SPAWN_PER_CLICK, room);
  const added: AgentSeed[] = [];
  let id = nextId;
  for (let i = 0; i < n; i += 1) {
    added.push(createAgent(id, "swarm"));
    id += 1;
  }
  return { agents: [...current, ...added], nextId: id };
}

export function pathBox(wordWidth: number, wordHeight: number) {
  const width = Math.max(wordWidth + PATH_PAD * 2, PATH_RADIUS * 2);
  const height = Math.max(wordHeight + PATH_PAD * 2, PATH_RADIUS * 2);
  return {
    width,
    height,
    radius: clampRadius(width, height, PATH_RADIUS),
    offsetX: OVERLAY_PAD - PATH_PAD,
    offsetY: OVERLAY_PAD - PATH_PAD,
  };
}
