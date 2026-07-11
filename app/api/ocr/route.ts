import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 🚀 TRAMPA PARA VERCEL: Evitamos que bloquee la subida al compilar
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Capa de Seguridad: Comprobamos que quien sube la foto es un usuario registrado
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    // 2. Recibimos la foto y la lista de categorías de tu empresa
    const body = await request.json();
    const { imageBase64, categorias } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No se ha detectado ninguna imagen." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ ERROR: Falta la GEMINI_API_KEY en Vercel.");
      return NextResponse.json({ error: "Falta la llave de la IA." }, { status: 500 });
    }

    // 3. Limpiamos la imagen para que la IA la pueda leer bien
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    // 4. EL CEREBRO: Le damos instrucciones ultra precisas a la IA para que actúe como un contable
    const prompt = `Actúa como un contable experto auditando una empresa. 
    Analiza la imagen de este ticket, recibo o factura y extrae los datos solicitados.
    
    INSTRUCCIONES ESTRICTAS:
    - Devuelve SOLO un objeto JSON puro, sin texto adicional, sin formato markdown y sin comillas invertidas.
    - Si no encuentras algún dato, asume un valor lógico o usa null.
    - El IVA debe ser uno de estos números: 0, 4, 10 o 21. Si solo ves el total, deduce el IVA lógico en España.
    - Base imponible debe ser un número con decimales (usa punto, no coma).
    
    FORMATO JSON ESPERADO:
    {
      "fecha": "YYYY-MM-DD",
      "concepto": "Breve descripción de la compra o servicio",
      "base_imponible": 0.00,
      "iva": 21,
      "categoria": "Elige la que mejor encaje de esta lista EXACTAMENTE: ${categorias.join(', ')}"
    }`;

    // 5. Llamada ultrarrápida al modelo Gemini 1.5 Flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: {
          // Forzamos a la IA a responder SOLO en código JSON
          response_mime_type: "application/json",
        }
      })
    });

    const apiData = await response.json();
    
    if (!apiData.candidates || apiData.candidates.length === 0) {
       console.error("❌ ERROR DE LA IA:", apiData);
       throw new Error("La Inteligencia Artificial no pudo procesar la imagen.");
    }

    // 6. Extraemos la respuesta, la convertimos y se la mandamos a tu pantalla
    const textResult = apiData.candidates[0].content.parts[0].text;
    const parsedResult = JSON.parse(textResult);

    return NextResponse.json(parsedResult);

  } catch (error: any) {
    console.error("❌ ERROR GENERAL EN OCR:", error);
    return NextResponse.json({ error: "Error interno al escanear la factura." }, { status: 500 });
  }
}