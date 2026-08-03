'use server'

import { prisma } from '../lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server'; 
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 🛡️ MOTOR DE SEGURIDAD B2B: IDENTIFICADOR COMPUESTO
async function getContextoSeguro(empresaIdRaw?: string) {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) throw new Error("No autenticado");

    const miEmail = user.primaryEmailAddress?.emailAddress;
    let realEmpresaId = empresaIdRaw || "Mi Empresa Principal";
    let targetUserId = userId;
    let rol = "PROPIETARIO";

    // Si es un Asesor entrando al espacio de un cliente
    if (empresaIdRaw && empresaIdRaw.startsWith("CLIENTE|")) {
        const parts = empresaIdRaw.split('|');
        if (parts.length === 3) {
            targetUserId = parts[1];
            realEmpresaId = parts[2] || "Mi Empresa Principal";
            rol = "NINGUNO";

            if (miEmail) {
                const permiso = await prisma.permisoEmpresa.findFirst({
                    where: { empresaId: realEmpresaId, propietarioId: targetUserId, asesorEmail: miEmail }
                });
                if (permiso) {
                    rol = permiso.rol; // "LECTURA"
                }
            }
        }
    } else {
        // Verificación extra por si la empresa se guardó como "undefined"
        if (realEmpresaId === "undefined" || realEmpresaId.includes("CLIENTE_undefined")) {
            realEmpresaId = "Mi Empresa Principal";
        }
    }

    return { targetUserId, realEmpresaId, rol, userId, miEmail };
}


