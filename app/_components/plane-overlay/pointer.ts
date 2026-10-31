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
