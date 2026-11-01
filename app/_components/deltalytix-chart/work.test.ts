import assert from "node:assert/strict";
import test from "node:test";
import { createRandom } from "@/lib/seeded-random";
import {
  WINRATE,
  areaPath,
  cumulative,
  layoutSeries,
  linePath,
  seriesFor,
  WEEKDAYS,
} from "./series";
import {
  MAX_AGENTS,
  PROMPTS,
  SPAWN_PER_CLICK,
  applyTileWork,
  createAgent,
  createInitialWork,
  dartEase,
  nextWork,
  pickPrompt,
  poseAgent,
  sampleStationsFor,
  spawnWork,
  stepAgent,
  tileFromPrompt,
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

test("each spawned agent gets a unique unused prompt and its own tile", () => {
  let work = createInitialWork();
  assert.equal(work.agents.length, 1);
  assert.equal(work.tiles.length, 1);
  assert.equal(work.agents[0]?.promptId, work.tiles[0]?.promptId);
  assert.equal(work.tiles[0]?.stage, "done");
  assert.equal(work.tiles[0]?.label, "weekday P&L");

  const seen = new Set(work.tiles.map((tile) => tile.promptId));
  while (work.agents.length < MAX_AGENTS) {
    const next = spawnWork(work);
    assert.equal(next.agents.length, work.agents.length + SPAWN_PER_CLICK);
    assert.equal(next.tiles.length, next.agents.length);
    const added = next.tiles.filter((tile) => !work.tiles.some((old) => old.id === tile.id));
    for (const tile of added) {
      assert.equal(seen.has(tile.promptId), false);
      seen.add(tile.promptId);
      assert.equal(tile.stage, "blank");
      assert.equal(
        next.agents.find((agent) => agent.id === tile.id)?.promptId,
        tile.promptId,
      );
    }
    work = next;
  }
  assert.equal(work.agents.length, MAX_AGENTS);
  assert.equal(spawnWork(work).agents.length, MAX_AGENTS);
  assert.equal(seen.size, MAX_AGENTS);
});

test("pickPrompt skips prompts already in use", () => {
  const first = pickPrompt(["weekday"], 2);
  assert.notEqual(first.id, "weekday");
  const used = PROMPTS.map((prompt) => prompt.id);
  assert.ok(used.includes(pickPrompt(used, 9).id));
});

test("tile work builds blank → kind → shape → color → done, then tunes inside the lock", () => {
  const rand = createRandom("tile-build");
  let tile = tileFromPrompt(2, PROMPTS[3], "blank");
  assert.equal(tile.stage, "blank");
  tile = applyTileWork(tile, rand);
  assert.equal(tile.stage, "kind");
  assert.equal(tile.kind, PROMPTS[3].kind);
  tile = applyTileWork(tile, rand);
  assert.equal(tile.stage, "shape");
  tile = applyTileWork(tile, rand);
  assert.equal(tile.stage, "color");
  assert.equal(tile.palette, PROMPTS[3].palette);
  tile = applyTileWork(tile, rand);
  assert.equal(tile.stage, "done");

  const locked = applyTileWork(tile, rand);
  assert.equal(locked.palette, tile.palette);
  assert.ok(locked.shape !== tile.shape || locked.kind !== tile.kind);
});

test("an agent only steps between stations on its own tile", () => {
  const mine = sampleStationsFor(3);
  const other = sampleStationsFor(4);
  assert.ok(mine.every((station) => station.tileId === 3));
  assert.ok(other.every((station) => station.tileId === 4));
  const agent = createAgent(3, "swarm", PROMPTS[2], mine);
  agent.station = 1;
  agent.work = "click";
  agent.elapsed = 0;
  agent.duration = 0.3;
  agent.toX = mine[1]?.x ?? 0;
  agent.toY = mine[1]?.y ?? 0;
  let edited = false;
  for (let i = 0; i < 40; i += 1) {
    const step = stepAgent(agent, 1 / 30, false, mine);
    if (step.edit) edited = true;
    const station = mine[agent.station];
    assert.equal(station?.tileId, 3);
  }
  assert.equal(edited, true);
});

test("reduced motion parks the pointer on its own tile", () => {
  const stations = sampleStationsFor(1);
  const agent = createAgent(1, "lead", PROMPTS[0], stations);
  agent.work = "click";
  agent.elapsed = 0.08;
  agent.duration = 0.3;
  agent.toX = stations[1]?.x ?? 0;
  agent.toY = stations[1]?.y ?? 0;
  const live = poseAgent(agent, false, stations);
  const still = poseAgent(agent, true, stations);
  assert.ok(live.scale < agent.size);
  assert.equal(still.x, stations[agent.station]?.x);
  assert.equal(still.ripple, 0);
});

test("weekday, equity, and win rate series stay distinct", () => {
  assert.ok(WEEKDAYS.some((day) => day.pnl < 0));
  assert.ok(WINRATE.every((day) => day.pnl > 0));
  assert.notEqual(seriesFor("equity")[1]?.pnl, WEEKDAYS[1]?.pnl);
  assert.equal(cumulative()[0]?.pnl, WEEKDAYS[0]?.pnl);
  const points = layoutSeries(WEEKDAYS, "rounded");
  assert.equal(points.length, 5);
  assert.match(linePath(points, false), /^M /);
  assert.match(areaPath(points, true), /Z$/);
});
