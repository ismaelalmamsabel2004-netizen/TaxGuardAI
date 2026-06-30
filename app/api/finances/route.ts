import { NextResponse } from 'next/server';
// Aquí iría tu import de base de datos (por ejemplo, Prisma o tu gestor actual)

export async function POST(request: Request) {
  const body = await request.json();
  const { month, total, empresaId } = body; // 🆕 Añadimos empresaId

  // Ejemplo de lógica: cuando guardes en tu BD, asegúrate de guardar este empresaId
  // await db.finances.create({ data: { month, total, empresaId } });
  
  return NextResponse.json({ success: true, month, total, empresaId });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresaId'); // 🆕 Filtramos por empresa

  // Ejemplo: const datos = await db.finances.findMany({ where: { empresaId } });
  
  return NextResponse.json([]); // Devuelve solo los datos de esa empresa
}