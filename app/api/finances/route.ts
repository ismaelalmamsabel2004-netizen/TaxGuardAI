import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'finances_data.json');

function leerDatos() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify([]));
      return [];
    }
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error("Error leyendo la base de datos local:", error);
    return [];
  }
}

function guardarDatos(datos: any[]) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(datos, null, 2));
  } catch (error) {
    console.error("Error escribiendo en la base de datos local:", error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 🆕 Asegurarnos de leer la 'categoria' enviada
    const { month, total, empresaId, categoria } = body;

    const db = leerDatos();

    const nuevaTransaccion = {
      id: Date.now(),
      name: month,
      total: total,
      empresaId: empresaId,
      categoria: categoria || "General" // 🆕 Guardamos la categoría (o "General" si viene vacía)
    };

    db.push(nuevaTransaccion);
    guardarDatos(db);
    
    return NextResponse.json(nuevaTransaccion);
  } catch (error) {
    return NextResponse.json({ error: "Error guardando los datos" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresaId');

  const db = leerDatos();

  if (empresaId) {
    const datosFiltrados = db.filter((item: any) => item.empresaId === empresaId);
    return NextResponse.json(datosFiltrados);
  }
  
  return NextResponse.json(db);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let db = leerDatos();

  if (id) {
    db = db.filter((item: any) => item.id !== Number(id));
    guardarDatos(db);
  }

  return NextResponse.json({ success: true });
}