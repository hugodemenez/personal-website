import assert from "node:assert/strict";
import test from "node:test";
import {
  ALTITUDE,
  applyGravity,
  applyImpulse,
  clickKick,
  collideBounds,
  createBody,
  crossedToTop,
  FLIGHT,
  nextFlightMode,
  settled,
  sinkAltitude,
  snap,
  stepSpring,
} from "./physics";

const DT = 1 / 60;

function integrate(body: ReturnType<typeof createBody>, target: { x: number; y: number }, seconds: number) {
  const frames = Math.round(seconds / DT);
  for (let i = 0; i < frames; i++) stepSpring(body, target, DT);
}

test("spring force pulls the body toward the target", () => {
  const body = createBody(0, 0);
  stepSpring(body, { x: 100, y: 0 }, DT);
  assert.ok(body.vel.x > 0);
  assert.ok(body.pos.x > 0);
  assert.equal(body.pos.y, 0);
});

test("underdamped spring overshoots instead of easing in", () => {
  const body = createBody(0, 0);
  const target = { x: 80, y: 0 };
  let passed = false;
  for (let i = 0; i < 90; i++) {
    stepSpring(body, target, DT);
    if (body.pos.x > target.x) passed = true;
  }
  assert.equal(passed, true);
});

test("velocity keeps the body moving after the target stops changing", () => {
  const body = createBody(0, 0);
  const target = { x: 120, y: 0 };
  stepSpring(body, target, 0.08);
  const xAfterPush = body.pos.x;
  const vx = body.vel.x;
  assert.ok(vx > 40);
  stepSpring(body, target, DT);
  assert.ok(body.pos.x > xAfterPush);
  assert.ok(Math.abs(body.vel.x) > 1);
});

test("impulse is momentum, not a position teleport", () => {
  const body = createBody(10, 10);
  applyImpulse(body, { x: 40, y: -20 }, 2);
  assert.equal(body.pos.x, 10);
  assert.equal(body.pos.y, 10);
  assert.equal(body.vel.x, 20);
  assert.equal(body.vel.y, -10);
});

test("click kick aims at the new target", () => {
  const body = createBody(0, 0);
  clickKick(body, { x: 0, y: 40 }, 80);
  assert.ok(Math.abs(body.vel.x) < 1e-9);
  assert.equal(body.vel.y, 80);
  assert.equal(body.pos.y, 0);
});

test("scroll is not part of the flight constants", () => {
  assert.equal("scrollGain" in FLIGHT, false);
  assert.ok(FLIGHT.clickImpulse > 0);
});

test("snap clears velocity for reduced motion", () => {
  const body = createBody(4, 5);
  body.vel.x = 90;
  body.vel.y = -30;
  snap(body, { x: 12, y: 8 });
  assert.deepEqual(body.pos, { x: 12, y: 8 });
  assert.deepEqual(body.vel, { x: 0, y: 0 });
  assert.equal(settled(body, { x: 12, y: 8 }), true);
});

test("walls bounce leftover velocity", () => {
  const body = createBody(9, 0);
  body.vel.x = 40;
  collideBounds(body, { minX: 0, maxX: 8, minY: -10, maxY: 10 }, 0.5);
  assert.equal(body.pos.x, 8);
  assert.equal(body.vel.x, -20);
});

test("settles near the target after a few seconds", () => {
  const body = createBody(-40, 20);
  integrate(body, { x: 0, y: 0 }, 3);
  assert.equal(settled(body, { x: 0, y: 0 }), true);
});

test("flight constants stay underdamped", () => {
  const critical = 2 * Math.sqrt(FLIGHT.stiffness * FLIGHT.mass);
  assert.ok(FLIGHT.damping < critical * 0.75);
});

test("idle altitude sinks gradually toward the landing pad", () => {
  let y = 40;
  y = sinkAltitude(y, 800, DT, ALTITUDE.sinkSeconds, 40);
  assert.ok(y > 40);
  assert.ok(y < 80);
  for (let i = 0; i < Math.round(ALTITUDE.sinkSeconds / DT) + 2; i++) {
    y = sinkAltitude(y, 800, DT, ALTITUDE.sinkSeconds, 40);
  }
  assert.equal(y, 800);
});

test("gravity adds downward velocity without teleporting", () => {
  const body = createBody(0, 10);
  applyGravity(body, DT, 600);
  assert.equal(body.pos.y, 10);
  assert.ok(body.vel.y > 0);
});

test("crossing back to the top of the page is a rising edge", () => {
  assert.equal(crossedToTop(200, 20), true);
  assert.equal(crossedToTop(10, 8), false);
  assert.equal(crossedToTop(20, 200), false);
});

test("flight mode sinks after idle and lands when settled", () => {
  assert.equal(
    nextFlightMode("flight", {
      idleFor: ALTITUDE.idleMs,
      atLanding: false,
      interacting: false,
      takeoff: false,
    }),
    "descent",
  );
  assert.equal(
    nextFlightMode("descent", {
      idleFor: 20_000,
      atLanding: true,
      interacting: false,
      takeoff: false,
    }),
    "landed",
  );
  assert.equal(
    nextFlightMode("landed", {
      idleFor: 20_000,
      atLanding: true,
      interacting: false,
      takeoff: true,
    }),
    "flight",
  );
  assert.equal(
    nextFlightMode("descent", {
      idleFor: 20_000,
      atLanding: false,
      interacting: true,
      takeoff: false,
    }),
    "flight",
  );
});
