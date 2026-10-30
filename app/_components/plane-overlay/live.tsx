"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  follow,
  useInView,
  useLoop,
  useStillness,
} from "@/components/iso/react/live";
import {
  bladePath,
  hubPoint,
  STILL_BLADE_ANGLE,
} from "@/components/figures/plane/motion";
import type { Projection } from "@/components/iso/iso-kit";

const LABEL =
  "A high-wing single-engine trainer in flight, registration F-HUGO";

export function PlaneLive({
  svg,
  projection,
}: {
  svg: string;
  projection: Projection;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<SVGGElement | null>(null);
  const bladesRef = useRef<SVGPathElement | null>(null);
  const hoverTarget = useRef(0);
  const hover = useRef(0);
  const time = useRef(0);
  const inView = useInView(stageRef);
  const still = useStillness();
  const hub = hubPoint(projection);

  const bind = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    planeRef.current = stage.querySelector("[data-part='plane']");
    bladesRef.current = stage.querySelector("[data-part='blades']");
  }, []);

  useLayoutEffect(() => {
    bind();
    const svgNode = stageRef.current?.querySelector("svg");
    if (!svgNode) return;
    const enter = () => {
      hoverTarget.current = 1;
    };
    const leave = () => {
      hoverTarget.current = 0;
    };
    svgNode.addEventListener("pointerenter", enter);
    svgNode.addEventListener("pointerleave", leave);
    return () => {
      svgNode.removeEventListener("pointerenter", enter);
      svgNode.removeEventListener("pointerleave", leave);
    };
  }, [bind, svg]);

  const poseStill = useCallback(() => {
    planeRef.current?.removeAttribute("transform");
    bladesRef.current?.setAttribute("d", bladePath(STILL_BLADE_ANGLE, projection));
  }, [projection]);

  useLoop((dt, calm) => {
    if (!planeRef.current || !bladesRef.current) bind();
    if (calm) {
      poseStill();
      return false;
    }
    hover.current = follow(hover.current, hoverTarget.current, dt, 0.35, calm);
    time.current += dt;
    const t = time.current;
    const bob = Math.sin(t * 0.9) * 3.2 + Math.sin(t * 0.37) * 1.6;
    const pitch = Math.cos(t * 0.9) * 1.4 - hover.current * 2.5;
    const drift = Math.sin(t * 0.21) * 6;
    const rpm = 2400 - hover.current * 300;
    const turns = (t * rpm) / 60;
    const angle = ((turns * Math.PI * 2) / 37) % (Math.PI * 2);
    planeRef.current?.setAttribute(
      "transform",
      `translate(${drift.toFixed(2)} ${(-bob).toFixed(2)}) rotate(${pitch.toFixed(2)} ${hub[0].toFixed(1)} ${hub[1].toFixed(1)})`,
    );
    bladesRef.current?.setAttribute("d", bladePath(angle, projection));
    return true;
  }, inView && !still);

  useEffect(() => {
    if (still) poseStill();
  }, [still, poseStill]);

  return (
    <div className="iso plane-overlay" data-theme="light">
      <div
        ref={stageRef}
        className="iso-stage"
        role="img"
        aria-label={LABEL}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
