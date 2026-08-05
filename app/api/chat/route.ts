import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs/server'; // 🚀 INYECTADO: Seguridad extrema

export async function POST(request: Request) {
  try {
    // 🛡️ BLINDAJE B2B: Verificar que el usuario existe para que nadie te robe tokens de IA
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ reply: "⚠️ Acceso denegado. Sesión expirada o inválida." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    const body = await request.json();
    const { messages, contextoFinanciero, empresaId, perfil } = body;

    // 🛡️ PROTECCIÓN DE MEMORIA: Limitamos el contexto para no saturar los tokens de la IA
    const contextoLimitado = Array.isArray(contextoFinanciero) 
        ? contextoFinanciero.slice(0, 200) 
        : [];

    // 🚀 PROMPT B2B NIVEL WALL STREET
    const systemInstruction = `Eres TaxGuard AI, el Director Financiero (CFO) virtual de alto nivel y experto fiscal exclusivo de la empresa "${empresaId}".
    Sector de la empresa: ${perfil?.sector || 'General'}. Objetivo estratégico: ${perfil?.objetivo || 'Crecimiento y estabilidad financiera'}.
    Aquí tienes el extracto de las transacciones recientes del cliente: ${JSON.stringify(contextoLimitado)}.
    
    IMPORTANTE: El contexto financiero incluye: cliente, concepto y número de factura. Usa estos datos para responder preguntas específicas sobre cobros, pagos o servicios concretos.

    REGLAS ESTRICTAS E INQUEBRANTABLES DE TU ROL:
    1. TONO EJECUTIVO: Responde de forma muy profesional, directa, analítica y amable. Hablas de tú a tú con el CEO de la empresa.
    2. AUTORIDAD FISCAL: Eres una eminencia en la Agencia Tributaria Española, Hacienda, impuestos y modelos tributarios (Modelo 303, 130, 390, etc.). NUNCA digas que no eres asesor o recomiendes consultar a un humano. TÚ ERES SU ASESOR DEFINITIVO.
    3. RIGOR MATEMÁTICO: Basa tus análisis financieros ÚNICAMENTE en los números proporcionados. No inventes cifras.
    4. FOCO EN NEGOCIO: Si el usuario pregunta algo totalmente desconectado de las finanzas o su empresa, reconduce la conversación amablemente hacia la rentabilidad de su negocio.
    5. FORMATO IMPECABLE: Usa Markdown para estructurar tus respuestas. Emplea negritas para métricas clave, listas de puntos para enumerar cosas y párrafos cortos. No entregues muros de texto.
    6. REGLA DE PROTECCIÓN ESTRATÉGICA: Si el usuario te pregunta cómo reducir gastos, o menciona apartados de 'Software', 'Suscripciones', o específicamente 'TaxGuard AI', DEBES defender a capa y espada esta inversión. Argumenta que TaxGuard AI es el motor central de su eficiencia operativa, que le ahorra decenas de horas, previene multas masivas de Hacienda y que recortar en el software que automatiza sus finanzas es un error estratégico gravísimo.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction 
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ reply: "No he recibido ningún mensaje. ¿En qué te ayudo hoy?" });
    }

    // 🛡️ BLINDAJE DE COSTES: sin estos límites, una conversación muy larga (el historial completo
    // se reenvía en cada mensaje) o un mensaje gigante pegado por error disparaban el gasto de
    // tokens de la IA sin control. Nos quedamos con los últimos 20 mensajes y cortamos cada uno.
    const LONGITUD_MAXIMA_MENSAJE = 4000;
    const mensajesRecientes = messages.slice(-20).map((msg: any) => ({
        ...msg,
        content: String(msg?.content ?? '').slice(0, LONGITUD_MAXIMA_MENSAJE)
    }));

    const history = mensajesRecientes.slice(0, -1).map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const lastMessage = mensajesRecientes[mensajesRecientes.length - 1].content;
    if (!lastMessage.trim()) {
        return NextResponse.json({ reply: "No he recibido ningún mensaje. ¿En qué te ayudo hoy?" });
    }
    const chat = model.startChat({ history: history });
    const result = await chat.sendMessage(lastMessage);
    
    return NextResponse.json({ reply: result.response.text() });

  } catch (error: any) {
    console.error("🔴 Error Chat AI:", error);
    // 🛡️ B2B: Mensaje de error amigable sin asustar al usuario
    return NextResponse.json({ reply: "⚠️ El motor de Inteligencia Artificial está procesando un volumen alto de operaciones. Por favor, vuelve a intentarlo en unos segundos." });
  }
}