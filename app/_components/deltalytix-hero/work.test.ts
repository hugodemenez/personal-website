import assert from "node:assert/strict";
import test from "node:test";
import { createRandom } from "@/lib/seeded-random";
import {
  DEFAULT_EDIT,
  HEADLINES,
  MAX_AGENTS,
  SAMPLE_STATIONS,
  SPAWN_PER_CLICK,
  applyStationEdit,
  createAgent,
  createInitialAgents,
  dartEase,
  nextWork,
  poseAgent,
  shouldEmitEdit,
  spawnAgents,
  stepAgent,
} from "./work";

test("dart ease overshoots then settles", () => {
  assert.equal(dartEase(0), 0);
  assert.ok(dartEase(0.82) > 1);
  assert.ok(Math.abs(dartEase(1) - 1) < 1e-9);
});

test("work cycle walks dart → select → type or click", () => {
  assert.equal(nextWork("dart", createRandom("d")), "select");
  const afterSelect = nextWork("select", createRandom("select-cycle"));
  assert.ok(afterSelect === "type" || afterSelect === "click");
});

test("station edits swap visible hero copy and can light a CTA", () => {
  const rand = createRandom("edits");
  const headline = applyStationEdit(DEFAULT_EDIT, "headline", rand);
  assert.notEqual(headline.headline, DEFAULT_EDIT.headline);
  assert.ok((HEADLINES as readonly string[]).includes(headline.headline));
  assert.equal(headline.flash, "headline");

  const start = applyStationEdit(DEFAULT_EDIT, "start", rand);
  assert.equal(start.highlight, "start");

  const stat = applyStationEdit(DEFAULT_EDIT, "stat", rand);
  assert.ok(stat.revenge !== DEFAULT_EDIT.revenge || stat.size !== DEFAULT_EDIT.size);
});

test("edits emit only after type or click, and not always", () => {
  assert.equal(shouldEmitEdit("dart", () => 0), false);
  assert.equal(shouldEmitEdit("type", () => 0.1), true);
  assert.equal(shouldEmitEdit("type", () => 0.9), false);
});

test("reduced motion parks the pointer; live type pecks", () => {
  const agent = createAgent(1, "lead");
  agent.work = "type";
  agent.elapsed = 0.15;
  agent.duration = 0.6;
  agent.pecks = 6;
  agent.toX = 80;
  agent.toY = 36;
  const live = poseAgent(agent, false, SAMPLE_STATIONS);
  const still = poseAgent(agent, true, SAMPLE_STATIONS);
  assert.ok(Math.hypot(live.x - 80, live.y - 36) > 0);
  assert.equal(still.x, SAMPLE_STATIONS[0].x);
  assert.equal(still.y, SAMPLE_STATIONS[0].y);
  assert.equal(still.caret, 0);
});

test("stepping can finish a click and leave a finite pose", () => {
  const agent = createAgent(2, "lead");
  agent.work = "click";
  agent.elapsed = 0;
  agent.duration = 0.34;
  agent.ripple = 0.001;
  for (let i = 0; i < 24; i += 1) stepAgent(agent, 1 / 30, false, SAMPLE_STATIONS);
  assert.ok(Number.isFinite(agent.x) && Number.isFinite(agent.y));
});

test("spawn starts with one lead pointer and caps the fleet", () => {
  const initial = createInitialAgents();
  assert.equal(initial.length, 1);
  assert.equal(initial[0].kind, "lead");
  let agents = initial;
  let nextId = 2;
  const first = spawnAgents(agents, nextId);
  assert.equal(first.agents.length, 1 + SPAWN_PER_CLICK);
  agents = first.agents;
  nextId = first.nextId;
  while (agents.length < MAX_AGENTS) {
    const step = spawnAgents(agents, nextId);
    if (step.agents.length === agents.length) break;
    agents = step.agents;
    nextId = step.nextId;
  }
  assert.equal(agents.length, MAX_AGENTS);
  assert.equal(spawnAgents(agents, nextId).agents.length, MAX_AGENTS);
});
