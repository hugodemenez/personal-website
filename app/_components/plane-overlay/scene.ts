import * as THREE from "three";
import { createAnatomyPlane, MODEL_SPAN } from "./plane-mesh";
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
const ISO_AZIMUTH = 52 * (Math.PI / 180);
const ISO_ELEVATION = 20 * (Math.PI / 180);
const ISO_DISTANCE = 14;
const VIEW_H = 5.1;

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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
  // Anatomy planeProjection: azimuth 38°, elevation 30° (see figures/plane/svg.ts).
  camera.position.set(
    Math.sin(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION) * ISO_DISTANCE,
    Math.sin(ISO_ELEVATION) * ISO_DISTANCE,
    Math.cos(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION) * ISO_DISTANCE,
  );
  camera.lookAt(0, 0.12, 0);

  // Kit lightOf: unit(-sinA, cosA, 1.2) in Anatomy → (+span, +up, -nose) here.
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(Math.cos(ISO_AZIMUTH), 1.2, -Math.sin(ISO_AZIMUTH));
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  const trainer = createAnatomyPlane();
  trainer.setTheme(themeScheme());
  scene.add(trainer.group);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const viewDir = new THREE.Vector3();
  const viewPlane = new THREE.Plane();
  const hitPoint = new THREE.Vector3();
  const projected = new THREE.Vector3();
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
  let yaw = 0;
  let pitch = 0;
  let roll = 0;
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

  const updateViewPlane = () => {
    camera.getWorldDirection(viewDir);
    viewPlane.setFromNormalAndCoplanarPoint(viewDir, new THREE.Vector3(0, 0, 0));
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    const aspect = w / Math.max(h, 1);
    camera.left = (-VIEW_H * aspect) / 2;
    camera.right = (VIEW_H * aspect) / 2;
    camera.top = VIEW_H / 2;
    camera.bottom = -VIEW_H / 2;
    camera.updateProjectionMatrix();
    updateViewPlane();
    worldPerPixel = VIEW_H / Math.max(h, 1);
    const spanPx = w < 640 ? 148 : 196;
    trainer.group.scale.setScalar((spanPx * worldPerPixel) / MODEL_SPAN);
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

  const pixelFromWorld = (x: number, y: number, z = 0) => {
    projected.set(x, y, z).project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * size.w,
      y: (-projected.y * 0.5 + 0.5) * size.h,
    };
  };

  const worldFromPixel = (x: number, y: number) => {
    pointer.set((x / Math.max(size.w, 1)) * 2 - 1, -(y / Math.max(size.h, 1)) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(viewPlane, hitPoint)) return { x: 0, y: 0, z: 0 };
    return { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z };
  };

  const applyPose = () => {
    const world = worldFromPixel(body.pos.x, body.pos.y);
    trainer.group.position.set(world.x, world.y, world.z);
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
    return pixelFromWorld(hitPoint.x, hitPoint.y, hitPoint.z);
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
      yaw = 0;
      pitch = 0;
      roll = 0;
      propSpeed = 0;
      trainer.prop.rotation.z = 0.6;
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

    const desiredYaw = clamp(body.vel.x * 0.0016, -0.9, 0.9);
    const desiredPitch = clamp(-body.vel.y * 0.0014, -0.45, 0.45);
    const desiredRoll = clamp(-body.vel.x * 0.0018, -0.55, 0.55);
    if (drag.mode !== "orbit" || !drag.active) {
      yaw = lerp(yaw, desiredYaw, 1 - Math.exp(-dt / 0.22));
      pitch = lerp(pitch, desiredPitch, 1 - Math.exp(-dt / 0.22));
    }
    roll = lerp(roll, desiredRoll, 1 - Math.exp(-dt / 0.18));

    const wantProp = mode === "landed" || still ? PROP_LAND : PROP_FLY;
    propSpeed = lerp(propSpeed, wantProp, 1 - Math.exp(-dt / (mode === "landed" ? 0.16 : 0.4)));
    trainer.prop.rotation.z += propSpeed * dt;
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
      if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
        node.geometry.dispose();
        const material = node.material;
        const drop = (item: THREE.Material) => {
          const mapped = item as THREE.MeshBasicMaterial & THREE.MeshToonMaterial;
          mapped.map?.dispose();
          mapped.gradientMap?.dispose();
          item.dispose();
        };
        if (Array.isArray(material)) material.forEach(drop);
        else drop(material);
      }
    });
    renderer.dispose();
  };

  return { canvas, dispose };
}
