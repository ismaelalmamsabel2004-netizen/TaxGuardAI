import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      throw new Error("No se encuentra la clave secreta de Stripe en el archivo .env");
    }

    // Usamos la versión estable del servidor de Stripe con el silenciador de errores
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20' as any,
    });

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Falta el ID del producto" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?pago=exito`,
      cancel_url: `${baseUrl}/precios?pago=cancelado`,
    });

    return NextResponse.json({ url: session.url });
    
  } catch (err: any) {
    console.error("🔴 Error en el servidor de Stripe:", err.message);
    return NextResponse.json({ error: "Error al conectar con la pasarela de pago" }, { status: 500 });
  }
}