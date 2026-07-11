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

    const apiKey = process.env.GEMINI_API_KEY;
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const catsTexto = categorias && categorias.length > 0 
        ? categorias.join('", "') 
        : 'Logística", "Marketing", "Software/Suscripciones", "Inventario/Materiales", "Nóminas", "Otros';

    const promptText = `Actúa como un experto contable. Analiza esta imagen de una factura o ticket y extrae la información.
    DEBES responder EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional, con esta estructura exacta:
    {
      "fecha": "YYYY-MM-DD", 
      "base_imponible": numero (solo la base sin IVA, usa punto para decimales. Si solo hay total, calcúlalo restando el IVA),
      "iva": 21,
      "categoria": "Elige estrictamente UNA de estas opciones: ${catsTexto}"
    }
    Adivina la categoría por el contexto (ejemplo: si es gasolina o un coche, es Logística o Vehículos. Si son ordenadores, Materiales).
    Si no encuentras la fecha clara, usa la fecha de hoy.`;

    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
            response_mime_type: "application/json",
        }
      })
    });

    const dataJson = await response.json();
    
    if (dataJson.error) {
       console.error("Error API Gemini:", dataJson.error);
       return NextResponse.json({ error: dataJson.error.message }, { status: 500 });
    }

    if (!dataJson.candidates || dataJson.candidates.length === 0) {
       throw new Error("Error procesando imagen en Google.");
    }

    const aiResponse = dataJson.candidates[0].content.parts[0].text;
    
    // Limpieza por si la IA introduce formato markdown
    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
    
  } catch (error: any) {
    console.error("OCR de error:", error);
    return NextResponse.json({ error: "Error analizando la factura" }, { status: 500 });
  }
}