"use client";

import { useEffect, useRef } from "react";
import { leverPath, linkage, rodPath, W } from "./geometry";
import { FLYWHEEL_SVG } from "./flywheel-art";
import { H0, P, translateAlong } from "./projection";
import "./iso.css";

const IDLE = 360 / 9;
const CAPTION =
  "A Berkel volano (manual flywheel slicer) after period photos: flower flywheel of the Model L / 80 era; carriage, rails, shoulder and tray as on the Model 8/21. The wheel turns gears in the base: they spin the blade faster than the wheel and, through a crank and connecting rod, walk the carriage and its ham past the blade — one slice per turn. Sources: originalslicers.com on the Berkel flywheel; Berkel Volano / Model 8 manuals. Drawn with Anatomy (MIT).";

type Drag = { from: number; t: number };

export function Flywheel() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const svg = stage.querySelector("svg");
    if (!svg) return;

    const part = (name: string) => svg.querySelector(`[data-part="${name}"]`);
    const wheel = part("wheel");
    const pinion = part("pinion");
    const crank = part("crank");
    const blade = part("blade");
    const rod = part("rod");
    const rodEdge = part("rod-edge");
    const lever = part("lever");
    const leverEdge = part("lever-edge");
    const carriage = part("carriage");
    const pin = part("drivepin");
    const handle = part("handle");
    const fly = part("slice-fly");
    if (
      !wheel ||
      !pinion ||
      !crank ||
      !blade ||
      !rod ||
      !rodEdge ||
      !lever ||
      !leverEdge ||
      !carriage ||
      !pin ||
      !handle ||
      !fly
    ) {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rest = linkage(0);
    let angle = 0;
    let speed = still.matches ? 0 : IDLE;
    let frame = 0;
    let last = 0;
    let visible = false;
    let drag: Drag | null = null;
    let idleAt = 0;

    const draw = () => {
      wheel.setAttribute("transform", `rotate(${angle.toFixed(2)})`);
      pinion.setAttribute("transform", `rotate(${angle.toFixed(2)})`);
      crank.setAttribute("transform", `rotate(${(-angle).toFixed(2)})`);
      blade.setAttribute("transform", `rotate(${(-angle * W.ratio).toFixed(2)})`);
      const link = linkage(angle);
      const rodD = rodPath(link);
      const leverD = leverPath(link);
      rod.setAttribute("d", rodD);
      rodEdge.setAttribute("d", rodD);
      lever.setAttribute("d", leverD);
      leverEdge.setAttribute("d", leverD);
      carriage.setAttribute("transform", translateAlong(P, [link.slide - rest.slide, 0, 0]));
      pin.setAttribute("transform", translateAlong(P, [link.top[0] - rest.top[0], 0, link.top[1] - rest.top[1]]));
      const a = (angle * Math.PI) / 180;
      handle.setAttribute("transform", translateAlong(P, [0, H0[1] * Math.cos(a) - H0[1], H0[1] * Math.sin(a)]));
      const phase = ((((angle - 120) % 360) + 360) % 360) / 360;
      if (phase < 0.4) {
        const s = phase / 0.4;
        const e = 1 - Math.pow(1 - s, 2);
        fly.setAttribute("transform", `translate(${(24 - 48 * e).toFixed(2)} ${(10 - 28 * e).toFixed(2)}) rotate(${(70 * e).toFixed(1)})`);
        fly.setAttribute("opacity", String(Math.min(1, s * 8, (1 - s) * 6).toFixed(2)));
      } else {
        fly.setAttribute("opacity", "0");
      }
      const deg = ((Math.round(angle) % 360) + 360) % 360;
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
      return [box.left + box.width * 0.78, box.top + box.height * 0.62] as const;
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
          </div>
          <div
            ref={stageRef}
            className="iso-stage"
            tabIndex={0}
            role="slider"
            aria-label="Berkel volano"
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