// ==========================================
// 1. OBTENER DATOS (+ AUTO-RESCATE SEGURO)
// ==========================================
export async function obtenerDatosSupabase(empresaIdRaw?: string) {
  try {
      const ctx = await getContextoSeguro(empresaIdRaw);
      
      // Si es un gestor sin permiso real, lo echamos.
      if (ctx.rol === "NINGUNO") return [];

      // 🌟 AUTO-RESCATE B2B CORREGIDO (Sin error Type 'null')
      if (ctx.rol === "PROPIETARIO") {
          await prisma.transaccion.updateMany({
              where: { 
                  userId: ctx.userId, 
                  OR: [
                      { empresaId: { in: ['CLIENTE_undefined', 'undefined', 'General'] } },
                      { empresaId: null }
                  ]
              },
              data: { empresaId: ctx.realEmpresaId }
          });
      }

      const transacciones = await prisma.transaccion.findMany({
        where: { userId: ctx.targetUserId, empresaId: ctx.realEmpresaId },
        orderBy: { createdAt: 'desc' },
      });

      return transacciones.map((t: any) => ({
        id: t.id,
        name: t.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        total: t.tipo === 'GASTO' ? -t.baseImponible : t.baseImponible,
        empresaId: t.empresaId || "Mi Empresa Principal",
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
  } catch (error) {
      return [];
  }
}

// ==========================================
// 2. GUARDAR NUEVO DATO 
// ==========================================
export async function guardarDatoSupabase(datos: any) {
  try {
      const ctx = await getContextoSeguro(datos.empresaId);
      
      if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") {
          return { error: "Acceso denegado: El Modo Asesor es de solo lectura." };
      }

      let fechaObj = new Date();
      if (datos.month && datos.month.includes('/')) {
         const [d, m, y] = datos.month.split('/');
         fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
      } else if (datos.fecha) {
         fechaObj = new Date(datos.fecha);
      }
      if (isNaN(fechaObj.getTime())) fechaObj = new Date();

      await prisma.transaccion.create({
        data: {
          userId: ctx.targetUserId,
          empresaId: ctx.realEmpresaId,
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
          metodo_pago: datos.metodo_pago || null,
          notas_internas: datos.notas_internas || null
        }
      });
      return { success: true };
  } catch (error: any) {
      return { error: "Error de servidor al guardar la transacción." };
  }
}

// ==========================================
// 3. EDITAR DATO 
// ==========================================
export async function editarDatoSupabase(datos: any) {
  try {
      const ctx = await getContextoSeguro(datos.empresaId);
      if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { error: "Modo solo lectura." };

      let fechaObj = new Date();
      if (datos.month && datos.month.includes('/')) {
         const [d, m, y] = datos.month.split('/');
         fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
      } else if (datos.fecha) {
         fechaObj = new Date(datos.fecha);
      }
      if (isNaN(fechaObj.getTime())) fechaObj = new Date();

      await prisma.transaccion.update({
        where: { id: Number(datos.id), userId: ctx.targetUserId },
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
      return { error: "Error de servidor al actualizar." };
  }
}

// ==========================================
// 4. BORRAR DATO 
// ==========================================
export async function borrarDatoSupabase(id: string, empresaIdRaw: string) {
  try {
      const ctx = await getContextoSeguro(empresaIdRaw);
      if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { error: "Modo solo lectura." };

      await prisma.transaccion.delete({
        where: { id: Number(id), userId: ctx.targetUserId }
      });
      return { success: true };
  } catch (error: any) {
      return { error: "Error de servidor al borrar." };
  }
}

// ==========================================
// 5. ACTUALIZAR ESTADO RÁPIDO
// ==========================================
export async function actualizarEstadoPago(id: number, nuevoEstado: string, empresaIdRaw: string) {
  try {
      const ctx = await getContextoSeguro(empresaIdRaw);
      if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { error: "Modo solo lectura." };

      await prisma.transaccion.update({
        where: { id: id, userId: ctx.targetUserId },
        data: { estado_pago: nuevoEstado }
      });
      return { success: true };
  } catch (error: any) {
      return { error: "Error al cambiar el estado financiero." };
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
            .upload(nombreArchivoUnico, buffer, { contentType: file.type, upsert: false });

        if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage.from('facturas').getPublicUrl(nombreArchivoUnico);
            urlArchivoSubido = publicUrlData.publicUrl;
        }
    } catch (e) {
        // Ignoramos error storage
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
      Eres un auditor financiero experto. Analiza este ticket o factura minuciosamente.
      Devuelve SOLO y EXCLUSIVAMENTE un objeto JSON válido con esta estructura:
      {
        "categoria": "Elige la que mejor encaje de esta lista: [${categorias}] o pon 'General'",
        "base_imponible": (el subtotal sin IVA en formato numérico con decimales, ej: 11.49),
        "iva": (el porcentaje de IVA en número, ej: 21, 10 o 0),
        "fecha": "YYYY-MM-DD",
        "numero_factura": "El número de la factura o ticket (ej: F-2309, 1516). Si no hay, devuelve null",
        "concepto": "Resumen muy breve de 3 o 4 palabras",
        "cliente_nombre": "Nombre de la empresa o emisor",
        "nif": "CIF o NIF del emisor de la factura. Devuélvelo limpio (ej: B45779477). Si no, devuelve null",
        "confianza": (tu nivel de seguridad global del 0 al 100),
        "evidencia": "Breve justificación de 1 línea de dónde has extraído los datos."
      }
    `;

    const result = await model.generateContent([ prompt, { inlineData: { data: base64Image, mimeType: file.type } } ]);
    const texto = result.response.text();
    const datosParseados = JSON.parse(texto);
    
    return { 
        success: true, 
        data: { ...datosParseados, url_archivo: urlArchivoSubido, nombre_archivo: file.name, tipo_archivo: file.type }
    };
  } catch (error: any) {
    return { error: error.message || "Fallo de conexión OCR" };
  }
}

// 🤝=============================================================🤝
// 7. FUNCIONES DEL MODO ASESOR (B2B)
// 🤝=============================================================🤝

export async function verificarRolUsuario(empresaIdRaw: string) {
    try {
        const ctx = await getContextoSeguro(empresaIdRaw);
        return { rol: ctx.rol };
    } catch {
        return { rol: "NINGUNO" };
    }
}

export async function obtenerEmpresasCliente() {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) return [];

    const miEmail = user.primaryEmailAddress?.emailAddress;
    if (!miEmail) return [];

    const invitaciones = await prisma.permisoEmpresa.findMany({
        where: { asesorEmail: miEmail }
    });

    return invitaciones
        .filter(inv => inv.empresaId && inv.empresaId.trim() !== "") 
        .map(inv => ({
            idCompleto: `CLIENTE|${inv.propietarioId}|${inv.empresaId}`,
            nombreVisible: inv.empresaId,
            propietarioId: inv.propietarioId
        }));
}

export async function invitarAsesor(empresaId: string, asesorEmail: string) {
    const { userId } = await auth();
    if (!userId) return { error: "No autorizado" };
    
    const realEmpresa = empresaId && empresaId.trim() !== "" ? empresaId : "Mi Empresa Principal";

    try {
        await prisma.permisoEmpresa.create({
            data: {
                empresaId: realEmpresa,
                propietarioId: userId,
                asesorEmail: asesorEmail.toLowerCase(),
                rol: "LECTURA"
            }
        });
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') return { error: "Este asesor ya está invitado a este espacio." };
        return { error: "No se pudo enviar la invitación." };
    }
}

export async function obtenerAsesores(empresaId: string) {
    const { userId } = await auth();
    if (!userId) return [];
    
    const realEmpresa = empresaId && empresaId.trim() !== "" ? empresaId : "Mi Empresa Principal";

    const asesores = await prisma.permisoEmpresa.findMany({
        where: { empresaId: realEmpresa, propietarioId: userId }
    });
    return asesores;
}

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