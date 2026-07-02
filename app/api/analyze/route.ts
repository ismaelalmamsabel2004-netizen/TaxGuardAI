import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Leemos la llave y le quitamos los espacios en blanco que pueda tener por error
    const apiKey = process.env.GEMINI_API_KEY?.trim(); 
    
    if (!apiKey) {
      return NextResponse.json({ analysis: "⚠️ API Key no configurada en el servidor." }, { status: 500 });
    }

    const body = await request.json();
    const { data, empresaId, contextoSector } = body; 

    if (!data || data.length === 0) {
      return NextResponse.json({ analysis: "Muestras insuficientes para generar una proyección financiera." });
    }

    const promptText = `Actúa como un Director Financiero (CFO) de élite. Analiza el siguiente historial de flujos de caja: ${JSON.stringify(data)}.
    
    CONTEXTO CORPORATIVO:
    - Empresa: ${empresaId || "General"}
    - Sector: ${contextoSector || "Estándar"}
    
    Instrucciones:
    1. Dirígete a la empresa por su nombre.
    2. Adapta tus recomendaciones de optimización al sector.
    3. Identifica patrones o anomalías.
    4. Devuelve la respuesta en formato Markdown limpio.`;

    // 🆕 CONEXIÓN DIRECTA (Bypass de la librería)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const dataJson = await response.json();

    // Si Google rechaza la conexión, ahora nos dirá el motivo exacto en español (o inglés claro)
    if (!response.ok) {
      console.error("Rechazo de Google:", dataJson);
      return NextResponse.json({ 
        analysis: `**⚠️ Conexión rechazada por Google:** *${dataJson.error?.message || "La API Key no es válida o el servicio está bloqueado."}*` 
      });
    }

    // Si todo va bien, sacamos el texto de la IA
    const analisisTexto = dataJson.candidates[0].content.parts[0].text;

    return NextResponse.json({ analysis: analisisTexto });
    
  } catch (error: any) {
    console.error("Error crítico en la IA:", error);
    return NextResponse.json({ 
      analysis: `**⚠️ Alerta de Sistema:** Fallo interno al intentar conectar. Detalle: ${error.message}` 
    });
  }
}