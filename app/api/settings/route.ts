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

    // 🚀 MODO DIOS (ADMIN BYPASS) EN EL BACKEND 🚀
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    // Directiva VIP: Acceso sin restricciones
    if (
      userEmail === 'ialmansabeltran@gmail.com' || 
      userEmail === 'ismaelalmamsabel2004@gmail.com' || 
      userEmail === 'sandra66773535@gmail.com'
    ) {
      configuracion = {
        ...configuracion,
        planSuscripcion: 'pro', // Rompemos el candado automáticamente
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

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const newSettings = await request.json();

    // Aseguramos la existencia de la tabla
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Guardamos o actualizamos (Upsert) actualizando el sello de tiempo
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_settings (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;`,
      userId,
      JSON.stringify(newSettings)
    );

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("🚨 Error guardando ajustes:", error);
    return NextResponse.json({ error: "Error de escritura en servidor" }, { status: 500 });
  }
}