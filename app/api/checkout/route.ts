import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '../../../lib/prisma'; // 🚀 IMPORTAMOS PRISMA

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Acceso denegado. Inicia sesión primero." }, { status: 401 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as any });

    const body = await request.json();
    const { priceId } = body;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.taxguard-ai.com';

    // 🚀 PASO 1: EL AWAIT DE CLERK
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    
    const stripeCustomerId = user.privateMetadata?.stripeCustomerId as string;
    const stripeSubscriptionId = user.privateMetadata?.stripeSubscriptionId as string;

    let necesitaCheckoutNuevo = true; // Por defecto, asumimos que va a la pasarela normal

    // 🚀 PASO 2: INTENTO DE UPGRADE EN 1 CLIC
    if (stripeCustomerId && stripeSubscriptionId) {
        try {
           // Buscamos qué producto tiene ahora mismo para sustituirlo
           const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
           
           // Si la suscripción está cancelada o fue borrada, fallamos a propósito para ir al Paso 3
           if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
              throw new Error("La suscripción antigua está cancelada.");
           }

           const subItemId = subscription.items.data[0].id;

           // Le decimos a Stripe: "Cámbiate a este precio y hazle el prorrateo automático"
           await stripe.subscriptions.update(stripeSubscriptionId, {
             items: [{ id: subItemId, price: priceId }],
             proration_behavior: 'create_prorations',
           });

           // 🚀 Actualizamos tu Base de Datos directamente aquí
           let planNombre = 'free';
           if (priceId === 'price_1TwN2RJADsdd8EhemCpvJbef') planNombre = 'autonomo';
           if (priceId === 'price_1TwN54JADsdd8EheCYnGZuaZ') planNombre = 'pro';

           const row = await prisma.$queryRawUnsafe<any[]>(
             `SELECT data FROM user_settings WHERE user_id = $1`, userId
           );
           let actuales: any = {};
           if (row && row.length > 0) actuales = row[0].data;

           actuales.planSuscripcion = planNombre;

           await prisma.$executeRawUnsafe(
             `INSERT INTO user_settings (user_id, data) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data;`,
             userId, JSON.stringify(actuales)
           );

           // Lo mandamos directo a la consola, ¡ya es PRO!
           return NextResponse.json({ url: `${baseUrl}/?pago=exito` });

        } catch (errorIntento) {
           console.log("⚠️ Cliente con suscripción rota o borrada en Stripe. Se le enviará al checkout nuevo.");
           // Como dio error, la variable necesitaCheckoutNuevo sigue siendo true, y bajará al PASO 3 sin colapsar.
        }
    }

    // 🚀 PASO 3: SI ES CLIENTE NUEVO O SU SUSCRIPCIÓN FUE BORRADA (Pasarela normal)
    if (necesitaCheckoutNuevo) {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          client_reference_id: userId,
          metadata: { userId: userId, priceId: priceId },
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${baseUrl}/?pago=exito`,
          cancel_url: `${baseUrl}/precios?pago=cancelado`,
        });

        return NextResponse.json({ url: session.url });
    }
    
  } catch (err: any) {
    console.error("🔴 Error en Checkout:", err.message);
    return NextResponse.json({ error: "Error interno o de conexión" }, { status: 500 });
  }
}