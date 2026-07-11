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

    const promptText = `Actúa como un contable experto. Analiza la factura/ticket y devuelve SOLO un objeto JSON puro (sin comillas invertidas ni markdown) con esta estructura exacta:
    {
      "fecha": "YYYY-MM-DD",
      "base_imponible": 0.00,
      "iva": 21,
      "categoria": "${categorias && categorias.length > 0 ? categorias[0] : 'General'}"
    }`;

    // 🚀 VOLVEMOS AL MOTOR ORIGINAL QUE TE FUNCIONABA (gemini-pro-vision)
    // Sin configuraciones extrañas que lo bloqueen
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }]
      }) // <-- Fíjate que aquí ya NO hay generationConfig
    });

    const result = await response.json();

    // Capturamos cualquier error de Google
    if (result.error) {
       console.error("Error de Google:", result.error);
       return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    if (!result.candidates || result.candidates.length === 0) {
       return NextResponse.json({ error: "La IA no pudo leer la imagen." }, { status: 500 });
    }

    const text = result.candidates[0].content.parts[0].text;
    
    // Limpiamos el texto a mano por si la IA es testaruda y le pone comillas
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error: any) {
    console.error("Error OCR:", error);
    return NextResponse.json({ error: "Error interno al procesar el ticket." }, { status: 500 });
  }
}