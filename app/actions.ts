'use server'

import { prisma } from '../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
// 🚀 INYECTADO: Cliente de Supabase para guardar los archivos
import { createClient } from '@supabase/supabase-js';

// ==========================================
// 0. CONFIGURACIÓN SUPABASE STORAGE
// ==========================================
// Necesitas añadir estas dos variables a tu archivo .env.local y en Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. OBTENER DATOS (CEREBRO CENTRALIZADO MEJORADO)
// ==========================================
export async function obtenerDatosSupabase(empresaId?: string) {
  const { userId } = await auth();
  if (!userId) return [];

  const whereClause: any = { userId: userId };
  if (empresaId) {
    whereClause.empresaId = empresaId;
  }

  const transacciones = await prisma.transaccion.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

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
    concepto_detalle: t.concepto_detalle || null,
    
    // 🚀 CAMPOS DE GESTIÓN AVANZADA
    url_archivo: t.url_archivo || null,
    nombre_archivo: t.nombre_archivo || null,
    tipo_archivo: t.tipo_archivo || null,
    estado_pago: t.estado_pago || "COBRADO",
    fecha_vencimiento: t.fecha_vencimiento ? t.fecha_vencimiento.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null,
    raw_fecha_vencimiento: t.fecha_vencimiento || null, // Útil para cálculos de días de retraso
    metodo_pago: t.metodo_pago || null,
    notas_internas: t.notas_internas || null
  }));
}

// ==========================================
// 2. GUARDAR NUEVO DATO (Soporta nuevos campos y blinda fechas)
// ==========================================
export async function guardarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  // 🚀 BLINDAJE DE FECHAS B2B: Previene caídas del servidor por formatos inválidos
  let fechaObj = new Date();
  if (datos.month && datos.month.includes('/')) {
     const [d, m, y] = datos.month.split('/');
     fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
  } else if (datos.fecha) {
     fechaObj = new Date(datos.fecha);
  }
  // Si la fecha resultante es "Invalid Date", usamos la fecha de hoy por seguridad
  if (isNaN(fechaObj.getTime())) fechaObj = new Date();

  let fechaVencimientoObj = null;
  if (datos.fecha_vencimiento) {
     fechaVencimientoObj = new Date(datos.fecha_vencimiento);
     if (isNaN(fechaVencimientoObj.getTime())) fechaVencimientoObj = null;
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
        concepto_detalle: datos.concepto_detalle || datos.concepto || null,
        
        // 🚀 GUARDADO DE LOS NUEVOS CAMPOS
        url_archivo: datos.url_archivo || null,
        nombre_archivo: datos.nombre_archivo || null,
        tipo_archivo: datos.tipo_archivo || null,
        estado_pago: datos.estado_pago || "COBRADO",
        fecha_vencimiento: fechaVencimientoObj,
        metodo_pago: datos.metodo_pago || null,
        notas_internas: datos.notas_internas || null
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("🚨 Error crítico al guardar en BD:", error);
    return { error: error.message };
  }
}

// ==========================================
// 3. EDITAR DATO
// ==========================================
export async function editarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  // 🚀 BLINDAJE DE FECHAS EN EDICIÓN
  let fechaObj = new Date();
  if (datos.month && datos.month.includes('/')) {
     const [d, m, y] = datos.month.split('/');
     fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
  } else if (datos.fecha) {
     fechaObj = new Date(datos.fecha);
  }
  if (isNaN(fechaObj.getTime())) fechaObj = new Date();

  try {
    await prisma.transaccion.update({
      where: { id: Number(datos.id), userId: userId },
      data: {
        fecha: fechaObj,
        categoria: datos.categoria,
        tipo: Number(datos.total) >= 0 ? 'INGRESO' : 'GASTO',
        baseImponible: Math.abs(Number(datos.total)),
        iva: Number(datos.iva) || 0,
        ...(datos.cliente_nombre !== undefined && { cliente_nombre: datos.cliente_nombre }),
        ...(datos.cliente_nif !== undefined && { cliente_nif: datos.cliente_nif }),
        ...(datos.concepto_detalle !== undefined && { concepto_detalle: datos.concepto_detalle }),
        // 🚀 EDICIÓN DE GESTOR DOCUMENTAL Y ESTADOS
        ...(datos.estado_pago !== undefined && { estado_pago: datos.estado_pago }),
        ...(datos.nombre_archivo !== undefined && { nombre_archivo: datos.nombre_archivo }),
        ...(datos.url_archivo !== undefined && { url_archivo: datos.url_archivo }),
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("🚨 Error crítico al editar en BD:", error);
    return { error: "Error de servidor al actualizar" };
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
      where: { id: Number(id), userId: userId }
    });
    return { success: true };
  } catch (error: any) {
    console.error("🚨 Error crítico al borrar en BD:", error);
    return { error: "Error de servidor al borrar" };
  }
}

