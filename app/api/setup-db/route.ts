import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Esto crea la tabla si no existe todavía
    await sql`
      CREATE TABLE IF NOT EXISTS user_finances (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        month VARCHAR(50) NOT NULL,
        total INTEGER NOT NULL
      );
    `;
    
    return NextResponse.json(
      { message: "¡Tabla de finanzas creada con éxito en la base de datos!" }, 
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Hubo un error al crear la tabla", details: error.message }, 
      { status: 500 }
    );
  }
}