import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
        console.error("Firma de webhook inválida:", err);
        return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (!metadata) {
            console.error("Sesión sin metadata.", session.id);
            return NextResponse.json({ received: true});
        }

        const { error } = await supabaseAdmin.from("pixel_blocks").insert({
            x: Number(metadata.x),
            y: Number(metadata.y),
            width: Number(metadata.width),
            height: Number(metadata.height),
            image_url: metadata.image_url,
            link_url: metadata.link_url,
            owner_email: metadata.buyer_email,
            price_cents: Number(metadata.price_cents),
            stripe_session_id: session.id,
            status: "pending",
        });

        if (error && error.code !== "23505") {
            console.error("Error insertando bloque:", error);
            return NextResponse.json({ error: "Error guardando el bloque." }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}