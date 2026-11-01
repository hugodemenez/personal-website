import assert from "node:assert/strict";
import test from "node:test";
import {
  WEEKDAYS,
  WINRATE,
  areaPath,
  layoutSeries,
  linePath,
  pieCenter,
  pieSlices,
  seriesFor,
  slicePath,
  cumulative,
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
  valuesUnchanged,
} from "./work";

test("dart ease overshoots then settles", () => {
  assert.equal(dartEase(0), 0);
  assert.ok(dartEase(0.82) > 1);
  assert.ok(Math.abs(dartEase(1) - 1) < 1e-9);
});

test("jobs name design moves in full sentences", () => {
  assert.equal(jobFor("Switch this chart to a pie.").action.type, "kind");
  assert.equal(jobFor("Switch this chart to a pie.").series, "weekday");
  assert.equal(jobFor("Turn the equity series into a doughnut.").series, "equity");
  assert.equal(jobFor("Redraw the win rate as a line chart.").series, "winrate");
  assert.equal(jobFor("Try a mint palette on this cell.").action.type, "palette");
  assert.equal(jobFor("Use a soft stroke on this series.").action.type, "stroke");
  assert.deepEqual(SCRIPT.slice(0, 4), [
    "Switch this chart to a pie.",
    "Turn the equity series into a doughnut.",
    "Redraw the win rate as a line chart.",
    "Fill the drawdown series as an area chart.",
  ]);
  assert.ok(SCRIPT.every((text) => /^[A-Z].*\.$/.test(text)));
  assert.ok(SCRIPT.every((text) => text.split(/\s+/).length >= 5));
});

test("applyAction only changes design and never PnL values", () => {
  const work = createInitialWork();
  const weekday = work.cells[0];
  const equity = work.cells[1];
  const winrate = work.cells[2];
  const drawdown = work.cells[3];
  if (!weekday || !equity || !winrate || !drawdown) throw new Error("missing cell");

  const pie = applyAction(weekday, { type: "kind", kind: "pie" });
  assert.equal(pie.kind, "pie");
  assert.ok(valuesUnchanged(weekday, pie));

  const doughnut = applyAction(equity, { type: "kind", kind: "doughnut" });
  assert.equal(doughnut.kind, "doughnut");
  assert.ok(valuesUnchanged(equity, doughnut));

  const line = applyAction(winrate, { type: "kind", kind: "line" });
  assert.equal(line.kind, "line");
  assert.ok(valuesUnchanged(winrate, line));

  const mint = applyAction(weekday, { type: "palette", palette: "mint" });
  assert.equal(mint.palette, "mint");
  assert.ok(valuesUnchanged(weekday, mint));

  const soft = applyAction(equity, { type: "stroke", stroke: "soft" });
  assert.equal(soft.stroke, "soft");
  assert.ok(valuesUnchanged(equity, soft));

  const area = applyAction(drawdown, { type: "kind", kind: "area" });
  assert.equal(area.kind, "area");
  assert.ok(valuesUnchanged(drawdown, area));
});

test("each design job sends an agent to its chart cell", () => {
  let work = createInitialWork();
  assert.equal(work.cells.length, CELL_COUNT);
  assert.equal(work.agents.length, 0);

  for (const job of JOBS.slice(0, 4)) {
    work = submitPrompt(work, job.text);
  }
  assert.equal(work.agents.length, 4);
  assert.deepEqual(work.agents.map((agent) => agent.cellId).sort(), [1, 2, 3, 4]);
  assert.deepEqual(
    work.agents.map((agent) => agent.prompt).sort(),
    JOBS.slice(0, 4).map((job) => job.text).sort(),
  );

  const extra = submitPrompt(work, "Try a mint palette on this cell.");
  assert.ok(extra.agents.length <= MAX_AGENTS);
});

test("nextFreeCell skips busy cells then wraps", () => {
  assert.equal(nextFreeCell([], 1), 1);
  assert.equal(nextFreeCell([1], 1), 2);
  assert.equal(nextFreeCell([1, 2, 3, 4], 3), 3);
});

