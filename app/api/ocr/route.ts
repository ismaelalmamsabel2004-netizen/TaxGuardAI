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
    // Quitamos el prefijo si existe (data:image/jpeg;base64,...)
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Actúa como un contable experto. Devuelve SOLO un JSON puro: {"fecha": "YYYY-MM-DD", "base_imponible": 0.00, "iva": 21, "categoria": "${categorias[0]}"}. Extrae los datos reales.` },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const result = await response.json();
    
    if (result.error) {
       console.error("Error API Gemini:", result.error);
       return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const text = result.candidates[0].content.parts[0].text;
    return NextResponse.json(JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()));

  } catch (error: any) {
    console.error("Error OCR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}