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

    // 🚀 PASO 1: EL AWAIT DE CLERK (Soluciona el error rojo)
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    
    // Usamos el símbolo ? por si el usuario es nuevo y aún no tiene metadatos
    const stripeCustomerId = user.privateMetadata?.stripeCustomerId as string;
    const stripeSubscriptionId = user.privateMetadata?.stripeSubscriptionId as string;

    // 🚀 PASO 2: UPGRADE MAGICO EN 1 CLIC (Si ya es cliente Autónomo)
    if (stripeCustomerId && stripeSubscriptionId) {
       // Buscamos qué producto tiene ahora mismo para sustituirlo
       const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
       const subItemId = subscription.items.data[0].id;

       // Le decimos a Stripe: "Cámbiate a este precio y hazle el prorrateo automático"
       await stripe.subscriptions.update(stripeSubscriptionId, {
         items: [{ id: subItemId, price: priceId }],
         proration_behavior: 'create_prorations',
       });

       // 🚀 Como no pasamos por la pasarela, actualizamos tu Base de Datos directamente aquí
       let planNombre = 'free';
       if (priceId === 'price_1Tsjz1JhA316XLs0dk9307W2') planNombre = 'autonomo';
       if (priceId === 'price_1Tsk0EJhA316XLs049Nl6hka') planNombre = 'pro';

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
    }

    // 🚀 PASO 3: SI ES CLIENTE NUEVO (Pasarela de pago normal)
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
    
  } catch (err: any) {
    console.error("🔴 Error en Checkout:", err.message);
    return NextResponse.json({ error: "Error interno o de conexión" }, { status: 500 });
  }
}