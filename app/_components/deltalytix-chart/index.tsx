"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  TILE_PLOT,
  areaPath,
  layoutSeries,
  linePath,
  pieCenter,
  pieSlices,
  slicePath,
  type ChartKind,
  type ChartShape,
  type ChartStroke,
  type DayPoint,
} from "./series";
import {
  type AgentSeed,
  type Station,
  applyAction,
  createInitialWork,
  createReducedWork,
  poseAgent,
  relocateAgents,
  stepAgent,
  tickPlay,
} from "./work";
import "./chart.css";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Lucide MousePointer2, filled — OS cursor, not the cube. */
function PointerMark() {
  return (
    <g className="dx-chart-pointer-mark">
      <path
        d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.941l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.941.063z"
        fill="currentColor"
        stroke="var(--background, #fff)"
        strokeLinejoin="round"
        strokeWidth="1.35"
        transform="translate(-4.2 -4.2)"
      />
    </g>
  );
}

function measureComposer(root: HTMLElement): Station {
  const box = root.getBoundingClientRect();
  const chip = root.querySelector<HTMLElement>("[data-chip]");
  const lane = root.querySelector<HTMLElement>("[data-station='composer']");
  const node = chip ?? lane;
  const rect = node?.getBoundingClientRect();
  return {
    id: "composer",
    cellId: 0,
    x: rect ? rect.left - box.left + rect.width * (chip ? 0.82 : 0.12) : 24,
    y: rect ? rect.top - box.top + rect.height * 0.55 : 120,
  };
}

function measureCells(root: HTMLElement): Map<number, Station[]> {
  const box = root.getBoundingClientRect();
  const byCell = new Map<number, Station[]>();
  for (const cell of root.querySelectorAll<HTMLElement>("article[data-cell]")) {
    const cellId = Number(cell.dataset.cell);
    const stations = [...cell.querySelectorAll<HTMLElement>("[data-station]")].map(
      (node) => {
        const rect = node.getBoundingClientRect();
        return {
          id: node.dataset.station ?? "plot",
          cellId,
          x: rect.left - box.left + rect.width / 2,
          y: rect.top - box.top + rect.height / 2,
        };
      },
    );
    byCell.set(cellId, stations);
  }
  return byCell;
}

function stationsFor(
  agent: AgentSeed,
  cells: Map<number, Station[]>,
  composer: Station,
): Station[] {
  return [composer, ...(cells.get(agent.cellId) ?? [])];
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
    ripple.setAttribute("r", (3 + pose.ripple * 10).toFixed(2));
    ripple.setAttribute(
      "opacity",
      pose.ripple > 0 ? (0.35 * (1 - pose.ripple)).toFixed(3) : "0",
    );
  }
}

function strokeWidth(stroke: ChartStroke, shape: ChartShape): number {
  if (stroke === "bold") return 2.5;
  if (stroke === "soft") return 1.85;
  return shape === "rounded" ? 1.5 : 1.15;
}

function Spark({
  kind,
  shape,
  stroke,
  days,
  label,
}: {
  kind: ChartKind;
  shape: ChartShape;
  stroke: ChartStroke;
  days: DayPoint[];
  label: string;
}) {
  const points = layoutSeries(days, shape);
  const smooth = shape === "rounded" || stroke === "soft";
  const dashed = shape === "markers";
  const radius = shape === "rounded" ? 1.4 : 0;
  const pie = kind === "pie" || kind === "doughnut";
  const { cx, cy, radius: pieR } = pieCenter();
  const inner = kind === "doughnut" ? pieR * 0.54 : 0;
  return (
    <svg
      data-station="plot"
      className="dx-chart-plot"
      viewBox={`0 0 ${TILE_PLOT.width} ${TILE_PLOT.height}`}
      role="img"
      aria-label={label}
    >
      {pie ? (
        pieSlices(days).map((slice) => (
          <path
            key={slice.label}
            className={`dx-chart-slice${slice.down ? " is-down" : ""}`}
            d={slicePath(cx, cy, pieR, inner, slice.start, slice.end, slice.large)}
          />
        ))
      ) : (
        <>
          <line
            className="dx-chart-zero"
            x1={TILE_PLOT.left}
            x2={TILE_PLOT.width - TILE_PLOT.right}
            y1={points[0]?.zeroY ?? TILE_PLOT.height / 2}
            y2={points[0]?.zeroY ?? TILE_PLOT.height / 2}
          />
          {kind === "bars"
            ? points.map((point) => (
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
                      r="1.3"
                    />
                  ) : null}
                </g>
              ))
            : (
                <>
                  {kind === "area" ? (
                    <path className="dx-chart-area" d={areaPath(points, smooth)} />
                  ) : null}
                  <path
                    className="dx-chart-series"
                    d={linePath(points, smooth)}
                    strokeWidth={strokeWidth(stroke, shape)}
                    strokeLinecap={smooth ? "round" : "butt"}
                    strokeDasharray={dashed ? "1.6 2" : undefined}
                  />
                </>
              )}
        </>
      )}
    </svg>
  );
}

