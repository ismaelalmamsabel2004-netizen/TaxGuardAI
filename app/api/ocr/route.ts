import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta la API Key" }, { status: 500 });

    const body = await request.json();
    const { imageBase64, categorias } = body; // 🚀 AHORA RECIBIMOS LAS CATEGORÍAS DEL CLIENTE
    
    if (!imageBase64) return NextResponse.json({ error: "No hay imagen" }, { status: 400 });

    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.split(';')[0].split(':')[1] || "image/jpeg";

    // 🚀 FORMATEAMOS SUS CATEGORÍAS PARA LA IA
    const catsTexto = categorias && categorias.length > 0 
        ? categorias.join('", "') 
        : 'Logística", "Marketing", "Software/Suscripciones", "Inventario/Materiales", "Nóminas", "Otros';

    const promptText = `Actúa como un experto contable. Analiza esta imagen de una factura o ticket y extrae la información.
    DEBES responder EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional, con esta estructura exacta:
    {
      "fecha": "YYYY-MM-DD", 
      "base_imponible": numero (solo la base sin IVA, usa punto para decimales. Si solo hay total, calcúlalo restando el IVA),
      "iva": "21", "10", "4" o "0" (el % aplicado),
      "categoria": Elige estrictamente UNA de estas opciones: "${catsTexto}"
    }
    Adivina la categoría por el contexto (ejemplo: si es gasolina o un coche, es Logística o Vehículos. Si son ordenadores, Materiales).
    Si no encuentras la fecha clara, usa la fecha de hoy.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
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
            responseMimeType: "application/json",
        }
      })
    });

    const dataJson = await response.json();
    if (!response.ok) throw new Error("Error procesando imagen en Google.");

    const aiResponse = dataJson.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(aiResponse);

    return NextResponse.json(parsedData);
    
  } catch (error: any) {
    console.error("Error OCR:", error);
    return NextResponse.json({ error: "Error analizando la factura" }, { status: 500 });
  }
}