"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import { DesignParams, GenerationState, defaultComponentes } from "@/lib/types";

const defaultParams: DesignParams = {
  description: "",
  style: "",
  materials: [],
  dimensions: { width: "", height: "", depth: "" },
  budget: "",
  quantity: "1",
  componentes: defaultComponentes,
  logoBase64: undefined,
};

/**
 * Step 1: Ask Gemini Vision where the BRAND panel is on the furniture render.
 * Step 2: Canvas-composite the client logo precisely onto that detected area.
 */
async function compositeLogoOnRender(renderBase64: string, logoBase64: string): Promise<string> {
  // Detect the BRAND panel bounding box via Gemini Vision
  let box = { x: 0.35, y: 0.15, width: 0.30, height: 0.14 }; // fallback
  try {
    const res = await fetch("/api/brand-place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renderBase64 }),
    });
    if (res.ok) box = await res.json();
  } catch {
    // silent — use fallback position
  }

  return new Promise(resolve => {
    const canvas = document.createElement("canvas");
    const render = new window.Image();
    render.onload = () => {
      canvas.width  = render.naturalWidth;
      canvas.height = render.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(renderBase64); return; }
      ctx.drawImage(render, 0, 0);

      const logo = new window.Image();
      logo.onload = () => {
        // Convert normalized box → pixel coordinates
        const bx = Math.round(box.x     * render.naturalWidth);
        const by = Math.round(box.y     * render.naturalHeight);
        const bw = Math.round(box.width  * render.naturalWidth);
        const bh = Math.round(box.height * render.naturalHeight);

        // Scale logo to fill the detected panel (with small inner padding)
        const innerPad = Math.round(Math.min(bw, bh) * 0.08);
        const scale = Math.min(
          (bw - innerPad * 2) / logo.naturalWidth,
          (bh - innerPad * 2) / logo.naturalHeight,
        );
        const lw = Math.round(logo.naturalWidth  * scale);
        const lh = Math.round(logo.naturalHeight * scale);
        // Center logo inside the panel box
        const lx = bx + Math.round((bw - lw) / 2);
        const ly = by + Math.round((bh - lh) / 2);

        // Clear the BRAND placeholder area with a neutral background that
        // blends with the render (sample corner pixel color for reference)
        ctx.clearRect(bx, by, bw, bh);
        const pixel = ctx.getImageData(bx - 2, by - 2, 1, 1).data;
        const isBright = (pixel[0] + pixel[1] + pixel[2]) / 3 > 180;
        ctx.fillStyle = isBright ? "rgba(240,235,225,0.88)" : "rgba(30,25,20,0.75)";
        const r = Math.round(Math.min(bw, bh) * 0.12);
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
        ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
        ctx.lineTo(bx + r, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
        ctx.lineTo(bx, by + r); ctx.arcTo(bx, by, bx + r, by, r);
        ctx.closePath();
        ctx.fill();

        // Draw client logo precisely in the detected panel
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logo, lx, ly, lw, lh);
        ctx.globalAlpha = 1;

        resolve(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => resolve(renderBase64);
      logo.src = logoBase64;
    };
    render.onerror = () => resolve(renderBase64);
    render.src = renderBase64;
  });
}

export default function Home() {
  const [params, setParams] = useState<DesignParams>(defaultParams);
  const [state, setState] = useState<GenerationState>("idle");
  const [renders, setRenders] = useState<string[]>([]);
  const [selectedRender, setSelectedRender] = useState<number | null>(null);

  // Pick up design transferred from Fenga Inspiración (params + images + plans)
  useEffect(() => {
    // 1. Design params from localStorage
    const rawParams = localStorage.getItem("fenga_inspiration_transfer");
    if (rawParams) {
      try {
        const transfer = JSON.parse(rawParams);
        setParams(prev => ({
          ...prev,
          description:  transfer.description  || prev.description,
          style:        transfer.style        || prev.style,
          materials:    transfer.materials    || prev.materials,
          dimensions:   transfer.dimensions   || prev.dimensions,
          budget:       transfer.budget       || prev.budget,
          componentes:  transfer.componentes  ? { ...prev.componentes, ...transfer.componentes } : prev.componentes,
          logoBase64:   transfer.logoBase64   || prev.logoBase64,
          logoAnalysis: transfer.logoAnalysis || prev.logoAnalysis,
        }));
        localStorage.removeItem("fenga_inspiration_transfer");
      } catch { /* silent */ }
    }

    // 2. Render + technical drawings from sessionStorage (large images)
    const rawImages = sessionStorage.getItem("fenga_inspiration_images");
    if (rawImages) {
      try {
        const pkg = JSON.parse(rawImages);
        const allImages: string[] = [];
        if (pkg.renderImage) allImages.push(pkg.renderImage);
        if (Array.isArray(pkg.techImages)) {
          pkg.techImages.forEach((t: { image: string }) => { if (t.image) allImages.push(t.image); });
        }
        if (allImages.length > 0) {
          setRenders(allImages);
          setSelectedRender(0);
          setState("results");
        }
        sessionStorage.removeItem("fenga_inspiration_images");
      } catch { /* silent */ }
    }
  }, []);

  const handleGenerate = async (overridePrompt?: string) => {
    if (!params.description.trim()) return;
    setState("generating");
    setRenders([]);
    setSelectedRender(null);

    try {
      const body = overridePrompt
        ? { ...params, _overridePrompt: overridePrompt }
        : params;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error generando");
      const data = await res.json();

      let images: string[] = data.images || [];

      // Only composite if there's no logoAnalysis — when analysis succeeded, Imagen 4
      // already rendered the brand natively via the prompt. Compositing would duplicate it.
      if (params.logoBase64 && !params.logoAnalysis && images.length > 0) {
        images = await Promise.all(
          images.map(img => compositeLogoOnRender(img, params.logoBase64!))
        );
      }

      setRenders(images);
      setState("results");
    } catch {
      setState("error");
    }
  };

  const handleRenderUpdate = (index: number, newUrl: string) => {
    setRenders(prev => {
      const updated = [...prev];
      updated[index] = newUrl;
      return updated;
    });
  };

  return (
    <main style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar
        params={params}
        onChange={setParams}
        onGenerate={() => handleGenerate()}
        state={state}
      />
      <Canvas
        state={state}
        renders={renders}
        selected={selectedRender}
        onSelect={setSelectedRender}
        onRenderUpdate={handleRenderUpdate}
        params={params}
        onRegenerate={handleGenerate}
      />
    </main>
  );
}
