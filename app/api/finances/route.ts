import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

async function ensureTableExists() {
  // Usamos executeRawUnsafe de Prisma para crear la tabla si no existe
  await prisma.$executeRawUnsafe(`
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
  `);
}

export async function POST(request: Request) {
  try {
    await ensureTableExists(); 
    
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    const { month, total, empresaId, categoria, isRecurrent, frecuencia, iva } = body;

    // Prisma $queryRaw actúa como el "sql" de Vercel y devuelve un array con los resultados
    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO finanzas (user_id, empresa_id, fecha, total, categoria, is_recurrent, frecuencia, iva)
      VALUES (${userId}, ${empresaId}, ${month}, ${Number(total)}, ${categoria || 'General'}, ${isRecurrent || false}, ${frecuencia || null}, ${Number(iva) || 0})
      RETURNING *;
    `;

    const data = result[0];
    if (!data) throw new Error("No se pudo guardar el dato");

    // 🚀 CORRECCIÓN VITAL: Convertimos a número puro (Number) antes de enviarlo
    return NextResponse.json({
        id: data.id, name: data.fecha, total: Number(data.total), empresaId: data.empresa_id,
        categoria: data.categoria, isRecurrent: data.is_recurrent, frecuencia: data.frecuencia, iva: Number(data.iva)
    });
  } catch (error) {
    console.error("❌ ERROR POST SUPABASE:", error);
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
  
      // Usamos $executeRaw para operaciones UPDATE
      await prisma.$executeRaw`
        UPDATE finanzas
        SET fecha = ${month}, total = ${Number(total)}, categoria = ${categoria}, is_recurrent = ${isRecurrent}, frecuencia = ${frecuencia || null}, iva = ${Number(iva) || 0}
        WHERE id = ${Number(id)} AND user_id = ${userId}
      `;
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("❌ ERROR PUT SUPABASE:", error);
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

    let result: any[];
    if (empresaId) {
        result = await prisma.$queryRaw<any[]>`SELECT * FROM finanzas WHERE user_id = ${userId} AND empresa_id = ${empresaId} ORDER BY id ASC`;
    } else {
        result = await prisma.$queryRaw<any[]>`SELECT * FROM finanzas WHERE user_id = ${userId} ORDER BY id ASC`;
    }

    // 🚀 CORRECCIÓN VITAL: Extraemos los datos como números matemáticos estrictos
    return NextResponse.json(result.map(item => ({
      id: item.id, 
      name: item.fecha, 
      total: Number(item.total), 
      empresaId: item.empresa_id,
      categoria: item.categoria, 
      isRecurrent: item.is_recurrent, 
      frecuencia: item.frecuencia, 
      iva: Number(item.iva) || 0
    })));
  } catch (error) {
    console.error("❌ ERROR GET SUPABASE:", error);
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
      await prisma.$executeRaw`DELETE FROM finanzas WHERE id = ${Number(id)} AND user_id = ${userId}`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ ERROR DELETE SUPABASE:", error);
    return NextResponse.json({ error: "Error al borrar." }, { status: 500 });
  }
}