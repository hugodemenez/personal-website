import assert from "node:assert/strict";
import test from "node:test";
import { createRandom } from "@/lib/seeded-random";
import {
  WEEKDAYS,
  WINRATE,
  areaPath,
  cumulative,
  layoutSeries,
  linePath,
  seriesFor,
} from "./series";
import {
  CELL_COUNT,
  GAP_HOLD,
  MAX_AGENTS,
  SCRIPT,
  SEND_HOLD,
  WORK_HOLD,
  applyTweak,
  createInitialWork,
  createReducedWork,
  dartEase,
  nextFreeCell,
  parsePrompt,
  poseAgent,
  sampleStations,
  stepAgent,
  submitPrompt,
  tickPlay,
} from "./work";

test("dart ease overshoots then settles", () => {
  assert.equal(dartEase(0), 0);
  assert.ok(dartEase(0.82) > 1);
  assert.ok(Math.abs(dartEase(1) - 1) < 1e-9);
});

test("parsePrompt reads kind, color, and shape hints", () => {
  assert.deepEqual(parsePrompt("kind: area"), { kind: "area" });
  assert.deepEqual(parsePrompt("colors: mint"), { palette: "mint" });
  assert.deepEqual(parsePrompt("shapes rounded"), { shape: "rounded" });
  assert.equal(parsePrompt("make it a line in amber").kind, "line");
  assert.equal(parsePrompt("make it a line in amber").palette, "amber");
  assert.deepEqual(parsePrompt("hello"), {});
});

test("applyTweak changes one thing at a time", () => {
  const work = createInitialWork();
  const cell = work.cells[0];
  if (!cell) throw new Error("missing cell");
  const mint = applyTweak(cell, { palette: "mint" }, () => 0);
  assert.equal(mint.palette, "mint");
  assert.equal(mint.kind, cell.kind);
  const again = applyTweak(mint, { palette: "mint" }, createRandom("nudge"));
  assert.ok(
    again.kind !== mint.kind ||
      again.shape !== mint.shape ||
      again.palette !== mint.palette,
  );
});

test("each prompt sends an agent to a different free cell", () => {
  let work = createInitialWork();
  assert.equal(work.cells.length, CELL_COUNT);
  assert.equal(work.agents.length, 0);

  work = submitPrompt(work, "colors: mint");
  work = submitPrompt(work, "kind: area");
  work = submitPrompt(work, "shapes: rounded");
  work = submitPrompt(work, "weekday bars");
  assert.equal(work.agents.length, 4);
  const cells = work.agents.map((agent) => agent.cellId).sort();
  assert.deepEqual(cells, [1, 2, 3, 4]);
  assert.equal(new Set(work.agents.map((agent) => agent.prompt)).size, 4);

  const extra = submitPrompt(work, "ink");
  assert.ok(extra.agents.length <= MAX_AGENTS);
});

test("nextFreeCell skips busy cells then wraps", () => {
  assert.equal(nextFreeCell([], 1), 1);
  assert.equal(nextFreeCell([1], 1), 2);
  assert.equal(nextFreeCell([1, 2, 3, 4], 3), 3);
});

test("an agent on a cell clicks the plot and then idles", () => {
  const work = submitPrompt(createInitialWork(), "mint");
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = sampleStations(agent.cellId);
  agent.station = 1;
  agent.work = "click";
  agent.elapsed = 0;
  agent.duration = 0.28;
  agent.tweaksLeft = 1;
  let edited = false;
  for (let i = 0; i < 40; i += 1) {
    const step = stepAgent(agent, 1 / 30, false, stations);
    if (step.edit) edited = true;
  }
  assert.equal(edited, true);
  assert.equal(agent.work, "idle");
});

test("reduced motion parks the pointer", () => {
  const work = submitPrompt(createInitialWork(), "area");
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = sampleStations(agent.cellId);
  agent.work = "click";
  agent.elapsed = 0.1;
  agent.duration = 0.28;
  agent.station = 1;
  const still = poseAgent(agent, true, stations);
  assert.equal(still.ripple, 0);
  assert.equal(still.x, stations[1]?.x);
});

test("autoplay sends a chip then spawns a pointer onto a free cell", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  let work = createInitialWork();
  assert.equal(work.phase, "gap");
  assert.equal(work.outgoing, null);

  work = tickPlay(work, GAP_HOLD, composer);
  assert.equal(work.phase, "send");
  assert.equal(work.outgoing, SCRIPT[0]);
  assert.equal(work.agents.length, 0);

  work = tickPlay(work, SEND_HOLD, composer);
  assert.equal(work.phase, "work");
  assert.equal(work.outgoing, SCRIPT[0]);
  assert.equal(work.agents.length, 1);
  assert.equal(work.agents[0]?.cellId, 1);
  assert.equal(work.agents[0]?.prompt, SCRIPT[0]);
  assert.equal(work.agents[0]?.work, "dart");
  assert.equal(work.agents[0]?.fromX, composer.x);
});

test("autoplay sequences later messages onto other cells", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  let work = createInitialWork();
  const seen = new Set<number>();
  for (let beat = 0; beat < SCRIPT.length; beat += 1) {
    work = tickPlay(work, GAP_HOLD, composer);
    work = tickPlay(work, SEND_HOLD, composer);
    const agent = work.agents.at(-1);
    if (agent) seen.add(agent.cellId);
    for (const item of work.agents) item.work = "idle";
    work = tickPlay(work, WORK_HOLD, composer);
    work = tickPlay(work, 0.3, composer);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4]);
  assert.equal(work.beat, SCRIPT.length);
});

test("reduced motion parks the first sent message and pointer", () => {
  const work = createReducedWork();
  assert.equal(work.outgoing, SCRIPT[0]);
  assert.equal(work.phase, "work");
  assert.equal(work.agents.length, 1);
  assert.equal(work.agents[0]?.work, "idle");
  assert.equal(work.cells[0]?.palette, "mint");
  assert.equal(work.cells[0]?.job, SCRIPT[0]);
});

test("tiny layouts stay drawable", () => {
  assert.ok(WEEKDAYS.some((day) => day.pnl < 0));
  assert.ok(WINRATE.every((day) => day.pnl > 0));
  assert.notEqual(seriesFor("equity")[1]?.pnl, WEEKDAYS[1]?.pnl);
  assert.equal(cumulative()[0]?.pnl, WEEKDAYS[0]?.pnl);
  const points = layoutSeries(WEEKDAYS, "rounded");
  assert.equal(points.length, 5);
  assert.match(linePath(points, false), /^M /);
  assert.match(areaPath(points, true), /Z$/);
});
