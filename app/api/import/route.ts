import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; // 🚀 B2B: Usamos el SDK oficial

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    const { csvText, empresaId } = body;

    if (!csvText || !empresaId) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
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

    // 🚀 OPTIMIZACIÓN B2B: Preparar array para inserción masiva
    const transaccionesParaInsertar = movimientosACargar.map((mov: any) => {
       // Blindaje de fechas bancarias extremas
       let fechaObj = new Date();
       if (mov.fecha) {
          const fechaLimpia = mov.fecha.replace(/-/g, '/'); // Cambiar guiones a barras por seguridad
          if (fechaLimpia.includes('/')) {
             const [d, m, y] = fechaLimpia.split('/');
             fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
          }
       }
       // Si es "Invalid Date", usar la fecha de hoy para no colgar la BD
       if (isNaN(fechaObj.getTime())) fechaObj = new Date();

       const totalNum = Number(mov.total) || 0;

       return {
         userId: userId,
         empresaId: empresaId,
         fecha: fechaObj,
         baseImponible: Math.abs(totalNum),
         tipo: totalNum >= 0 ? 'INGRESO' : 'GASTO',
         categoria: mov.categoria || 'Otros',
         iva: Number(mov.iva) || 0,
         isRecurrent: false,
         concepto_detalle: mov.concepto || "Importado vía CSV",
         estado_pago: "COBRADO", // 🚀 B2B: Si viene del banco, el pago ya está efectuado
       };
    });

    // 🚀 INSERCIÓN MASIVA (BULK INSERT) PARA ALTO RENDIMIENTO
    const dbResult = await prisma.transaccion.createMany({
        data: transaccionesParaInsertar,
        skipDuplicates: true // Previene bloqueos si hay algún conflicto menor
    });

    return NextResponse.json({ success: true, count: dbResult.count });

  } catch (error: any) {
    console.error("🔴 Error en importación bancaria masiva:", error);
    return NextResponse.json({ error: "El servidor encontró un error al procesar el extracto bancario." }, { status: 500 });
  }
}