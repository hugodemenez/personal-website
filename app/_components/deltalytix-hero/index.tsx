"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createRandom } from "@/lib/seeded-random";
import {
  DEFAULT_EDIT,
  type AgentSeed,
  type HeroEdit,
  type Station,
  applyStationEdit,
  createInitialAgents,
  poseAgent,
  relocateAgents,
  spawnAgents,
  stepAgent,
} from "./work";
import "./hero.css";

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

/** Lucide MousePointer2, filled — the working-agent cursor, not the cube. */
function PointerMark() {
  return (
    <g className="dx-hero-pointer-mark">
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
      id: node.dataset.station ?? "headline",
      x: rect.left - box.left + Math.min(rect.width * 0.42, 72),
      y: rect.top - box.top + Math.min(rect.height * 0.45, 18),
    };
  });
}

function paintNode(
  node: SVGGElement,
  agent: AgentSeed,
  pose: ReturnType<typeof poseAgent>,
) {
  const mark = node.querySelector("[data-pointer]");
  const caret = node.querySelector("[data-caret]");
  const ripple = node.querySelector("[data-ripple]");
  const deg = ((pose.tilt * 180) / Math.PI).toFixed(2);
  mark?.setAttribute(
    "transform",
    `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${deg}) scale(${pose.scale.toFixed(3)})`,
  );
  caret?.setAttribute(
    "transform",
    `translate(${agent.toX.toFixed(2)} ${(agent.toY - 8).toFixed(2)})`,
  );
  caret?.setAttribute("opacity", pose.caret.toFixed(3));
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

function flashClass(edit: HeroEdit, id: string) {
  return edit.flash === id ? "dx-hero-flash" : undefined;
}

export function DeltalytixHero() {
  const rootRef = useRef<HTMLElement>(null);
  const stationsRef = useRef<Station[]>([]);
  const nodes = useRef(new Map<number, SVGGElement>());
  const agentsRef = useRef<AgentSeed[]>(createInitialAgents());
  const paintRef = useRef<(still: boolean) => void>(() => {});
  const nextId = useRef(agentsRef.current.length + 1);
  const editRef = useRef(DEFAULT_EDIT);
  const [agents, setAgents] = useState<AgentSeed[]>(agentsRef.current);
  const [edit, setEdit] = useState<HeroEdit>(DEFAULT_EDIT);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
      className="dx-hero"
      aria-label="Deltalytix landing"
      onClick={multiply}
    >
      <div className="dx-hero-inner">
        <div className="dx-hero-nav" aria-hidden="true">
          <span className="dx-hero-brand">
            <DeltalytixIcon />
            Deltalytix
          </span>
          <span className="dx-hero-nav-links">
            <span>Features</span>
            <span>Pricing</span>
            <span>Sign in</span>
          </span>
        </div>
        <h3 data-station="headline" className={`dx-hero-title ${flashClass(edit, "headline") ?? ""}`}>
          {edit.headline}
        </h3>
        <p data-station="sub" className={`dx-hero-sub ${flashClass(edit, "sub") ?? ""}`}>
          {edit.sub}
        </p>
        <div className="dx-hero-actions">
          <a
            data-station="start"
            className={`dx-hero-cta${edit.highlight === "start" ? " is-lit" : ""} ${flashClass(edit, "start") ?? ""}`}
            href={SITE}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Get Started</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            data-station="features"
            className={`dx-hero-ghost${edit.highlight === "features" ? " is-lit" : ""} ${flashClass(edit, "features") ?? ""}`}
            href={`${SITE}/en#features`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Features</span>
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
      <div className="dx-hero-stage">
        <div className="dx-hero-card">
          <div className="dx-hero-card-head">
            <p className="dx-hero-kicker">AI-powered journaling</p>
            <p className="dx-hero-card-title">
              Ask the coach what the journal already knows.
            </p>
          </div>
          <div className="dx-hero-chat">
            <div className="dx-hero-chat-bar">
              <span>Chat</span>
              <span className="dx-hero-chat-meta">
                127 trades and 18 journal entries connected
              </span>
            </div>
            <div className="dx-hero-bubbles">
              <p
                data-station="question"
                className={`dx-hero-user ${flashClass(edit, "question") ?? ""}`}
              >
                {edit.question}
              </p>
              <p
                data-station="stat"
                className={`dx-hero-bot ${flashClass(edit, "stat") ?? ""}`}
              >
                Your journal entries reveal a clear pattern: after 2+ consecutive
                losses, you increase position size by {edit.size} and abandon your
                setup criteria. This revenge trading accounts for {edit.revenge} of
                your largest losses.
              </p>
            </div>
            <div data-station="composer" className="dx-hero-composer">
              <span>Ask your AI coach anything…</span>
              <span className="dx-hero-send" aria-hidden="true">↑</span>
            </div>
          </div>
        </div>
      </div>
      {size.width > 0 ? (
        <svg
          aria-hidden="true"
          className="dx-hero-agents"
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
                  ? "dx-hero-pointer is-spawn"
                  : "dx-hero-pointer"
              }
              data-kind={agent.kind}
            >
              <circle data-ripple="" className="dx-hero-ripple" r="0" opacity="0" />
              <rect
                data-caret=""
                className="dx-hero-caret"
                x="-0.6"
                y="0"
                width="1.2"
                height="8"
                rx="0.6"
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
