"use client";

import { useState } from "react";

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="group fixed left-4 top-4 z-50">
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-dim/40 bg-black/40 text-sm font-semibold text-gold hover:bg-black/60"
          aria-label="Ayuda"
        >
          ?
        </button>
        <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          ¿Necesitas ayuda?
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-gold-dim/40 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gold">¿Cómo funciona Asgard?</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-foreground/60 hover:text-foreground"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <video
              src="/ayuda.mp4"
              controls
              className="mb-4 w-full rounded border border-gold-dim/30"
            />

            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">
              <li>Asgard vende trozos de esta web como espacio publicitario permanente.</li>
              <li>Haz clic y arrastra sobre el lienzo para seleccionar el área que quieres comprar.</li>
              <li>Sube tu imagen y, opcionalmente, un enlace al que dirigir a los visitantes.</li>
              <li>Completa el pago de forma segura con Stripe.</li>
              <li>Tras la aprobación, tu imagen quedará visible en ese espacio para siempre.</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}