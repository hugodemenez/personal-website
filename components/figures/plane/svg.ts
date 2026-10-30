import { figureSvg, fitProjection, type Projection } from "@/components/iso/iso-kit";
import { NOSE, PROP_R, SPAN, VIEW_HEIGHT, VIEW_WIDTH } from "./motion";
import { planeParts } from "./parts";

const BOUNDS: Array<[number, number, number]> = [
  [-80, -(SPAN + 4), -14],
  [NOSE + 8, SPAN + 4, 48],
  [-80, SPAN + 4, 48],
  [NOSE + 8, -(SPAN + 4), -14],
  [-6, SPAN + 4, 40],
  [-6, -(SPAN + 4), 40],
  [NOSE + 3, PROP_R, 22 + PROP_R],
  [NOSE + 3, -PROP_R, 22 - PROP_R],
  [-76, 0, 48],
];

export function planeProjection(): Projection {
  return fitProjection(BOUNDS, VIEW_WIDTH, VIEW_HEIGHT, { pad: 28, azimuth: 38 });
}

export function planeFigureSvg(projection: Projection = planeProjection()) {
  const { body } = planeParts(projection);
  return figureSvg({
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    label: "A high-wing single-engine light aircraft in level flight, its propeller turning.",
    body: [`<g data-part="plane">${body}</g>`],
  });
}
