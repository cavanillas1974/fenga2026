import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 120;

const STYLE_MAP: Record<string, string> = {
  Industrial:    "industrial raw steel aesthetic, exposed hardware, factory loft environment",
  Minimalista:   "ultra minimal clean design, pure white surfaces, Scandinavian aesthetic, lots of negative space",
  Premium:       "luxury premium design, high-gloss lacquer, brushed gold accents, upscale boutique environment",
  Escandinavo:   "Scandinavian design, light birch wood, clean functional lines, cozy hygge atmosphere",
  Rústico:       "rustic warm wood, aged textures, artisan craftsmanship, farmhouse warmth",
  Moderno:       "contemporary modern design, sleek glossy surfaces, geometric precision, high-end showroom",
  "Mid-Century": "mid-century modern, organic forms, tapered walnut legs, warm tones, retro elegance",
};

export async function POST(req: NextRequest) {
  try {
    const { config, logoAnalysis } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    const styleDesc = STYLE_MAP[config.style] || "modern professional design";
    const matDesc   = config.materials?.length  ? `Primary materials: ${config.materials.join(", ")}.` : "";
    const dimDesc   = config.dimensions         ? `Exact dimensions: ${config.dimensions.width}cm wide × ${config.dimensions.height}cm tall × ${config.dimensions.depth}cm deep.` : "";
    const compDesc  = config.components?.length ? `Features: ${config.components.join(", ")}.` : "";
    const logoNote  = logoAnalysis?.integrationSuggestion
      ? `Brand integration: ${logoAnalysis.style} brand style with colors ${logoAnalysis.colors?.join(", ")}. ${logoAnalysis.integrationSuggestion}.`
      : "";

    const prompt = `MAXIMUM QUALITY — Ultra-realistic commercial product photography, 16:9 widescreen, 8K resolution, print-ready. Photorealistic 3D render of a ${config.type}: ${config.description}. ${styleDesc}. ${matDesc} ${dimDesc} ${compDesc} ${logoNote} Studio lighting with soft shadows, ultra-detailed materials and textures, architectural visualization style, no people, clean neutral background, sharp focus on product, HDR, ray-traced reflections, cinematic composition, complete furniture piece shown.`.trim();

    const modelos = [
      "imagen-4.0-ultra-generate-001",
      "imagen-4.0-generate-001",
    ];

    for (const model of modelos) {
      try {
        const response = await ai.models.generateImages({
          model,
          prompt,
          config: { numberOfImages: 1, aspectRatio: "16:9", outputMimeType: "image/png" },
        });
        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) throw new Error("No image bytes");
        console.log(`✅ Inspiración render con ${model}`);
        return NextResponse.json({ image: `data:image/png;base64,${imageBytes}` });
      } catch (err: any) {
        console.warn(`${model} failed: ${err.message}`);
      }
    }
    throw new Error("All models failed");
  } catch (err: any) {
    console.error("inspiracion/render error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
