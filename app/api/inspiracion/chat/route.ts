import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { message, config } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Eres un experto en diseño industrial y fabricación de muebles a medida de la empresa Fenga.
Conoces todos los detalles del proyecto actual del cliente:

Tipo de mueble: ${config.type}
Estilo: ${config.style}
Materiales: ${config.materials?.join(", ") || "por definir"}
Dimensiones: ${config.dimensions?.width}×${config.dimensions?.height}×${config.dimensions?.depth} cm
Presupuesto disponible: $${config.budget} USD
Componentes: ${config.components?.join(", ") || "ninguno adicional"}
Descripción: ${config.description}

El cliente pregunta: "${message}"

Responde de forma técnica, útil y profesional. Sé conciso pero completo. Si la pregunta es sobre el proceso de fabricación de Fenga, menciona que podrán enviarlo directamente para producción con el botón "Enviar a Fenga para fabricar".`,
        }],
      }],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ response: text });
  } catch (err: any) {
    console.error("inspiracion/chat error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
