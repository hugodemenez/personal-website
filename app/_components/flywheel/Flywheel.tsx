"use client";

import { useEffect, useRef } from "react";
import { linkage, rodPath } from "./geometry";
import { FLYWHEEL_SVG } from "./flywheel-art";
import { H0, P, translateAlong } from "./projection";
import "./iso.css";

const IDLE = 360 / 14;
const CAPTION =
  "A Berkel volano (manual flywheel slicer). Turning the flowered wheel clockwise drives both the blade and the carriage: through gears and a connecting rod, about one flywheel turn makes one blade turn while the carriage walks a slice past it. Sources: originalslicers.com on the Berkel flywheel; Berkel Volano manuals. Drawn with Anatomy (MIT).";

type Drag = { from: number; t: number };

export function Flywheel() {
  const stageRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const readout = readoutRef.current;
    if (!stage) return;
    const svg = stage.querySelector("svg");
    if (!svg) return;

    const part = (name: string) => svg.querySelector(`[data-part="${name}"]`);
    const wheel = part("wheel");
    const back = part("wheel-back");
    const pinion = part("pinion");
    const rod = part("rod");
    const rodEdge = part("rod-edge");
    const slider = part("slider");
    const handle = part("handle");
    if (!wheel || !back || !pinion || !rod || !rodEdge || !slider || !handle) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let angle = 0;
    let speed = still.matches ? 0 : IDLE;
    let frame = 0;
    let last = 0;
    let visible = false;
    let drag: Drag | null = null;
    let idleAt = 0;

    const draw = () => {
      const r = `rotate(${angle.toFixed(2)})`;
      wheel.setAttribute("transform", r);
      back.setAttribute("transform", r);
      pinion.setAttribute("transform", r);
      const link = linkage(angle);
      const d = rodPath(link);
      rod.setAttribute("d", d);
      rodEdge.setAttribute("d", d);
      slider.setAttribute("transform", translateAlong(P, [0, link.slide, 0]));
      const a = (angle * Math.PI) / 180;
      const u = H0[1] * Math.cos(a);
      const v = H0[1] * Math.sin(a);
      handle.setAttribute("transform", translateAlong(P, [0, u - H0[1], v]));
      const deg = ((Math.round(angle) % 360) + 360) % 360;
      const text = `${deg}° · blade ${deg}° · 1 turn → 1 blade turn`;
      if (readout && readout.textContent !== text) readout.textContent = text;
      stage.setAttribute("aria-valuenow", String(deg));
    };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      if (!drag) {
        const want = still.matches ? 0 : now > idleAt ? IDLE : 0;
        speed += (want - speed) * (1 - Math.exp(-dt / 0.9));
        if (Math.abs(speed) < 0.05 && want === 0) speed = 0;
        angle += speed * dt;
      }
      draw();
      frame = visible && (drag || speed !== 0 || !still.matches) ? requestAnimationFrame(tick) : 0;
    };

    const run = () => {
      if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1]?.isIntersecting ?? false;
        if (visible) run();
        else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(stage);

    const centre = () => {
      const box = svg.getBoundingClientRect();
      return [box.left + box.width * 0.5, box.top + box.height * 0.42] as const;
    };
    const angleOf = (event: PointerEvent) => {
      const [cx, cy] = centre();
      return (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
    };

    const onDown = (event: PointerEvent) => {
      drag = { from: angleOf(event), t: performance.now() };
      stage.setPointerCapture(event.pointerId);
      run();
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      const now = performance.now();
      const to = angleOf(event);
      let delta = to - drag.from;
      delta = ((delta + 540) % 360) - 180;
      angle += delta;
      speed = delta / Math.max((now - drag.t) / 1000, 1 / 120);
      drag = { from: to, t: now };
      draw();
    };
    const release = () => {
      if (!drag) return;
      drag = null;
      speed = Math.max(-720, Math.min(720, speed));
      idleAt = performance.now() + 2500;
      run();
    };
    const onKey = (event: KeyboardEvent) => {
      const step =
        event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 15
          : event.key === "ArrowLeft" || event.key === "ArrowDown"
            ? -15
            : 0;
      if (!step) return;
      event.preventDefault();
      speed = 0;
      angle += step;
      idleAt = performance.now() + 3000;
      draw();
      run();
    };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("keydown", onKey);
    draw();

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", release);
      stage.removeEventListener("pointercancel", release);
      stage.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="iso fw-embed">
      <figure className="iso-figure">
        <div className="iso-plate">
          <div className="iso-plate-corners" aria-hidden="true">
            <span className="iso-plate-corner" data-corner="fig">
              Fig 1
            </span>
            <span className="iso-plate-corner" data-corner="title">
              Berkel volano
            </span>
            <span className="iso-plate-corner" data-corner="hint">
              Drag to turn the wheel
            </span>
            <span
              ref={readoutRef}
              className="iso-plate-corner"
              data-corner="readout"
              data-readout=""
            >
              0° · 1 turn → 1 blade turn
            </span>
          </div>
          <div
            ref={stageRef}
            className="iso-stage"
            tabIndex={0}
            role="slider"
            aria-label="Berkel flywheel: drag or use arrow keys to turn it"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={0}
            dangerouslySetInnerHTML={{ __html: FLYWHEEL_SVG }}
          />
        </div>
        <figcaption className="iso-legend">
          <span className="iso-caption">{CAPTION}</span>
        </figcaption>
      </figure>
    </div>
  );
}
