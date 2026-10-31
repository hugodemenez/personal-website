export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Ndc = { x: number; y: number };

export type DragMode = "move" | "orbit";

/** Convert a client point to Three.js NDC for Raycaster.setFromCamera. */
export function clientToNdc(clientX: number, clientY: number, rect: Rect): Ndc {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

export function pixelBounds(width: number, height: number, margin: number): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  return {
    minX: margin,
    maxX: Math.max(margin, width - margin),
    minY: margin,
    maxY: Math.max(margin, height - margin),
  };
}

/** Shift, right button, or a second contact rotates in place. */
export function dragModeFor(event: {
  shiftKey?: boolean;
  button?: number;
  buttons?: number;
  pointerType?: string;
}, extraPointers = 0): DragMode {
  if (event.shiftKey) return "orbit";
  if ((event.button ?? 0) === 2) return "orbit";
  if ((event.buttons ?? 0) & 2) return "orbit";
  if (extraPointers >= 1) return "orbit";
  return "move";
}

export function shouldClaimPointer(hit: boolean, dragging: boolean) {
  return hit || dragging;
}

/** On-screen wingspan in CSS pixels — half the previous 148 / 196 framing. */
export const PLANE_SPAN_PX = { mobile: 74, desktop: 98 } as const;

export const PLANE_DOCK = "[data-plane-dock]";

export function spanPxFor(width: number) {
  return width < 640 ? PLANE_SPAN_PX.mobile : PLANE_SPAN_PX.desktop;
}

/** Rest/spawn next to a marker (after “planes”), else the old top-right park. */
export function dockPark(
  rect: { left: number; top: number; right: number; width: number; height: number } | null,
  view: { width: number; height: number },
  spanPx: number,
  margin: number,
): { x: number; y: number } {
  const bounds = pixelBounds(view.width, view.height, margin);
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return {
      x: Math.max(bounds.minX, view.width - margin - 20),
      y: bounds.minY + 8,
    };
  }
  const gap = 8;
  let x = rect.right + gap + spanPx * 0.38;
  let y = rect.top + rect.height / 2;
  const maxX = view.width - Math.max(spanPx * 0.42, 16);
  if (x > maxX) {
    x = Math.min(maxX, Math.max(rect.left + spanPx * 0.45, rect.right - spanPx * 0.1));
    y = rect.top + rect.height + 12 + spanPx * 0.22;
  }
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}
