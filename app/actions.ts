'use server'

import { prisma } from '../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. OBTENER DATOS (Para llenar tu tabla avanzada)
export async function obtenerDatosSupabase() {
  const { userId } = await auth();
  if (!userId) return [];

  const transacciones = await prisma.transaccion.findMany({
    where: { userId: userId },
    orderBy: { createdAt: 'desc' },
  });

  // Transformamos los datos de Supabase al formato exacto que usa tu frontend
  return transacciones.map(t => ({
    id: t.id,
    name: t.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    total: t.tipo === 'GASTO' ? -t.baseImponible : t.baseImponible,
    categoria: t.categoria,
    iva: t.iva || 21,
    isRecurrent: false, 
    frecuencia: "Mensual"
  }));
}

// 2. GUARDAR NUEVO DATO
export async function guardarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  // Convertimos tu fecha DD/MM/YYYY a un formato de base de datos
  const [d, m, y] = datos.month.split('/');
  const fechaObj = new Date(Number(y), Number(m) - 1, Number(d));

  await prisma.transaccion.create({
    data: {
      userId: userId,
      fecha: fechaObj,
      categoria: datos.categoria,
      tipo: datos.total >= 0 ? 'INGRESO' : 'GASTO',
      baseImponible: Math.abs(datos.total),
      iva: Number(datos.iva) || 0,
    }
  });
  return { success: true };
}

// 3. EDITAR DATO (Para tu botón de edición en línea)
export async function editarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  const [d, m, y] = datos.month.split('/');
  const fechaObj = new Date(Number(y), Number(m) - 1, Number(d));

  await prisma.transaccion.update({
    where: { id: datos.id, userId: userId },
    data: {
      fecha: fechaObj,
      categoria: datos.categoria,
      tipo: datos.total >= 0 ? 'INGRESO' : 'GASTO',
      baseImponible: Math.abs(datos.total),
      iva: Number(datos.iva) || 0,
    }
  });
  return { success: true };
}

// 4. BORRAR DATO
export async function borrarDatoSupabase(id: string) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  await prisma.transaccion.delete({
    where: { id: id, userId: userId }
  });
  return { success: true };
}

// 5. EL CEREBRO DE LA IA (Para tu botón de escáner)
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

    // Le decimos a la IA que use TUS categorías personalizadas
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