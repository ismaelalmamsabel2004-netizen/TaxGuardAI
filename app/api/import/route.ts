import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';

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

    const categoriasValidas = [
      "Ventas", "Servicios", "Inversión", "Subvenciones", "Logística", 
      "Marketing", "Software/Suscripciones", "Inventario/Materiales", 
      "Nóminas", "Impuestos", "Dietas", "Mantenimiento", "Seguros", "Otros"
    ];

    const promptText = `Actúas como un contable robotizado de alta precisión. Te voy a pasar un extracto de movimientos bancarios en texto bruto o formato CSV.
    Tu único trabajo es leer cada línea, identificar la fecha, el concepto, el importe y emparejarlo con la mejor categoría de esta lista exacta: [${categoriasValidas.join(', ')}].

    TEXTO BRUTO DEL EXTRACTO BANCO:
    ${csvText}

    REGLAS ESTRICTAS DE SALIDA:
    - Debes devolver ÚNICAMENTE un array JSON.
    - La clave "fecha" DEBE tener el formato exacto europeo separada por barras: DD/MM/YYYY. Ejemplo: "16/07/2026". Si el mes es un solo dígito, añádele un cero delante (ej. "07"). Si viene con guiones, cámbialos por barras. ¡ESTO ES CRÍTICO!
    - La clave "total" debe ser un número matemático positivo (ingresos) o negativo (gastos).
    - La clave "categoria" debe ser exactamente de la lista proporcionada.
    - La clave "iva" debe ser un número entero (0 si no se deduce, 21 si es una factura estándar).
    - La clave "concepto" debe ser un texto breve resumiendo el movimiento.
    - No escribas explicaciones, ni introducciones, ni formato markdown. Solo el array JSON directo.
    `;

    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const dataJson = await response.json();

    if (dataJson.error) {
       return NextResponse.json({ error: dataJson.error.message }, { status: 500 });
    }

    const aiResponse = dataJson.candidates[0].content.parts[0].text;
    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const movimientosACargar = JSON.parse(cleanJson);

    if (!Array.isArray(movimientosACargar)) {
       throw new Error("La IA no devolvió un formato de lista válido.");
    }

    // 🚀 INSERCIÓN DIRECTA EN EL NUEVO CEREBRO (Prisma)
    for (const mov of movimientosACargar) {
       let fechaObj = new Date();
       if (mov.fecha && mov.fecha.includes('/')) {
          const [d, m, y] = mov.fecha.split('/');
          fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
       }

       await prisma.transaccion.create({
         data: {
           userId: userId,
           empresaId: empresaId,
           fecha: fechaObj,
           baseImponible: Math.abs(Number(mov.total)),
           tipo: Number(mov.total) >= 0 ? 'INGRESO' : 'GASTO',
           categoria: mov.categoria || 'Otros',
           iva: Number(mov.iva) || 0,
           isRecurrent: false,
           concepto_detalle: mov.concepto || "Importado vía CSV"
         }
       });
    }

    return NextResponse.json({ success: true, count: movimientosACargar.length });

  } catch (error: any) {
    console.error("Error en importación bancaria masiva:", error);
    return NextResponse.json({ error: "Error al procesar e insertar el extracto bancario masivo." }, { status: 500 });
  }
}