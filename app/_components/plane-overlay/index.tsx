import "@/components/iso/iso.css";
import "./plane-overlay.css";
import { planeFigureSvg, planeProjection } from "@/components/figures/plane/svg";
import { PlaneLive } from "./live";

const projection = planeProjection();
const svg = planeFigureSvg(projection);

export function PlaneOverlay() {
  return <PlaneLive svg={svg} projection={projection} />;
}
