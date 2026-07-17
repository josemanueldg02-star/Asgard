"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  GRID_DIVISIONS,
  MIN_BLOCK_FRACTION,
  rectsOverlap,
  calculatePriceCents,
  formatPrice,
  type Rect,
} from "@/lib/canvas";

type PixelBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image_url: string;
  link_url: string | null;
};

type PixelCanvasProps = {
  onBlocksChange?: (blocks: PixelBlock[]) => void;
};

export default function PixelCanvas({ onBlocksChange }: PixelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [blocks, setBlocks] = useState<PixelBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [imageTick, setImageTick] = useState(0);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [selectedArea, setSelectedArea] = useState<Rect | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlocks() {
      const { data, error } = await supabase
        .from("pixel_blocks")
        .select("id, x, y, width, height, image_url, link_url");

      if (error) {
        console.error("Error loading pixel blocks:", error);
      } else {
        setBlocks(data ?? []);
        onBlocksChange?.(data ?? []);
      }
      setLoading(false);
    }

    loadBlocks();
  }, [onBlocksChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    blocks.forEach((block) => {
      if (imageCache.current.has(block.image_url)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = block.image_url;
      img.onload = () => {
        imageCache.current.set(block.image_url, img);
        setImageTick((t) => t + 1);
      };
    });
  }, [blocks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#0d0f17";
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.strokeStyle = "rgba(232, 184, 75, 0.08)";
    const stepX = size.width / GRID_DIVISIONS;
    const stepY = size.height / GRID_DIVISIONS;
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * stepX, 0);
      ctx.lineTo(i * stepX, size.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * stepY);
      ctx.lineTo(size.width, i * stepY);
      ctx.stroke();
    }

    blocks.forEach((block) => {
      const img = imageCache.current.get(block.image_url);
      if (!img) return;
      ctx.drawImage(
        img,
        block.x * size.width,
        block.y * size.height,
        block.width * size.width,
        block.height * size.height
      );
    });

    if (dragRect) {
      let strokeColor = "#e8b84b";
      let fillColor = "rgba(232, 184, 75, 0.18)";
      let lineWidth = 2;
      if (selectionError) {
        strokeColor = "#ef4444";
        fillColor = "rgba(239, 68, 68, 0.2)";
      } else if (selectedArea) {
        fillColor = "rgba(232, 184, 75, 0.28)";
        lineWidth = 3;
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(
        dragRect.x * size.width,
        dragRect.y * size.height,
        dragRect.width * size.width,
        dragRect.height * size.height
      );
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(
        dragRect.x * size.width,
        dragRect.y * size.height,
        dragRect.width * size.width,
        dragRect.height * size.height
      );
    }
  }, [blocks, size, dragRect, imageTick, selectedArea, selectionError]);

  function getFraction(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.min(Math.max(x, 0), 1),
      y: Math.min(Math.max(y, 0), 1),
    };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const point = getFraction(e);
    dragStartRef.current = point;
    setSelectedArea(null);
    setSelectionError(null);
    setDragRect({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragStartRef.current) return;
    const point = getFraction(e);
    const start = dragStartRef.current;
    setDragRect({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function handleMouseUp() {
    dragStartRef.current = null;
    if (!dragRect) return;

    if (dragRect.width < 0.002 || dragRect.height < 0.002) {
      setDragRect(null);
      setSelectionError(null);
      setSelectedArea(null);
      return;
    }

    if (dragRect.width < MIN_BLOCK_FRACTION || dragRect.height < MIN_BLOCK_FRACTION) {
      setSelectionError("El área seleccionada es demasiado pequeña.");
      setSelectedArea(null);
      return;
    }

    const overlapsExisting = blocks.some((block) => rectsOverlap(dragRect, block));
    if (overlapsExisting) {
      setSelectionError("Esa zona ya está ocupada por otro bloque.");
      setSelectedArea(null);
      return;
    }

    setSelectionError(null);
    setSelectedArea(dragRect);
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="block bg-[#0d0f17] cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {loading && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-foreground/50">
          Cargando lienzo...
        </p>
      )}
      {dragRect && (
        <div className="absolute top-4 right-4 rounded-lg border border-gold-dim/40 bg-background/90 px-4 py-2 text-right shadow-lg backdrop-blur">
          <div className="text-xs tracking-wider text-foreground/50 uppercase">
            Precio estimado
          </div>
          <div className="font-mono text-lg font-semibold text-gold">
            {formatPrice(calculatePriceCents(dragRect))}
          </div>
        </div>
      )}
      {selectionError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-red-400/40 bg-red-950/90 px-4 py-2 text-sm text-red-100 shadow-lg">
          {selectionError}
        </div>
      )}
      {selectedArea && !selectionError && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-gold-dim/40 bg-background/90 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur">
          <span className="font-mono">
            {(selectedArea.width * 100).toFixed(1)}% × {(selectedArea.height * 100).toFixed(1)}%
            {" · "}
            <span className="text-gold">{formatPrice(calculatePriceCents(selectedArea))}</span>
          </span>
          <button
            type="button"
            onClick={() => console.log("Selección confirmada:", selectedArea)}
            className="rounded bg-gold px-3 py-1 font-medium text-black hover:bg-gold/90"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}