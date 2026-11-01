import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_AGENTS,
  SPAWN_PER_CLICK,
  clampRadius,
  createAgent,
  createInitialAgents,
  pathBox,
  poseOnRoundedRect,
  roamPose,
  roundedRectPerimeter,
  spawnAgents,
  wrap01,
} from "./orbit";

test("wrap01 folds negatives and values above one", () => {
  assert.equal(wrap01(0), 0);
  assert.equal(wrap01(1), 0);
  assert.ok(Math.abs(wrap01(-0.25) - 0.75) < 1e-12);
  assert.ok(Math.abs(wrap01(2.25) - 0.25) < 1e-12);
});

test("rounded rect perimeter grows with size and shrinks with radius", () => {
  const sharp = roundedRectPerimeter(20, 10, 0);
  const round = roundedRectPerimeter(20, 10, 4);
  assert.equal(sharp, 60);
  assert.ok(round < sharp);
  assert.ok(round > 0);
});

test("radius never exceeds half the shorter side", () => {
  assert.equal(clampRadius(10, 6, 8), 3);
  assert.equal(clampRadius(0, 6, 2), 0);
});

test("t=0 and t=1 meet on the top edge, and samples stay on the box", () => {
  const width = 40;
  const height = 12;
  const radius = 4;
  const start = poseOnRoundedRect(width, height, radius, 0);
  const loop = poseOnRoundedRect(width, height, radius, 1);
  assert.ok(Math.abs(start.x - loop.x) < 1e-9);
  assert.ok(Math.abs(start.y - loop.y) < 1e-9);
  assert.ok(start.x > 0);
  assert.equal(start.y, 0);

  for (let i = 0; i < 32; i += 1) {
    const pose = poseOnRoundedRect(width, height, radius, i / 32);
    assert.ok(pose.x >= -1e-9 && pose.x <= width + 1e-9);
    assert.ok(pose.y >= -1e-9 && pose.y <= height + 1e-9);
    assert.ok(Number.isFinite(pose.angle));
  }
});

test("heading follows the clockwise tangent on the four sides", () => {
  const width = 40;
  const height = 20;
  const radius = 0;
  assert.ok(Math.abs(poseOnRoundedRect(width, height, radius, 0.1).angle) < 1e-9);
  assert.ok(
    Math.abs(poseOnRoundedRect(width, height, radius, 0.4).angle - Math.PI / 2) <
      1e-9,
  );
  assert.ok(
    Math.abs(poseOnRoundedRect(width, height, radius, 0.6).angle - Math.PI) <
      1e-9,
  );
  assert.ok(
    Math.abs(poseOnRoundedRect(width, height, radius, 0.85).angle + Math.PI / 2) <
      1e-9,
  );
});

test("still roam pose sits on the path; motion adds a finite offset", () => {
  const seed = createAgent(3, "swarm");
  const still = roamPose(36, 12, 6, seed, 0.2, 1.4, true);
  const live = roamPose(36, 12, 6, seed, 0.2, 1.4, false);
  const onPath = poseOnRoundedRect(36, 12, 6, 0.2);
  assert.equal(still.x, onPath.x);
  assert.equal(still.y, onPath.y);
  assert.ok(Number.isFinite(live.x) && Number.isFinite(live.y));
  assert.ok(Math.hypot(live.x - still.x, live.y - still.y) > 0);
});

test("spawn starts with one lead agent and caps the swarm", () => {
  const initial = createInitialAgents();
  assert.equal(initial.length, 1);
  assert.equal(initial[0].kind, "lead");

  let agents = initial;
  let nextId = 2;
  const first = spawnAgents(agents, nextId);
  assert.equal(first.agents.length, 1 + SPAWN_PER_CLICK);
  assert.ok(first.agents.slice(1).every((agent) => agent.kind === "swarm"));
  agents = first.agents;
  nextId = first.nextId;

  while (agents.length < MAX_AGENTS) {
    const step = spawnAgents(agents, nextId);
    assert.ok(step.agents.length <= MAX_AGENTS);
    if (step.agents.length === agents.length) break;
    agents = step.agents;
    nextId = step.nextId;
  }

  assert.equal(agents.length, MAX_AGENTS);
  const overflow = spawnAgents(agents, nextId);
  assert.equal(overflow.agents.length, MAX_AGENTS);
  assert.equal(overflow.nextId, nextId);
});

test("path box keeps the orbit outside the word", () => {
  const box = pathBox(80, 16);
  assert.ok(box.width > 80);
  assert.ok(box.height > 16);
  assert.ok(box.offsetX > 0);
  assert.ok(box.offsetY > 0);
});
