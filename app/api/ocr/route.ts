import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Acceso denegado" }, { status: 401 });

    const body = await request.json();
    const { imageBase64, categorias } = body;

    if (!imageBase64) return NextResponse.json({ error: "No hay imagen" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta la API Key en Vercel" }, { status: 500 });

    // Extraemos la imagen pura y su formato
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mimeType = imageBase64.includes(';') ? imageBase64.split(';')[0].split(':')[1] : "image/jpeg";

    const catsTexto = categorias && categorias.length > 0 
        ? categorias.join('", "') 
        : 'Logística", "Marketing", "Software/Suscripciones", "Inventario/Materiales", "Nóminas", "Otros';

    const promptText = `Actúa como un experto contable. Analiza esta imagen de una factura o ticket y extrae la información.
    DEBES responder EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional, con esta estructura exacta:
    {
      "fecha": "YYYY-MM-DD", 
      "base_imponible": 0.00,
      "iva": 21,
      "categoria": "Elige estrictamente UNA de estas opciones: ${catsTexto}"
    }
    Adivina la categoría por el contexto. Si no encuentras la fecha clara, usa la fecha de hoy. Usa el punto para los decimales de la base imponible.`;

    // 🚀 EL MOTOR CORRECTO DE TU CUENTA: gemini-2.5-flash
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
            response_mime_type: "application/json"
        }
      })
    });

    const dataJson = await response.json();
    
    // Capturamos cualquier rechazo de Google
    if (dataJson.error) {
       console.error("Error API Gemini:", dataJson.error);
       return NextResponse.json({ error: dataJson.error.message }, { status: 500 });
    }

    if (!dataJson.candidates || dataJson.candidates.length === 0) {
       throw new Error("La IA no pudo extraer los datos de la imagen.");
    }

    const aiResponse = dataJson.candidates[0].content.parts[0].text;
    
    // Limpieza de seguridad y conversión a JSON
    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
    
  } catch (error: any) {
    console.error("OCR de error:", error);
    return NextResponse.json({ error: "Error interno al analizar la factura." }, { status: 500 });
  }
}