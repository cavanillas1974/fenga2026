/**
 * Brand Placement Detection API — Fenga
 * Uses Gemini Vision to detect the bounding box of the BRAND placeholder
 * panel on a furniture render so the client logo can be precisely composited.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  try {
    const { renderBase64 } = await req.json();

    // Strip data: prefix — Gemini expects raw base64
    const imageData = renderBase64.replace(/^data:image\/\w+;base64,/, "");

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
            text: `Analyze this furniture product render. Find the rectangular BRAND sign, logo panel, or brand placeholder area that says "BRAND" (or similar brand placeholder) on the furniture surface.

Return ONLY valid JSON — no markdown, no explanation:
{"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0}

Where x, y is the top-left corner of the brand panel and width, height are its dimensions — all as normalized fractions from 0.0 to 1.0 of the total image dimensions.

If you cannot find a brand area, return the best location on the furniture front face where a brand sign would be placed.`,
          },
        ],
      }],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = raw.match(/\{[^}]+\}/);

    if (!match) {
      // Fallback: upper-center area (typical brand sign position in furniture renders)
      return NextResponse.json({ x: 0.35, y: 0.15, width: 0.30, height: 0.14 });
    }

    const box = JSON.parse(match[0]);

    // Sanity check: clamp values
    const clamped = {
      x:      Math.max(0, Math.min(0.9, Number(box.x)     || 0.35)),
      y:      Math.max(0, Math.min(0.9, Number(box.y)     || 0.15)),
      width:  Math.max(0.05, Math.min(0.6, Number(box.width)  || 0.30)),
      height: Math.max(0.04, Math.min(0.4, Number(box.height) || 0.14)),
    };

    return NextResponse.json(clamped);
  } catch (err: any) {
    console.error("brand-place error:", err);
    // Return safe fallback
    return NextResponse.json({ x: 0.35, y: 0.15, width: 0.30, height: 0.14 });
  }
}
