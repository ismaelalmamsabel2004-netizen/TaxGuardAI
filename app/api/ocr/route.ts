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

    // INTENTO 1: Motor principal (Gemini 1.5 Flash)
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
    
    // INTENTO 2 (SALVAVIDAS DE GOOGLE): Si el moderno da error, usamos el nombre clásico EXACTO que Google pide ahora
    if (result.error) {
       console.log("Usando motor de rescate: gemini-1.0-pro-vision-latest");
       response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-vision-latest:generateContent?key=${apiKey}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{
             parts: [
               { text: promptText + " IMPORTANTE: No uses formato markdown, devuelve solo el JSON tal cual." },
               { inline_data: { mime_type: "image/jpeg", data: base64Data } }
             ]
           }]
         }) // OJO: Le quitamos el generationConfig porque los motores antiguos explotan con él
       });
       result = await response.json();
    }

    // Si ambos fallan, devolvemos el error exacto a la pantalla
    if (result.error) {
       return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const text = result.candidates[0].content.parts[0].text;
    
    // Limpiamos el texto por si la IA añade basurilla alrededor del JSON
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error: any) {
    console.error("Error OCR:", error);
    return NextResponse.json({ error: "Error de servidor al procesar la imagen." }, { status: 500 });
  }
}