"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PixelCanvas from "@/components/PixelCanvas";
import HelpButton from "@/components/HelpButton";

type PixelBlock = {
  width: number;
  height: number;
};

export default function Home() {
  const [soldFraction, setSoldFraction] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("maintenance_mode")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setMaintenanceMode(data.maintenance_mode);
      });
  }, []);

  function handleBlocksChange(blocks: PixelBlock[]) {
    const total = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
    setSoldFraction(total);
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <HelpButton />
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
        {maintenanceMode && (
          <p className="mt-2 rounded border border-red-400/40 bg-red-950/40 px-3 py-1 text-xs text-red-200">
            🔧 Estamos actualizando Asgard. Las compras están temporalmente desactivadas.
          </p>
        )}
      </header>
      <main className="flex-1 overflow-hidden">
        <PixelCanvas onBlocksChange={handleBlocksChange} maintenanceMode={maintenanceMode} />
      </main>
    </div>
  );
}