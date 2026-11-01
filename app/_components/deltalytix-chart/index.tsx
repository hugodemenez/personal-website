"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createRandom } from "@/lib/seeded-random";
import {
  TILE_PLOT,
  areaPath,
  layoutSeries,
  linePath,
  seriesFor,
  type ChartKind,
  type ChartShape,
} from "./series";
import {
  type AgentSeed,
  type Station,
  type TileState,
  applyTileWork,
  createInitialWork,
  poseAgent,
  relocateAgents,
  spawnWork,
  stepAgent,
} from "./work";
import "./chart.css";

const QUERY = "(prefers-reduced-motion: reduce)";
const SITE = "https://deltalytix.app";

function DeltalytixIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 shrink-0 fill-current"
      viewBox="0 0 255 255"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M159 63L127.5 0V255H255L236.5 218H159V63Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 255L127.5 0V255H0ZM64 217L121 104V217H64Z"
      />
    </svg>
  );
}

/** Lucide MousePointer2, filled — OS cursor, not the cube. */
function PointerMark() {
  return (
    <g className="dx-chart-pointer-mark">
      <path
        d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.941l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.941.063z"
        fill="#111"
        stroke="#fff"
        strokeLinejoin="round"
        strokeWidth="1.35"
        transform="translate(-4.2 -4.2)"
      />
    </g>
  );
}

function measureStations(root: HTMLElement): Map<number, Station[]> {
  const box = root.getBoundingClientRect();
  const byTile = new Map<number, Station[]>();
  for (const tile of root.querySelectorAll<HTMLElement>("[data-tile]")) {
    const tileId = Number(tile.dataset.tile);
    const stations: Station[] = [...tile.querySelectorAll<HTMLElement>("[data-station]")].map(
      (node) => {
        const rect = node.getBoundingClientRect();
        return {
          id: node.dataset.station ?? "plot",
          tileId,
          x: rect.left - box.left + Math.min(rect.width * 0.45, 48),
          y: rect.top - box.top + Math.min(rect.height * 0.5, 14),
        };
      },
    );
    byTile.set(tileId, stations);
  }
  return byTile;
}

function paintNode(
  node: SVGGElement,
  agent: AgentSeed,
  pose: ReturnType<typeof poseAgent>,
) {
  const mark = node.querySelector("[data-pointer]");
  const ripple = node.querySelector("[data-ripple]");
  const deg = ((pose.tilt * 180) / Math.PI).toFixed(2);
  mark?.setAttribute(
    "transform",
    `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${deg}) scale(${pose.scale.toFixed(3)})`,
  );
  if (ripple instanceof SVGCircleElement) {
    ripple.setAttribute("cx", agent.toX.toFixed(2));
    ripple.setAttribute("cy", agent.toY.toFixed(2));
    ripple.setAttribute("r", (4 + pose.ripple * 14).toFixed(2));
    ripple.setAttribute(
      "opacity",
      pose.ripple > 0 ? (0.4 * (1 - pose.ripple)).toFixed(3) : "0",
    );
  }
}

function ChartMarks({
  kind,
  shape,
  points,
}: {
  kind: ChartKind;
  shape: ChartShape;
  points: ReturnType<typeof layoutSeries>;
}) {
  const smooth = shape === "rounded";
  const dashed = shape === "markers";
  const radius = shape === "rounded" ? 2.2 : 0;
  const stroke = shape === "sharp" ? 1.3 : 1.9;

  if (kind === "bars") {
    return (
      <>
        {points.map((point) => (
          <g key={point.label}>
            <rect
              className={`dx-chart-bar${point.value < 0 ? " is-down" : ""}`}
              x={point.bar.x}
              y={point.bar.y}
              width={point.bar.width}
              height={point.bar.height}
              rx={radius}
            />
            {shape === "markers" ? (
              <circle
                className={`dx-chart-mark${point.value < 0 ? " is-down" : ""}`}
                cx={point.x}
                cy={point.y}
                r="2.2"
              />
            ) : null}
          </g>
        ))}
      </>
    );
  }

  return (
    <>
      {kind === "area" ? (
        <path className="dx-chart-area" d={areaPath(points, smooth)} />
      ) : null}
      <path
        className="dx-chart-series"
        d={linePath(points, smooth)}
        strokeWidth={stroke}
        strokeLinecap={smooth ? "round" : "butt"}
        strokeLinejoin={smooth ? "round" : "miter"}
        strokeDasharray={dashed ? "2.5 3" : undefined}
      />
      {shape === "markers"
        ? points.map((point) =>
            smooth ? (
              <circle
                key={point.label}
                className="dx-chart-mark"
                cx={point.x}
                cy={point.y}
                r="2.2"
              />
            ) : (
              <rect
                key={point.label}
                className="dx-chart-mark"
                x={point.x - 1.8}
                y={point.y - 1.8}
                width="3.6"
                height="3.6"
              />
            ),
          )
        : null}
    </>
  );
}

