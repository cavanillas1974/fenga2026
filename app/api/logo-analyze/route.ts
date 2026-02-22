/**
 * Logo Analysis API — Fenga
 *
 * Gemini Vision decodes an uploaded brand logo and returns a structured JSON
 * descriptor that Imagen 4 Ultra can use to render the logo directly on the
 * furniture as part of the scene — with correct lighting, perspective and material.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 30;

export interface LogoAnalysis {
  /** Primary brand colors as hex values */
  colors: string[];
  /** Background color/style of the logo */
  bgColor: string;
  /** Any text visible in the logo */
  text: string;
  /** Dominant shape elements (icon, symbol, letterform) */
  shapes: string;
  /** Overall visual style */
  style: string;
  /**
   * Ready-to-inject English description for Imagen 4 Ultra prompt.
   * Describes what the brand panel on the furniture should look like —
   * specific enough for the model to approximate the logo visually.
   */
  promptDescription: string;
}

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  try {
    const { logoBase64 } = await req.json();

    const imageData = logoBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageData,
            },
          },
          {
            text: `You are a visual branding analyst. Analyze this brand logo image in extreme detail and return a JSON descriptor that will be used to instruct an image generation model (Imagen 4 Ultra) to render this exact logo on a piece of furniture.

Return ONLY valid JSON, no markdown:
{
  "colors": ["#hex1 description", "#hex2 description"],
  "bgColor": "transparent | white | #hex description",
  "text": "exact text visible in the logo",
  "shapes": "detailed description of icons, symbols, letterforms, shapes",
  "style": "modern/minimalist/industrial/luxury/etc",
  "promptDescription": "A rectangular brand panel on the furniture displaying: [complete visual description of the logo as it would appear printed/engraved on the furniture surface — include colors, text, icon placement, proportions, and style — written as a directive for an image generation AI, in English, max 60 words]"
}

Be very precise about colors, typography weight, icon shape, and relative proportions. The promptDescription must be specific enough for an AI image generator to recreate a recognizable approximation of this logo on a furniture surface.`,
          },
        ],
      }],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON from logo analyzer");

    const analysis: LogoAnalysis = JSON.parse(match[0]);
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("logo-analyze error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
