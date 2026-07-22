"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/canvas";

type PendingBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image_url: string;
  link_url: string | null;
  owner_email: string;
  price_cents: number;
  created_at: string;
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [blocks, setBlocks] = useState<PendingBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadPendingBlocks();
    loadMaintenanceMode();
  }, [session]);

  async function loadPendingBlocks() {
    setLoadingBlocks(true);
    const { data, error } = await supabase
      .from("pixel_blocks")
      .select("id, x, y, width, height, image_url, link_url, owner_email, price_cents, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setActionError("Error cargando bloques pendientes.");
    } else {
      setBlocks(data ?? []);
    }
    setLoadingBlocks(false);
  }


  async function loadMaintenanceMode() {
    const { data } = await supabase
      .from("site_settings")
      .select("maintenance_mode")
      .eq("id", 1)
      .single();
    if (data) setMaintenanceMode(data.maintenance_mode);
  }

  async function toggleMaintenanceMode() {
    setMaintenanceLoading(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ maintenance_mode: !maintenanceMode, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (!error) setMaintenanceMode((prev) => !prev);
    setMaintenanceLoading(false);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError("Credenciales incorrectas.");
    }
    setLoggingIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setBlocks([]);
  }

  async function handleReview(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setActionError(null);
    const { error } = await supabase.from("pixel_blocks").update({ status }).eq("id", id);
    if (error) {
      setActionError("Error actualizando el bloque.");
    } else {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    }
    setBusyId(null);
  }

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground/60">
        Cargando...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <form
          onSubmit={handleLogin}
          className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-gold-dim/40 bg-black/30 p-6"
        >
          <h1 className="text-lg font-semibold text-gold">Acceso administrador</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-gold-dim/30 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-gold-dim/30 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
          />
          {loginError && <p className="text-sm text-red-400">{loginError}</p>}
          <button
            type="submit"
            disabled={loggingIn}
            className="rounded bg-gold px-4 py-2 font-medium text-black hover:bg-gold/90 disabled:opacity-50"
          >
            {loggingIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gold">Bloques pendientes</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMaintenanceMode}
              disabled={maintenanceLoading}
              className={`rounded px-3 py-1 text-sm font-medium disabled:opacity-50 ${
                maintenanceMode
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-gold-dim/40 text-foreground/70 hover:text-foreground"
              }`}
            >
              {maintenanceMode ? "🔧 Mantenimiento activado" : "Activar mantenimiento"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded border border-gold-dim/40 px-3 py-1 text-sm text-foreground/70 hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {actionError && <p className="mb-4 text-sm text-red-400">{actionError}</p>}

        {loadingBlocks && <p className="text-foreground/60">Cargando...</p>}

        {!loadingBlocks && blocks.length === 0 && (
          <p className="text-foreground/60">No hay bloques pendientes de revisión.</p>
        )}

        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="flex gap-4 rounded-lg border border-gold-dim/30 bg-black/20 p-4"
            >
              <img
                src={block.image_url}
                alt="Imagen enviada"
                className="h-24 w-24 rounded object-cover"
              />
              <div className="flex-1 text-sm">
                <p>
                  <span className="text-foreground/50">Enlace: </span>
                  <a
                    href={block.link_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-gold underline"
                  >
                    {block.link_url}
                  </a>
                </p>
                <p>
                  <span className="text-foreground/50">Email: </span>
                  {block.owner_email}
                </p>
                <p>
                  <span className="text-foreground/50">Precio: </span>
                  {formatPrice(block.price_cents)}
                </p>
                <p className="font-mono text-xs text-foreground/40">
                  {(block.width * 100).toFixed(1)}% × {(block.height * 100).toFixed(1)}%
                </p>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <button
                  onClick={() => handleReview(block.id, "approved")}
                  disabled={busyId === block.id}
                  className="rounded bg-gold px-3 py-1 text-sm font-medium text-black hover:bg-gold/90 disabled:opacity-50"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleReview(block.id, "rejected")}
                  disabled={busyId === block.id}
                  className="rounded border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}