function MiniChart({ tile }: { tile: TileState }) {
  if (tile.stage === "blank") {
    return (
      <svg
        data-station="plot"
        className="dx-chart-plot"
        viewBox={`0 0 ${TILE_PLOT.width} ${TILE_PLOT.height}`}
        role="img"
        aria-label={`${tile.label}, waiting`}
      >
        <line
          className="dx-chart-zero"
          x1={TILE_PLOT.left}
          x2={TILE_PLOT.width - TILE_PLOT.right}
          y1={TILE_PLOT.height / 2}
          y2={TILE_PLOT.height / 2}
        />
        <text
          className="dx-chart-empty"
          x={TILE_PLOT.width / 2}
          y={TILE_PLOT.height / 2 + 12}
          textAnchor="middle"
        >
          reading prompt
        </text>
      </svg>
    );
  }

  const points = layoutSeries(seriesFor(tile.series), tile.shape);
  return (
    <svg
      data-station="plot"
      className="dx-chart-plot"
      viewBox={`0 0 ${TILE_PLOT.width} ${TILE_PLOT.height}`}
      role="img"
      aria-label={tile.label}
    >
      <line
        className="dx-chart-zero"
        x1={TILE_PLOT.left}
        x2={TILE_PLOT.width - TILE_PLOT.right}
        y1={points[0]?.zeroY ?? TILE_PLOT.height / 2}
        y2={points[0]?.zeroY ?? TILE_PLOT.height / 2}
      />
      <ChartMarks kind={tile.kind} shape={tile.shape} points={points} />
      {points.map((point) => (
        <text
          key={point.label}
          className="dx-chart-axis"
          x={point.x}
          y={TILE_PLOT.height - 3}
          textAnchor="middle"
        >
          {point.label.slice(0, 1)}
        </text>
      ))}
    </svg>
  );
}

export function DeltalytixChart() {
  const rootRef = useRef<HTMLElement>(null);
  const stationsRef = useRef(new Map<number, Station[]>());
  const nodes = useRef(new Map<number, SVGGElement>());
  const workRef = useRef(createInitialWork());
  const paintRef = useRef<(still: boolean) => void>(() => {});
  const [work, setWork] = useState(workRef.current);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    stationsRef.current = measureStations(root);
    relocateAgents(workRef.current.agents, stationsRef.current);
  }, [work.tiles]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const still = window.matchMedia(QUERY);

    const sync = () => {
      const rect = root.getBoundingClientRect();
      stationsRef.current = measureStations(root);
      relocateAgents(workRef.current.agents, stationsRef.current);
      setSize({ width: rect.width, height: rect.height });
    };

    const paint = (reduced: boolean) => {
      for (const agent of workRef.current.agents) {
        const node = nodes.current.get(agent.id);
        if (!node) continue;
        const stations = stationsRef.current.get(agent.id) ?? [];
        paintNode(node, agent, poseAgent(agent, reduced, stations));
      }
    };
    paintRef.current = paint;

    sync();
    paint(still.matches);

    const observer = new ResizeObserver(() => {
      sync();
      paint(still.matches);
    });
    observer.observe(root);

    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const seconds = now / 1000;
      const dt = last === 0 ? 0 : Math.min(0.05, seconds - last);
      last = seconds;
      if (!still.matches && dt > 0) {
        let changed = false;
        const nextTiles = workRef.current.tiles.map((tile) => ({ ...tile, flash: false }));
        for (const agent of workRef.current.agents) {
          const stations = stationsRef.current.get(agent.id) ?? [];
          const { edit } = stepAgent(agent, dt, false, stations);
          if (edit) {
            const index = nextTiles.findIndex((tile) => tile.id === agent.id);
            if (index >= 0 && nextTiles[index]) {
              nextTiles[index] = applyTileWork(
                nextTiles[index],
                createRandom(`edit-${agent.id}-${agent.elapsed}`),
              );
              changed = true;
            }
          }
        }
        if (changed) {
          workRef.current = { ...workRef.current, tiles: nextTiles };
          setWork(workRef.current);
        }
      }
      paint(still.matches);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || still.matches) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      paint(true);
    };

    start();
    const onMotion = () => {
      if (still.matches) stop();
      else start();
    };
    still.addEventListener("change", onMotion);

    return () => {
      observer.disconnect();
      still.removeEventListener("change", onMotion);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const multiply = () => {
    const next = spawnWork(workRef.current);
    workRef.current = next;
    setWork(next);
  };

  return (
    <section
      ref={rootRef}
      className="dx-chart"
      aria-label="Deltalytix chart fleet"
      data-count={work.tiles.length}
      onClick={multiply}
    >
      <div className="dx-chart-shell">
        <div className="dx-chart-head">
          <a
            className="dx-chart-brand"
            href={SITE}
            rel="noopener noreferrer"
            target="_blank"
            onClick={(event) => event.stopPropagation()}
          >
            <DeltalytixIcon />
            Deltalytix
          </a>
          <p className="dx-chart-count">
            {work.tiles.length} {work.tiles.length === 1 ? "prompt" : "prompts"}
          </p>
        </div>
        <div className="dx-chart-grid" data-count={work.tiles.length}>
          {work.tiles.map((tile) => (
            <article
              key={tile.id}
              data-tile={tile.id}
              data-prompt={tile.promptId}
              data-stage={tile.stage}
              data-palette={tile.palette}
              className={`dx-chart-tile${tile.id > 1 ? " is-spawn" : ""}${tile.flash ? " is-flash" : ""}`}
            >
              <span data-station="prompt" className="dx-chart-prompt">
                {tile.label}
              </span>
              <MiniChart tile={tile} />
            </article>
          ))}
        </div>
      </div>
      {size.width > 0 ? (
        <svg
          aria-hidden="true"
          className="dx-chart-agents"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
        >
          {work.agents.map((agent) => (
            <g
              key={agent.id}
              ref={(node) => {
                if (node) {
                  nodes.current.set(agent.id, node);
                  paintRef.current(window.matchMedia(QUERY).matches);
                } else {
                  nodes.current.delete(agent.id);
                }
              }}
              className={
                agent.kind === "swarm"
                  ? "dx-chart-pointer is-spawn"
                  : "dx-chart-pointer"
              }
              data-kind={agent.kind}
              data-prompt={agent.promptId}
            >
              <circle
                data-ripple=""
                className="dx-chart-ripple"
                fill="none"
                r="0"
                opacity="0"
              />
              <g data-pointer="">
                <PointerMark />
              </g>
            </g>
          ))}
        </svg>
      ) : null}
    </section>
  );
}
