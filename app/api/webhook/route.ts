import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''; 

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as any });
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err: any) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.client_reference_id || session.metadata?.userId;
      const priceId = session.metadata?.priceId;

      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;

      if (userId) {
        let planNombre = 'free';
        if (priceId === 'price_1Tsjz1JhA316XLs0dk9307W2') planNombre = 'autonomo';
        if (priceId === 'price_1Tsk0EJhA316XLs049Nl6hka') planNombre = 'pro';

        // 🚀 EL AWAIT DE CLERK ARREGLADO
        if (stripeCustomerId && stripeSubscriptionId) {
            const clerk = await clerkClient(); // <--- LA MAGIA ESTÁ AQUÍ
            await clerk.users.updateUserMetadata(userId, {
              privateMetadata: {
                stripeCustomerId: stripeCustomerId,
                stripeSubscriptionId: stripeSubscriptionId,
              }
            });
        }

        // Actualizamos en Supabase
        const row = await prisma.$queryRawUnsafe<any[]>(
          `SELECT data FROM user_settings WHERE user_id = $1`, userId
        );
        
        let actuales: any = {};
        if (row && row.length > 0) actuales = row[0].data;

        actuales.planSuscripcion = planNombre;
        actuales.pagoVerificado = true;
        actuales.stripeCustomerId = stripeCustomerId;
        actuales.stripeSubscriptionId = stripeSubscriptionId;

        await prisma.$executeRawUnsafe(
          `INSERT INTO user_settings (user_id, data) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data;`,
          userId, JSON.stringify(actuales)
        );

        console.log(`💰 Pago nuevo de ${userId} ascendido a ${planNombre}`);
      }
    }

    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error("🔴 Error en Webhook:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}