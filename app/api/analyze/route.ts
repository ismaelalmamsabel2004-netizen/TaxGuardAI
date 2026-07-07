import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim(); 
    if (!apiKey) return NextResponse.json({ analysis: "⚠️ Error de configuración en el servidor." }, { status: 500 });

    const body = await request.json();
    const { data, empresaId, contextoSector } = body; 

    if (!data || data.length === 0) {
      return NextResponse.json({ analysis: "Aún no hay suficientes movimientos registrados para generar un análisis financiero fiable." });
    }

    // 🚀 ORDEN ESTRICTA: Le lavamos el cerebro a la IA para que sea 100% tuya
    const promptText = `Actúa como el CFO virtual del software. Analiza el historial de flujos de caja: ${JSON.stringify(data)}.
    Empresa a auditar: "${empresaId}".
    Contexto estratégico del negocio: ${contextoSector || "Estándar"}.
    
    REGLAS ESTRICTAS Y OBLIGATORIAS:
    1. Dirígete a la empresa EXCLUSIVAMENTE por el nombre exacto "${empresaId}".
    2. NUNCA, bajo ningún concepto, menciones a Google, Gemini ni que eres un modelo de lenguaje genérico. Si te preguntan quién eres, di que eres "TaxGuard AI", un motor de inteligencia artificial financiera nativo y exclusivo de esta plataforma.
    3. Devuelve la respuesta en formato Markdown limpio, con consejos directos y profesionales aplicados a su sector.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const dataJson = await response.json();

    if (!response.ok) {
      return NextResponse.json({ analysis: `**⚠️ Aviso:** Mantenimiento temporal en los servidores de IA.` });
    }

    return NextResponse.json({ analysis: dataJson.candidates[0].content.parts[0].text });
    
  } catch (error: any) {
    return NextResponse.json({ analysis: `**⚠️ Alerta del Servidor:** No se pudo completar la conexión.` });
  }
}