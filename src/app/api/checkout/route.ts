import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculatePriceCents, rectsOverlap, type Rect } from "@/lib/canvas";
import { ipAddress } from "@vercel/functions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("maintenance_mode")
    .eq("id", 1)
    .single();

  if (settings?.maintenance_mode) {
    return NextResponse.json(
      { error: "El sitio está en mantenimiento temporalmente. Vuelve en un rato." },
      { status: 503 }
    );
  }

  const ip = ipAddress(request) ?? "unknown";

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", oneMinuteAgo);

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes, inténtalo de nuevo en unos minutos." },
      { status: 429 }
    );
  }
  
  await supabaseAdmin.from("rate_limits").insert({ ip });

  const formData = await request.formData();

  const image = formData.get("image");
  const linkUrl = formData.get("linkUrl");
  const buyerEmail = formData.get("buyerEmail");
  const x = Number(formData.get("x"));
  const y = Number(formData.get("y"));
  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
  }
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  if (!ALLOWED_TYPES.includes(image.type)) {
    return NextResponse.json({ error: "Formato de imagen no permitido." }, { status: 400 });
  }
  if (image.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "La imagen supera el tamaño máximo (5MB)." }, { status: 400 });
  }
  if (typeof linkUrl !== "string" || typeof buyerEmail !== "string") {
    return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
  }
 
  try {
    new URL(linkUrl);
  } catch {
    return NextResponse.json({ error: "Enlace inválido." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(buyerEmail)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  if ([x, y, width, height].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Área inválida." }, { status: 400 });
  }

  const rect: Rect = { x, y, width, height };
  const priceCents = calculatePriceCents(rect);

  const { data: existingBlocks, error: fetchError } = await supabaseAdmin
    .from("pixel_blocks")
    .select("x, y, width, height")
    .in("status", ["pending", "approved"]);

  if (fetchError) {
    console.error("Error comprobando solapes:", fetchError); 
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  if ((existingBlocks ?? []).some((block) => rectsOverlap(rect, block))) {
    return NextResponse.json(
      { error: "Esa zona ya no está disponible, elige otra." },
      { status: 409 }
    );
  }

  const extension = image.name.split(".").pop() || "png";
  const path = `${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("pixel-images")
    .upload(path, image, { contentType: image.type });

  if (uploadError) {
    console.error("Error subiendo imagen:", uploadError);
    return NextResponse.json({ error: "Error subiendo la imagen." }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("pixel-images")
    .getPublicUrl(path);

  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: priceCents,
          product_data: {
            name: "Espacio publicitario en Asgard",
          },
        },
        quantity: 1,
      },
    ],
    customer_email: buyerEmail,
    success_url: `${origin}/gracias`,
    cancel_url: `${origin}/?checkout=cancelled`,
    metadata: {
      x: String(x),
      y: String(y),
      width: String(width),
      height: String(height),
      image_url: publicUrlData.publicUrl,
      link_url: linkUrl,
      buyer_email: buyerEmail,
      price_cents: String(priceCents),
    },
  });

  return NextResponse.json({ url: session.url });
}