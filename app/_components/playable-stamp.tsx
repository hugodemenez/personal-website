"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

export interface StampOffset {
  x: number;
  y: number;
}

interface PlayableStampProps {
  children: ReactNode;
  className?: string;
  offset: StampOffset;
  onOffset: (offset: StampOffset) => void;
  /**
   * Title stamps sit in the scrolling list. If the first movement is mostly
   * vertical, leave the gesture to the page so a drag does not steal scroll.
   */
  allowVerticalScroll?: boolean;
}

const DRAG_THRESHOLD = 8;

/**
 * Pointer drag for a stamp — mouse, touch, and pen. A tap still reaches the
 * link inside; a drag does not navigate.
 */
export function PlayableStamp({
  children,
  className,
  offset,
  onOffset,
  allowVerticalScroll = false,
}: PlayableStampProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{
    blocked: boolean;
    moved: boolean;
    originX: number;
    originY: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const endDrag = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (drag.moved) {
      didDragRef.current = true;
      event.preventDefault();
    }

    if (hostRef.current?.hasPointerCapture(event.pointerId)) {
      hostRef.current.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    setDragging(false);
  };

  return (
    <span
      ref={hostRef}
      className={`stamp-play relative block ${className ?? ""}`}
      data-allow-scroll={allowVerticalScroll ? "true" : undefined}
      data-dragging={dragging ? "true" : undefined}
      onClickCapture={(event) => {
        if (!didDragRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        didDragRef.current = false;
      }}
      onPointerCancel={endDrag}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        didDragRef.current = false;
        dragRef.current = {
          blocked: false,
          moved: false,
          originX: offset.x,
          originY: offset.y,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.pointerId || drag.blocked) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        if (!drag.moved) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          if (allowVerticalScroll && Math.abs(dy) > Math.abs(dx) * 1.15) {
            drag.blocked = true;
            dragRef.current = null;
            return;
          }

          drag.moved = true;
          setDragging(true);
          hostRef.current?.setPointerCapture(event.pointerId);
        }

        event.preventDefault();
        onOffset({ x: drag.originX + dx, y: drag.originY + dy });
      }}
      onPointerUp={endDrag}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: dragging ? 50 : undefined,
      }}
    >
      {children}
    </span>
  );
}
