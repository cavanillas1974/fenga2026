import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const params = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });
    const prompt = params._overridePrompt || buildPrompt(params);

    const modelos = [
      "imagen-4.0-ultra-generate-001",
      "imagen-4.0-generate-001",
    ];

    for (const model of modelos) {
      try {
        const response = await ai.models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "4:3",
            outputMimeType: "image/png",
          },
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) throw new Error("No image bytes");

        console.log(`✅ Imagen generada con ${model}`);
        return NextResponse.json({
          images: [`data:image/png;base64,${imageBytes}`],
        });
      } catch (err: any) {
        console.warn(`${model} falló: ${err.message}`);
      }
    }

    throw new Error("Todos los modelos fallaron");
  } catch (err: any) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildPrompt(params: any): string {
  const { description, style, materials, dimensions } = params;
  const c = params.componentes || {};

  const styleMap: Record<string, string> = {
    industrial:  "industrial raw steel aesthetic, exposed hardware, factory loft environment",
    minimalista: "ultra minimal clean design, pure white surfaces, Scandinavian aesthetic, lots of negative space",
    moderno:     "contemporary modern design, sleek glossy surfaces, geometric precision, high-end showroom environment",
    corporativo: "professional corporate design, premium neutral palette, structured grid, executive office environment",
    retail:      "retail point of sale display, commercial, high visibility, bright store environment, strategic lighting",
    premium:     "luxury premium design, high-gloss lacquer, brushed gold accents, upscale boutique environment",
  };

  const styleDesc = styleMap[style] || "modern professional design, clean contemporary aesthetic";
  const matDesc = materials?.length ? `Primary materials: ${materials.join(", ")}.` : "";
  const dimDesc = dimensions?.width ? `Exact dimensions: ${dimensions.width}cm wide × ${dimensions.height}cm tall × ${dimensions.depth || "45"}cm deep.` : "";

  // Build component-specific description
  const compParts: string[] = [];
  if (c.cajones > 0) compParts.push(`${c.cajones} drawer${c.cajones > 1 ? "s" : ""}`);
  if (c.puertas > 0) compParts.push(`${c.puertas} ${c.tipoPuerta || "hinged"} door${c.puertas > 1 ? "s" : ""}`);
  if (c.repisas > 0) compParts.push(`${c.repisas} ${c.repisasAjustables ? "adjustable " : ""}shelf/shelves`);
  if (c.iluminacionLED) compParts.push(c.tipLED === "tira_rgb" ? "integrated RGB LED strip lighting" : c.tipLED === "empotrada" ? "recessed LED lighting" : "integrated warm LED strip lighting");
  if (c.espejo) compParts.push("mirror panel");
  if (c.vidrio) compParts.push("tempered glass panel");
  if (c.ruedas) compParts.push("casters/wheels");
  if (!c.backpanel) compParts.push("open back structure");

  const compDesc = compParts.length
    ? `Featuring: ${compParts.join(", ")}.`
    : "";

  // When logo analysis is available, inject the AI-generated brand description into the prompt
  // so Imagen 4 renders the actual brand visuals natively on the furniture surface.
  // Fallback: ask for a generic BRAND placeholder if only a raw logo was uploaded.
  const logoNote = params.logoAnalysis?.promptDescription
    ? `CRITICAL BRANDING REQUIREMENT: On the most prominent front-facing surface of this furniture, render a professional BRAND PANEL that displays: ${params.logoAnalysis.promptDescription}. The panel must be clearly visible, realistic, and rendered as if printed or applied directly to the furniture surface with correct lighting, perspective, and material finish.`
    : params.logoBase64
    ? "IMPORTANT: On the most prominent front-facing panel or upper face of this furniture, include a clearly visible rectangular BRAND SIGN/PANEL with the word 'BRAND' printed on it in bold letters, with a slightly contrasting background color so it stands out."
    : "";

  // Budget tier visual hint: makes the render match the actual price level
  const tierNote = params.promptTier ? `Quality and finish level: ${params.promptTier}.` : "";

  return `MAXIMUM QUALITY — Ultra-realistic commercial product photography, 8K resolution, print-ready. Photorealistic 3D render of ${description}. ${styleDesc}. ${compDesc} ${matDesc} ${dimDesc} ${tierNote} ${logoNote} Studio lighting with soft shadows, ultra-detailed materials and textures, architectural visualization style, commercial photography quality, no people, clean neutral background, sharp focus on product, HDR, ray-traced reflections, cinematic composition, complete furniture piece shown.`.trim();
}
