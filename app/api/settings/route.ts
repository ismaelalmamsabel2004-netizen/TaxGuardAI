import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    // 1. Nos aseguramos de que la tabla maestra exista y le añadimos auditoría de tiempo (Valor B2B)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Buscamos los ajustes del usuario
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT data FROM user_settings WHERE user_id = $1`,
      userId
    );
    
    let configuracion: any = {};
    if (rows && rows.length > 0) {
      // 🚀 BLINDAJE VERCEL: Evitamos el borrado fantasma asegurando que el JSONB se lea bien siempre
      configuracion = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : (rows[0].data || {});
    } else {
      // 🚀 VALOR B2B: Si el cliente es nuevo, le damos una estructura por defecto en vez de un panel vacío
      configuracion = {
        empresas: ["Mi Empresa Principal"],
        empresaActiva: "Mi Empresa Principal",
        planSuscripcion: 'free'
      };
    }

    // VIP vía env ADMIN_EMAILS (coma-separado). Fallback a lista histórica si no hay env.
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';

    const vipFromEnv = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const vipFallback = [
      'ialmansabeltran@gmail.com',
      'ismaelalmamsabel2004@gmail.com',
      'sandra66773535@gmail.com',
    ];
    const vipEmails = new Set(vipFromEnv.length > 0 ? vipFromEnv : vipFallback);

    if (userEmail && vipEmails.has(userEmail)) {
      configuracion = {
        ...configuracion,
        planSuscripcion: 'pro',
        is_admin: true
      };
    }

    return NextResponse.json(configuracion);
  } catch (error) {
    console.error("🚨 Error obteniendo ajustes:", error);
    // Si la BD de Vercel se desconecta momentáneamente, salvamos los muebles devolviendo la estructura básica
    return NextResponse.json({ 
        empresas: ["Entorno de Seguridad"], 
        empresaActiva: "Entorno de Seguridad",
        planSuscripcion: 'free',
        error_bd: true 
    });
  }
}

// 🛡️ CAMPOS DE FACTURACIÓN BLINDADOS: estos datos solo los puede escribir el webhook de
// Stripe (tras un pago real y verificado) o la ruta de checkout. Antes, este endpoint
// aceptaba y guardaba CUALQUIER campo que mandara el cliente, incluido "planSuscripcion".
// Eso significaba que cualquier usuario, con las herramientas de desarrollador del
// navegador, podía llamar a POST /api/settings con { planSuscripcion: "pro" } y
// autoconcederse el plan de pago gratis, sin pasar nunca por Stripe.
const CAMPOS_PROTEGIDOS_FACTURACION = ['planSuscripcion', 'pagoVerificado', 'stripeCustomerId', 'stripeSubscriptionId'] as const;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const newSettings = await request.json();
    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      return NextResponse.json({ error: "Formato de ajustes no válido" }, { status: 400 });
    }

    // Nunca confiamos en lo que el cliente diga sobre su propia facturación.
    for (const campo of CAMPOS_PROTEGIDOS_FACTURACION) {
      delete newSettings[campo];
    }
    // Nunca persistir un id compuesto de asesor como empresaActiva del propietario
    if (typeof newSettings.empresaActiva === 'string' && newSettings.empresaActiva.startsWith('CLIENTE|')) {
      delete newSettings.empresaActiva;
    }

    // Aseguramos la existencia de la tabla
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Recuperamos el estado actual y fusionamos (evita que un POST parcial de otra pestaña
    // borre perfiles/categorías). La facturación del servidor siempre gana.
    const filasActuales = await prisma.$queryRawUnsafe<any[]>(`SELECT data FROM user_settings WHERE user_id = $1`, userId);
    let actuales: any = {};
    let datosFacturacion: any = {};
    if (filasActuales && filasActuales.length > 0) {
      actuales = typeof filasActuales[0].data === 'string' ? JSON.parse(filasActuales[0].data) : (filasActuales[0].data || {});
      for (const campo of CAMPOS_PROTEGIDOS_FACTURACION) {
        if (actuales[campo] !== undefined) datosFacturacion[campo] = actuales[campo];
      }
    }

    const settingsFinales = { ...actuales, ...newSettings, ...datosFacturacion };

    // 3. Guardamos o actualizamos (Upsert) actualizando el sello de tiempo
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_settings (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;`,
      userId,
      JSON.stringify(settingsFinales)
    );

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("🚨 Error guardando ajustes:", error);
    return NextResponse.json({ error: "Error de escritura en servidor" }, { status: 500 });
  }
}