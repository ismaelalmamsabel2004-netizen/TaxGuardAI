import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://tu-proyecto.supabase.co", 
  supabaseKey || "clave-secreta"
);

export async function POST(request: Request) {
  try {
    if (!supabaseUrl) return NextResponse.json({ error: "Faltan claves" }, { status: 500 });

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    // 🚀 AÑADIDO: Recibimos el IVA
    const { month, total, empresaId, categoria, isRecurrent, frecuencia, iva } = body;

    const { data, error } = await supabase
      .from('finanzas')
      .insert([
        {
          user_id: userId,
          empresa_id: empresaId,
          fecha: month,
          total: total,
          categoria: categoria || "General",
          is_recurrent: isRecurrent || false,
          frecuencia: frecuencia || null,
          iva: Number(iva) || 0 // 🚀 AÑADIDO: Lo guardamos en la nueva columna
        }
      ])
      .select();

    if (error) throw error;

    const transaccion = data[0];
    const nuevaTransaccion = {
        id: transaccion.id,
        name: transaccion.fecha,
        total: transaccion.total,
        empresaId: transaccion.empresa_id,
        categoria: transaccion.categoria,
        isRecurrent: transaccion.is_recurrent,
        frecuencia: transaccion.frecuencia,
        iva: transaccion.iva
    };
    
    return NextResponse.json(nuevaTransaccion);
  } catch (error: any) {
    console.error("Error Crítico de Base de Datos:", error);
    return NextResponse.json({ error: "Fallo de sincronización en la nube." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    if (!supabaseUrl) return NextResponse.json([]);

    const { userId } = await auth();
    if (!userId) return NextResponse.json([], { status: 401 });

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    let query = supabase.from('finanzas').select('*').eq('user_id', userId);

    if (empresaId) query = query.eq('empresa_id', empresaId);

    const { data, error } = await query;
    if (error) throw error;

    const datosFormateados = data.map(item => ({
      id: item.id,
      name: item.fecha,
      total: item.total,
      empresaId: item.empresa_id,
      categoria: item.categoria,
      isRecurrent: item.is_recurrent,
      frecuencia: item.frecuencia,
      iva: item.iva || 0 // 🚀 AÑADIDO: Recuperamos el IVA
    }));

    return NextResponse.json(datosFormateados);
  } catch (error) {
    console.error("Error leyendo Base de Datos:", error);
    return NextResponse.json([]);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!supabaseUrl) return NextResponse.json({ error: "Faltan claves" }, { status: 500 });

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { error } = await supabase.from('finanzas').delete().eq('id', id).eq('user_id', userId); 
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error borrando en Base de Datos:", error);
    return NextResponse.json({ error: "No se pudo eliminar el registro." }, { status: 500 });
  }
}