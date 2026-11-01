import assert from "node:assert/strict";
import test from "node:test";
import {
  WEEKDAYS,
  WINRATE,
  areaPath,
  cloneDays,
  cumulative,
  layoutSeries,
  linePath,
  seriesFor,
  smoothDays,
} from "./series";
import {
  CELL_COUNT,
  GAP_HOLD,
  JOBS,
  MAX_AGENTS,
  SCRIPT,
  SEND_HOLD,
  WORK_HOLD,
  applyAction,
  createInitialWork,
  createReducedWork,
  dartEase,
  jobFor,
  nextFreeCell,
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

test("jobs name a real action on a matching series", () => {
  assert.equal(jobFor("highlight Friday").series, "weekday");
  assert.equal(jobFor("highlight Friday").action.type, "highlight");
  assert.equal(jobFor("smooth equity").series, "equity");
  assert.equal(jobFor("raise win rate").action.type, "raise");
  assert.equal(jobFor("deepen the trough").series, "drawdown");
  assert.deepEqual(SCRIPT.slice(0, 4), [
    "highlight Friday",
    "smooth equity",
    "raise win rate",
    "deepen the trough",
  ]);
});

test("applyAction edits the named chart, not a random dimension", () => {
  const work = createInitialWork();
  const weekday = work.cells[0];
  const equity = work.cells[1];
  const winrate = work.cells[2];
  const drawdown = work.cells[3];
  if (!weekday || !equity || !winrate || !drawdown) throw new Error("missing cell");

  const highlighted = applyAction(weekday, { type: "highlight", day: "Fri" });
  assert.equal(highlighted.focus, "Fri");
  assert.equal(highlighted.kind, weekday.kind);
  assert.equal(highlighted.palette, weekday.palette);
  assert.deepEqual(
    highlighted.days.map((day) => day.pnl),
    weekday.days.map((day) => day.pnl),
  );

  const lifted = applyAction(weekday, { type: "nudge", day: "Tue", delta: 860 });
  assert.ok((lifted.days.find((day) => day.label === "Tue")?.pnl ?? 0) > -100);

  const before = equity.days[1]?.pnl ?? 0;
  const smoothed = applyAction(equity, { type: "smooth" });
  assert.notEqual(smoothed.days[1]?.pnl, before);
  assert.equal(smoothed.shape, "rounded");

  const raised = applyAction(winrate, { type: "raise", amount: 34 });
  assert.ok((raised.days[1]?.pnl ?? 0) > (winrate.days[1]?.pnl ?? 0));
  assert.equal(raised.focus, "Tue");
  assert.equal(raised.kind, "bars");

  const deep = applyAction(drawdown, { type: "trough", day: "Wed", delta: -14 });
  assert.ok((deep.days[2]?.pnl ?? 0) < (drawdown.days[2]?.pnl ?? 0));
  assert.equal(deep.focus, "Wed");
});

test("each job sends an agent to its own chart cell", () => {
  let work = createInitialWork();
  assert.equal(work.cells.length, CELL_COUNT);
  assert.equal(work.agents.length, 0);

  for (const job of JOBS.slice(0, 4)) {
    work = submitPrompt(work, job.text);
  }
  assert.equal(work.agents.length, 4);
  const cells = work.agents.map((agent) => agent.cellId).sort();
  assert.deepEqual(cells, [1, 2, 3, 4]);
  assert.deepEqual(
    work.agents.map((agent) => agent.prompt).sort(),
    JOBS.slice(0, 4).map((job) => job.text).sort(),
  );
  assert.equal(work.agents.find((agent) => agent.cellId === 1)?.day, "Fri");
  assert.equal(work.agents.find((agent) => agent.cellId === 4)?.day, "Wed");

  const extra = submitPrompt(work, "lift Tuesday");
  assert.ok(extra.agents.length <= MAX_AGENTS);
});

test("nextFreeCell skips busy cells then wraps", () => {
  assert.equal(nextFreeCell([], 1), 1);
  assert.equal(nextFreeCell([1], 1), 2);
  assert.equal(nextFreeCell([1, 2, 3, 4], 3), 3);
});

test("an agent on a cell clicks the named day and then idles", () => {
  const work = submitPrompt(createInitialWork(), "highlight Friday");
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = sampleStations(agent.cellId, agent.day);
  agent.target = agent.day;
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

test("reduced motion parks the pointer on the named day", () => {
  const work = submitPrompt(createInitialWork(), "highlight Friday");
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = sampleStations(agent.cellId, agent.day);
  agent.work = "click";
  agent.elapsed = 0.1;
  agent.duration = 0.28;
  agent.target = agent.day;
  const still = poseAgent(agent, true, stations);
  assert.equal(still.ripple, 0);
  assert.equal(still.x, stations.find((station) => station.id === "Fri")?.x);
});

test("autoplay sends a chip then spawns a pointer onto that chart", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  let work = createInitialWork();
  assert.equal(work.phase, "gap");
  assert.equal(work.outgoing, null);

  work = tickPlay(work, GAP_HOLD, composer);
  assert.equal(work.phase, "send");
  assert.equal(work.outgoing, "highlight Friday");
  assert.equal(work.agents.length, 0);

  work = tickPlay(work, SEND_HOLD, composer);
  assert.equal(work.phase, "work");
  assert.equal(work.outgoing, "highlight Friday");
  assert.equal(work.agents.length, 1);
  assert.equal(work.agents[0]?.cellId, 1);
  assert.equal(work.agents[0]?.prompt, "highlight Friday");
  assert.equal(work.agents[0]?.day, "Fri");
  assert.equal(work.agents[0]?.work, "spawn");
  assert.equal(work.agents[0]?.fromX, composer.x);
});

test("spawn holds on the message then darts to Friday", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  const work = submitPrompt(createInitialWork(), "highlight Friday", composer);
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  assert.equal(agent.work, "spawn");
  const stations = [composer, ...sampleStations(agent.cellId, agent.day).slice(1)];
  stepAgent(agent, 0.3, false, stations);
  assert.equal(agent.work, "dart");
  assert.equal(agent.target, "Fri");
  assert.equal(agent.fromX, composer.x);
  assert.equal(agent.toX, stations.find((station) => station.id === "Fri")?.x);
});

test("autoplay sequences later messages onto other cells", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  let work = createInitialWork();
  const seen = new Set<number>();
  for (let beat = 0; beat < 4; beat += 1) {
    work = tickPlay(work, GAP_HOLD, composer);
    work = tickPlay(work, SEND_HOLD, composer);
    const agent = work.agents.at(-1);
    if (agent) seen.add(agent.cellId);
    for (const item of work.agents) item.work = "idle";
    work = tickPlay(work, WORK_HOLD, composer);
    work = tickPlay(work, 0.3, composer);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4]);
  assert.equal(work.beat, 4);
});

test("reduced motion parks the first sent message and pointer", () => {
  const work = createReducedWork();
  assert.equal(work.outgoing, "highlight Friday");
  assert.equal(work.phase, "work");
  assert.equal(work.agents.length, 1);
  assert.equal(work.agents[0]?.work, "idle");
  assert.equal(work.cells[0]?.focus, "Fri");
  assert.equal(work.cells[0]?.job, "highlight Friday");
});

test("tiny layouts stay drawable after a relevant edit", () => {
  assert.ok(WEEKDAYS.some((day) => day.pnl < 0));
  assert.ok(WINRATE.every((day) => day.pnl > 0));
  assert.notEqual(seriesFor("equity")[1]?.pnl, WEEKDAYS[1]?.pnl);
  assert.equal(cumulative()[0]?.pnl, WEEKDAYS[0]?.pnl);
  const points = layoutSeries(WEEKDAYS, "rounded");
  assert.equal(points.length, 5);
  assert.match(linePath(points, false), /^M /);
  assert.match(areaPath(points, true), /Z$/);
  const smoothed = smoothDays(cloneDays(seriesFor("equity")));
  assert.notEqual(smoothed[1]?.pnl, seriesFor("equity")[1]?.pnl);
});
