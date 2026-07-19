import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculatePriceCents, type Rect } from "@/lib/canvas";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
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
    success_url: `${origin}/?checkout=success`,
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