import assert from "node:assert/strict";
import test from "node:test";
import { createRandom } from "@/lib/seeded-random";
import {
  MAX_AGENTS,
  SPAWN_PER_CLICK,
  STATION_GAP,
  createAgent,
  createInitialAgents,
  dartEase,
  nextWork,
  poseAgent,
  spawnAgents,
  stationsOutsideWord,
  stepAgent,
  workStations,
} from "./work";

test("work stations sit outside the word so letters stay clear", () => {
  const wordW = 90;
  const wordH = 16;
  const stations = workStations(wordW, wordH);
  assert.equal(stations.length, 10);
  assert.equal(stationsOutsideWord(stations, wordW, wordH), true);
  assert.ok(stations.some((station) => station.y === -STATION_GAP));
  assert.ok(stations.some((station) => station.y === wordH + STATION_GAP));
});

test("dart ease overshoots then settles on the target", () => {
  assert.equal(dartEase(0), 0);
  assert.ok(dartEase(0.6) > 0.8);
  assert.ok(dartEase(0.82) > 1);
  assert.ok(Math.abs(dartEase(1) - 1) < 1e-9);
});

test("work cycle walks dart → select → type or click", () => {
  const rand = createRandom("cycle");
  assert.equal(nextWork("dart", rand), "select");
  const afterSelect = new Set(
    Array.from({ length: 20 }, () => nextWork("select", createRandom("s"))),
  );
  assert.ok(afterSelect.has("type") || afterSelect.has("click"));
});

test("live pose pecks toward the word; reduced motion stays parked", () => {
  const agent = createAgent(3, "swarm", 80, 16);
  agent.work = "type";
  agent.elapsed = 0.18;
  agent.duration = 0.6;
  agent.pecks = 6;
  agent.toX = 12;
  agent.toY = -STATION_GAP;
  const live = poseAgent(agent, false);
  const still = poseAgent(agent, true);
  assert.ok(Math.hypot(live.x - 12, live.y + STATION_GAP) > 0);
  assert.equal(still.caret, 0);
  assert.equal(still.ripple, 0);
  const parked = workStations(80, 16)[agent.station];
  assert.equal(still.x, parked.x);
  assert.equal(still.y, parked.y);
});

test("stepping an agent changes its task and can start a click ripple", () => {
  const agent = createAgent(1, "lead", 80, 16);
  agent.work = "click";
  agent.elapsed = 0;
  agent.duration = 0.34;
  agent.ripple = 0.001;
  const before = { x: agent.x, y: agent.y, work: agent.work };
  for (let i = 0; i < 24; i += 1) stepAgent(agent, 1 / 30, false);
  assert.ok(agent.work !== before.work || agent.elapsed > 0);
  assert.ok(Number.isFinite(agent.x) && Number.isFinite(agent.y));
});

test("reduced motion stepping does not wander", () => {
  const agent = createAgent(2, "lead", 80, 16);
  const first = stepAgent(agent, 1 / 30, true);
  const later = stepAgent(agent, 1, true);
  assert.equal(first.x, later.x);
  assert.equal(first.y, later.y);
  assert.equal(later.ripple, 0);
});

test("spawn starts with one lead agent and caps the swarm", () => {
  const initial = createInitialAgents(80, 16);
  assert.equal(initial.length, 1);
  assert.equal(initial[0].kind, "lead");

  let agents = initial;
  let nextId = 2;
  const first = spawnAgents(agents, nextId, 80, 16);
  assert.equal(first.agents.length, 1 + SPAWN_PER_CLICK);
  assert.ok(first.agents.slice(1).every((agent) => agent.kind === "swarm"));
  agents = first.agents;
  nextId = first.nextId;

  while (agents.length < MAX_AGENTS) {
    const step = spawnAgents(agents, nextId, 80, 16);
    assert.ok(step.agents.length <= MAX_AGENTS);
    if (step.agents.length === agents.length) break;
    agents = step.agents;
    nextId = step.nextId;
  }

  assert.equal(agents.length, MAX_AGENTS);
  const overflow = spawnAgents(agents, nextId, 80, 16);
  assert.equal(overflow.agents.length, MAX_AGENTS);
  assert.equal(overflow.nextId, nextId);
});