// ==========================================
// 5. ACTUALIZAR ESTADO RÁPIDO (Morosidad)
// ==========================================
export async function actualizarEstadoPago(id: number, nuevoEstado: string) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  try {
    await prisma.transaccion.update({
      where: { id: id, userId: userId },
      data: { estado_pago: nuevoEstado }
    });
    return { success: true };
  } catch (error: any) {
    return { error: "Error al cambiar el estado financiero" };
  }
}

// ==========================================
// 6. ESCÁNER DE FACTURAS CON IA (HIPERVITAMINADO B2B)
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
    
    // 🚀 PASO 1: SUBIR EL ARCHIVO AL STORAGE DE SUPABASE
    let urlArchivoSubido = null;
    let nombreArchivoUnico = `${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('facturas') // <-- IMPORTANTE: DEBES CREAR ESTE BUCKET PÚBLICO EN TU PANEL DE SUPABASE
            .upload(nombreArchivoUnico, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error("⚠️ Aviso: Error al subir a Supabase Storage (La IA seguirá procesando).", uploadError);
        } else if (uploadData) {
            const { data: publicUrlData } = supabase.storage
                .from('facturas')
                .getPublicUrl(nombreArchivoUnico);
            
            urlArchivoSubido = publicUrlData.publicUrl;
        }
    } catch (e) {
        console.log("⚠️ Aviso: No se pudo subir la imagen al Storage. Verifica la conexión.");
    }

    // 🚀 PASO 2: PROCESAMIENTO CON GEMINI (PROMPT SUPER-VITAMINADO)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Eres un auditor financiero experto. Analiza este ticket o factura minuciosamente.
      Devuelve SOLO y EXCLUSIVAMENTE este JSON exacto (sin bloques de código, sin markdown, solo el objeto JSON):
      {
        "categoria": "Elige la que mejor encaje de esta lista: [${categorias}] o pon 'General'",
        "base_imponible": (el subtotal sin IVA en formato numérico),
        "iva": (el porcentaje de IVA en número, ej: 21, 10 o 0),
        "fecha": "YYYY-MM-DD",
        "numero_factura": "El número de la factura o ticket (si aparece, ej: F-2309. Si no lo encuentras, devuelve null)",
        "concepto": "Un resumen muy breve de 3 o 4 palabras de lo que se ha comprado (ej: Material de oficina, Cena con clientes, Combustible)",
        "cliente_nombre": "Nombre de la empresa, restaurante, comercio o proveedor que emite el ticket",
        "cliente_nif": "CIF o NIF del proveedor (si aparece)",
        "confianza": (tu nivel de seguridad en la lectura global del 0 al 100 en número),
        "evidencia": "Breve justificación de 1 línea de dónde has extraído la base y el IVA."
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } }
    ]);

    const texto = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    const datosParseados = JSON.parse(texto);
    
    // 🚀 PASO 3: DEVOLVER LOS DATOS EXTRAÍDOS DE LA IA + LA URL DE LA FOTO
    return { 
        success: true, 
        data: {
            ...datosParseados,
            url_archivo: urlArchivoSubido,
            nombre_archivo: file.name,
            tipo_archivo: file.type
        }
    };
  } catch (error: any) {
    console.error("🚨 Error en Escáner IA:", error);
    return { error: error.message || "Fallo de conexión con el motor de IA o Storage" };
  }
}