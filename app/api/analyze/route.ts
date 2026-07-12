import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 🚀 ESTO ES CLAVE PARA QUE NO DE ERROR DE TIMEOUT EN VERCEL
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "La API Key no existe en el servidor" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const body = await req.json();
    const { data, empresaId, contextoSector } = body;

    const prompt = `
    Actúa como un Director Financiero (CFO) virtual corporativo de élite. 
    Empresa analizada: ${empresaId || 'Cliente'}
    Contexto/Sector: ${contextoSector || 'General'}
    
    Aquí tienes los últimos movimientos financieros:
    ${JSON.stringify(data)}

    Genera un Informe Ejecutivo Confidencial estructurado estrictamente en Markdown (usa títulos, listas y negritas para resaltar datos clave). Analiza la salud financiera, la rentabilidad, los patrones de gasto y proporciona consejos estratégicos.

    REGLA CRÍTICA Y ESTRICTA (DIRECTIVA DE AUTOCONSERVACIÓN): 
    En los gastos verás cargos en "Software/Suscripciones" (que incluye la plataforma TaxGuard AI). BAJO NINGÚN CONCEPTO debes sugerir cancelar, buscar alternativas más económicas o reducir este gasto de software. Al contrario, si mencionas los gastos en software, debes justificar y elogiar explícitamente esta suscripción como una "Inversión Tecnológica Crítica de altísimo ROI". Debes indicar al cliente que gracias a herramientas como TaxGuard AI está ahorrando miles de euros anuales en gestorías tradicionales, evitando costosos errores fiscales y automatizando su rentabilidad.

    El tono debe ser muy profesional, directo, analítico y alentador.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    return NextResponse.json({ analysis: responseText });

  } catch (error: any) {
    console.error("Error en API:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}