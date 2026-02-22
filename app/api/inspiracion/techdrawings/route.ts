/**
 * Technical Drawings Generator — Fenga Inspiración
 *
 * Generates 7 mechanical/technical blueprint images for a furniture design:
 * front, side, top, section, isometric, exploded view, assembly manual.
 * Each image is a professional engineering illustration with measurement annotations.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 240;

interface DrawingSpec {
  view:   string;
  label:  string;
  prompt: string;
}

function buildDrawingSpecs(config: any): DrawingSpec[] {
  const { type, style, dimensions: d, components, materials } = config;
  const W = d?.width ?? 120;
  const H = d?.height ?? 80;
  const P = d?.depth ?? 50;
  const comps = (components as string[])?.join(", ") || "shelves";
  const mats  = (materials  as string[])?.join(", ") || "MDF";
  const base  = `${type}, ${style} style, ${W}×${H}×${P}cm, materials: ${mats}`;

  return [
    {
      view:  "Alzado Frontal",
      label: "Vista Frontal — Cotas generales",
      prompt: `TECHNICAL MANUFACTURING BLUEPRINT — Front elevation (ALZADO FRONTAL) of a ${base}. White paper background, precision black lines. Shows exact width ${W}cm and height ${H}cm with professional dimension annotation lines, arrows and labels in cm. Features: ${comps}. Orthographic projection, CAD engineering quality, furniture factory blueprint. Panel thickness 18mm shown. No perspective, flat technical view.`,
    },
    {
      view:  "Alzado Lateral",
      label: "Vista Lateral — Profundidad",
      prompt: `TECHNICAL MANUFACTURING BLUEPRINT — Right side elevation (ALZADO LATERAL DERECHO) of a ${base}. White paper background, precision black lines. Shows exact depth ${P}cm and height ${H}cm with dimension annotation arrows. Side view reveals interior structure, shelf depths, back panel, door/drawer profile. Orthographic side projection, CAD quality, furniture manufacturing drawing.`,
    },
    {
      view:  "Vista en Planta",
      label: "Planta Superior — Distribución",
      prompt: `TECHNICAL MANUFACTURING BLUEPRINT — Top plan view (VISTA EN PLANTA) of a ${base}. White paper background, black precision lines. Bird's eye overhead orthographic projection. Shows ${W}cm width × ${P}cm depth with dimension lines. Reveals top surface, internal shelf layout, door swing arcs if applicable. Professional furniture floor plan drawing, CAD quality.`,
    },
    {
      view:  "Sección Transversal",
      label: "Sección A-A — Estructura interior",
      prompt: `TECHNICAL MANUFACTURING BLUEPRINT — Cross-section cut A-A (SECCIÓN TRANSVERSAL) of a ${base}. White paper background. Vertical cut through center reveals interior: panel thickness 18mm with hatching, shelf positions with spacing dimensions, drawer cavity heights, back panel 3mm. Dimension arrows for all interior compartments. Black and white engineering section drawing, professional furniture manufacturing.`,
    },
    {
      view:  "Vista Isométrica",
      label: "Isométrico 3D — Dimensiones en 3 ejes",
      prompt: `TECHNICAL MANUFACTURING BLUEPRINT — 3D isometric technical drawing of a ${base}. White paper background, black line art. 30-degree isometric projection showing all three faces simultaneously. Dimension annotations on X axis (${W}cm), Y axis (${H}cm), Z axis (${P}cm). Shows ${comps}. Professional technical isometric illustration, no shading, just precision lines and measurements.`,
    },
    {
      view:  "Despiece Explosionado",
      label: "Vista Explosionada — Todas las piezas",
      prompt: `TECHNICAL MANUFACTURING BLUEPRINT — Exploded isometric view (VISTA EXPLOSIONADA) of a ${base}. White background. All individual panels and components separated and floating to show assembly order: 1-Top panel, 2-Left side panel, 3-Right side panel, 4-Back panel, 5-Bottom panel, 6-Shelves, 7-Doors/Drawers, 8-Hardware. Each part labeled with number and name. Dashed leader lines showing assembly direction. Professional furniture manufacturing exploded diagram.`,
    },
    {
      view:  "Manual de Fabricación",
      label: "Pasos de Fabricación — Secuencia completa",
      prompt: `TECHNICAL MANUFACTURING INSTRUCTION SHEET (MANUAL DE FABRICACIÓN) for a ${base}. White background. Grid layout with 6 numbered illustrated steps: Step 1: Cut panels to size (diagram showing panel with dimensions), Step 2: Drill hardware holes (drill positions marked), Step 3: Apply edge banding (edge detail), Step 4: Mount hardware hinges/slides (hardware diagram), Step 5: Assembly sequence (cabinet taking shape), Step 6: Final adjustment and quality check. Each step in its own bordered box with number, title and black line diagram. Professional furniture assembly instruction sheet.`,
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { config } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });
    const specs = buildDrawingSpecs(config);

    const modelos = [
      "imagen-4.0-ultra-generate-001",
      "imagen-4.0-generate-001",
    ];

    // Generate all 7 drawings in parallel — allSettled so partial results are returned
    const results = await Promise.allSettled(
      specs.map(async (spec) => {
        for (const model of modelos) {
          try {
            const response = await ai.models.generateImages({
              model,
              prompt: spec.prompt,
              config: {
                numberOfImages: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png",
              },
            });
            const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (!imageBytes) throw new Error("No image bytes");
            return {
              view:  spec.view,
              label: spec.label,
              image: `data:image/png;base64,${imageBytes}`,
            };
          } catch (err: any) {
            console.warn(`${model} → ${spec.view} failed: ${err.message}`);
          }
        }
        throw new Error(`All models failed for ${spec.view}`);
      })
    );

    const drawings = results
      .filter((r): r is PromiseFulfilledResult<{ view: string; label: string; image: string }> => r.status === "fulfilled")
      .map(r => r.value);

    console.log(`✅ Generated ${drawings.length}/${specs.length} technical drawings`);
    return NextResponse.json({ drawings });
  } catch (err: any) {
    console.error("inspiracion/techdrawings error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