export function DeltalytixChart() {
  const rootRef = useRef<HTMLElement>(null);
  const cellsRef = useRef(new Map<number, Station[]>());
  const composerRef = useRef<Station>({ id: "composer", cellId: 0, x: 24, y: 120 });
  const nodes = useRef(new Map<number, SVGGElement>());
  const workRef = useRef(createInitialWork());
  const paintRef = useRef<(still: boolean) => void>(() => {});
  const [work, setWork] = useState(workRef.current);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    composerRef.current = measureComposer(root);
    cellsRef.current = measureCells(root);
    relocateAgents(workRef.current.agents, cellsRef.current, composerRef.current);
  }, [work.cells, work.agents.length, work.outgoing, work.phase]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const still = window.matchMedia(QUERY);

    const sync = () => {
      const rect = root.getBoundingClientRect();
      composerRef.current = measureComposer(root);
      cellsRef.current = measureCells(root);
      relocateAgents(workRef.current.agents, cellsRef.current, composerRef.current);
      setSize({ width: rect.width, height: rect.height });
    };

    const paint = (reduced: boolean) => {
      for (const agent of workRef.current.agents) {
        const node = nodes.current.get(agent.id);
        if (!node) continue;
        paintNode(
          node,
          agent,
          poseAgent(
            agent,
            reduced,
            stationsFor(agent, cellsRef.current, composerRef.current),
          ),
        );
      }
    };
    paintRef.current = paint;
    if (still.matches) {
      workRef.current = createReducedWork();
      setWork(workRef.current);
    }
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
        const played = tickPlay(workRef.current, dt, composerRef.current);
        let changed = played !== workRef.current;
        let next = played;
        const nextCells = next.cells.map((cell) => ({
          ...cell,
          flash: false,
        }));
        let edited = false;
        for (const agent of next.agents) {
          const { edit } = stepAgent(
            agent,
            dt,
            false,
            stationsFor(agent, cellsRef.current, composerRef.current),
          );
          if (edit) {
            const index = nextCells.findIndex((cell) => cell.id === agent.cellId);
            if (index >= 0 && nextCells[index]) {
              nextCells[index] = applyAction(
                { ...nextCells[index], job: agent.prompt },
                agent.action,
              );
              edited = true;
            }
          }
        }
        if (edited) {
          next = { ...next, cells: nextCells };
          changed = true;
        }
        workRef.current = next;
        if (changed) setWork(next);
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

  return (
    <section
      ref={rootRef}
      className="dx-chart"
      aria-label="Agents receiving a message and editing Deltalytix chart sketches"
      data-count={work.agents.length}
      data-play={work.phase}
    >
      <div className="dx-chart-grid">
        {work.cells.map((cell) => (
          <article
            key={cell.id}
            data-cell={cell.id}
            data-kind={cell.kind}
            data-shape={cell.shape}
            data-palette={cell.palette}
            data-stroke={cell.stroke}
            data-series={cell.series}
            data-job={cell.job ?? undefined}
            className={`dx-chart-cell${cell.flash ? " is-flash" : ""}`}
          >
            <Spark
              kind={cell.kind}
              shape={cell.shape}
              stroke={cell.stroke}
              days={cell.days}
              label={cell.label}
            />
            <span className={cell.job ? "dx-chart-job" : "dx-chart-label"}>
              {cell.job ?? cell.label}
            </span>
          </article>
        ))}
      </div>
      <div className="dx-chart-lane" data-station="composer">
        <p className="dx-chart-hide" aria-live="polite">
          {work.outgoing ? `Sent ${work.outgoing}` : ""}
        </p>
        {work.outgoing ? (
          <p
            key={`${work.beat}-${work.outgoing}`}
            data-chip=""
            data-phase={work.phase}
            className="dx-chart-chip"
          >
            {work.outgoing}
          </p>
        ) : null}
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
              className="dx-chart-pointer is-spawn"
              data-agent-cell={agent.cellId}
              data-prompt={agent.prompt}
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
