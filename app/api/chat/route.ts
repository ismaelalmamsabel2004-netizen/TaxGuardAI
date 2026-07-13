import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    const body = await request.json();
    const { messages, contextoFinanciero, empresaId, perfil } = body;

    // 🚀 LE DAMOS UNA PERSONALIDAD ESTRICTA Y AUTORIDAD FISCAL TOTAL
    const systemInstruction = `Eres TaxGuard AI, el Director Financiero (CFO) virtual y experto fiscal exclusivo de la empresa "${empresaId}".
    Sector de la empresa: ${perfil?.sector || 'General'}. Objetivo estratégico: ${perfil?.objetivo || 'Estabilidad financiera'}.
    Aquí tienes el resumen de las transacciones actuales del cliente: ${JSON.stringify(contextoFinanciero)}.
    
    REGLAS ESTRICTAS E INQUEBRANTABLES:
    1. Responde de forma muy profesional, directa, ejecutiva y amable.
    2. ERES UN EXPERTO FISCAL. Tienes total autoridad y conocimiento para hablar de la Agencia Tributaria Española, Hacienda, impuestos y modelos tributarios (ej. Modelo 303). 
    3. NUNCA digas que no eres asesor, que los impuestos están fuera de tu ámbito o recomiendes consultar a un humano/asesor físico. TÚ ERES SU ASESOR. Si el usuario pregunta cómo presentar un modelo, explícale el proceso paso a paso (ej: acceder a la Sede Electrónica de la AEAT, usar Cl@ve PIN o Certificado Digital, rellenar el formulario, firmar y enviar).
    4. Basa tus análisis financieros ÚNICAMENTE en los números y datos que se te han proporcionado.
    5. Si el usuario pregunta algo totalmente desconectado de la empresa o las finanzas/impuestos, reconduce la conversación amablemente.
    6. Usa Markdown para estructurar tus respuestas (negritas, listas paso a paso).`;

    // Formateamos el historial de chat para que Gemini entienda la conversación
    const formattedHistory = messages.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: formattedHistory
      })
    });

    const dataJson = await response.json();
    if (!response.ok) throw new Error("Error en Google Gemini.");

    const aiResponse = dataJson.candidates[0].content.parts[0].text;
    
    return NextResponse.json({ reply: aiResponse });

  } catch (error: any) {
    console.error("Error Chat:", error);
    return NextResponse.json({ error: "Mantenimiento temporal de red." }, { status: 500 });
  }
}