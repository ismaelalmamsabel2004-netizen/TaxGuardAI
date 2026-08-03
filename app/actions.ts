'use server'

import { prisma } from '../lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server'; // 🚀 Añadido currentUser para saber el email
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// 0. CONFIGURACIÓN SUPABASE STORAGE
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. OBTENER DATOS (AHORA SOPORTA MODO ASESOR) 🚀
// ==========================================
export async function obtenerDatosSupabase(empresaId?: string) {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) return [];

  const miEmail = user.primaryEmailAddress?.emailAddress;

  // 1. Buscamos si el usuario es el PROPIETARIO
  let whereClause: any = { userId: userId };
  if (empresaId) whereClause.empresaId = empresaId;

  let transacciones = await prisma.transaccion.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  // 2. Si no encontró transacciones (o es una cuenta nueva), comprobamos si es un ASESOR INVITADO
  if (transacciones.length === 0 && empresaId && miEmail) {
      const permiso = await prisma.permisoEmpresa.findFirst({
          where: { empresaId: empresaId, asesorEmail: miEmail }
      });

      // Si es asesor, buscamos las transacciones del PROPIETARIO
      if (permiso) {
          transacciones = await prisma.transaccion.findMany({
              where: { userId: permiso.propietarioId, empresaId: empresaId },
              orderBy: { createdAt: 'desc' },
          });
      }
  }

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
    cif: t.cliente_nif || null, 
    cliente_nif: t.cliente_nif || null,
    concepto_detalle: t.concepto_detalle || null,
    url_archivo: t.url_archivo || null,
    nombre_archivo: t.nombre_archivo || null,
    tipo_archivo: t.tipo_archivo || null,
    estado_pago: t.estado_pago || "COBRADO",
    fecha_vencimiento: t.fecha_vencimiento ? t.fecha_vencimiento.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null,
    raw_fecha_vencimiento: t.fecha_vencimiento || null,
    metodo_pago: t.metodo_pago || null,
    notas_internas: t.notas_internas || null
  }));
}

// ==========================================
// 2. GUARDAR NUEVO DATO 
// ==========================================
export async function guardarDatoSupabase(datos: any) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  let fechaObj = new Date();
  if (datos.month && datos.month.includes('/')) {
     const [d, m, y] = datos.month.split('/');
     fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
  } else if (datos.fecha) {
     fechaObj = new Date(datos.fecha);
  }
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
        cliente_nif: datos.cif || datos.cliente_nif || null,
        concepto_detalle: datos.concepto_detalle || datos.concepto || null,
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
        ...((datos.cif !== undefined || datos.cliente_nif !== undefined) && { cliente_nif: datos.cif || datos.cliente_nif }),
        ...(datos.concepto_detalle !== undefined && { concepto_detalle: datos.concepto_detalle }),
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
// 6. ESCÁNER DE FACTURAS CON IA
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
    
    let urlArchivoSubido = null;
    let nombreArchivoUnico = `${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('facturas') 
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
      Eres un auditor financiero experto. Analiza este ticket o factura minuciosamente.
      IMPORTANTE: Tu objetivo es extraer datos que sirvan para detectar tickets duplicados en el sistema contable. Necesitamos máxima precisión en la fecha, el NIF y el número de factura.

      Devuelve SOLO y EXCLUSIVAMENTE un objeto JSON válido con esta estructura:
      {
        "categoria": "Elige la que mejor encaje de esta lista: [${categorias}] o pon 'General'",
        "base_imponible": (el subtotal sin IVA en formato numérico con decimales, ej: 11.49),
        "iva": (el porcentaje de IVA en número, ej: 21, 10 o 0),
        "fecha": "YYYY-MM-DD",
        "numero_factura": "El número de la factura o ticket (ej: F-2309, 1516). Si no hay número obvio, busca cualquier código de caja o transacción que sirva como identificador único. Si no hay nada, devuelve null",
        "concepto": "Resumen muy breve de 3 o 4 palabras (ej: Gasolina, Dietas, Material oficina)",
        "cliente_nombre": "Nombre de la empresa, restaurante, gasolinera o comercio emisor",
        "nif": "CIF o NIF del emisor de la factura. Busca DNI, NIF, CIF, o secuencias como B45779477. Si lo encuentras, devuélvelo limpio (ej: B45779477). Si no, devuelve null",
        "confianza": (tu nivel de seguridad global del 0 al 100),
        "evidencia": "Breve justificación de 1 línea de dónde has extraído los datos clave."
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } }
    ]);

    const texto = result.response.text();
    const datosParseados = JSON.parse(texto);
    
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

// 🤝=============================================================🤝
// 7. FUNCIONES DEL MODO ASESOR (B2B)
// 🤝=============================================================🤝

// Verifica qué rol tiene el usuario en la empresa actual
export async function verificarRolUsuario(empresaId: string) {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) return { rol: "NINGUNO" };

    const miEmail = user.primaryEmailAddress?.emailAddress;

    // ¿Soy yo el que creó alguna transacción en esta empresa?
    const soyPropietario = await prisma.transaccion.findFirst({
        where: { userId: userId, empresaId: empresaId }
    });

    if (soyPropietario) return { rol: "PROPIETARIO" };

    // Si no soy el creador, ¿estoy invitado a mirar?
    if (miEmail) {
        const invitado = await prisma.permisoEmpresa.findFirst({
            where: { empresaId: empresaId, asesorEmail: miEmail }
        });
        if (invitado) return { rol: invitado.rol }; // Devolverá "LECTURA"
    }

    return { rol: "NINGUNO" };
}

// Para que el CEO invite a su gestor
export async function invitarAsesor(empresaId: string, asesorEmail: string) {
    const { userId } = await auth();
    if (!userId) return { error: "No autorizado" };

    try {
        await prisma.permisoEmpresa.create({
            data: {
                empresaId: empresaId,
                propietarioId: userId,
                asesorEmail: asesorEmail.toLowerCase(),
                rol: "LECTURA"
            }
        });
        return { success: true };
    } catch (error: any) {
        // El error P2002 significa que viola la regla de @@unique (ya estaba invitado)
        if (error.code === 'P2002') return { error: "Este asesor ya está invitado a este espacio." };
        return { error: "No se pudo enviar la invitación." };
    }
}

// Para que el CEO vea a quién tiene invitado
export async function obtenerAsesores(empresaId: string) {
    const { userId } = await auth();
    if (!userId) return [];

    const asesores = await prisma.permisoEmpresa.findMany({
        where: { empresaId: empresaId, propietarioId: userId }
    });
    return asesores;
}

// Para echar al gestor
export async function revocarAsesor(permisoId: number) {
    const { userId } = await auth();
    if (!userId) return { error: "No autorizado" };

    try {
        await prisma.permisoEmpresa.delete({
            where: { id: permisoId, propietarioId: userId }
        });
        return { success: true };
    } catch (error) {
        return { error: "No se pudo revocar el acceso." };
    }
}