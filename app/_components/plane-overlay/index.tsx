"use client";

import dynamic from "next/dynamic";
import "./plane-overlay.css";

const PlaneCanvas = dynamic(
  () => import("./canvas").then((module) => module.PlaneCanvas),
  { ssr: false },
);

export function PlaneOverlay() {
  return <PlaneCanvas />;
}
