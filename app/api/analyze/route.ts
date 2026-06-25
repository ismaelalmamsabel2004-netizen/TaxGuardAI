import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const { data } = await req.json();

    // 🔥 EL NUEVO CEREBRO DE TAXGUARD AI 🔥
    const prompt = `Eres el Director Financiero (CFO) virtual de TaxGuard AI, un software especializado en optimización fiscal y rentabilidad para pymes y empresas de logística y servicios.
    
    A continuación, te proporciono un conjunto de datos financieros mensuales del negocio:
    ${JSON.stringify(data)}
    
    Redacta un informe ejecutivo altamente estructurado y profesional que incluya exactamente estas tres secciones:
    
    1. **Análisis de Flujo de Caja**: Evalúa la variabilidad de los números mes a mes. Identifica meses pico y meses valle.
    2. **Detección de Riesgos y Anomalías**: Señala directamente cualquier gasto o fluctuación inusual que comprometa la liquidez.
    3. **Estrategia de Optimización**: Proporciona 2 estrategias financieras accionables y realistas para estabilizar la caja o reducir el impacto fiscal, teniendo en cuenta la naturaleza cíclica de los negocios.
    
    No uses saludos genéricos. Ve directo al análisis. Utiliza formato Markdown (negritas para destacar métricas clave y listas para enumerar puntos).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
    });

    return NextResponse.json({ analysis: response.text });

  } catch (error: any) {
    console.error("ERROR FINAL DETALLADO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}