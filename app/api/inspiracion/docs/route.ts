import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { config } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Actúa como un Ingeniero de Diseño Industrial Senior especializado en fabricación de mobiliario.
Genera documentación técnica de producción detallada para este mueble:

Tipo: ${config.type}
Estilo: ${config.style}
Materiales: ${config.materials.join(", ")}
Dimensiones: ${config.dimensions.width}×${config.dimensions.height}×${config.dimensions.depth} cm
Presupuesto: $${config.budget} USD
Componentes: ${config.components.join(", ")}
Descripción adicional: ${config.description}

Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones:
{
  "plans": [
    {"view": "Elevación Frontal", "description": "descripción técnica", "dimensions": "120×75 cm"},
    {"view": "Elevación Lateral", "description": "...", "dimensions": "..."},
    {"view": "Planta", "description": "...", "dimensions": "..."},
    {"view": "Detalle de Unión", "description": "...", "dimensions": "..."}
  ],
  "cutList": [
    {"part": "nombre de la pieza", "material": "material", "dimensions": "largo×ancho×espesor cm", "quantity": 1}
  ],
  "hardware": [
    {"item": "nombre", "quantity": 1, "purpose": "uso específico"}
  ],
  "assemblySteps": ["Paso detallado 1", "Paso detallado 2"],
  "quotation": [
    {"item": "concepto", "cost": 0.0}
  ],
  "totalEstimatedCost": 0.0
}

Sé muy específico: nombres reales de herrajes (correderas telescópicas de 45kg, bisagras de cazoleta 35mm, minifix 15mm), dimensiones precisas, pasos de ensamble profesionales, costos en USD realistas.`,
        }],
      }],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON from docs generator");

    const docs = JSON.parse(match[0]);
    return NextResponse.json(docs);
  } catch (err: any) {
    console.error("inspiracion/docs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
