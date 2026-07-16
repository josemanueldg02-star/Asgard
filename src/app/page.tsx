import PixelCanvas from "@/components/PixelCanvas";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col bg-black">
      <header className="flex shrink-0 items-center justify-center border-b border-zinc-800 py-4">
        <h1 className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-2xl font-bold tracking-[0.2em] text-transparent uppercase">
          Asgard
        </h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <PixelCanvas />
      </main>
    </div>
  );
}