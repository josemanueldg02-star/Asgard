"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GRID_DIVISIONS } from "@/lib/canvas";

type PixelBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image_url: string;
  link_url: string | null;
};

export default function PixelCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<PixelBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    async function loadBlocks() {
      const { data, error } = await supabase
        .from("pixel_blocks")
        .select("id, x, y, width, height, image_url, link_url");

      if (error) {
        console.error("Error loading pixel blocks:", error);
      } else {
        setBlocks(data ?? []);
      }
      setLoading(false);
    }

    loadBlocks();
  }, []);

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

    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.strokeStyle = "#e4e4e7";
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
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = block.image_url;
      img.onload = () => {
        ctx.drawImage(
          img,
          block.x * size.width,
          block.y * size.height,
          block.width * size.width,
          block.height * size.height
        );
      };
    });
  }, [blocks, size]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="block bg-zinc-50" />
      {loading && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-zinc-500">
          Cargando lienzo...
        </p>
      )}
    </div>
  );
}