test("an agent clicks the plot, switches kind, then idles", () => {
  const work = submitPrompt(createInitialWork(), "Switch this chart to a pie.");
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = sampleStations(agent.cellId);
  agent.target = "plot";
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

test("reduced motion parks the pointer on the plot", () => {
  const work = submitPrompt(createInitialWork(), "Switch this chart to a pie.");
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = sampleStations(agent.cellId);
  agent.work = "click";
  agent.elapsed = 0.1;
  agent.duration = 0.28;
  agent.target = "plot";
  const still = poseAgent(agent, true, stations);
  assert.equal(still.ripple, 0);
  assert.equal(still.x, stations.find((station) => station.id === "plot")?.x);
});

test("autoplay sends a design chip then spawns a pointer", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  let work = createInitialWork();
  assert.equal(work.phase, "gap");
  assert.equal(work.outgoing, null);

  work = tickPlay(work, GAP_HOLD, composer);
  assert.equal(work.phase, "send");
  assert.equal(work.outgoing, "Switch this chart to a pie.");
  assert.equal(work.agents.length, 0);

  work = tickPlay(work, SEND_HOLD, composer);
  assert.equal(work.phase, "work");
  assert.equal(work.outgoing, "Switch this chart to a pie.");
  assert.equal(work.agents.length, 1);
  assert.equal(work.agents[0]?.cellId, 1);
  assert.equal(work.agents[0]?.prompt, "Switch this chart to a pie.");
  assert.equal(work.agents[0]?.work, "spawn");
});

test("spawn holds on the message then darts to the plot", () => {
  const composer = { id: "composer", cellId: 0, x: 16, y: 90 };
  const work = submitPrompt(createInitialWork(), "Switch this chart to a pie.", composer);
  const agent = work.agents[0];
  if (!agent) throw new Error("missing agent");
  const stations = [composer, ...sampleStations(agent.cellId).slice(1)];
  stepAgent(agent, 0.3, false, stations);
  assert.equal(agent.work, "dart");
  assert.equal(agent.target, "plot");
  assert.equal(agent.toX, stations.find((station) => station.id === "plot")?.x);
});

test("autoplay sequences later design jobs onto other cells", () => {
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

test("reduced motion settles on a pie without changing values", () => {
  const initial = createInitialWork();
  const work = createReducedWork();
  assert.equal(work.outgoing, "Switch this chart to a pie.");
  assert.equal(work.phase, "work");
  assert.equal(work.agents[0]?.work, "idle");
  assert.equal(work.cells[0]?.kind, "pie");
  assert.equal(work.cells[0]?.job, "Switch this chart to a pie.");
  assert.ok(initial.cells[0] && valuesUnchanged(initial.cells[0], work.cells[0]!));
});

test("layouts stay drawable and pie slices use the same values", () => {
  assert.ok(WEEKDAYS.some((day) => day.pnl < 0));
  assert.ok(WINRATE.every((day) => day.pnl > 0));
  assert.notEqual(seriesFor("equity")[1]?.pnl, WEEKDAYS[1]?.pnl);
  assert.equal(cumulative()[0]?.pnl, WEEKDAYS[0]?.pnl);
  const points = layoutSeries(WEEKDAYS, "rounded");
  assert.equal(points.length, 5);
  assert.match(linePath(points, false), /^M /);
  assert.match(areaPath(points, true), /Z$/);
  const slices = pieSlices(WEEKDAYS);
  assert.equal(slices.length, 5);
  assert.equal(slices.filter((slice) => slice.down).length, 2);
  const { cx, cy, radius } = pieCenter();
  const first = slices[0];
  if (!first) throw new Error("missing slice");
  assert.match(slicePath(cx, cy, radius, 0, first.start, first.end, first.large), /Z$/);
  assert.match(
    slicePath(cx, cy, radius, radius * 0.5, first.start, first.end, first.large),
    /Z$/,
  );
});
