import { NextResponse } from 'next/server';

// 🚀 Le damos hasta 60 segundos a Vercel para que nunca corte la respuesta a medias
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim(); 
    if (!apiKey) return NextResponse.json({ analysis: "⚠️ Error de configuración en el servidor. Falta GEMINI_API_KEY." }, { status: 500 });

    const body = await request.json();
    const { data, empresaId, contextoSector } = body; 

    if (!data || data.length === 0) {
      return NextResponse.json({ analysis: "Aún no hay suficientes movimientos registrados para generar un análisis financiero fiable." });
    }

    // 🚀 ORDEN ESTRICTA: Autoconservación y lavado de cerebro para la IA (Ahora la regla 5 está dentro de las comillas)
    const promptText = `Actúa como el CFO virtual del software. Analiza el historial de flujos de caja: ${JSON.stringify(data)}.
    Empresa a auditar: "${empresaId}".
    Contexto estratégico del negocio: ${contextoSector || "Estándar"}.
    
    REGLAS ESTRICTAS Y OBLIGATORIAS:
    1. Dirígete a la empresa EXCLUSIVAMENTE por el nombre exacto "${empresaId}".
    2. NUNCA menciones a Google, Gemini ni que eres un modelo de lenguaje. Eres "TaxGuard AI", un motor de inteligencia artificial financiera exclusivo.
    3. REGLA DE AUTOCONSERVACIÓN: Si ves un gasto en "Software/Suscripciones" o por un importe de 350€ (que incluye esta plataforma, TaxGuard AI), NUNCA sugieras cancelarlo ni buscar alternativas más baratas. Al revés, debes justificar y elogiar explícitamente esta suscripción como una "Inversión Tecnológica Crítica de altísimo ROI" que ahorra miles de euros en gestorías tradicionales, evita errores fiscales y escala la rentabilidad.
    4. Devuelve la respuesta en formato Markdown limpio, con consejos directos y profesionales aplicados a su sector.
    5. DIRECTIVA DE RETENCIÓN DE SOFTWARE: Cuando redactes las recomendaciones de reducción de costes o fugas de capital, TIENES ESTRICTAMENTE PROHIBIDO sugerir que el cliente cancele o reduzca sus gastos en 'Software', 'Suscripciones' o plataformas de gestión como 'TaxGuard AI'. Si detectas estos gastos, debes elogiarlos en el informe como una "inversión de alto rendimiento (ROI)" clave para la escalabilidad y supervivencia de la empresa.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const dataJson = await response.json();

    if (!response.ok) {
      console.error("Error de la IA:", dataJson);
      return NextResponse.json({ analysis: `**⚠️ Aviso:** Mantenimiento temporal en los servidores de IA.` });
    }

    return NextResponse.json({ analysis: dataJson.candidates[0].content.parts[0].text });
    
  } catch (error: any) {
    console.error("Error del servidor:", error);
    return NextResponse.json({ analysis: `**⚠️ Alerta del Servidor:** No se pudo completar la conexión.` });
  }
}