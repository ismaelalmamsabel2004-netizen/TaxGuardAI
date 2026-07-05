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

    // 🚀 ORDEN ESTRICTA A LA IA PARA RESPETAR EL NOMBRE DEL CLIENTE
    const promptText = `Actúa como un CFO experto. Analiza el historial de flujos de caja: ${JSON.stringify(data)}.
    Empresa a auditar: "${empresaId}".
    Contexto estratégico del negocio: ${contextoSector || "Estándar"}.
    
    REGLA DE PRIVACIDAD ESTRICTA: Dirígete a la empresa EXCLUSIVAMENTE por el nombre exacto "${empresaId}". Bajo ningún concepto menciones nombres de otras empresas ni inventes datos.
    
    Devuelve la respuesta en formato Markdown limpio, con consejos directos y profesionales aplicados a su sector.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const dataJson = await response.json();

    if (!response.ok) {
      if (dataJson.error?.code === 429 || dataJson.error?.message?.includes("quota")) {
        return NextResponse.json({ 
          analysis: `**⏳ Sistemas a máximo rendimiento:** La red de análisis está procesando un alto volumen de datos en este momento. Por favor, espere un par de minutos y vuelva a solicitar la auditoría.` 
        });
      }
      return NextResponse.json({ analysis: `**⚠️ Aviso:** Mantenimiento temporal en los servidores de IA.` });
    }

    return NextResponse.json({ analysis: dataJson.candidates[0].content.parts[0].text });
    
  } catch (error: any) {
    return NextResponse.json({ analysis: `**⚠️ Alerta del Servidor:** No se pudo completar la conexión.` });
  }
}