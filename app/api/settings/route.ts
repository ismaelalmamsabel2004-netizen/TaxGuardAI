import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    // 1. Nos aseguramos de que la tabla maestra de configuración exista en Supabase
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB
      );
    `);

    // 2. Buscamos los ajustes del usuario en la nube usando Prisma de forma segura
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT data FROM user_settings WHERE user_id = $1`,
      userId
    );
    
    if (rows && rows.length > 0) {
      return NextResponse.json(rows[0].data);
    } else {
      return NextResponse.json({}); // Si es un usuario nuevo, devolvemos vacío
    }
  } catch (error) {
    console.error("Error obteniendo ajustes:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
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
        data JSONB
      );
    `);

    // 3. Guardamos o actualizamos (Upsert) los ajustes vinculados a tu cuenta de Clerk
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_settings (user_id, data)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) 
       DO UPDATE SET data = EXCLUDED.data;`,
      userId,
      JSON.stringify(newSettings)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error guardando ajustes:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}