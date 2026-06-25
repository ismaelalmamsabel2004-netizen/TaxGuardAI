import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 1. GUARDAR (y devolver el ID nuevo)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Acceso Denegado", { status: 401 });

    const body = await request.json();
    const { month, total } = body;

    if (!month || total === undefined) return new NextResponse("Faltan datos", { status: 400 });

    // Guardamos y pedimos que nos devuelva la fila recién creada con su ID
    const result = await sql`
      INSERT INTO user_finances (user_id, month, total)
      VALUES (${userId}, ${month}, ${total})
      RETURNING id, month as name, total
    `;

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. LEER (ahora también extrae el ID de la base de datos)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Acceso Denegado", { status: 401 });

    const result = await sql`
      SELECT id, month as name, total FROM user_finances 
      WHERE user_id = ${userId} 
      ORDER BY id ASC
    `;
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. 🆕 BORRAR (elimina un registro específico usando su ID)
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Acceso Denegado", { status: 401 });

    // Cogemos el ID que nos manda el frontend en la URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return new NextResponse("Falta el ID", { status: 400 });

    await sql`
      DELETE FROM user_finances 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    return NextResponse.json({ message: "Eliminado con éxito" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}