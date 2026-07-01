import { NextResponse } from 'next/server';

// 🆕 BASE DE DATOS TEMPORAL EN MEMORIA
// Esto actuará como tu base de datos real mientras tu servidor esté encendido.
// Separa y guarda automáticamente los datos de cada empresa.
let mockDB: { id: number, name: string, total: number, empresaId: string }[] = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, total, empresaId } = body;

    // 1. Creamos la nueva transacción con un ID único
    const nuevaTransaccion = {
      id: Date.now(), // Generamos un ID automático basado en la hora
      name: month,
      total: total,
      empresaId: empresaId // 🆕 Fundamental: guardamos a qué empresa pertenece
    };

    // 2. La guardamos en nuestra base de datos
    mockDB.push(nuevaTransaccion);
    
    return NextResponse.json(nuevaTransaccion);
  } catch (error) {
    return NextResponse.json({ error: "Error guardando los datos" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresaId');

  // 🆕 Si el panel nos pide los datos de una empresa concreta, se los damos filtrados
  if (empresaId) {
    const datosFiltrados = mockDB.filter(item => item.empresaId === empresaId);
    return NextResponse.json(datosFiltrados);
  }
  
  // Si no pide empresa (fallback), devolvemos todo
  return NextResponse.json(mockDB);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // 🆕 Buscamos el dato por su ID y lo borramos de la base de datos
  if (id) {
    mockDB = mockDB.filter(item => item.id !== Number(id));
  }

  return NextResponse.json({ success: true });
}