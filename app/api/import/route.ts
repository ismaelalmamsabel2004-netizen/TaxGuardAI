import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Capa de seguridad obligatoria
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    const { csvText, empresaId } = body;

    if (!csvText || !empresaId) {
      return NextResponse.json({ error: "Faltan datos obligatorios (csvText o empresaId)." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta la API Key en Vercel" }, { status: 500 });

    // Lista de categorías estándar para guiar a la IA
    const categoriasValidas = [
      "Ventas", "Servicios", "Inversión", "Subvenciones", "Logística", 
      "Marketing", "Software/Suscripciones", "Inventario/Materiales", 
      "Nóminas", "Impuestos", "Dietas", "Mantenimiento", "Seguros", "Otros"
    ];

    // 2. EL PROMPT MAESTRO: Enseñamos a la IA a procesar un extracto bancario completo
    const promptText = `Actúas como un contable robotizado de alta precisión. Te voy a pasar un extracto de movimientos bancarios en texto bruto.
    Tu único trabajo es leer cada línea, identificar la fecha, el concepto, el importe y emparejarlo con la mejor categoría de esta lista exacta: [${categoriasValidas.join(', ')}].

    TEXTO BRUTO DEL EXTRACTO BANCO:
    ${csvText}

    REGLAS ESTRICTAS DE SALIDA:
    - Debes devolver ÚNICAMENTE un array JSON con objetos que contengan exactamente estas claves: "fecha" (formato DD/MM/YYYY), "concepto", "total" (número matemático positivo o negativo), "categoria" (de la lista proporcionada), "iva" (número entero, pon 0 si no se deduce, o 21 si es una factura estándar obvia).
    - No escribas explicaciones, ni introducciones, ni formato markdown. Solo el array JSON directo.
    
    EJEMPLO DE SALIDA:
    [
      {"fecha": "12/07/2026", "concepto": "PAGO REPSOL GASOLINERA", "total": -55.30, "categoria": "Logística", "iva": 21},
      {"fecha": "13/07/2026", "concepto": "INGRESO TRANSFERENCIA CLIENTE AX", "total": 1200.00, "categoria": "Ventas", "iva": 21}
    ]`;

    // 3. Llamada al motor verificado de tu cuenta
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
    
    // Lista de movimientos ya estructurados por la IA
    const movimientosACargar = JSON.parse(cleanJson);

    if (!Array.isArray(movimientosACargar)) {
       throw new Error("La IA no devolvió un formato de lista válido.");
    }

    // 4. INSERCIÓN MASIVA EN LA BASE DE DATOS (Neon / Vercel Postgres)
    // Recorremos cada movimiento clasificado y lo guardamos automáticamente en tu tabla
    for (const mov of movimientosACargar) {
       await sql`
         INSERT INTO finanzas (user_id, empresa_id, fecha, total, categoria, is_recurrent, frecuencia, iva)
         VALUES (
           ${userId}, 
           ${empresaId}, 
           ${mov.fecha}, 
           ${Number(mov.total)}, 
           ${mov.categoria || 'Otros'}, 
           false, 
           null, 
           ${Number(mov.iva) || 0}
         );
       `;
    }

    return NextResponse.json({ success: true, count: movimientosACargar.length });

  } catch (error: any) {
    console.error("Error en importación bancaria masiva:", error);
    return NextResponse.json({ error: "Error al procesar e insertar el extracto bancario masivo." }, { status: 500 });
  }
}