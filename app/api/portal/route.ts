import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as any });

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const stripeCustomerId = user.privateMetadata?.stripeCustomerId as string;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No hay cliente de Stripe asociado" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.taxguard-ai.com';

    // 🚀 Creamos la sesión del Portal del Cliente de Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/`, // A dónde vuelve cuando termine de cancelar o mirar
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("🔴 Error en Portal de Stripe:", error.message);
    return NextResponse.json({ error: "Error interno de conexión" }, { status: 500 });
  }
}