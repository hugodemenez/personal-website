"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SharpSceneViewerProps {
  readonly plyUrl: string;
  readonly motionEnabled: boolean;
  readonly scrollOffset?: number;
  readonly resetSignal?: number;
  readonly onReady?: () => void;
  readonly onError?: (message: string) => void;
}

type Orbit = {
  yaw: number;
  pitch: number;
  radius: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function SharpSceneViewer({
  plyUrl,
  motionEnabled,
  scrollOffset = 0,
  resetSignal,
  onReady,
  onError,
}: SharpSceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbitRef = useRef<Orbit>({ yaw: 0.3, pitch: -0.1, radius: 3 });
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(
    null
  );
  const motionYawRef = useRef(0);
  const motionPitchRef = useRef(0);
  const scrollRef = useRef(scrollOffset);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    if (!plyUrl) return;
    let isMounted = true;
    let frameId: number | null = null;
    let renderer: import("three").WebGLRenderer | null = null;
    let camera: import("three").PerspectiveCamera | null = null;
    let scene: import("three").Scene | null = null;
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      try {
        const THREE = await import("three");
        const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");

        if (!isMounted || !containerRef.current) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
          55,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.01,
          100
        );

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        containerRef.current.appendChild(renderer.domElement);

        const light = new THREE.HemisphereLight(0xffffff, 0x222222, 1.2);
        scene.add(light);

        const loader = new PLYLoader();
        loader.load(
          plyUrl,
          (geometry) => {
            geometry.computeVertexNormals();
            geometry.center();

            const material = new THREE.PointsMaterial({
              size: 0.02,
              sizeAttenuation: true,
              vertexColors: true,
              transparent: true,
              opacity: 0.95,
            });

            const points = new THREE.Points(geometry, material);
            scene?.add(points);

            const bbox = new THREE.Box3().setFromObject(points);
            const size = bbox.getSize(new THREE.Vector3()).length() || 1;
            const radius = Math.max(size * 0.8, 1);
            orbitRef.current.radius = radius;

            const center = bbox.getCenter(new THREE.Vector3());
            points.position.sub(center);

            setHasRendered(true);
            onReady?.();
          },
          undefined,
          (error) => {
            console.error("PLY load failed", error);
            onError?.("Failed to load scene");
          }
        );

        const updateCamera = () => {
          if (!camera) return;
          const baseYaw = orbitRef.current.yaw + scrollRef.current * 0.12;
          const basePitch = orbitRef.current.pitch;
          const yaw = baseYaw + motionYawRef.current * 0.5;
          const pitch = clamp(basePitch + motionPitchRef.current * 0.4, -1.2, 1.2);

          const r = orbitRef.current.radius;
          const x = r * Math.cos(pitch) * Math.sin(yaw);
          const y = r * Math.sin(pitch);
          const z = r * Math.cos(pitch) * Math.cos(yaw);

          camera.position.set(x, y, z);
          camera.lookAt(0, 0, 0);
        };

        const onResize = () => {
          if (!containerRef.current || !renderer || !camera) return;
          const { clientWidth, clientHeight } = containerRef.current;
          renderer.setSize(clientWidth, clientHeight);
          camera.aspect = clientWidth / clientHeight;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);

        const renderLoop = () => {
          if (!renderer || !scene || !camera) return;
          updateCamera();
          renderer.render(scene, camera);
          frameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        cleanup = () => {
          window.removeEventListener("resize", onResize);
          if (frameId) cancelAnimationFrame(frameId);
          renderer?.dispose();
          scene?.clear();
          if (renderer?.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
      } catch (error) {
        console.error("Viewer setup failed", error);
        onError?.("Viewer setup failed");
      }
    };

    setup();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [plyUrl, onError, onReady]);

  useEffect(() => {
    scrollRef.current = scrollOffset;
  }, [scrollOffset]);

  useEffect(() => {
    if (resetSignal === undefined) return;
    orbitRef.current.yaw = 0.3;
    orbitRef.current.pitch = -0.1;
    motionYawRef.current = 0;
    motionPitchRef.current = 0;
  }, [resetSignal]);

  useEffect(() => {
    if (!motionEnabled || prefersReducedMotion) {
      motionYawRef.current = 0;
      motionPitchRef.current = 0;
      return;
    }

    let lastYaw = 0;
    let lastPitch = 0;
    const smoothing = 0.08;

    const handler = (event: DeviceOrientationEvent) => {
      if (event.alpha == null || event.beta == null || event.gamma == null) {
        return;
      }
      const yaw = (event.alpha * Math.PI) / 180;
      const pitch = (event.beta * Math.PI) / 180 - Math.PI / 2;
      lastYaw = lastYaw + smoothing * (yaw - lastYaw);
      lastPitch = lastPitch + smoothing * (pitch - lastPitch);
      motionYawRef.current = lastYaw;
      motionPitchRef.current = lastPitch;
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => {
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, [motionEnabled, prefersReducedMotion]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    dragStartRef.current = { x, y, yaw: orbitRef.current.yaw, pitch: orbitRef.current.pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const deltaX = x - dragStartRef.current.x;
    const deltaY = y - dragStartRef.current.y;
    orbitRef.current.yaw = dragStartRef.current.yaw + deltaX * 0.005;
    orbitRef.current.pitch = clamp(
      dragStartRef.current.pitch + deltaY * 0.004,
      -1.2,
      1.2
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {!hasRendered ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-background/20 to-background/80" />
      ) : null}
    </div>
  );
}
