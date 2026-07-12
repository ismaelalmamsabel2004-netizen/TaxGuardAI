import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    // 1. Nos aseguramos de que la tabla maestra de configuración exista
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB
      );
    `;

    // 2. Buscamos los ajustes en la nube
    const result = await sql`SELECT data FROM user_settings WHERE user_id = ${userId}`;
    
    if (result.rows.length > 0) {
      return NextResponse.json(result.rows[0].data);
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

    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB
      );
    `;

    // 3. Guardamos todos los ajustes del usuario machacando los anteriores (Upsert)
    await sql`
      INSERT INTO user_settings (user_id, data)
      VALUES (${userId}, ${JSON.stringify(newSettings)})
      ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data;
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error guardando ajustes:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}