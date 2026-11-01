"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  OVERLAY_PAD,
  type AgentSeed,
  createInitialAgents,
  pathBox,
  roamPose,
  spawnAgents,
} from "./orbit";
import "./agents.css";

const QUERY = "(prefers-reduced-motion: reduce)";

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

function AgentMark() {
  return (
    <g className="deltalytix-agent-mark">
      <path
        d="M-5.1 0 H3.2 M0.4 -2.85 L5.15 0 L0.4 2.85"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.15"
      />
    </g>
  );
}

export function DeltalytixMark({ className }: { className: string }) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const nodes = useRef(new Map<number, SVGGElement>());
  const agentsRef = useRef<AgentSeed[]>(createInitialAgents());
  const paintRef = useRef<(time: number) => void>(() => {});
  const nextId = useRef(agentsRef.current.length + 1);
  const [agents, setAgents] = useState<AgentSeed[]>(agentsRef.current);
  const [overlay, setOverlay] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const word = wordRef.current;
    if (!word) return;

    const still = window.matchMedia(QUERY);

    const boxOf = () => {
      const rect = word.getBoundingClientRect();
      return {
        rect,
        box: pathBox(rect.width, rect.height),
        overlay: {
          width: rect.width + OVERLAY_PAD * 2,
          height: rect.height + OVERLAY_PAD * 2,
        },
      };
    };

    const paint = (time: number) => {
      const { box } = boxOf();
      for (const seed of agentsRef.current) {
        const node = nodes.current.get(seed.id);
        if (!node) continue;
        const pose = roamPose(
          box.width,
          box.height,
          box.radius,
          seed,
          seed.t,
          time,
          still.matches,
        );
        const deg = (pose.angle * 180) / Math.PI;
        node.setAttribute(
          "transform",
          `translate(${(pose.x + box.offsetX).toFixed(2)} ${(pose.y + box.offsetY).toFixed(2)}) rotate(${deg.toFixed(2)}) scale(${seed.size})`,
        );
      }
    };
    paintRef.current = paint;

    const syncOverlay = () => {
      setOverlay(boxOf().overlay);
    };

    syncOverlay();
    paint(0);

    const observer = new ResizeObserver(() => {
      syncOverlay();
      paint(performance.now() / 1000);
    });
    observer.observe(word);

    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const seconds = now / 1000;
      const dt = last === 0 ? 0 : Math.min(0.05, seconds - last);
      last = seconds;
      if (!still.matches) {
        for (const seed of agentsRef.current) {
          seed.t += seed.speed * dt;
        }
      }
      paint(seconds);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || still.matches) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      paint(0);
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
    const next = spawnAgents(agentsRef.current, nextId.current);
    nextId.current = next.nextId;
    agentsRef.current = next.agents;
    setAgents(next.agents);
  };

  return (
    <a
      className={className}
      href="https://deltalytix.app"
      rel="noopener noreferrer"
      target="_blank"
      onClick={multiply}
    >
      <DeltalytixIcon />
      <span className="deltalytix-word">
        <span ref={wordRef}>Deltalytix</span>
        {overlay.width > 0 ? (
          <svg
            aria-hidden="true"
            className="deltalytix-agents"
            width={overlay.width}
            height={overlay.height}
            viewBox={`0 0 ${overlay.width} ${overlay.height}`}
          >
            {agents.map((agent) => (
              <g
                key={agent.id}
                ref={(node) => {
                  if (node) {
                    nodes.current.set(agent.id, node);
                    paintRef.current(performance.now() / 1000);
                  } else {
                    nodes.current.delete(agent.id);
                  }
                }}
                className={
                  agent.kind === "swarm"
                    ? "deltalytix-agent is-spawn"
                    : "deltalytix-agent"
                }
                data-kind={agent.kind}
              >
                <AgentMark />
              </g>
            ))}
          </svg>
        ) : null}
      </span>
    </a>
  );
}
