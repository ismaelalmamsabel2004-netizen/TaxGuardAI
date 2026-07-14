import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''; // Clave de firma de Stripe

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20' as any,
    });

    const payload = await request.text();
    const sig = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;

    // Verificación de seguridad para asegurar que la petición viene de Stripe de verdad
    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err: any) {
      console.error(`❌ Fallo de validación de Webhook: ${err.message}`);
      return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
    }

    // 🚀 ANALIZAMOS EL EVENTO DE PAGO COMPLETADO
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.client_reference_id || session.metadata?.userId;
      const priceId = session.metadata?.priceId;

      if (userId) {
        // Mapeamos el ID de Stripe con el nivel de acceso correspondiente
        let planNombre = 'free';
        if (priceId === 'price_1Tsjz1JhA316XLs0dk9307W2') planNombre = 'autonomo';
        if (priceId === 'price_1Tsk0EJhA316XLs049Nl6hka') planNombre = 'pro';

        // 🚀 ACTUALIZAMOS LA BASE DE DATOS EN SUPABASE
        // Buscamos los ajustes del usuario actuales para no romper sus empresas
        const row = await prisma.$queryRawUnsafe<any[]>(
          `SELECT data FROM user_settings WHERE user_id = $1`,
          userId
        );

        let actuales: any = {};
        if (row && row.length > 0) {
          actuales = row[0].data;
        }

        // Le añadimos la marca de suscripción activa de por vida
        actuales.planSuscripcion = planNombre;
        actuales.pagoVerificado = true;

        await prisma.$executeRawUnsafe(
          `INSERT INTO user_settings (user_id, data)
           VALUES ($1, $2::jsonb)
           ON CONFLICT (user_id) 
           DO UPDATE SET data = EXCLUDED.data;`,
          userId,
          JSON.stringify(actuales)
        );

        console.log(`💰 ¡Pago verificado con éxito! Usuario ${userId} ascendido a plan: ${planNombre}`);
      }
    }

    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error("🔴 Error crítico en Webhook:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}