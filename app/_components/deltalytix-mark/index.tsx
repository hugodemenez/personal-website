"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  OVERLAY_PAD,
  type AgentSeed,
  createInitialAgents,
  poseAgent,
  resizeAgent,
  spawnAgents,
  stepAgent,
} from "./work";
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

/** Official Cursor 2D cube, inset on the rounded agent chip. */
function CursorAgentMark() {
  return (
    <g className="cursor-agent-mark">
      <rect
        className="cursor-agent-chip"
        x="-6"
        y="-6"
        width="12"
        height="12"
        rx="2.6"
      />
      <g transform="translate(0 0.1) scale(0.0182)">
        <g transform="translate(-233.365 -266.045)">
          <path
            className="cursor-agent-cube"
            fillRule="evenodd"
            d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"
          />
        </g>
      </g>
    </g>
  );
}

function paintNode(
  node: SVGGElement,
  agent: AgentSeed,
  pose: ReturnType<typeof poseAgent>,
) {
  const avatar = node.querySelector("[data-avatar]");
  const caret = node.querySelector("[data-caret]");
  const ripple = node.querySelector("[data-ripple]");
  const x = (pose.x + OVERLAY_PAD).toFixed(2);
  const y = (pose.y + OVERLAY_PAD).toFixed(2);
  const workX = (agent.toX + OVERLAY_PAD).toFixed(2);
  const workY = (agent.toY + OVERLAY_PAD).toFixed(2);
  const deg = ((pose.tilt * 180) / Math.PI).toFixed(2);
  avatar?.setAttribute(
    "transform",
    `translate(${x} ${y}) rotate(${deg}) scale(${pose.scale.toFixed(3)})`,
  );
  caret?.setAttribute("transform", `translate(${workX} ${workY})`);
  caret?.setAttribute("opacity", pose.caret.toFixed(3));
  if (ripple instanceof SVGCircleElement) {
    ripple.setAttribute("cx", workX);
    ripple.setAttribute("cy", workY);
    ripple.setAttribute("r", (3 + pose.ripple * 11).toFixed(2));
    ripple.setAttribute(
      "opacity",
      pose.ripple > 0 ? (0.42 * (1 - pose.ripple)).toFixed(3) : "0",
    );
  }
}

export function DeltalytixMark({ className }: { className: string }) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const nodes = useRef(new Map<number, SVGGElement>());
  const agentsRef = useRef<AgentSeed[]>(createInitialAgents());
  const paintRef = useRef<(still: boolean) => void>(() => {});
  const nextId = useRef(agentsRef.current.length + 1);
  const [agents, setAgents] = useState<AgentSeed[]>(agentsRef.current);
  const [overlay, setOverlay] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const word = wordRef.current;
    if (!word) return;

    const still = window.matchMedia(QUERY);

    const measure = () => {
      const rect = word.getBoundingClientRect();
      for (const agent of agentsRef.current) {
        resizeAgent(agent, rect.width, rect.height);
      }
      setOverlay({
        width: rect.width + OVERLAY_PAD * 2,
        height: rect.height + OVERLAY_PAD * 2,
      });
      return rect;
    };

    const paint = (reduced: boolean) => {
      for (const agent of agentsRef.current) {
        const node = nodes.current.get(agent.id);
        if (!node) continue;
        paintNode(node, agent, poseAgent(agent, reduced));
      }
    };
    paintRef.current = paint;

    measure();
    paint(still.matches);

    const observer = new ResizeObserver(() => {
      measure();
      paint(still.matches);
    });
    observer.observe(word);

    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const seconds = now / 1000;
      const dt = last === 0 ? 0 : Math.min(0.05, seconds - last);
      last = seconds;
      if (!still.matches && dt > 0) {
        for (const agent of agentsRef.current) {
          stepAgent(agent, dt, false);
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
      if (!frame) return;
      cancelAnimationFrame(frame);
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
    const word = wordRef.current?.getBoundingClientRect();
    const next = spawnAgents(
      agentsRef.current,
      nextId.current,
      word?.width ?? 80,
      word?.height ?? 16,
    );
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
                    paintRef.current(
                      window.matchMedia(QUERY).matches,
                    );
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
                <circle
                  data-ripple=""
                  className="cursor-agent-ripple"
                  r="0"
                  opacity="0"
                />
                <rect
                  data-caret=""
                  className="cursor-agent-caret"
                  x="-0.6"
                  y="-5"
                  width="1.2"
                  height="8"
                  rx="0.6"
                  opacity="0"
                />
                <g data-avatar="">
                  <CursorAgentMark />
                </g>
              </g>
            ))}
          </svg>
        ) : null}
      </span>
    </a>
  );
}
