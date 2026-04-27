'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  onClose: () => void;
};

type Transform = {
  scale: number;
  x: number;
  y: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type TouchPoint = Pick<React.Touch, 'clientX' | 'clientY'>;

const getDistance = (a: TouchPoint, b: TouchPoint) =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

const getMidpoint = (a: TouchPoint, b: TouchPoint) => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});

export function FloorPlanViewer({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });

  // close on Escape
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const resetTransform = useCallback(() => setTransform({ scale: 1, x: 0, y: 0 }), []);

  // --- mouse/trackpad wheel zoom ---
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const originX = event.clientX - rect.left;
    const originY = event.clientY - rect.top;
    const delta = -event.deltaY * 0.001;

    setTransform((prev) => {
      const nextScale = clamp(prev.scale * (1 + delta), MIN_SCALE, MAX_SCALE);
      const ratio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: originX - ratio * (originX - prev.x),
        y: originY - ratio * (originY - prev.y),
      };
    });
  }, []);

  // --- mouse drag ---
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    dragStart.current = { x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    setTransform((prev) => ({ ...prev, x: dragStart.current!.tx + dx, y: dragStart.current!.ty + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { dragStart.current = null; }, []);

  // --- touch events (pinch + pan) ---
  const lastTouches = useRef<{ dist: number; mid: { x: number; y: number }; tx: number; ty: number; scale: number } | null>(null);
  const singleDragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      singleDragStart.current = null;
      const [a, b] = [event.touches[0], event.touches[1]];
      lastTouches.current = {
        dist: getDistance(a, b),
        mid: getMidpoint(a, b),
        tx: transform.x,
        ty: transform.y,
        scale: transform.scale,
      };
    } else if (event.touches.length === 1) {
      lastTouches.current = null;
      singleDragStart.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        tx: transform.x,
        ty: transform.y,
      };
    }
  }, [transform]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();

    if (event.touches.length === 2 && lastTouches.current) {
      const [a, b] = [event.touches[0], event.touches[1]];
      const rect = containerRef.current!.getBoundingClientRect();
      const dist = getDistance(a, b);
      const mid = getMidpoint(a, b);
      const ratio = dist / lastTouches.current.dist;
      const nextScale = clamp(lastTouches.current.scale * ratio, MIN_SCALE, MAX_SCALE);
      const actualRatio = nextScale / lastTouches.current.scale;
      const originX = mid.x - rect.left;
      const originY = mid.y - rect.top;
      const originX0 = lastTouches.current.mid.x - rect.left;
      const originY0 = lastTouches.current.mid.y - rect.top;

      setTransform({
        scale: nextScale,
        x: originX - actualRatio * (originX0 - lastTouches.current.tx),
        y: originY - actualRatio * (originY0 - lastTouches.current.ty),
      });
    } else if (event.touches.length === 1 && singleDragStart.current) {
      const dx = event.touches[0].clientX - singleDragStart.current.x;
      const dy = event.touches[0].clientY - singleDragStart.current.y;
      setTransform((prev) => ({ ...prev, x: singleDragStart.current!.tx + dx, y: singleDragStart.current!.ty + dy }));
    }
  }, []);

  const lastTapTime = useRef(0);
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    lastTouches.current = null;
    singleDragStart.current = null;

    // double-tap to zoom
    if (event.changedTouches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        const rect = containerRef.current!.getBoundingClientRect();
        const touch = event.changedTouches[0];
        const originX = touch.clientX - rect.left;
        const originY = touch.clientY - rect.top;
        setTransform((prev) => {
          if (prev.scale > 1.5) {
            return { scale: 1, x: 0, y: 0 };
          }
          const nextScale = 2.5;
          const ratio = nextScale / prev.scale;
          return {
            scale: nextScale,
            x: originX - ratio * (originX - prev.x),
            y: originY - ratio * (originY - prev.y),
          };
        });
      }
      lastTapTime.current = now;
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="오피스텔 도면"
    >
      {/* toolbar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">FLOOR PLAN</p>
          <p className="text-sm font-bold text-white">오피스텔 도면</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10"
            type="button"
            onClick={resetTransform}
          >
            초기화
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:bg-white/10"
            type="button"
            aria-label="닫기"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* image area */}
      <div
        ref={containerRef}
        className="relative flex-1 select-none overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', willChange: 'transform' }}
        >
          <Image
            src="/drawings.png"
            alt="분당풍림아이원플러스 오피스텔 도면"
            width={1200}
            height={900}
            className="max-h-full max-w-full object-contain"
            draggable={false}
            priority
          />
        </div>
      </div>

      {/* hint */}
      <p className="shrink-0 py-2 text-center text-[11px] font-bold text-white/30 sm:py-3">
        핀치로 확대 · 드래그로 이동 · 두 번 탭으로 확대
      </p>
    </div>
  );
}
