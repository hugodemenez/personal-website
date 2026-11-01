"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRandom } from "@/lib/seeded-random";
import {
  PLOT,
  areaPath,
  layoutSeries,
  linePath,
  seriesForKind,
  titleForKind,
  type ChartKind,
  type ChartShape,
} from "./series";
import {
  DEFAULT_EDIT,
  KINDS,
  PALETTES,
  SHAPES,
  type AgentSeed,
  type ChartEdit,
  type Station,
  applyStationEdit,
  createInitialAgents,
  poseAgent,
  relocateAgents,
  spawnAgents,
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

function measureStations(root: HTMLElement): Station[] {
  const box = root.getBoundingClientRect();
  return [...root.querySelectorAll<HTMLElement>("[data-station]")].map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      id: node.dataset.station ?? "plot",
      x: rect.left - box.left + Math.min(rect.width * 0.42, 64),
      y: rect.top - box.top + Math.min(rect.height * 0.5, 16),
    };
  });
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
  const radius = shape === "rounded" ? 3.2 : 0;
  const stroke = shape === "sharp" ? 1.5 : 2.3;

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
                r="3.1"
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
        strokeDasharray={dashed ? "3 3.5" : undefined}
      />
      {shape === "markers"
        ? points.map((point) =>
            smooth ? (
              <circle
                key={point.label}
                className="dx-chart-mark"
                cx={point.x}
                cy={point.y}
                r="3.1"
              />
            ) : (
              <rect
                key={point.label}
                className="dx-chart-mark"
                x={point.x - 2.6}
                y={point.y - 2.6}
                width="5.2"
                height="5.2"
              />
            ),
          )
        : null}
    </>
  );
}

export function DeltalytixChart() {
  const rootRef = useRef<HTMLElement>(null);
  const stationsRef = useRef<Station[]>([]);
  const nodes = useRef(new Map<number, SVGGElement>());
  const agentsRef = useRef<AgentSeed[]>(createInitialAgents());
  const paintRef = useRef<(still: boolean) => void>(() => {});
  const nextId = useRef(agentsRef.current.length + 1);
  const editRef = useRef(DEFAULT_EDIT);
  const [agents, setAgents] = useState<AgentSeed[]>(agentsRef.current);
  const [edit, setEdit] = useState<ChartEdit>(DEFAULT_EDIT);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const points = useMemo(
    () => layoutSeries(seriesForKind(edit.kind), edit.shape),
    [edit.kind, edit.shape],
  );

  useLayoutEffect(() => {
    editRef.current = edit;
    const root = rootRef.current;
    if (!root) return;
    stationsRef.current = measureStations(root);
    relocateAgents(agentsRef.current, stationsRef.current);
  }, [edit]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const still = window.matchMedia(QUERY);

    const sync = () => {
      const rect = root.getBoundingClientRect();
      stationsRef.current = measureStations(root);
      relocateAgents(agentsRef.current, stationsRef.current);
      setSize({ width: rect.width, height: rect.height });
    };

    const paint = (reduced: boolean) => {
      for (const agent of agentsRef.current) {
        const node = nodes.current.get(agent.id);
        if (!node) continue;
        paintNode(node, agent, poseAgent(agent, reduced, stationsRef.current));
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
        for (const agent of agentsRef.current) {
          const { editStation } = stepAgent(
            agent,
            dt,
            false,
            stationsRef.current,
          );
          if (editStation) {
            const next = applyStationEdit(
              editRef.current,
              editStation,
              createRandom(`edit-${agent.id}-${editStation}-${agent.elapsed}`),
            );
            editRef.current = next;
            setEdit(next);
          }
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
    const next = spawnAgents(
      agentsRef.current,
      nextId.current,
      stationsRef.current,
    );
    nextId.current = next.nextId;
    agentsRef.current = next.agents;
    setAgents(next.agents);
  };

  return (
    <section
      ref={rootRef}
      className="dx-chart"
      aria-label="Deltalytix chart example"
      data-kind={edit.kind}
      data-shape={edit.shape}
      data-palette={edit.palette}
      onClick={multiply}
    >
      <div className="dx-chart-card">
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
          <p className="dx-chart-title">{titleForKind(edit.kind)}</p>
        </div>
        <div className="dx-chart-tunes">
          <div
            data-station="shape"
            className={`dx-chart-row${edit.flash === "shape" ? " is-flash" : ""}`}
          >
            <span className="dx-chart-label">Shapes</span>
            <div className="dx-chart-chips">
              {SHAPES.map((shape) => (
                <span
                  key={shape}
                  className={`dx-chart-chip${edit.shape === shape ? " is-on" : ""}`}
                >
                  {shape}
                </span>
              ))}
            </div>
          </div>
          <div
            data-station="color"
            className={`dx-chart-row${edit.flash === "color" ? " is-flash" : ""}`}
          >
            <span className="dx-chart-label">Colors</span>
            <div className="dx-chart-swatches">
              {PALETTES.map((palette) => (
                <span
                  key={palette}
                  data-tone={palette}
                  className={`dx-chart-swatch${edit.palette === palette ? " is-on" : ""}`}
                />
              ))}
            </div>
          </div>
          <div
            data-station="kind"
            className={`dx-chart-row${edit.flash === "kind" ? " is-flash" : ""}`}
          >
            <span className="dx-chart-label">Kinds</span>
            <div className="dx-chart-chips">
              {KINDS.map((kind) => (
                <span
                  key={kind}
                  className={`dx-chart-chip${edit.kind === kind ? " is-on" : ""}`}
                >
                  {kind === "bars" ? "weekday" : kind}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="dx-chart-plot-wrap">
          <svg
            data-station="plot"
            className={`dx-chart-plot${edit.flash === "plot" ? " is-flash" : ""}`}
            viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
            role="img"
            aria-label={titleForKind(edit.kind)}
          >
            <line
              className="dx-chart-zero"
              x1={PLOT.left}
              x2={PLOT.width - PLOT.right}
              y1={points[0]?.zeroY ?? 90}
              y2={points[0]?.zeroY ?? 90}
            />
            <ChartMarks kind={edit.kind} shape={edit.shape} points={points} />
            {points.map((point) => (
              <text
                key={point.label}
                className="dx-chart-axis"
                x={point.x}
                y={PLOT.height - 10}
                textAnchor="middle"
              >
                {point.label}
              </text>
            ))}
          </svg>
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
          {agents.map((agent) => (
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
            >
              <circle data-ripple="" className="dx-chart-ripple" fill="none" r="0" opacity="0" />
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
