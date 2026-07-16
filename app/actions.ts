'use server'

import { prisma } from '../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ==========================================
// 1. OBTENER DATOS (CEREBRO CENTRALIZADO)
// ==========================================
export async function obtenerDatosSupabase(empresaId?: string) {
  const { userId } = await auth();
  if (!userId) return [];

  // Filtramos por empresa si se pasa el ID (para Análisis y Tributos)
  const whereClause: any = { userId: userId };
  if (empresaId) {
    whereClause.empresaId = empresaId;
  }

  const transacciones = await prisma.transaccion.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  // Transformamos al formato universal que le gusta a tu frontend
  return transacciones.map((t: any) => ({
    id: t.id,
    name: t.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    total: t.tipo === 'GASTO' ? -t.baseImponible : t.baseImponible,
    empresaId: t.empresaId || "General",
    categoria: t.categoria,
    iva: t.iva || 0,
    isRecurrent: t.isRecurrent || false, 
    frecuencia: t.frecuencia || "Mensual",
    numero_factura: t.numero_factura || null,
    cliente_nombre: t.cliente_nombre || null,
    cliente_nif: t.cliente_nif || null,
    concepto_detalle: t.concepto_detalle || null
  }));
}

// ==========================================
// 2. GUARDAR NUEVO DATO (Consola y Facturas)
// ==========================================
export async function guardarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  // Control estricto de fechas (soporta DD/MM/YYYY)
  let fechaObj = new Date();
  if (datos.month && datos.month.includes('/')) {
     const [d, m, y] = datos.month.split('/');
     fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
  } else if (datos.fecha) {
     // Por si viene de algún sitio con formato YYYY-MM-DD
     fechaObj = new Date(datos.fecha);
  }

  try {
    await prisma.transaccion.create({
      data: {
        userId: userId,
        empresaId: datos.empresaId || "General",
        fecha: fechaObj,
        categoria: datos.categoria || 'General',
        tipo: Number(datos.total) >= 0 ? 'INGRESO' : 'GASTO',
        baseImponible: Math.abs(Number(datos.total)),
        iva: Number(datos.iva) || 0,
        isRecurrent: datos.isRecurrent || false,
        frecuencia: datos.frecuencia || null,
        numero_factura: datos.numero_factura || null,
        cliente_nombre: datos.cliente_nombre || null,
        cliente_nif: datos.cliente_nif || null,
        concepto_detalle: datos.concepto_detalle || datos.concepto || null
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar en BD:", error);
    return { error: error.message };
  }
}

// ==========================================
// 3. EDITAR DATO
// ==========================================
export async function editarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  let fechaObj = new Date();
  if (datos.month && datos.month.includes('/')) {
     const [d, m, y] = datos.month.split('/');
     fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
  }

  try {
    await prisma.transaccion.update({
      where: { id: Number(datos.id), userId: userId }, // 🚀 DEVUELTO A NUMBER
      data: {
        fecha: fechaObj,
        categoria: datos.categoria,
        tipo: Number(datos.total) >= 0 ? 'INGRESO' : 'GASTO',
        baseImponible: Math.abs(Number(datos.total)),
        iva: Number(datos.iva) || 0,
      }
    });
    return { success: true };
  } catch (error: any) {
    return { error: "Error al actualizar" };
  }
}

// ==========================================
// 4. BORRAR DATO
// ==========================================
export async function borrarDatoSupabase(id: string) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  try {
    await prisma.transaccion.delete({
      where: { id: Number(id), userId: userId } // 🚀 DEVUELTO A NUMBER
    });
    return { success: true };
  } catch (error: any) {
    return { error: "Error al borrar" };
  }
}

// ==========================================
// 5. ESCÁNER DE FACTURAS CON IA
// ==========================================
export async function escanearFacturaIA(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  const file = formData.get('factura') as File;
  const categorias = formData.get('categorias') as string;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Eres un contable experto. Analiza este ticket o factura.
      Devuelve SOLO y EXCLUSIVAMENTE este JSON exacto:
      {
        "categoria": "Elige la que mejor encaje de esta lista: [${categorias}] o pon 'General'",
        "base_imponible": (el subtotal sin IVA en número),
        "iva": (el porcentaje de IVA en número, ej: 21, 10 o 0),
        "fecha": "YYYY-MM-DD"
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } }
    ]);

    const texto = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    return { success: true, data: JSON.parse(texto) };
  } catch (error: any) {
    return { error: error.message || "Fallo de conexión con IA" };
  }
}