import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    const body = await request.json();
    const { messages, contextoFinanciero, empresaId, perfil } = body;

    // 🚀 LE DAMOS UNA PERSONALIDAD ESTRICTA A LA IA
    const systemInstruction = `Eres TaxGuard AI, el Director Financiero (CFO) virtual y exclusivo de la empresa "${empresaId}".
    Sector de la empresa: ${perfil?.sector || 'General'}. Objetivo estratégico: ${perfil?.objetivo || 'Estabilidad financiera'}.
    Aquí tienes el resumen de las transacciones actuales del cliente: ${JSON.stringify(contextoFinanciero)}.
    
    REGLAS ESTRICTAS:
    1. Responde de forma muy profesional, directa, ejecutiva y amable.
    2. Basa tus respuestas ÚNICAMENTE en los números y datos que se te han proporcionado.
    3. Si el usuario pregunta algo no relacionado con finanzas o su negocio, dile amablemente que tu función es estrictamente financiera.
    4. Usa Markdown para poner en negrita números clave o hacer listas si es necesario.`;

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