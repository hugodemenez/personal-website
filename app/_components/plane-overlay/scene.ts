import * as THREE from "three";
import { createTrainer } from "./plane-mesh";
import {
  ALTITUDE,
  applyGravity,
  applyImpulse,
  clickKick,
  collideBounds,
  createBody,
  crossedToTop,
  nextFlightMode,
  sinkAltitude,
  snap,
  stepSpring,
  type FlightMode,
} from "./physics";
import { clientToNdc, dragModeFor, pixelBounds, type DragMode } from "./pointer";

const EDGE = 72;
const LONGEST = 1 / 30;
const PROP_FLY = 42;
const PROP_LAND = 0;

export type PlaneSceneHandle = {
  canvas: HTMLCanvasElement;
  dispose: () => void;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function themeScheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function mountPlaneScene(
  canvas: HTMLCanvasElement,
  stillRef: { current: boolean },
): PlaneSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0.15, 6.2);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xf7f3ea, 0x8a8478, 1.05);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2.4, 3.2, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe6c8, 0.35);
  rim.position.set(-3, 1.2, -2);
  scene.add(rim);

  const trainer = createTrainer();
  trainer.setTheme(themeScheme());
  scene.add(trainer.group);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const viewPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hitPoint = new THREE.Vector3();
  const ndc = { x: 0, y: 0 };

  const body = createBody();
  const target = { x: 0, y: 0 };
  let mode: FlightMode = "flight";
  let placed = false;
  let last = 0;
  let lastInput = performance.now();
  let lastScrollY = window.scrollY;
  let descentFrom = 0;
  let frame = 0;
  let worldPerPixel = 0.01;
  let yaw = -0.72;
  let pitch = 0.16;
  let roll = 0.08;
  let propSpeed = 0;
  let hoverHit = false;

  const drag = {
    active: false,
    mode: "move" as DragMode,
    id: -1,
    extra: 0,
    lastX: 0,
    lastY: 0,
  };

  const size = { w: 0, h: 0 };

  const setFlight = (next: FlightMode) => {
    mode = next;
    canvas.dataset.flight = next;
  };

  const skyPark = () => {
    const bounds = pixelBounds(size.w, size.h, EDGE);
    return {
      x: Math.max(bounds.minX, size.w - EDGE - 20),
      y: bounds.minY + 8,
    };
  };

  const landPad = () => {
    const bounds = pixelBounds(size.w, size.h, EDGE);
    return { x: target.x, y: bounds.maxY };
  };

  const noteInput = () => {
    lastInput = performance.now();
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    const worldH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    worldPerPixel = worldH / Math.max(h, 1);
    const spanPx = w < 640 ? 128 : 168;
    trainer.group.scale.setScalar((spanPx * worldPerPixel) / 2.28);
    if (!placed) {
      const sky = skyPark();
      snap(body, sky);
      target.x = sky.x;
      target.y = sky.y;
      placed = true;
    } else {
      collideBounds(body, pixelBounds(w, h, EDGE));
    }
  };

  const pixelFromWorld = (x: number, y: number) => ({
    x: size.w / 2 + x / worldPerPixel,
    y: size.h / 2 - y / worldPerPixel,
  });

  const worldFromPixel = (x: number, y: number) => ({
    x: (x - size.w / 2) * worldPerPixel,
    y: (size.h / 2 - y) * worldPerPixel,
  });

  const applyPose = () => {
    const world = worldFromPixel(body.pos.x, body.pos.y);
    trainer.group.position.set(world.x, world.y, 0);
    trainer.group.rotation.order = "YXZ";
    trainer.group.rotation.y = yaw;
    trainer.group.rotation.x = pitch;
    trainer.group.rotation.z = roll;
  };

  const intersectView = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const next = clientToNdc(clientX, clientY, rect);
    pointer.set(next.x, next.y);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(viewPlane, hitPoint)) return null;
    return pixelFromWorld(hitPoint.x, hitPoint.y);
  };

  const hitsPlane = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const next = clientToNdc(clientX, clientY, rect);
    ndc.x = next.x;
    ndc.y = next.y;
    pointer.set(next.x, next.y);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(trainer.group, true).length > 0;
  };

  const takeoff = () => {
    const sky = skyPark();
    target.x = sky.x;
    target.y = sky.y;
    applyImpulse(body, { x: 0, y: -ALTITUDE.takeoffImpulse });
    setFlight("flight");
    noteInput();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.isPrimary) drag.extra = 0;
    else drag.extra += 1;
    const hit = hitsPlane(event.clientX, event.clientY);
    hoverHit = hit;
    if (!hit) return;
    event.preventDefault();
    drag.active = true;
    drag.id = event.pointerId;
    drag.mode = dragModeFor(event, drag.extra);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    noteInput();
    setFlight("flight");
    document.documentElement.classList.add("plane-dragging");
    if (drag.mode === "move") {
      const point = intersectView(event.clientX, event.clientY);
      if (point) {
        target.x = point.x;
        target.y = point.y;
        clickKick(body, target);
      }
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag.active) {
      hoverHit = hitsPlane(event.clientX, event.clientY);
      document.documentElement.style.cursor = hoverHit ? "grab" : "";
      return;
    }
    if (event.pointerId !== drag.id && drag.mode !== "orbit") return;
    event.preventDefault();
    noteInput();
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    if (drag.mode === "orbit") {
      yaw += dx * 0.008;
      pitch = clamp(pitch + dy * 0.006, -0.7, 0.7);
      return;
    }
    const point = intersectView(event.clientX, event.clientY);
    if (point) {
      const bounds = pixelBounds(size.w, size.h, EDGE);
      target.x = clamp(point.x, bounds.minX, bounds.maxX);
      target.y = clamp(point.y, bounds.minY, bounds.maxY);
    }
  };

  const endDrag = (event: PointerEvent) => {
    if (event.pointerId === drag.id) {
      drag.active = false;
      drag.id = -1;
      document.documentElement.classList.remove("plane-dragging");
      document.documentElement.style.cursor = "";
    }
    if (!event.isPrimary) drag.extra = Math.max(0, drag.extra - 1);
  };

  const onContextMenu = (event: MouseEvent) => {
    if (drag.active || hitsPlane(event.clientX, event.clientY)) {
      event.preventDefault();
    }
  };

  const onScroll = () => {
    const sy = window.scrollY;
    const prev = lastScrollY;
    lastScrollY = sy;
    if (mode !== "flight" && crossedToTop(prev, sy)) takeoff();
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, LONGEST) : 1 / 60;
    last = now;
    const still = stillRef.current;

    if (still) {
      const sky = skyPark();
      snap(body, sky);
      yaw = -0.72;
      pitch = 0.16;
      roll = 0.08;
      propSpeed = 0;
      trainer.prop.rotation.x = 0.35;
      applyPose();
      setFlight("flight");
      canvas.dataset.spinning = "0";
      canvas.dataset.x = body.pos.x.toFixed(1);
      canvas.dataset.y = body.pos.y.toFixed(1);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
      return;
    }

    const interacting = drag.active;
    const pad = landPad();
    const atLanding =
      body.pos.y >= pad.y - ALTITUDE.landEps && Math.abs(body.vel.y) < 40;
    const next = nextFlightMode(mode, {
      idleFor: performance.now() - lastInput,
      atLanding,
      interacting,
      takeoff: false,
    });
    if (next !== mode) {
      if (next === "descent") descentFrom = body.pos.y;
      setFlight(next);
    }

    if (mode === "descent") {
      target.y = sinkAltitude(target.y, pad.y, dt, ALTITUDE.sinkSeconds, descentFrom);
      applyGravity(body, dt);
    } else if (mode === "landed") {
      target.x = pad.x;
      target.y = pad.y;
    }

    stepSpring(body, target, dt);
    collideBounds(body, pixelBounds(size.w, size.h, EDGE));

    const desiredYaw = -0.72 + clamp(body.vel.x * 0.0016, -0.9, 0.9);
    const desiredPitch = 0.16 + clamp(-body.vel.y * 0.0014, -0.45, 0.45);
    const desiredRoll = 0.08 + clamp(-body.vel.x * 0.0018, -0.55, 0.55);
    if (drag.mode !== "orbit" || !drag.active) {
      yaw = lerp(yaw, desiredYaw, 1 - Math.exp(-dt / 0.22));
      pitch = lerp(pitch, desiredPitch, 1 - Math.exp(-dt / 0.22));
    }
    roll = lerp(roll, desiredRoll, 1 - Math.exp(-dt / 0.18));

    const wantProp = mode === "landed" || still ? PROP_LAND : PROP_FLY;
    propSpeed = lerp(propSpeed, wantProp, 1 - Math.exp(-dt / (mode === "landed" ? 0.16 : 0.4)));
    trainer.prop.rotation.x += propSpeed * dt;
    applyPose();

    canvas.dataset.spinning = mode === "landed" || propSpeed < 2 ? "0" : "1";
    canvas.dataset.x = body.pos.x.toFixed(1);
    canvas.dataset.y = body.pos.y.toFixed(1);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const onTheme = () => trainer.setTheme(themeScheme());
  themeQuery.addEventListener("change", onTheme);

  resize();
  setFlight("flight");
  applyPose();
  canvas.dataset.x = body.pos.x.toFixed(1);
  canvas.dataset.y = body.pos.y.toFixed(1);
  canvas.dataset.spinning = stillRef.current ? "0" : "1";
  renderer.render(scene, camera);

  const optsMove: AddEventListenerOptions = { passive: false };
  const optsDown: AddEventListenerOptions = { capture: true, passive: false };
  window.addEventListener("pointerdown", onPointerDown, optsDown);
  window.addEventListener("pointermove", onPointerMove, optsMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  frame = requestAnimationFrame(tick);

  const dispose = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointerdown", onPointerDown, optsDown);
    window.removeEventListener("pointermove", onPointerMove, optsMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    window.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", resize);
    window.visualViewport?.removeEventListener("resize", resize);
    themeQuery.removeEventListener("change", onTheme);
    document.documentElement.classList.remove("plane-dragging");
    document.documentElement.style.cursor = "";
    trainer.group.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const material = node.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else {
          if ("map" in material && material.map) material.map.dispose();
          material.dispose();
        }
      }
    });
    renderer.dispose();
  };

  return { canvas, dispose };
}
