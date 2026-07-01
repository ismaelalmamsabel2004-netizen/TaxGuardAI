import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ analysis: "⚠️ API Key no configurada en el servidor." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body = await request.json();
    
    // 🆕 Ahora aceptamos un "contextoSector" dinámico que enviará la interfaz del cliente
    const { data, empresaId, contextoSector } = body; 

    if (!data || data.length === 0) {
      return NextResponse.json({ analysis: "Muestras insuficientes para generar una proyección financiera." });
    }

    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    } catch {
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    // 🆕 El prompt ahora es universal. Si el cliente no ha rellenado su perfil, usa un texto por defecto.
    const prompt = `Actúa como un Director Financiero (CFO) de élite. Analiza con rigor el siguiente historial de flujos de caja (ingresos y gastos): ${JSON.stringify(data)}.
    
    CONTEXTO CORPORATIVO DEL CLIENTE:
    - Nombre de la empresa: ${empresaId || "Empresa Cliente"}
    - Sector / Objetivos: ${contextoSector || "Sector no especificado por el cliente. Realiza un análisis financiero corporativo estándar aplicable a cualquier PYME."}
    
    Instrucciones estrictas para el reporte:
    1. Dirígete a la empresa por su nombre de forma rigurosa y ejecutiva.
    2. Adapta tus recomendaciones de optimización de costes y evaluación de márgenes al sector específico mencionado arriba. Si no se especifica, usa principios contables universales.
    3. Identifica patrones en el flujo de caja, tendencias de crecimiento o anomalías en los gastos.
    4. Devuelve la respuesta exclusivamente en formato Markdown limpio, utilizando títulos, textos en negrita y listas estructuradas.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ analysis: text });
    
  } catch (error: any) {
    console.error("Error en la auditoría:", error);
    return NextResponse.json({ 
      analysis: `**⚠️ Alerta:** No se pudo procesar la auditoría automatizada: *${error.message}*` 
    });
  }
}