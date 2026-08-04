'use server'

import { prisma } from '../lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server'; 
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { getContextoSeguro } from '../lib/authContext';
import { contactoCrmSchema } from '../lib/validations';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);


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

      // 🚀 RENDIMIENTO A ESCALA: sin este límite, una empresa con años de actividad acabaría
      // descargando miles de filas de golpe en cada carga de página. 4000 movimientos son de sobra
      // para varios años de un negocio real; actúa como red de seguridad, no como paginación visible.
      const transacciones = await prisma.transaccion.findMany({
        where: { userId: ctx.targetUserId, empresaId: ctx.realEmpresaId },
        orderBy: { createdAt: 'desc' },
        take: 4000,
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

// 🛡️ BLINDAJE LEGAL: la numeración de facturas se propone en el navegador contando documentos
// existentes, así que dos pestañas o un doble clic muy rápido podrían intentar registrar el mismo
// número dos veces (irregularidad sancionable por Hacienda). Antes de guardar, comprobamos en el
// servidor si ese número ya existe para esa empresa y, si es así, lo incrementamos automáticamente
// hasta encontrar uno libre, sin interrumpir al usuario ni hacerle perder el documento.
async function resolverNumeroDocumentoUnico(targetUserId: string, empresaId: string, numeroPropuesto: string): Promise<string> {
    let candidato = numeroPropuesto;
    for (let intentos = 0; intentos < 50; intentos++) {
        const existe = await prisma.transaccion.findFirst({
            where: { userId: targetUserId, empresaId: empresaId, numero_factura: candidato },
            select: { id: true }
        });
        if (!existe) return candidato;

        const match = candidato.match(/^(.*-)(\d+)$/);
        if (!match) return candidato; // Formato inesperado: no forzamos un incremento a ciegas.

        const [, prefijo, numeroStr] = match;
        candidato = `${prefijo}${String(Number(numeroStr) + 1).padStart(numeroStr.length, '0')}`;
    }
    return candidato;
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

      // 🛡️ BLINDAJE DE DATOS: la validación del formulario se puede saltar llamando a esta
      // Server Action directamente. Sin esto, un total/iva no numérico se convertía en NaN y
      // corrompía silenciosamente todas las sumas del Libro Mayor (ingresos, IVA, balances...).
      const totalNum = Number(datos.total);
      if (!Number.isFinite(totalNum)) {
          return { error: "El importe introducido no es un número válido." };
      }
      const ivaNum = Number(datos.iva) || 0;
      if (!Number.isFinite(ivaNum) || ivaNum < 0 || ivaNum > 100) {
          return { error: "El IVA introducido no es válido (debe estar entre 0 y 100)." };
      }
      if (!String(datos.categoria || '').trim()) {
          return { error: "Selecciona una categoría antes de guardar." };
      }

      let fechaObj = new Date();
      if (datos.month && datos.month.includes('/')) {
         const [d, m, y] = datos.month.split('/');
         fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
      } else if (datos.fecha) {
         fechaObj = new Date(datos.fecha);
      }
      if (isNaN(fechaObj.getTime())) fechaObj = new Date();

      let numeroFacturaFinal: string | null = datos.numero_factura || null;
      if (numeroFacturaFinal) {
          numeroFacturaFinal = await resolverNumeroDocumentoUnico(ctx.targetUserId, ctx.realEmpresaId, numeroFacturaFinal);
      }

      await prisma.transaccion.create({
        data: {
          userId: ctx.targetUserId,
          empresaId: ctx.realEmpresaId,
          fecha: fechaObj,
          categoria: datos.categoria || 'General',
          tipo: totalNum >= 0 ? 'INGRESO' : 'GASTO',
          baseImponible: Math.abs(totalNum),
          iva: ivaNum,
          isRecurrent: datos.isRecurrent || false,
          frecuencia: datos.frecuencia || null,
          numero_factura: numeroFacturaFinal,
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
      // Si tuvimos que corregir el número para evitar un duplicado, se lo decimos al cliente
      // para que actualice su estado local (contador de siguiente factura, nombre del PDF, etc.).
      return { success: true, numero_factura_final: numeroFacturaFinal };
  } catch (error: any) {
      return { error: "Error de servidor al guardar la transacción." };
  }
}

// 🔄=============================================================🔄
// 2.B AUTOMATIZACIÓN DE RECURRENTES: hasta ahora, marcar un gasto/ingreso como "recurrente"
// solo pintaba una etiqueta visual; el usuario tenía que volver a introducirlo cada mes a mano.
// Esta función genera de verdad los movimientos que tocaba registrar desde la última vez.
// 🔄=============================================================🔄

function avanzarFecha(fecha: Date, frecuencia: string | null): Date {
    const nueva = new Date(fecha);
    switch (frecuencia) {
        case 'Semanal': nueva.setDate(nueva.getDate() + 7); break;
        case 'Trimestral': nueva.setMonth(nueva.getMonth() + 3); break;
        case 'Anual': nueva.setFullYear(nueva.getFullYear() + 1); break;
        default: nueva.setMonth(nueva.getMonth() + 1); break; // "Mensual" o cualquier valor desconocido
    }
    return nueva;
}

export async function generarRecurrentesPendientes(empresaIdRaw?: string) {
    try {
        const ctx = await getContextoSeguro(empresaIdRaw);
        // Solo el propietario dispara altas automáticas; un asesor en modo lectura nunca escribe.
        if (ctx.rol !== "PROPIETARIO") return { creadas: 0 };

        const recurrentes = await prisma.transaccion.findMany({
            where: { userId: ctx.targetUserId, empresaId: ctx.realEmpresaId, isRecurrent: true },
            orderBy: { fecha: 'asc' }
        });
        if (recurrentes.length === 0) return { creadas: 0 };

        // Agrupamos por "plantilla" (mismo tipo, categoría, importe, IVA, cliente y concepto) y nos
        // quedamos con la ocurrencia más reciente de cada grupo: es la última vez que se registró.
        const grupos = new Map<string, typeof recurrentes[number]>();
        for (const t of recurrentes) {
            const clave = `${t.tipo}|${t.categoria}|${t.baseImponible}|${t.iva}|${t.cliente_nombre || ''}|${t.concepto_detalle || ''}`;
            const actual = grupos.get(clave);
            if (!actual || t.fecha > actual.fecha) grupos.set(clave, t);
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const nuevasTransacciones: any[] = [];

        for (const ultima of grupos.values()) {
            let siguienteFecha = avanzarFecha(ultima.fecha, ultima.frecuencia);
            let generadas = 0;
            // Tope de seguridad: si el usuario no ha abierto la app en mucho tiempo, se pone al día
            // sin generar un histórico infinito por un dato corrupto o una frecuencia mal calculada.
            while (siguienteFecha <= hoy && generadas < 12) {
                nuevasTransacciones.push({
                    userId: ctx.targetUserId,
                    empresaId: ctx.realEmpresaId,
                    fecha: siguienteFecha,
                    categoria: ultima.categoria,
                    tipo: ultima.tipo,
                    baseImponible: ultima.baseImponible,
                    iva: ultima.iva,
                    isRecurrent: true,
                    frecuencia: ultima.frecuencia || 'Mensual',
                    cliente_nombre: ultima.cliente_nombre,
                    cliente_nif: ultima.cliente_nif,
                    concepto_detalle: ultima.concepto_detalle,
                    estado_pago: ultima.tipo === 'INGRESO' ? 'COBRADO' : 'PAGADO',
                    // No copiamos numero_factura ni archivos adjuntos: son propios del documento
                    // original, no del movimiento recurrente autogenerado.
                    notas_internas: 'Generado automáticamente por la automatización de recurrentes de TaxGuard AI.',
                });
                generadas++;
                siguienteFecha = avanzarFecha(siguienteFecha, ultima.frecuencia);
            }
        }

        if (nuevasTransacciones.length === 0) return { creadas: 0 };

        await prisma.transaccion.createMany({ data: nuevasTransacciones });
        return { creadas: nuevasTransacciones.length };
    } catch (error) {
        return { creadas: 0 };
    }
}

// ==========================================
// 3. EDITAR DATO 
// ==========================================
export async function editarDatoSupabase(datos: any) {
  try {
      const ctx = await getContextoSeguro(datos.empresaId);
      if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { error: "Modo solo lectura." };

      // 🛡️ BLINDAJE DE DATOS: mismo guardián que en el alta, para que una edición con un
      // importe/IVA corrupto no pueda dejar un NaN grabado en el Libro Mayor.
      const totalNum = Number(datos.total);
      if (!Number.isFinite(totalNum)) {
          return { error: "El importe introducido no es un número válido." };
      }
      const ivaNum = Number(datos.iva) || 0;
      if (!Number.isFinite(ivaNum) || ivaNum < 0 || ivaNum > 100) {
          return { error: "El IVA introducido no es válido (debe estar entre 0 y 100)." };
      }

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
          tipo: totalNum >= 0 ? 'INGRESO' : 'GASTO',
          baseImponible: Math.abs(totalNum),
          iva: ivaNum,
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
// 🛡️ BLINDAJE DE ARCHIVOS: sin esto, cualquiera podía subir un fichero gigante (caída del
// servidor por consumo de memoria) o de un tipo cualquiera (gasto inútil de la IA y del storage).
const TAMANO_MAXIMO_FACTURA = 10 * 1024 * 1024; // 10MB, de sobra para una foto o un PDF de factura
const TIPOS_PERMITIDOS_FACTURA = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

export async function escanearFacturaIA(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: "No autorizado" };

  const file = formData.get('factura') as File;
  const categorias = formData.get('categorias') as string;

  if (!file || file.size === 0) {
    return { error: "No se ha podido leer el archivo. Inténtalo de nuevo." };
  }
  if (file.size > TAMANO_MAXIMO_FACTURA) {
    return { error: "El archivo es demasiado grande (máx. 10MB). Comprime la imagen o el PDF antes de subirlo." };
  }
  if (!TIPOS_PERMITIDOS_FACTURA.includes(file.type)) {
    return { error: "Formato no soportado. Sube una imagen (JPG, PNG, WEBP) o un PDF." };
  }

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

    // 🛡️ BLINDAJE DE DATOS: sin esta validación, un email mal escrito quedaba guardado igualmente
    // en PermisoEmpresa y el "asesor invitado" nunca podría entrar, sin ningún aviso del error.
    const emailLimpio = (asesorEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
        return { error: "El email introducido no es válido." };
    }

    const usuarioActual = await currentUser();
    if (usuarioActual?.primaryEmailAddress?.emailAddress?.toLowerCase() === emailLimpio) {
        return { error: "No puedes invitarte a ti mismo como asesor." };
    }

    const realEmpresa = empresaId && empresaId.trim() !== "" ? empresaId : "Mi Empresa Principal";

    try {
        await prisma.permisoEmpresa.create({
            data: {
                empresaId: realEmpresa,
                propietarioId: userId,
                asesorEmail: emailLimpio,
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

// 🏢=============================================================🏢
// 8. CRM REAL DE CLIENTES (Tabla ContactoEmpresa, ya no JSON fantasma)
// 🏢=============================================================🏢

export async function obtenerContactosCRM(empresaIdRaw?: string) {
    try {
        const ctx = await getContextoSeguro(empresaIdRaw);
        if (ctx.rol === "NINGUNO") return [];

        const contactos = await prisma.contactoEmpresa.findMany({
            where: { userId: ctx.targetUserId, empresaId: ctx.realEmpresaId },
            orderBy: { nombre: 'asc' },
        });
        return contactos;
    } catch (error) {
        return [];
    }
}

export async function guardarContactoCRM(datos: any) {
    try {
        const ctx = await getContextoSeguro(datos.empresaId);
        if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") {
            return { error: "Acceso denegado: El Modo Asesor es de solo lectura." };
        }

        // 🛡️ BLINDAJE DE DATOS: esta Server Action se puede invocar directamente sin pasar por el
        // formulario. Sin esta validación, un nombre vacío o un email/NIF con formato inválido se
        // guardaba igual en el CRM y podía acabar impreso en una factura real enviada a un cliente.
        const validacion = contactoCrmSchema.safeParse({
            nombre: datos.nombre, nif: datos.nif || '', direccion: datos.direccion || '',
            email: datos.email || '', telefono: datos.telefono || ''
        });
        if (!validacion.success) {
            return { error: validacion.error.issues[0]?.message || "Datos del contacto no válidos." };
        }
        const d = validacion.data;

        const contacto = await prisma.contactoEmpresa.create({
            data: {
                userId: ctx.targetUserId,
                empresaId: ctx.realEmpresaId,
                tipo: datos.tipo || "CLIENTE",
                nombre: d.nombre,
                nif: d.nif || null,
                email: d.email || null,
                telefono: d.telefono || null,
                direccion: d.direccion || null,
            }
        });
        return { success: true, contacto };
    } catch (error: any) {
        return { error: "Error de servidor al guardar el contacto." };
    }
}

export async function editarContactoCRM(datos: any) {
    try {
        const ctx = await getContextoSeguro(datos.empresaId);
        if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { error: "Modo solo lectura." };

        // 🛡️ BLINDAJE DE DATOS: mismo guardián que en el alta (ver guardarContactoCRM).
        const validacion = contactoCrmSchema.safeParse({
            nombre: datos.nombre, nif: datos.nif || '', direccion: datos.direccion || '',
            email: datos.email || '', telefono: datos.telefono || ''
        });
        if (!validacion.success) {
            return { error: validacion.error.issues[0]?.message || "Datos del contacto no válidos." };
        }
        const d = validacion.data;

        await prisma.contactoEmpresa.update({
            where: { id: Number(datos.id), userId: ctx.targetUserId },
            data: {
                nombre: d.nombre,
                nif: d.nif || null,
                email: d.email || null,
                telefono: d.telefono || null,
                direccion: d.direccion || null,
            }
        });
        return { success: true };
    } catch (error: any) {
        return { error: "Error de servidor al actualizar el contacto." };
    }
}

export async function borrarContactoCRM(id: number, empresaIdRaw: string) {
    try {
        const ctx = await getContextoSeguro(empresaIdRaw);
        if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { error: "Modo solo lectura." };

        await prisma.contactoEmpresa.delete({
            where: { id: Number(id), userId: ctx.targetUserId }
        });
        return { success: true };
    } catch (error: any) {
        return { error: "Error de servidor al borrar el contacto." };
    }
}

// 🚀 MIGRACIÓN TRANSPARENTE: la primera vez que detectamos contactos guardados a la antigua
// usanza (JSON dentro de los ajustes), los copiamos a la tabla real para que el usuario nunca
// note el cambio ni pierda su agenda. No se ejecuta si ya hay contactos reales para no duplicar.
export async function migrarContactosCRMDesdeJSON(empresaIdRaw: string, contactosJSON: any[]) {
    try {
        if (!contactosJSON || contactosJSON.length === 0) return { migrated: 0 };
        const ctx = await getContextoSeguro(empresaIdRaw);
        if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") return { migrated: 0 };

        const existentes = await prisma.contactoEmpresa.count({
            where: { userId: ctx.targetUserId, empresaId: ctx.realEmpresaId }
        });
        if (existentes > 0) return { migrated: 0 };

        const validos = contactosJSON.filter((c: any) => c && c.nombre && c.nombre.trim() !== "");
        if (validos.length === 0) return { migrated: 0 };

        await prisma.contactoEmpresa.createMany({
            data: validos.map((c: any) => ({
                userId: ctx.targetUserId,
                empresaId: ctx.realEmpresaId,
                tipo: "CLIENTE",
                nombre: c.nombre,
                nif: c.nif || null,
                email: c.email || null,
                telefono: c.telefono || null,
                direccion: c.direccion || null,
            }))
        });
        return { migrated: validos.length };
    } catch (error) {
        return { migrated: 0 };
    }
}