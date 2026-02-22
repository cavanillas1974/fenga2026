/**
 * Smart Image Edit API — Fenga
 * Step 1: Gemini Vision analyzes current render → detailed furniture description
 * Step 2: Builds a targeted "preserve + change" prompt
 * Step 3: Imagen 4 Ultra regenerates with surgical precision
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 120;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, changeRequest, params } = await req.json();

    if (!imageBase64 || !changeRequest) {
      return NextResponse.json({ error: "imageBase64 and changeRequest required" }, { status: 400 });
    }

    // Strip data URL prefix to get raw base64
    const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    // ─── PASO 1: Gemini Vision analiza el render actual ────────────────────────
    const analysisRes = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: rawBase64,
            },
          },
          {
            text: `You are a senior furniture design expert and photographic art director.
Analyze this furniture render image in extreme detail. Your description will be used to recreate the same piece with ONLY ONE specific change.

Describe with maximum precision:
1. FURNITURE TYPE: exact type (shelf, cabinet, wardrobe, counter, etc.)
2. DIMENSIONS: approximate proportions (tall/wide/deep ratio)
3. STRUCTURE: number and position of shelves, drawers, doors, compartments
4. MATERIALS: exact finish (matte, gloss, wood grain, metal, etc.), colors with hex approximations
5. STYLE: design language (industrial, minimalist, modern, etc.)
6. HARDWARE: hinges, handles, legs, any visible hardware
7. LIGHTING: studio setup, shadows, reflections
8. BACKGROUND: color, environment
9. CAMERA ANGLE: perspective, distance, focal length feel
10. SPECIAL FEATURES: LED lighting, glass, mirror, casters, etc.

Be extremely specific. Use millimeter-level descriptions when possible. This description must allow an AI to regenerate the EXACT same furniture.`,
          },
        ],
      }],
    });

    const furnitureDescription = analysisRes.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!furnitureDescription) {
      throw new Error("Could not analyze image");
    }

    console.log("Furniture analysis:", furnitureDescription.slice(0, 200));

    // ─── PASO 2: Construir prompt quirúrgico ────────────────────────────────────
    const styleMap: Record<string, string> = {
      industrial:  "industrial raw steel aesthetic, factory loft environment",
      minimalista: "ultra minimal clean design, Scandinavian aesthetic",
      moderno:     "contemporary modern design, sleek glossy surfaces, showroom",
      corporativo: "professional corporate design, executive office environment",
      retail:      "retail point of sale display, bright store environment",
      premium:     "luxury premium design, brushed gold accents, boutique",
    };
    const styleDesc = styleMap[params?.style] || "modern professional design";

    const refinedPrompt = `MAXIMUM QUALITY — Ultra-realistic commercial product photography, 8K resolution, print-ready.

PRESERVE EXACTLY — Do NOT change any of the following elements:
${furnitureDescription}

APPLY ONLY THIS SPECIFIC CHANGE:
${changeRequest}

All other elements (structure, dimensions, position, materials not mentioned in the change, camera angle, lighting setup, background) must remain IDENTICAL to the description above.

${styleDesc}. Studio lighting with soft shadows, ultra-detailed materials and textures, architectural visualization style, no people, sharp focus on product, HDR, ray-traced reflections, cinematic composition.`.trim();

    console.log("Refined prompt length:", refinedPrompt.length);

    // ─── PASO 3: Imagen 4 Ultra con prompt quirúrgico ──────────────────────────
    const modelos = [
      "imagen-4.0-ultra-generate-001",
      "imagen-4.0-generate-001",
    ];

    for (const model of modelos) {
      try {
        const response = await ai.models.generateImages({
          model,
          prompt: refinedPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "4:3",
            outputMimeType: "image/png",
          },
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) throw new Error("No image bytes");

        console.log(`✅ Edited image generated with ${model}`);
        return NextResponse.json({
          image: `data:image/png;base64,${imageBytes}`,
          analysis: furnitureDescription.slice(0, 300),
        });
      } catch (err: any) {
        console.warn(`${model} failed: ${err.message}`);
      }
    }

    throw new Error("All models failed");
  } catch (err: any) {
    console.error("Edit error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
