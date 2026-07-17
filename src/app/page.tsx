"use client";

import { useState } from "react";
import PixelCanvas from "@/components/PixelCanvas";

type PixelBlock = {
  width: number;
  height: number;
};

export default function Home() {
  const [soldFraction, setSoldFraction] = useState(0);

  function handleBlocksChange(blocks: PixelBlock[]) {
    const total = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
    setSoldFraction(total);
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <header className="flex shrink-0 flex-col items-center gap-1 border-b border-gold-dim/30 py-6">
        <h1 className="bg-gradient-to-r from-gold via-yellow-100 to-gold bg-clip-text text-4xl font-bold tracking-[0.3em] text-transparent uppercase">
          Asgard
        </h1>
        <p className="text-sm text-foreground/60">
          Compra tu trozo de esta web, para siempre
        </p>
        <p className="font-mono text-xs text-gold">
          {(soldFraction * 100).toFixed(2)}% del lienzo vendido
        </p>
      </header>
      <main className="flex-1 overflow-hidden">
        <PixelCanvas onBlocksChange={handleBlocksChange} />
      </main>
    </div>
  );
}