import assert from "node:assert/strict";
import test from "node:test";
import { createRandom } from "@/lib/seeded-random";
import {
  areaPath,
  cumulative,
  layoutSeries,
  linePath,
  seriesForKind,
  WEEKDAYS,
} from "./series";
import {
  DEFAULT_EDIT,
  KINDS,
  MAX_AGENTS,
  PALETTES,
  SAMPLE_STATIONS,
  SHAPES,
  SPAWN_PER_CLICK,
  TUNE_ORDER,
  applyStationEdit,
  createAgent,
  createInitialAgents,
  dartEase,
  nextTuneStation,
  nextWork,
  poseAgent,
  spawnAgents,
  stepAgent,
} from "./work";

test("dart ease overshoots then settles", () => {
  assert.equal(dartEase(0), 0);
  assert.ok(dartEase(0.82) > 1);
  assert.ok(Math.abs(dartEase(1) - 1) < 1e-9);
});

test("work cycle is dart → select → click", () => {
  assert.equal(nextWork("dart", () => 0), "select");
  assert.equal(nextWork("select", () => 0), "click");
});

test("tune order walks shapes then colors then kinds", () => {
  assert.deepEqual([...TUNE_ORDER], ["shape", "color", "kind"]);
  const rand = () => 0.5;
  assert.equal(
    SAMPLE_STATIONS[nextTuneStation("shape", SAMPLE_STATIONS, rand)]?.id,
    "color",
  );
  assert.equal(
    SAMPLE_STATIONS[nextTuneStation("color", SAMPLE_STATIONS, rand)]?.id,
    "kind",
  );
  assert.equal(
    SAMPLE_STATIONS[nextTuneStation("kind", SAMPLE_STATIONS, rand)]?.id,
    "shape",
  );
});

test("station edits cycle shape, palette, and kind", () => {
  const rand = createRandom("chart-edits");
  const shape = applyStationEdit(DEFAULT_EDIT, "shape", rand);
  assert.notEqual(shape.shape, DEFAULT_EDIT.shape);
  assert.ok((SHAPES as readonly string[]).includes(shape.shape));
  assert.equal(shape.flash, "shape");

  const color = applyStationEdit(DEFAULT_EDIT, "color", rand);
  assert.notEqual(color.palette, DEFAULT_EDIT.palette);
  assert.ok((PALETTES as readonly string[]).includes(color.palette));

  const kind = applyStationEdit(DEFAULT_EDIT, "kind", rand);
  assert.notEqual(kind.kind, DEFAULT_EDIT.kind);
  assert.ok((KINDS as readonly string[]).includes(kind.kind));
});

test("weekday series stays signed; cumulative climbs from it", () => {
  assert.ok(WEEKDAYS.some((day) => day.pnl < 0));
  assert.ok(WEEKDAYS.some((day) => day.pnl > 0));
  const run = cumulative();
  assert.equal(run[0]?.pnl, WEEKDAYS[0]?.pnl);
  assert.equal(
    run[run.length - 1]?.pnl,
    WEEKDAYS.reduce((sum, day) => sum + day.pnl, 0),
  );
  assert.equal(seriesForKind("bars")[1]?.pnl, WEEKDAYS[1]?.pnl);
  assert.notEqual(seriesForKind("line")[1]?.pnl, WEEKDAYS[1]?.pnl);
});

test("layout keeps a zero line and finite bar geometry", () => {
  const points = layoutSeries(WEEKDAYS, "rounded");
  assert.equal(points.length, 5);
  assert.ok(points.every((point) => Number.isFinite(point.bar.height)));
  assert.ok(points[0] && points[0].zeroY > points[0].y);
});

test("line and area paths are drawable", () => {
  const points = layoutSeries(seriesForKind("line"), "sharp");
  assert.match(linePath(points, false), /^M /);
  assert.match(areaPath(points, true), /Z$/);
});

test("reduced motion parks the pointer; live click squashes", () => {
  const agent = createAgent(1, "lead");
  agent.work = "click";
  agent.elapsed = 0.08;
  agent.duration = 0.32;
  agent.toX = 72;
  agent.toY = 58;
  const live = poseAgent(agent, false, SAMPLE_STATIONS);
  const still = poseAgent(agent, true, SAMPLE_STATIONS);
  assert.ok(live.scale < agent.size);
  assert.equal(still.x, SAMPLE_STATIONS[0].x);
  assert.equal(still.y, SAMPLE_STATIONS[0].y);
  assert.equal(still.ripple, 0);
});

test("stepping a click can emit a station edit", () => {
  const agent = createAgent(2, "lead");
  agent.work = "click";
  agent.elapsed = 0;
  agent.duration = 0.32;
  agent.ripple = 0.001;
  let emitted = false;
  for (let i = 0; i < 24; i += 1) {
    const step = stepAgent(agent, 1 / 30, false, SAMPLE_STATIONS);
    if (step.editStation) emitted = true;
  }
  assert.equal(emitted, true);
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
