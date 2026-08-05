import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; // 🚀 B2B: Usamos el SDK oficial
import { getContextoSeguro } from '../../../lib/authContext';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    const { csvText, empresaId, preview } = body;

    if (!csvText || !empresaId) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }

    // 🛡️ BLINDAJE DE COSTES: sin este límite, pegar un extracto bancario gigante (o un archivo
    // equivocado) disparaba una petición enorme y cara a la IA, o directamente hacía fallar la
    // llamada por exceder el límite de tokens del modelo. ~600.000 caracteres cubren de sobra
    // varios años de movimientos bancarios reales.
    if (typeof csvText !== 'string' || csvText.length > 600_000) {
      return NextResponse.json({ error: "El extracto es demasiado grande. Divídelo en partes más pequeñas (por ejemplo, por trimestre) e impórtalo por tramos." }, { status: 400 });
    }

    // 🛡️ BLINDAJE: mismo control de permisos que el resto de la app. Sin esto, un asesor
    // en modo "solo lectura" podía volcar un extracto bancario entero en el espacio de un cliente.
    const ctx = await getContextoSeguro(empresaId);
    if (ctx.rol === "LECTURA" || ctx.rol === "NINGUNO") {
      return NextResponse.json({ error: "Acceso denegado: el Modo Asesor es de solo lectura." }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta la API Key en Vercel" }, { status: 500 });

    // 🚀 B2B: Instrucciones hiper-estrictas para lidiar con la basura de los bancos (cabeceras, referencias largas...)
    const categoriasValidas = [
      "Ventas", "Servicios", "Inversión", "Subvenciones", "Logística", 
      "Marketing", "Software/Suscripciones", "Inventario/Materiales", 
      "Nóminas", "Impuestos", "Dietas", "Mantenimiento", "Seguros", "Otros"
    ];

    const promptText = `Actúas como un contable robotizado de alta precisión especializado en conciliación bancaria corporativa. 
    Te voy a pasar un extracto de movimientos bancarios en texto bruto o formato CSV. Los bancos suelen meter basura, cabeceras inútiles, números de tarjeta y formatos rotos. Ignora la basura y céntrate en las transacciones reales.
    
    Tu único trabajo es leer cada línea, identificar la fecha, el concepto, el importe y emparejarlo con la mejor categoría de esta lista exacta: [${categoriasValidas.join(', ')}].

    TEXTO BRUTO DEL EXTRACTO BANCO:
    ${csvText}

    REGLAS ESTRICTAS DE SALIDA:
    - Debes devolver ÚNICAMENTE un array JSON válido.
    - La clave "fecha" DEBE tener el formato exacto europeo separada por barras: DD/MM/YYYY. Ejemplo: "16/07/2026". Si el mes es un solo dígito, añádele un cero delante (ej. "07"). Convierte cualquier formato raro a este.
    - La clave "total" debe ser un número matemático positivo (ingresos) o negativo (gastos). (Ej: -45.50 o 1500.00). Usa punto para decimales.
    - La clave "categoria" debe ser exactamente de la lista proporcionada.
    - La clave "iva" debe ser un número entero (0 si no se deduce, 21 si es una factura estándar).
    - La clave "concepto" debe ser un texto breve y limpio resumiendo el movimiento (máximo 6 o 7 palabras, quita referencias bancarias largas).
    - No escribas explicaciones, ni introducciones. Solo el array JSON directo.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } // 🛡️ Forzamos JSON nativo
    });

    const result = await model.generateContent(promptText);
    const aiResponse = result.response.text();
    
    // 🛡️ BLINDAJE B2B: Parseo seguro Anti-Alucinaciones
    let movimientosACargar = [];
    try {
        const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        movimientosACargar = JSON.parse(cleanJson);
        if (!Array.isArray(movimientosACargar)) throw new Error("No es un array");
    } catch (parseError) {
        console.error("🔴 Error al parsear el JSON de Gemini:", aiResponse);
        return NextResponse.json({ error: "El archivo era demasiado caótico para la IA. Intenta limpiar las cabeceras del CSV antes de subirlo." }, { status: 400 });
    }

    if (movimientosACargar.length === 0) {
        return NextResponse.json({ error: "No se detectó ninguna transacción válida en el archivo." }, { status: 400 });
    }

    // Normaliza y prepara filas
    const transaccionesParaInsertar = movimientosACargar.map((mov: any) => {
       let fechaObj = new Date();
       if (mov.fecha) {
          const fechaLimpia = String(mov.fecha).replace(/-/g, '/');
          if (fechaLimpia.includes('/')) {
             const [d, m, y] = fechaLimpia.split('/');
             fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
          }
       }
       if (isNaN(fechaObj.getTime())) fechaObj = new Date();

       const totalNum = Number(mov.total) || 0;
       const concepto = String(mov.concepto || "Importado vía CSV").trim().slice(0, 200);

       return {
         userId: ctx.targetUserId,
         empresaId: ctx.realEmpresaId,
         fecha: fechaObj,
         baseImponible: Math.abs(totalNum),
         tipo: totalNum >= 0 ? 'INGRESO' : 'GASTO',
         categoria: mov.categoria || 'Otros',
         iva: Number(mov.iva) || 0,
         isRecurrent: false,
         concepto_detalle: concepto,
         estado_pago: "COBRADO",
       };
    }).filter((t: any) => Number.isFinite(t.baseImponible) && t.baseImponible > 0);

    if (transaccionesParaInsertar.length === 0) {
        return NextResponse.json({ error: "No se detectó ninguna transacción válida en el archivo." }, { status: 400 });
    }

    // Preview: devolver clasificados sin escribir (el cliente confirma)
    if (preview === true) {
      return NextResponse.json({
        success: true,
        preview: true,
        count: transaccionesParaInsertar.length,
        movimientos: transaccionesParaInsertar.map((t: any) => ({
          fecha: t.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          concepto: t.concepto_detalle,
          total: t.tipo === 'GASTO' ? -t.baseImponible : t.baseImponible,
          categoria: t.categoria,
          iva: t.iva,
        })),
      });
    }

    // Huella anti-duplicados: misma fecha + importe + concepto (90 días atrás)
    const desde = new Date();
    desde.setDate(desde.getDate() - 90);
    const existentes = await prisma.transaccion.findMany({
      where: {
        userId: ctx.targetUserId,
        empresaId: ctx.realEmpresaId,
        fecha: { gte: desde },
      },
      select: { fecha: true, baseImponible: true, tipo: true, concepto_detalle: true },
      take: 5000,
    });

    const huella = (fecha: Date, base: number, tipo: string, concepto: string) => {
      const d = fecha.toISOString().slice(0, 10);
      const c = (concepto || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
      return `${d}|${tipo}|${Number(base).toFixed(2)}|${c}`;
    };

    const existentesSet = new Set(
      existentes.map((e) => huella(e.fecha, e.baseImponible, e.tipo, e.concepto_detalle || ''))
    );

    const nuevas: typeof transaccionesParaInsertar = [];
    let skippedDuplicates = 0;
    for (const t of transaccionesParaInsertar) {
      const key = huella(t.fecha, t.baseImponible, t.tipo, t.concepto_detalle || '');
      if (existentesSet.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      existentesSet.add(key); // evita duplicados dentro del propio CSV
      nuevas.push(t);
    }

    if (nuevas.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        skippedDuplicates,
        message: "Todos los movimientos del extracto ya estaban registrados.",
      });
    }

    const dbResult = await prisma.transaccion.createMany({
        data: nuevas,
        skipDuplicates: true
    });

    return NextResponse.json({
      success: true,
      count: dbResult.count,
      skippedDuplicates,
    });

  } catch (error: any) {
    console.error("🔴 Error en importación bancaria masiva:", error);
    return NextResponse.json({ error: "El servidor encontró un error al procesar el extracto bancario." }, { status: 500 });
  }
}