"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
const CHASE_SECONDS = 0.22;
const TAP_SLOP = 12;
const EDGE = 8;

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function hubOffset(svg: SVGSVGElement | null, hub: [number, number]) {
  if (!svg) return { x: 0, y: 0 };
  const ctm = svg.getCTM();
  if (!ctm) {
    return { x: svg.clientWidth * 0.62, y: svg.clientHeight * 0.55 };
  }
  return {
    x: ctm.a * hub[0] + ctm.c * hub[1] + ctm.e,
    y: ctm.b * hub[0] + ctm.d * hub[1] + ctm.f,
  };
}

export function PlaneLive({
  svg,
  projection,
}: {
  svg: string;
  projection: Projection;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<SVGGElement | null>(null);
  const bladesRef = useRef<SVGPathElement | null>(null);
  const hoverTarget = useRef(0);
  const hover = useRef(0);
  const time = useRef(0);
  const rest = useRef({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    hubX: 0,
    hubY: 0,
    overlayH: 0,
  });
  const shown = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const park = useRef({ x: 0, y: 0 });
  const touch = useRef<{
    id: number;
    x: number;
    y: number;
    dragging: boolean;
    inStrip: boolean;
  } | null>(null);
  const inView = useInView(overlayRef);
  const still = useStillness();
  const hub = useMemo(() => hubPoint(projection), [projection]);

  const bind = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    planeRef.current = stage.querySelector("[data-part='plane']");
    bladesRef.current = stage.querySelector("[data-part='blades']");
  }, []);

  const measureRest = useCallback(() => {
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    if (!stage || !overlay) return;
    const prev = stage.style.transform;
    stage.style.transform = "";
    const box = stage.getBoundingClientRect();
    const strip = overlay.getBoundingClientRect();
    const offset = hubOffset(stage.querySelector("svg"), hub);
    rest.current = {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      hubX: offset.x,
      hubY: offset.y,
      overlayH: strip.height,
    };
    stage.style.transform = prev;
  }, [hub]);

  const pointToTranslate = useCallback((clientX: number, clientY: number, followY: boolean) => {
    const r = rest.current;
    let dx = clientX - r.left - r.hubX;
    let dy = followY ? clientY - r.top - r.hubY : shown.current.y;
    const minDx = EDGE - r.left;
    const maxDx = window.innerWidth - EDGE - r.left - r.width;
    const maxDy = Math.max(0, r.overlayH - r.height);
    return {
      x: clamp(dx, minDx, maxDx),
      y: clamp(dy, 0, maxDy),
    };
  }, []);

  const applyStage = useCallback((x: number, y: number) => {
    stageRef.current?.style.setProperty(
      "transform",
      `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`,
    );
  }, []);

  const inStrip = useCallback((clientY: number) => {
    const strip = overlayRef.current?.getBoundingClientRect();
    return strip ? clientY >= strip.top && clientY <= strip.bottom : clientY < 140;
  }, []);

  const relocate = useCallback(
    (clientX: number, clientY: number, snap: boolean) => {
      const next = pointToTranslate(clientX, clientY, inStrip(clientY));
      park.current = next;
      target.current = next;
      if (snap) {
        shown.current = next;
        applyStage(next.x, next.y);
      }
    },
    [applyStage, inStrip, pointToTranslate],
  );

  useLayoutEffect(() => {
    bind();
    measureRest();
    applyStage(shown.current.x, shown.current.y);
  }, [applyStage, bind, measureRest, svg]);

  useEffect(() => {
    const onResize = () => {
      measureRest();
      const next = {
        x: clamp(shown.current.x, EDGE - rest.current.left, window.innerWidth - EDGE - rest.current.left - rest.current.width),
        y: clamp(shown.current.y, 0, Math.max(0, rest.current.overlayH - rest.current.height)),
      };
      shown.current = next;
      target.current = next;
      park.current = next;
      applyStage(next.x, next.y);
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [applyStage, measureRest]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      touch.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
        inStrip: inStrip(event.clientY),
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        hoverTarget.current = inStrip(event.clientY) ? 1 : 0;
        if (still) return;
        const next = pointToTranslate(event.clientX, event.clientY, inStrip(event.clientY));
        target.current = next;
        park.current = next;
        return;
      }

      const gesture = touch.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
        if (gesture.inStrip && Math.abs(dx) >= Math.abs(dy)) {
          gesture.dragging = true;
        } else {
          touch.current = null;
          return;
        }
      }
      if (still) return;
      const next = pointToTranslate(event.clientX, event.clientY, false);
      target.current = next;
      park.current = next;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (touch.current?.id === event.pointerId) touch.current = null;
    };

    const onClick = (event: MouseEvent) => {
      relocate(event.clientX, event.clientY, still);
    };

    const onMouseLeave = () => {
      hoverTarget.current = 0;
      if (!still) target.current = park.current;
    };

    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", onPointerDown, opts);
    window.addEventListener("pointermove", onPointerMove, opts);
    window.addEventListener("pointerup", onPointerUp, opts);
    window.addEventListener("pointercancel", onPointerUp, opts);
    window.addEventListener("click", onClick);
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("click", onClick);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [inStrip, pointToTranslate, relocate, still]);

  const poseStill = useCallback(() => {
    planeRef.current?.removeAttribute("transform");
    bladesRef.current?.setAttribute("d", bladePath(STILL_BLADE_ANGLE, projection));
  }, [projection]);

  useLoop((dt, calm) => {
    if (!planeRef.current || !bladesRef.current) bind();
    shown.current.x = follow(shown.current.x, target.current.x, dt, CHASE_SECONDS, calm);
    shown.current.y = follow(shown.current.y, target.current.y, dt, CHASE_SECONDS, calm);
    applyStage(shown.current.x, shown.current.y);
    if (calm) {
      poseStill();
      return shown.current.x !== target.current.x || shown.current.y !== target.current.y;
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
    <div ref={overlayRef} className="iso plane-overlay" data-theme="light">
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
