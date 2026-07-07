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
    const { month, total, empresaId, categoria, isRecurrent, frecuencia, iva } = body;

    const { data, error } = await supabase
      .from('finanzas')
      .insert([{
          user_id: userId,
          empresa_id: empresaId,
          fecha: month,
          total: total,
          categoria: categoria || "General",
          is_recurrent: isRecurrent || false,
          frecuencia: frecuencia || null,
          iva: Number(iva) || 0
      }]).select();

    if (error) throw error;
    
    return NextResponse.json({
        id: data[0].id, name: data[0].fecha, total: data[0].total, empresaId: data[0].empresa_id,
        categoria: data[0].categoria, isRecurrent: data[0].is_recurrent, frecuencia: data[0].frecuencia, iva: data[0].iva
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Fallo de sincronización." }, { status: 500 });
  }
}

// 🚀 NUEVA PIEZA: Enseña a la base de datos a modificar un registro existente
export async function PUT(request: Request) {
    try {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });
  
      const body = await request.json();
      const { id, month, total, categoria, isRecurrent, frecuencia, iva } = body;
  
      const { error } = await supabase
        .from('finanzas')
        .update({
          fecha: month,
          total: total,
          categoria: categoria,
          is_recurrent: isRecurrent,
          frecuencia: frecuencia || null,
          iva: Number(iva) || 0
        })
        .eq('id', id)
        .eq('user_id', userId); // Solo modifica si el dato es suyo
  
      if (error) throw error;
  
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
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

    return NextResponse.json(data.map(item => ({
      id: item.id, name: item.fecha, total: item.total, empresaId: item.empresa_id,
      categoria: item.categoria, isRecurrent: item.is_recurrent, frecuencia: item.frecuencia, iva: item.iva || 0
    })));
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!supabaseUrl) return NextResponse.json({ error: "Faltan claves" }, { status: 500 });
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const { error } = await supabase.from('finanzas').delete().eq('id', id).eq('user_id', userId); 
      if (error) throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al borrar." }, { status: 500 });
  }
}