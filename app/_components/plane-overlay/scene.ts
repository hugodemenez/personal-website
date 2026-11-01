import * as THREE from "three";
import { createAnatomyPlane, MODEL_SPAN } from "./plane-mesh";
import {
  clickKick,
  collideBounds,
  createBody,
  settled,
  snap,
  stepSpring,
  type FlightMode,
} from "./physics";
import {
  clientToNdc,
  dockPark,
  dragModeFor,
  homeOrExit,
  pixelBounds,
  PLANE_DOCK,
  PLANE_SLOT,
  rectOnScreen,
  spanPxFor,
  type DragMode,
  type Recall,
} from "./pointer";

const EDGE = 72;
const LONGEST = 1 / 30;
const PROP_FLY = 42;
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
  host: HTMLElement,
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
  let last = 0;
  let frame = 0;
  let worldPerPixel = 0.01;
  let yaw = 0;
  let pitch = 0;
  let roll = 0;
  let propSpeed = 0;
  let hoverHit = false;
  let flying = false;
  let phase: "planted" | "parked" | "recall" = "planted";
  let scrolling = false;
  let recallKind: Recall["kind"] = "home";
  let pendingPlant = false;
  let scrollIdle = 0;
  let scrollArmed = false;
  let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;

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

  const markMode = () => {
    canvas.dataset.docked = phase === "planted" ? "1" : "0";
    canvas.dataset.mode = phase === "planted" ? "planted" : flying ? "flying" : "planted";
    canvas.dataset.recall = phase === "recall" ? recallKind : "";
  };

  const dockSlot = () => {
    const dock = document.querySelector(PLANE_DOCK);
    const slot = dock instanceof HTMLElement ? dock.querySelector(PLANE_SLOT) : null;
    return slot instanceof HTMLElement ? slot : null;
  };

  const applyCanvasBox = (w: number, h: number) => {
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
    const spanPx = spanPxFor(window.innerWidth);
    trainer.group.scale.setScalar((spanPx * worldPerPixel) / MODEL_SPAN);
    canvas.dataset.span = String(spanPx);
  };

  const plantInSlot = () => {
    const slot = dockSlot();
    if (!slot) return false;
    if (canvas.parentElement !== slot) slot.appendChild(canvas);
    canvas.classList.remove("is-flying");
    flying = false;
    const w = Math.max(1, slot.clientWidth);
    const h = Math.max(1, slot.clientHeight);
    applyCanvasBox(w, h);
    snap(body, { x: w / 2, y: h / 2 });
    target.x = body.pos.x;
    target.y = body.pos.y;
    phase = "planted";
    pendingPlant = false;
    markMode();
    return true;
  };

  const takeFlight = (origin?: { x: number; y: number }) => {
    const from = origin ?? {
      x: canvas.getBoundingClientRect().left + body.pos.x,
      y: canvas.getBoundingClientRect().top + body.pos.y,
    };
    if (canvas.parentElement !== host) host.appendChild(canvas);
    canvas.classList.add("is-flying");
    flying = true;
    applyCanvasBox(window.innerWidth, window.innerHeight);
    snap(body, from);
    target.x = from.x;
    target.y = from.y;
    markMode();
  };

  const viewSize = () => ({ width: window.innerWidth, height: window.innerHeight });

  const slotRect = () => {
    const slot = dockSlot();
    return slot ? slot.getBoundingClientRect() : null;
  };

  const skyFallback = () =>
    dockPark(null, viewSize(), spanPxFor(window.innerWidth), EDGE);

  const liftIfPlanted = () => {
    if (flying) return;
    const rect = canvas.getBoundingClientRect();
    takeFlight({
      x: rect.left + body.pos.x,
      y: rect.top + body.pos.y,
    });
  };

  const aimRecall = () => {
    liftIfPlanted();
    const dest = homeOrExit(slotRect(), viewSize(), body.pos);
    recallKind = dest.kind;
    target.x = dest.point.x;
    target.y = dest.point.y;
    phase = "recall";
    pendingPlant = dest.kind === "home" && !scrolling;
    clickKick(body, target);
    markMode();
  };

  const restIdle = () => {
    if (phase === "parked" || drag.active) return;
    if (scrolling) return;
    const rect = slotRect();
    if (rect && rectOnScreen(rect, viewSize())) {
      if (!plantInSlot()) takeFlight(skyFallback());
      return;
    }
    if (!flying) liftIfPlanted();
    if (flying) {
      const dest = homeOrExit(rect, viewSize(), body.pos);
      recallKind = dest.kind;
      target.x = dest.point.x;
      target.y = dest.point.y;
      phase = "recall";
      pendingPlant = false;
      markMode();
    }
  };

  let lockY = 0;
  const lockPage = () => {
    lockY = window.scrollY;
    document.documentElement.classList.add("plane-dragging");
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  };

  const unlockPage = () => {
    document.documentElement.classList.remove("plane-dragging");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    document.documentElement.style.cursor = "";
    window.scrollTo(0, lockY);
    lastScrollY = lockY;
  };

  const blockPage = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const updateViewPlane = () => {
    camera.getWorldDirection(viewDir);
    viewPlane.setFromNormalAndCoplanarPoint(viewDir, new THREE.Vector3(0, 0, 0));
  };

  const resize = () => {
    if (drag.active) return;
    if (phase === "planted" || (phase !== "parked" && !scrolling)) {
      restIdle();
      return;
    }
    applyCanvasBox(window.innerWidth, window.innerHeight);
    if (recallKind !== "exit") collideBounds(body, pixelBounds(size.w, size.h, EDGE));
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

  const onPointerDown = (event: PointerEvent) => {
    if (event.isPrimary) drag.extra = 0;
    else drag.extra += 1;
    const hit = hitsPlane(event.clientX, event.clientY);
    hoverHit = hit;
    if (!hit) return;
    blockPage(event);
    liftIfPlanted();
    phase = "parked";
    pendingPlant = false;
    markMode();
    drag.active = true;
    drag.id = event.pointerId;
    drag.mode = dragModeFor(event, drag.extra);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    setFlight("flight");
    lockPage();
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
    blockPage(event);
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
      unlockPage();
    }
    if (!event.isPrimary) drag.extra = Math.max(0, drag.extra - 1);
  };

  const onContextMenu = (event: MouseEvent) => {
    if (drag.active || hitsPlane(event.clientX, event.clientY)) {
      blockPage(event);
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    if (drag.active || hitsPlane(touch.clientX, touch.clientY)) blockPage(event);
  };

  const onTouchMove = (event: TouchEvent) => {
    if (drag.active) blockPage(event);
  };

  const onWheel = (event: WheelEvent) => {
    if (drag.active) blockPage(event);
  };

  const beginScrollFlight = () => {
    const dy = window.scrollY - lastScrollY;
    if (phase === "planted") {
      // Leave the heading: a planted WebGL canvas still jitters on iOS
      // if it tries to ride flowing text. Fly out; come home after rest.
      liftIfPlanted();
      const pad = 140;
      recallKind = "exit";
      target.x = body.pos.x;
      target.y = dy >= 0 ? -pad : window.innerHeight + pad;
      phase = "recall";
      pendingPlant = false;
      clickKick(body, target);
      markMode();
      return;
    }
    aimRecall();
  };

  const endScrollFlight = () => {
    scrolling = false;
    scrollArmed = false;
    if (drag.active) return;
    if (phase === "planted") {
      const rect = slotRect();
      if (rect && !rectOnScreen(rect, viewSize())) return;
      return;
    }
    aimRecall();
  };

  const onScroll = () => {
    if (drag.active) return;
    scrolling = true;
    if (!scrollArmed) {
      scrollArmed = true;
      beginScrollFlight();
    } else if (phase === "recall" && recallKind === "home") {
      const rect = slotRect();
      if (rect && !rectOnScreen(rect, viewSize())) aimRecall();
    }
    lastScrollY = window.scrollY;
    window.clearTimeout(scrollIdle);
    scrollIdle = window.setTimeout(endScrollFlight, 180);
  };

  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, LONGEST) : 1 / 60;
    last = now;
    const still = stillRef.current;

    if (still) {
      if (phase === "planted") {
        // Stay planted — do not re-measure the heading on a timer.
      } else if (phase === "recall") {
        snap(body, target);
        if (pendingPlant && !scrolling) plantInSlot();
      } else {
        snap(body, target);
      }
      yaw = 0;
      pitch = 0;
      roll = 0;
      propSpeed = 0;
      trainer.prop.rotation.z = 0.6;
      applyPose();
      setFlight("flight");
      canvas.dataset.spinning = "0";
      markMode();
      canvas.dataset.x = body.pos.x.toFixed(1);
      canvas.dataset.y = body.pos.y.toFixed(1);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
      return;
    }

    if (phase === "planted") {
      yaw = lerp(yaw, 0, 1 - Math.exp(-dt / 0.22));
      pitch = lerp(pitch, 0, 1 - Math.exp(-dt / 0.22));
      roll = lerp(roll, 0, 1 - Math.exp(-dt / 0.18));
      propSpeed = lerp(propSpeed, PROP_FLY, 1 - Math.exp(-dt / 0.4));
      trainer.prop.rotation.z += propSpeed * dt;
      applyPose();
      setFlight("flight");
      canvas.dataset.spinning = propSpeed < 2 ? "0" : "1";
      markMode();
      canvas.dataset.x = body.pos.x.toFixed(1);
      canvas.dataset.y = body.pos.y.toFixed(1);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
      return;
    }

    stepSpring(body, target, dt);
    if (recallKind !== "exit" || phase !== "recall") {
      collideBounds(body, pixelBounds(size.w, size.h, EDGE));
    }
    if (phase === "recall" && pendingPlant && !scrolling && settled(body, target, 10, 40)) {
      plantInSlot();
    }

    const desiredYaw = clamp(body.vel.x * 0.0016, -0.9, 0.9);
    const desiredPitch = clamp(-body.vel.y * 0.0014, -0.45, 0.45);
    const desiredRoll = clamp(-body.vel.x * 0.0018, -0.55, 0.55);
    if (drag.mode !== "orbit" || !drag.active) {
      yaw = lerp(yaw, desiredYaw, 1 - Math.exp(-dt / 0.22));
      pitch = lerp(pitch, desiredPitch, 1 - Math.exp(-dt / 0.22));
    }
    roll = lerp(roll, desiredRoll, 1 - Math.exp(-dt / 0.18));

    propSpeed = lerp(propSpeed, PROP_FLY, 1 - Math.exp(-dt / 0.4));
    trainer.prop.rotation.z += propSpeed * dt;
    applyPose();

    canvas.dataset.spinning = propSpeed < 2 ? "0" : "1";
    markMode();
    canvas.dataset.x = body.pos.x.toFixed(1);
    canvas.dataset.y = body.pos.y.toFixed(1);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const onTheme = () => trainer.setTheme(themeScheme());
  themeQuery.addEventListener("change", onTheme);

  const onWindowResize = () => {
    if (phase === "planted") {
      const slot = dockSlot();
      if (slot && slot.clientWidth === size.w && slot.clientHeight === size.h) return;
    }
    resize();
  };

  const orphanWatch = new MutationObserver(() => {
    if (!canvas.isConnected) {
      host.appendChild(canvas);
      if (phase !== "parked") restIdle();
    } else if (phase === "planted" && !dockSlot()) {
      takeFlight(skyFallback());
      phase = "recall";
    }
  });
  orphanWatch.observe(document.body, { childList: true, subtree: true });

  restIdle();
  document.fonts?.ready.then(() => {
    if (phase === "planted" || phase === "recall") restIdle();
  });
  setFlight("flight");
  applyPose();
  canvas.dataset.x = body.pos.x.toFixed(1);
  canvas.dataset.y = body.pos.y.toFixed(1);
  canvas.dataset.spinning = stillRef.current ? "0" : "1";
  markMode();
  renderer.render(scene, camera);

  const optsClaim: AddEventListenerOptions = { capture: true, passive: false };
  window.addEventListener("pointerdown", onPointerDown, optsClaim);
  window.addEventListener("pointermove", onPointerMove, optsClaim);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("touchstart", onTouchStart, optsClaim);
  window.addEventListener("touchmove", onTouchMove, optsClaim);
  window.addEventListener("wheel", onWheel, optsClaim);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onWindowResize);
  frame = requestAnimationFrame(tick);

  const dispose = () => {
    cancelAnimationFrame(frame);
    orphanWatch.disconnect();
    window.removeEventListener("pointerdown", onPointerDown, optsClaim);
    window.removeEventListener("pointermove", onPointerMove, optsClaim);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    window.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("touchstart", onTouchStart, optsClaim);
    window.removeEventListener("touchmove", onTouchMove, optsClaim);
    window.removeEventListener("wheel", onWheel, optsClaim);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onWindowResize);
    window.clearTimeout(scrollIdle);
    themeQuery.removeEventListener("change", onTheme);
    if (drag.active) unlockPage();
    else {
      document.documentElement.classList.remove("plane-dragging");
      document.documentElement.style.cursor = "";
    }
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
