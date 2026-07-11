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

    const promptText = `Actúa como un contable experto. Devuelve SOLO un JSON puro: {"fecha": "YYYY-MM-DD", "base_imponible": 0.00, "iva": 21, "categoria": "${categorias[0] || 'General'}"}. Extrae los datos reales de esta factura/ticket.`;

    // INTENTO 1: Usamos la versión "latest" que exige Google ahora en su versión nueva
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    let result = await response.json();
    
    // INTENTO 2 (EL SALVAVIDAS): Si salta tu error "is not found", volvemos automáticamente al motor que te funcionaba antes
    if (result.error && result.error.message.includes("is not found")) {
       response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{
             parts: [
               { text: promptText + " IMPORTANTE: No uses formato markdown, devuelve solo el JSON." },
               { inline_data: { mime_type: "image/jpeg", data: base64Data } }
             ]
           }]
         })
       });
       result = await response.json();
    }

    if (result.error) {
       return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const text = result.candidates[0].content.parts[0].text;
    
    // Limpiamos el texto por si la IA añade comillas raras
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error: any) {
    console.error("Error OCR:", error);
    return NextResponse.json({ error: "Error al procesar la imagen." }, { status: 500 });
  }
}