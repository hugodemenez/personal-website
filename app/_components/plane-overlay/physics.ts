export type Vec2 = { x: number; y: number };

export type Body = {
  pos: Vec2;
  vel: Vec2;
};

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type SpringOpts = {
  mass?: number;
  stiffness?: number;
  damping?: number;
  maxSpeed?: number;
};

/** Underdamped flight: mass + spring + drag. Critical damping at these
 *  stiffness/mass values is ~10.6; 5.4 leaves a visible overshoot. */
export const FLIGHT = {
  mass: 1,
  stiffness: 28,
  damping: 5.4,
  restitution: 0.38,
  maxSpeed: 2800,
  clickImpulse: 220,
  scrollGain: 12,
} as const;

export type FlightMode = "flight" | "descent" | "landed";

/** Page-scale altitude: idle sinks toward the document bottom; returning
 *  to the top of the page restarts flight from the sky. */
export const ALTITUDE = {
  idleMs: 5000,
  sinkSeconds: 2.8,
  topPx: 56,
  meaningfulScroll: 4,
  pointerSlop: 6,
  takeoffImpulse: 320,
  gravity: 140,
  landEps: 28,
} as const;

const SUBSTEP_HZ = 240;

export function createBody(x = 0, y = 0): Body {
  return { pos: { x, y }, vel: { x: 0, y: 0 } };
}

export function applyImpulse(body: Body, impulse: Vec2, mass: number = FLIGHT.mass) {
  if (mass <= 0) return;
  body.vel.x += impulse.x / mass;
  body.vel.y += impulse.y / mass;
}

export function snap(body: Body, target: Vec2) {
  body.pos.x = target.x;
  body.pos.y = target.y;
  body.vel.x = 0;
  body.vel.y = 0;
}

export function settled(
  body: Body,
  target: Vec2,
  posEps = 0.45,
  velEps = 6,
) {
  return (
    Math.abs(body.pos.x - target.x) < posEps &&
    Math.abs(body.pos.y - target.y) < posEps &&
    Math.abs(body.vel.x) < velEps &&
    Math.abs(body.vel.y) < velEps
  );
}

/** Kick toward a new target so a click starts motion immediately. */
export function clickKick(body: Body, target: Vec2, impulse: number = FLIGHT.clickImpulse) {
  const dx = target.x - body.pos.x;
  const dy = target.y - body.pos.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3 || impulse === 0) return;
  applyImpulse(body, { x: (dx / len) * impulse, y: (dy / len) * impulse });
}

/** Scroll delta (px this frame) becomes momentum, not a 1:1 offset. */
export function impartScroll(body: Body, deltaY: number, gain: number = FLIGHT.scrollGain) {
  if (deltaY === 0 || gain === 0) return;
  applyImpulse(body, { x: 0, y: deltaY * gain });
}

export function stepSpring(
  body: Body,
  target: Vec2,
  dt: number,
  opts: SpringOpts = {},
) {
  if (!(dt > 0)) return;
  const mass = opts.mass ?? FLIGHT.mass;
  const stiffness = opts.stiffness ?? FLIGHT.stiffness;
  const damping = opts.damping ?? FLIGHT.damping;
  const maxSpeed = opts.maxSpeed ?? FLIGHT.maxSpeed;
  if (mass <= 0) {
    body.pos.x = target.x;
    body.pos.y = target.y;
    body.vel.x = 0;
    body.vel.y = 0;
    return;
  }
  const steps = Math.max(1, Math.ceil(dt * SUBSTEP_HZ));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const fx = (target.x - body.pos.x) * stiffness - body.vel.x * damping;
    const fy = (target.y - body.pos.y) * stiffness - body.vel.y * damping;
    body.vel.x += (fx / mass) * h;
    body.vel.y += (fy / mass) * h;
    const speed = Math.hypot(body.vel.x, body.vel.y);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      body.vel.x *= scale;
      body.vel.y *= scale;
    }
    body.pos.x += body.vel.x * h;
    body.pos.y += body.vel.y * h;
  }
}

export function sinkAltitude(
  current: number,
  landY: number,
  dt: number,
  seconds: number = ALTITUDE.sinkSeconds,
  fromY?: number,
) {
  if (!(dt > 0) || seconds <= 0) return landY;
  const span = Math.max(1, landY - (fromY ?? current));
  const next = current + (span / seconds) * dt;
  return next >= landY ? landY : next;
}

export function applyGravity(body: Body, dt: number, gravity: number = ALTITUDE.gravity) {
  if (!(dt > 0) || gravity === 0) return;
  body.vel.y += gravity * dt;
}

export function atPageTop(scrollY: number, topPx: number = ALTITUDE.topPx) {
  return scrollY <= topPx;
}

export function crossedToTop(
  prevScrollY: number,
  scrollY: number,
  topPx: number = ALTITUDE.topPx,
) {
  return prevScrollY > topPx && scrollY <= topPx;
}

export function nextFlightMode(
  mode: FlightMode,
  opts: {
    idleFor: number;
    idleMs?: number;
    atLanding: boolean;
    interacting: boolean;
    takeoff: boolean;
  },
): FlightMode {
  if (opts.takeoff || opts.interacting) return "flight";
  if (mode === "flight" && opts.idleFor >= (opts.idleMs ?? ALTITUDE.idleMs)) return "descent";
  if (mode === "descent" && opts.atLanding) return "landed";
  return mode;
}

export function collideBounds(
  body: Body,
  bounds: Bounds,
  restitution: number = FLIGHT.restitution,
) {
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return;
  if (body.pos.x < bounds.minX) {
    body.pos.x = bounds.minX;
    if (body.vel.x < 0) body.vel.x *= -restitution;
  } else if (body.pos.x > bounds.maxX) {
    body.pos.x = bounds.maxX;
    if (body.vel.x > 0) body.vel.x *= -restitution;
  }
  if (body.pos.y < bounds.minY) {
    body.pos.y = bounds.minY;
    if (body.vel.y < 0) body.vel.y *= -restitution;
  } else if (body.pos.y > bounds.maxY) {
    body.pos.y = bounds.maxY;
    if (body.vel.y > 0) body.vel.y *= -restitution;
  }
}
