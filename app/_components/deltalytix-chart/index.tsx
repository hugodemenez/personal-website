"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
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
  type CellState,
  type Station,
  applyTweak,
  createInitialWork,
  poseAgent,
  relocateAgents,
  stepAgent,
  submitPrompt,
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
  const node = root.querySelector<HTMLElement>("[data-station='composer']");
  const rect = node?.getBoundingClientRect();
  return {
    id: "composer",
    cellId: 0,
    x: rect ? rect.left - box.left + Math.min(rect.width * 0.12, 28) : 24,
    y: rect ? rect.top - box.top + rect.height * 0.45 : 120,
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
          x: rect.left - box.left + Math.min(rect.width * 0.55, 36),
          y: rect.top - box.top + Math.min(rect.height * 0.45, 10),
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

function Spark({
  kind,
  shape,
  series,
  label,
}: {
  kind: ChartKind;
  shape: ChartShape;
  series: CellState["series"];
  label: string;
}) {
  const points = layoutSeries(seriesFor(series), shape);
  const smooth = shape === "rounded";
  const dashed = shape === "markers";
  const radius = shape === "rounded" ? 1.2 : 0;
  return (
    <svg
      data-station="plot"
      className="dx-chart-plot"
      viewBox={`0 0 ${TILE_PLOT.width} ${TILE_PLOT.height}`}
      role="img"
      aria-label={label}
    >
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
                strokeWidth={smooth ? 1.5 : 1.1}
                strokeLinecap={smooth ? "round" : "butt"}
                strokeDasharray={dashed ? "1.6 2" : undefined}
              />
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
  const [draft, setDraft] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    composerRef.current = measureComposer(root);
    cellsRef.current = measureCells(root);
    relocateAgents(workRef.current.agents, cellsRef.current, composerRef.current);
  }, [work.cells, work.agents.length]);

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
        const nextCells = workRef.current.cells.map((cell) => ({
          ...cell,
          flash: false,
        }));
        for (const agent of workRef.current.agents) {
          const { edit } = stepAgent(
            agent,
            dt,
            false,
            stationsFor(agent, cellsRef.current, composerRef.current),
          );
          if (edit) {
            const index = nextCells.findIndex((cell) => cell.id === agent.cellId);
            if (index >= 0 && nextCells[index]) {
              nextCells[index] = applyTweak(
                { ...nextCells[index], job: agent.prompt },
                agent.tweak,
                createRandom(`edit-${agent.id}-${agent.tweaksLeft}`),
              );
              changed = true;
            }
          }
        }
        if (changed) {
          workRef.current = { ...workRef.current, cells: nextCells };
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = submitPrompt(workRef.current, draft, composerRef.current);
    if (next === workRef.current) return;
    const still = window.matchMedia(QUERY);
    if (still.matches) {
      next.cells = next.cells.map((cell) => {
        const agent = next.agents.find((item) => item.cellId === cell.id);
        if (!agent || cell.id !== next.agents.at(-1)?.cellId) return cell;
        return applyTweak({ ...cell, job: agent.prompt }, agent.tweak, () => 0.2);
      });
      for (const agent of next.agents) agent.work = "idle";
    }
    workRef.current = next;
    setWork(next);
    setDraft("");
  };

  return (
    <section
      ref={rootRef}
      className="dx-chart"
      aria-label="Deltalytix chart sketches"
      data-count={work.agents.length}
    >
      <div className="dx-chart-head">
        <a
          className="dx-chart-brand"
          href={SITE}
          rel="noopener noreferrer"
          target="_blank"
        >
          <DeltalytixIcon />
          Deltalytix
        </a>
      </div>
      <div className="dx-chart-grid">
        {work.cells.map((cell) => (
          <article
            key={cell.id}
            data-cell={cell.id}
            data-kind={cell.kind}
            data-shape={cell.shape}
            data-palette={cell.palette}
            className={`dx-chart-cell${cell.flash ? " is-flash" : ""}`}
          >
            <Spark
              kind={cell.kind}
              shape={cell.shape}
              series={cell.series}
              label={cell.label}
            />
            <span className={cell.job ? "dx-chart-job" : "dx-chart-label"}>
              {cell.job ?? cell.label}
            </span>
          </article>
        ))}
      </div>
      <form className="dx-chart-box" onSubmit={onSubmit}>
        <label className="dx-chart-hide" htmlFor="dx-chart-prompt">
          Chart prompt
        </label>
        <input
          id="dx-chart-prompt"
          data-station="composer"
          className="dx-chart-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="a small tweak…"
          autoComplete="off"
        />
        <button className="dx-chart-go" type="submit" aria-label="Go to work">
          →
        </button>
      </form>
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
