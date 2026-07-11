import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@clerk/nextjs/server';

// 🚀 ORDEN ESTRICTA: Le dice a Vercel que no bloquee la subida al compilar
export const dynamic = 'force-dynamic';

// 🚀 ROBOT CONSTRUCTOR: Crea tu tabla automáticamente si no existe en Neon
async function ensureTableExists() {
  await sql`
    CREATE TABLE IF NOT EXISTS finanzas (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      empresa_id VARCHAR(255),
      fecha VARCHAR(255),
      total NUMERIC,
      categoria VARCHAR(255),
      is_recurrent BOOLEAN,
      frecuencia VARCHAR(50),
      iva NUMERIC
    );
  `;
}

export async function POST(request: Request) {
  try {
    await ensureTableExists(); // Asegura que la tabla está viva antes de guardar
    
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    const { month, total, empresaId, categoria, isRecurrent, frecuencia, iva } = body;

    const result = await sql`
      INSERT INTO finanzas (user_id, empresa_id, fecha, total, categoria, is_recurrent, frecuencia, iva)
      VALUES (${userId}, ${empresaId}, ${month}, ${total}, ${categoria || 'General'}, ${isRecurrent || false}, ${frecuencia || null}, ${Number(iva) || 0})
      RETURNING *;
    `;

    const data = result.rows[0];
    if (!data) throw new Error("No se pudo guardar el dato");

    return NextResponse.json({
        id: data.id, name: data.fecha, total: data.total, empresaId: data.empresa_id,
        categoria: data.categoria, isRecurrent: data.is_recurrent, frecuencia: data.frecuencia, iva: data.iva
    });
  } catch (error) {
    console.error("❌ ERROR POST VERCEL POSTGRES:", error);
    return NextResponse.json({ error: "Fallo de sincronización." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
      await ensureTableExists();
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  
      const body = await request.json();
      const { id, month, total, categoria, isRecurrent, frecuencia, iva } = body;
  
      await sql`
        UPDATE finanzas
        SET fecha = ${month}, total = ${total}, categoria = ${categoria}, is_recurrent = ${isRecurrent}, frecuencia = ${frecuencia || null}, iva = ${Number(iva) || 0}
        WHERE id = ${id} AND user_id = ${userId}
      `;
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("❌ ERROR PUT VERCEL POSTGRES:", error);
      return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
    }
}

export async function GET(request: Request) {
  try {
    await ensureTableExists();
    const { userId } = await auth();
    if (!userId) return NextResponse.json([], { status: 401 });

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    let result;
    if (empresaId) {
        result = await sql`SELECT * FROM finanzas WHERE user_id = ${userId} AND empresa_id = ${empresaId}`;
    } else {
        result = await sql`SELECT * FROM finanzas WHERE user_id = ${userId}`;
    }

    return NextResponse.json(result.rows.map(item => ({
      id: item.id, name: item.fecha, total: item.total, empresaId: item.empresa_id,
      categoria: item.categoria, isRecurrent: item.is_recurrent, frecuencia: item.frecuencia, iva: item.iva || 0
    })));
  } catch (error) {
    console.error("❌ ERROR GET VERCEL POSTGRES:", error);
    return NextResponse.json([]);
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureTableExists();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      await sql`DELETE FROM finanzas WHERE id = ${id} AND user_id = ${userId}`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ ERROR DELETE VERCEL POSTGRES:", error);
    return NextResponse.json({ error: "Error al borrar." }, { status: 500 });
  }
}