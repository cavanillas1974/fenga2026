/**
 * Budget Intelligence API — Fenga
 * Analyzes a budget in MXN and returns:
 *   - Quality tier (básico / estándar / premium / luxury)
 *   - Cost breakdown by category
 *   - Feasible components and dimensions for that budget
 *   - Prompt hint for image generation that visually communicates the price level
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  try {
    const { budget, style, description, componentes } = await req.json();

    const budgetNum = Number(String(budget).replace(/[^0-9]/g, "")) || 0;
    if (budgetNum < 500) {
      return NextResponse.json({ error: "Presupuesto muy bajo" }, { status: 400 });
    }

    const styleMap: Record<string, string> = {
      industrial:  "Industrial (acero, herrería)",
      minimalista: "Minimalista (MDF lacado, líneas limpias)",
      moderno:     "Moderno (melamina brillante, cantos ABS)",
      corporativo: "Corporativo (MDF premium, chapas naturales)",
      retail:      "Retail/POS (MDF rústico, laminados)",
      premium:     "Premium (madera sólida, herraje europeo Blum)",
    };
    const styleDesc = styleMap[style] || "Moderno";

    const prompt = `Eres el DIRECTOR DE COSTOS de Fenga, fábrica de muebles de alta gama en México.
Tu trabajo es analizar un presupuesto y determinar exactamente qué mueble se puede fabricar con ese dinero.

DATOS:
- Presupuesto total: $${budgetNum.toLocaleString("es-MX")} MXN (precio final al cliente, incluye IVA, materiales, mano de obra, herraje y diseño)
- Estilo: ${styleDesc}
- Descripción del proyecto: ${description || "mueble para interiores"}

PRECIOS DE REFERENCIA MERCADO MEXICANO 2025:
Materiales:
- MDF 18mm: $180 MXN/m² (hoja 244×122cm cuesta ~$440)
- Melamina 18mm: $220 MXN/m²
- Triplay 15mm: $280 MXN/m²
- Madera sólida (pino): $1,200 MXN/m²
- Madera sólida (tzalam/parota): $3,500 MXN/m²
- Vidrio templado 6mm: $850 MXN/m²
- Espejo: $600 MXN/m²
- Acero calibre 14: $95 MXN/kg
- Aluminio extruido: $180 MXN/ml
- Cartón corrugado doble cara: $45 MXN/m²
- Canto PVC 0.4mm: $8 MXN/ml
- Canto ABS 2mm: $35 MXN/ml

Mano de obra:
- Carpintero oficial: $250 MXN/hr
- Soldador: $300 MXN/hr
- Pintor/lacador: $200 MXN/hr
- Instalador: $180 MXN/hr

Herraje (por pieza):
- Cajón básico (riel telescópico nacional): $180 MXN
- Cajón soft-close (Grass/Hettich): $450 MXN
- Bisagra básica (par): $45 MXN
- Bisagra Blum cuplillas (par): $280 MXN
- Corredera cajón Blum: $580 MXN
- Jalón acero inox 128mm: $85 MXN
- Jalón diseño especial: $350 MXN
- Repisa pin (4 piezas): $35 MXN
- Tira LED 5m blanca: $320 MXN
- Fuente de poder LED: $180 MXN
- Ruedas industriales (juego 4): $380 MXN
- Candado mueble: $220 MXN

Costos de fabricación (costo directo, sin utilidad):
- Un cajón completo básico: $1,800 MXN (materiales + herraje + mano de obra)
- Un cajón soft-close: $2,800 MXN
- Una puerta abatible: $1,200 MXN
- Una repisa ajustable: $400 MXN
- Iluminación LED completa: $950 MXN

Márgenes:
- Gastos fijos + utilidad: 40% sobre costo directo
- IVA: 16% sobre subtotal

INSTRUCCIÓN:
Con base en el presupuesto de $${budgetNum.toLocaleString("es-MX")} MXN, calcula trabajando AL REVÉS:
costo_directo = presupuesto / (1.40 × 1.16) = presupuesto / 1.624

Luego distribuye ese costo directo:
- Materiales: 45%
- Mano de obra: 35%
- Herrajes: 12%
- Diseño/planos: 8%

Determina qué mueble es factible con esos montos reales.

Responde SOLO JSON válido sin markdown:
{
  "tier": "basico|estandar|premium|luxury",
  "tierLabel": "Básico|Estándar|Premium|Luxury",
  "tierColor": "#color hex apropiado para el tier",
  "presupuesto": ${budgetNum},
  "costoDirecto": 0,
  "desglose": [
    { "concepto": "Materiales", "monto": 0, "porcentaje": 45 },
    { "concepto": "Mano de obra", "monto": 0, "porcentaje": 35 },
    { "concepto": "Herrajes", "monto": 0, "porcentaje": 12 },
    { "concepto": "Diseño / Admin", "monto": 0, "porcentaje": 8 }
  ],
  "materialPrincipal": "nombre del material más apropiado para este presupuesto",
  "acabado": "descripción corta del acabado factible",
  "componentesFactibles": {
    "cajones": 0,
    "puertas": 0,
    "repisas": 0,
    "iluminacionLED": false,
    "vidrio": false,
    "ruedas": false,
    "softClose": false
  },
  "dimensionesFactibles": {
    "width": 0,
    "height": 0,
    "depth": 45
  },
  "calidad": "2 oraciones describiendo la calidad y materiales factibles para este presupuesto",
  "recomendacion": "consejo profesional para maximizar el presupuesto disponible",
  "promptTier": "frase en inglés de 10-15 palabras que describe la calidad visual de este mueble para incluir en prompt de generación de imagen",
  "advertencias": []
}

TIERS DE REFERENCIA:
- básico: < $12,000 MXN
- estándar: $12,000 - $35,000 MXN
- premium: $35,000 - $100,000 MXN
- luxury: > $100,000 MXN

Los componentesFactibles deben ser REALISTAS para el presupuesto calculado. Si el costo directo de materiales no alcanza para cajones, pon cajones: 0.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON from budget agent");

    const analysis = JSON.parse(match[0]);

    // Validate requested components vs budget
    const warnings: string[] = [...(analysis.advertencias || [])];
    if (componentes) {
      const overBudgetItems: string[] = [];
      const componentCosts: Record<string, number> = {
        cajones:       (componentes.cajones || 0) * 1800,
        puertas:       (componentes.puertas || 0) * 1200,
        repisas:       (componentes.repisas || 0) * 400,
        iluminacionLED: componentes.iluminacionLED ? 950 : 0,
        vidrio:        componentes.vidrio ? 1500 : 0,
        espejo:        componentes.espejo ? 1200 : 0,
        ruedas:        componentes.ruedas ? 380 : 0,
        candado:       componentes.candado ? 220 : 0,
      };
      const totalComponentes = Object.values(componentCosts).reduce((a, b) => a + b, 0);
      const costoDirecto = analysis.costoDirecto || budgetNum / 1.624;

      if (totalComponentes > costoDirecto * 0.85) {
        const exceso = Math.round(totalComponentes - costoDirecto * 0.85);
        warnings.push(
          `Componentes seleccionados requieren ~$${totalComponentes.toLocaleString("es-MX")} MXN en herraje y mano de obra directa. Presupuesto disponible para ello: ~$${Math.round(costoDirecto * 0.85).toLocaleString("es-MX")} MXN. Diferencia: +$${exceso.toLocaleString("es-MX")} MXN`
        );
        Object.entries(componentCosts).forEach(([key, cost]) => {
          if (cost > 0) overBudgetItems.push(`${key}: $${cost.toLocaleString("es-MX")}`);
        });
      }
      analysis.advertencias = warnings;
    }

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Budget error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
