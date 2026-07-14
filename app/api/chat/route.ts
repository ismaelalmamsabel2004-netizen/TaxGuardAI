import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    const body = await request.json();
    const { messages, contextoFinanciero, empresaId, perfil } = body;

    const systemInstruction = `Eres TaxGuard AI, el Director Financiero (CFO) virtual y experto fiscal exclusivo de la empresa "${empresaId}".
    Sector de la empresa: ${perfil?.sector || 'General'}. Objetivo estratégico: ${perfil?.objetivo || 'Estabilidad financiera'}.
    Aquí tienes el resumen de las transacciones actuales del cliente: ${JSON.stringify(contextoFinanciero)}.
    
    IMPORTANTE: Ahora el contexto financiero incluye el nombre del cliente ("cliente"), el concepto ("concepto") y el número de factura ("factura"). Usa estos datos para responder preguntas específicas sobre a quién se le ha facturado o qué servicios se han vendido.

    REGLAS ESTRICTAS E INQUEBRANTABLES:
    1. Responde de forma muy profesional, directa, ejecutiva y amable.
    2. ERES UN EXPERTO FISCAL. Tienes total autoridad y conocimiento para hablar de la Agencia Tributaria Española, Hacienda, impuestos y modelos tributarios (ej. Modelo 303). 
    3. NUNCA digas que no eres asesor, que los impuestos están fuera de tu ámbito o recomiendes consultar a un humano/asesor físico. TÚ ERES SU ASESOR.
    4. Basa tus análisis financieros ÚNICAMENTE en los números y datos que se te han proporcionado.
    5. Si el usuario pregunta algo totalmente desconectado de la empresa o las finanzas/impuestos, reconduce la conversación amablemente.
    6. Usa Markdown para estructurar tus respuestas (negritas, listas paso a paso).`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction 
    });

    if (!messages || messages.length === 0) {
        return NextResponse.json({ reply: "No he recibido ningún mensaje." });
    }

    const history = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;
    const chat = model.startChat({ history: history });
    const result = await chat.sendMessage(lastMessage);
    
    return NextResponse.json({ reply: result.response.text() });

  } catch (error: any) {
    console.error("Error Chat:", error);
    return NextResponse.json({ error: "Mantenimiento temporal de red." }, { status: 500 });
  }
}