import Link from "next/link";

export default function GraciasPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="bg-gradient-to-r from-gold via-yellow-100 to-gold bg-clip-text text-3xl font-bold tracking-[0.2em] text-transparent uppercase">
        ¡Gracias por tu compra!
      </h1>
      <p className="max-w-md text-sm text-foreground/70">
        Hemos recibido tu pago correctamente. Tu píxel está pendiente de
        revisión y aparecerá en el lienzo en cuanto sea aprobado.
      </p>
      <Link
        href="/"
        className="mt-4 rounded bg-gold px-4 py-2 font-medium text-black hover:bg-gold/90"
      >
        Volver al lienzo
      </Link>
    </div>
  );
}