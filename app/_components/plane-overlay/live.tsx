"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLoop, useStillness } from "@/components/iso/react/live";
import {
  bladePath,
  hubPoint,
  STILL_BLADE_ANGLE,
} from "@/components/figures/plane/motion";
import type { Projection } from "@/components/iso/iso-kit";
import {
  ALTITUDE,
  applyGravity,
  applyImpulse,
  clickKick,
  collideBounds,
  createBody,
  crossedToTop,
  impartScroll,
  nextFlightMode,
  sinkAltitude,
  snap,
  stepSpring,
  type Bounds,
  type FlightMode,
} from "./physics";

const LABEL =
  "A high-wing single-engine trainer in flight, registration F-HUGO";
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

function pageHeight() {
  return Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    window.innerHeight,
  );
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
  });
  const body = useRef(createBody());
  const target = useRef({ x: 0, y: 0 });
  const park = useRef({ x: 0, y: 0 });
  const lastScrollY = useRef(0);
  const lastInputAt = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });
  const mode = useRef<FlightMode>("flight");
  const descentFrom = useRef(0);
  const placed = useRef(false);
  const touch = useRef<{
    id: number;
    x: number;
    y: number;
    dragging: boolean;
  } | null>(null);
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
    if (!stage) return;
    const prev = stage.style.transform;
    stage.style.transform = "";
    const box = stage.getBoundingClientRect();
    const offset = hubOffset(stage.querySelector("svg"), hub);
    rest.current = {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      hubX: offset.x,
      hubY: offset.y,
    };
    stage.style.transform = prev;
  }, [hub]);

  const flightBounds = useCallback((): Bounds => {
    const r = rest.current;
    const minX = EDGE - r.left;
    const maxX = window.innerWidth - EDGE - r.left - r.width;
    const minY = EDGE;
    const maxY = pageHeight() - EDGE - r.height;
    return {
      minX,
      maxX: Math.max(minX, maxX),
      minY,
      maxY: Math.max(minY, maxY),
    };
  }, []);

  const skyPark = useCallback(() => {
    const r = rest.current;
    const bounds = flightBounds();
    const right = window.innerWidth - r.width - window.innerWidth * 0.05 - r.left;
    return {
      x: clamp(right, bounds.minX, bounds.maxX),
      y: bounds.minY,
    };
  }, [flightBounds]);

  const landPad = useCallback(() => {
    const bounds = flightBounds();
    return {
      x: park.current.x,
      y: bounds.maxY,
    };
  }, [flightBounds]);

  const pointToTranslate = useCallback((clientX: number, clientY: number) => {
    const r = rest.current;
    const bounds = flightBounds();
    return {
      x: clamp(clientX - r.left - r.hubX, bounds.minX, bounds.maxX),
      y: clamp(window.scrollY + clientY - r.top - r.hubY, bounds.minY, bounds.maxY),
    };
  }, [flightBounds]);

  const applyStage = useCallback((docX: number, docY: number) => {
    const viewY = docY - window.scrollY;
    stageRef.current?.style.setProperty(
      "transform",
      `translate(${docX.toFixed(1)}px, ${viewY.toFixed(1)}px)`,
    );
  }, []);

  const setMode = useCallback((next: FlightMode) => {
    mode.current = next;
    overlayRef.current?.setAttribute("data-flight", next);
  }, []);

  const noteInput = useCallback(() => {
    lastInputAt.current = performance.now();
  }, []);

  const takeoff = useCallback(() => {
    const sky = skyPark();
    park.current = sky;
    target.current = sky;
    snap(body.current, sky);
    applyImpulse(body.current, { x: 0, y: -ALTITUDE.takeoffImpulse });
    setMode("flight");
    noteInput();
    applyStage(sky.x, sky.y);
  }, [applyStage, noteInput, setMode, skyPark]);

  const relocate = useCallback(
    (clientX: number, clientY: number, snapTo: boolean) => {
      const next = pointToTranslate(clientX, clientY);
      park.current = next;
      target.current = next;
      noteInput();
      setMode("flight");
      if (snapTo) {
        snap(body.current, next);
        applyStage(next.x, next.y);
      } else {
        clickKick(body.current, next);
      }
    },
    [applyStage, noteInput, pointToTranslate, setMode],
  );

  useLayoutEffect(() => {
    bind();
    measureRest();
    lastScrollY.current = window.scrollY;
    lastInputAt.current = performance.now();
    if (!placed.current) {
      const sky = skyPark();
      snap(body.current, sky);
      park.current = sky;
      target.current = sky;
      placed.current = true;
    }
    setMode(mode.current);
    applyStage(body.current.pos.x, body.current.pos.y);
  }, [applyStage, bind, measureRest, setMode, skyPark, svg]);

  useEffect(() => {
    const onResize = () => {
      measureRest();
      const bounds = flightBounds();
      const next = {
        x: clamp(body.current.pos.x, bounds.minX, bounds.maxX),
        y: clamp(body.current.pos.y, bounds.minY, bounds.maxY),
      };
      snap(body.current, next);
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
  }, [applyStage, flightBounds, measureRest]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      touch.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        const dx = event.clientX - lastPointer.current.x;
        const dy = event.clientY - lastPointer.current.y;
        lastPointer.current = { x: event.clientX, y: event.clientY };
        hoverTarget.current = 1;
        if (still) return;
        if (Math.hypot(dx, dy) < ALTITUDE.pointerSlop) return;
        noteInput();
        if (mode.current === "landed") return;
        const next = pointToTranslate(event.clientX, event.clientY);
        target.current = next;
        park.current = next;
        if (mode.current === "descent") setMode("flight");
        return;
      }

      const gesture = touch.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
        // Horizontal nudges can steer; vertical motion is left to page scroll.
        if (Math.abs(dx) >= Math.abs(dy)) {
          gesture.dragging = true;
        } else {
          touch.current = null;
          return;
        }
      }
      if (still) return;
      noteInput();
      setMode("flight");
      const next = pointToTranslate(event.clientX, event.clientY);
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
      if (!still && mode.current === "flight") target.current = park.current;
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
  }, [noteInput, pointToTranslate, relocate, setMode, still]);

  const poseStill = useCallback(() => {
    planeRef.current?.removeAttribute("transform");
    bladesRef.current?.setAttribute("d", bladePath(STILL_BLADE_ANGLE, projection));
  }, [projection]);

  useLoop((dt, calm) => {
    if (!planeRef.current || !bladesRef.current) bind();

    const sy = window.scrollY;
    const prevSy = lastScrollY.current;
    const dsy = sy - prevSy;
    lastScrollY.current = sy;

    if (calm) {
      const sky = skyPark();
      snap(body.current, sky);
      applyStage(sky.x, sky.y);
      poseStill();
      setMode("flight");
      return false;
    }

    const meaningfulScroll = Math.abs(dsy) >= ALTITUDE.meaningfulScroll;
    if (meaningfulScroll) noteInput();
    if (mode.current !== "flight" && crossedToTop(prevSy, sy)) {
      takeoff();
    }

    const interacting = performance.now() - lastInputAt.current < 80;
    const pad = landPad();
    const atLanding =
      body.current.pos.y >= pad.y - ALTITUDE.landEps &&
      Math.abs(body.current.vel.y) < 40;
    const next = nextFlightMode(mode.current, {
      idleFor: performance.now() - lastInputAt.current,
      atLanding,
      interacting: interacting && mode.current !== "landed",
      takeoff: false,
    });
    if (next !== mode.current) {
      if (next === "descent") descentFrom.current = body.current.pos.y;
      setMode(next);
    }

    if (mode.current === "descent") {
      const sunk = sinkAltitude(
        target.current.y,
        pad.y,
        dt,
        ALTITUDE.sinkSeconds,
        descentFrom.current,
      );
      target.current = { x: park.current.x, y: sunk };
      applyGravity(body.current, dt);
    } else if (mode.current === "landed") {
      target.current = pad;
    }

    if (dsy !== 0 && mode.current === "flight") impartScroll(body.current, dsy);
    stepSpring(body.current, target.current, dt);
    collideBounds(body.current, flightBounds());
    applyStage(body.current.pos.x, body.current.pos.y);

    if (mode.current === "landed") {
      poseStill();
      return true;
    }

    const vx = body.current.vel.x;
    const vy = body.current.vel.y;
    hover.current += (hoverTarget.current - hover.current) * (1 - Math.exp(-dt / 0.35));
    time.current += dt;
    const t = time.current;
    const bob = Math.sin(t * 0.9) * 3.2 + Math.sin(t * 0.37) * 1.6;
    const pitch =
      Math.cos(t * 0.9) * 1.4 -
      hover.current * 2.5 +
      clamp(vy * 0.012, -10, 10);
    const drift = Math.sin(t * 0.21) * 6 + clamp(vx * 0.012, -10, 10);
    const rpm = 2400 - hover.current * 300;
    const turns = (t * rpm) / 60;
    const angle = ((turns * Math.PI * 2) / 37) % (Math.PI * 2);
    planeRef.current?.setAttribute(
      "transform",
      `translate(${drift.toFixed(2)} ${(-bob).toFixed(2)}) rotate(${pitch.toFixed(2)} ${hub[0].toFixed(1)} ${hub[1].toFixed(1)})`,
    );
    bladesRef.current?.setAttribute("d", bladePath(angle, projection));
    return true;
  }, !still);

  useEffect(() => {
    if (still) poseStill();
  }, [still, poseStill]);

  return (
    <div
      ref={overlayRef}
      className="iso plane-overlay"
      data-theme="light"
      data-flight="flight"
    >
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
