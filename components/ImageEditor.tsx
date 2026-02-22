"use client";

import { useState, useRef } from "react";
import { X, Sparkles, RotateCcw, Download, Sliders, Search, Scan, ZoomIn } from "lucide-react";
import { DesignParams } from "@/lib/types";

interface Props {
  imageUrl: string;
  params: DesignParams;
  onClose: () => void;
  onNewRender: (newImageUrl: string) => void;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

const defaultFilters: Filters = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };

function cssFilter(f: Filters): string {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    f.warmth > 0 ? `sepia(${f.warmth}%)` : "",
  ].filter(Boolean).join(" ");
}

const PRESETS = [
  { name: "Original",   f: defaultFilters },
  { name: "Vibrante",   f: { brightness: 105, contrast: 115, saturation: 140, warmth: 0  } },
  { name: "Cálido",     f: { brightness: 108, contrast: 100, saturation: 110, warmth: 20 } },
  { name: "Frío",       f: { brightness: 100, contrast: 108, saturation: 85,  warmth: 0  } },
  { name: "Alto Contr.",f: { brightness: 95,  contrast: 150, saturation: 110, warmth: 0  } },
  { name: "Nocturno",   f: { brightness: 70,  contrast: 120, saturation: 80,  warmth: 10 } },
];

type Stage = "idle" | "analyzing" | "generating" | "done" | "error";

export default function ImageEditor({ imageUrl, params, onClose, onNewRender }: Props) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [editText, setEditText] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [analysisText, setAnalysisText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const setF = (key: keyof Filters, v: number) =>
    setFilters(prev => ({ ...prev, [key]: v }));

  const isDirty = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  const handleDownload = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth  || 800;
    canvas.height = img.naturalHeight || 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = cssFilter(filters);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `fenga-render-edit-${Date.now()}.png`;
    a.click();
  };

  const handleSmartEdit = async () => {
    if (!editText.trim()) return;
    setStage("analyzing");
    setAnalysisText("");
    setPreviewUrl(null);
    setErrorMsg("");

    try {
      // Step 1+2+3 all handled server-side by /api/edit
      setStage("analyzing");

      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageUrl,
          changeRequest: editText,
          params,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en el servidor");
      }

      const data = await res.json();
      setAnalysisText(data.analysis || "");
      setPreviewUrl(data.image);
      setStage("done");
    } catch (err: any) {
      console.error("Smart edit error:", err);
      setErrorMsg(err.message);
      setStage("error");
    }
  };

  const handleAcceptEdit = () => {
    if (previewUrl) {
      onNewRender(previewUrl);
      onClose();
    }
  };

  const handleRetry = () => {
    setStage("idle");
    setPreviewUrl(null);
    setErrorMsg("");
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.93)",
      zIndex: 950,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "min(98vw, 1160px)",
        height: "90vh",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          padding: "11px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--surface-2)", flexShrink: 0,
        }}>
          <Sliders size={14} color="var(--gold)" />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Editor de Render</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 10 }}>
              Filtros instantáneos · Edición quirúrgica con IA Gemini Vision
            </span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Left: Image Preview ─────────────────────────────────────────── */}
          <div style={{ flex: 1, background: "#080808", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, position: "relative", overflow: "hidden", padding: 16 }}>

            {/* Original */}
            <div style={{ display: "flex", gap: 12, width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
              {/* Original image */}
              <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, maxHeight: "100%" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", letterSpacing: "1px" }}>Original</div>
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", maxHeight: "calc(100% - 24px)" }} className="zoom-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Original"
                    style={{
                      maxWidth: "100%", maxHeight: "100%",
                      objectFit: "contain", borderRadius: 6,
                      filter: previewUrl ? "none" : cssFilter(filters),
                      transition: "filter 0.1s",
                      border: "1px solid #1C2128",
                      display: "block",
                    }}
                  />
                  <button onClick={() => setZoomedImg(imageUrl)} className="img-zoom-btn" style={{
                    position: "absolute", top: 6, right: 6,
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity 0.15s",
                  }}>
                    <ZoomIn size={13} />
                  </button>
                </div>
                {isDirty && !previewUrl && (
                  <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", padding: "3px 10px", background: "rgba(245,184,0,0.15)", border: "1px solid rgba(245,184,0,0.4)", borderRadius: 12, fontSize: 9, color: "var(--gold)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Filtros activos
                  </div>
                )}
              </div>

              {/* Result preview (when editing done) */}
              {(stage === "done" && previewUrl) && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#F5B800", fontSize: 18 }}>→</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, maxHeight: "100%" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#4ADE80", textTransform: "uppercase", letterSpacing: "1px" }}>Resultado IA</div>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", maxHeight: "calc(100% - 24px)" }} className="zoom-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Edited"
                        style={{
                          maxWidth: "100%", maxHeight: "100%",
                          objectFit: "contain", borderRadius: 6,
                          border: "1px solid rgba(74,222,128,0.35)",
                          boxShadow: "0 0 20px rgba(74,222,128,0.1)",
                          display: "block",
                        }}
                      />
                      <button onClick={() => setZoomedImg(previewUrl)} className="img-zoom-btn" style={{
                        position: "absolute", top: 6, right: 6,
                        width: 30, height: 30, borderRadius: "50%",
                        background: "rgba(0,0,0,0.65)", border: "1px solid rgba(74,222,128,0.4)",
                        color: "#4ADE80", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.15s",
                      }}>
                        <ZoomIn size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Analyzing state */}
              {(stage === "analyzing" || stage === "generating") && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, minHeight: 200 }}>
                  <div style={{ width: 44, height: 44, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                      {stage === "analyzing" ? "Gemini Vision analizando..." : "Imagen 4 Ultra generando..."}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220 }}>
                      {stage === "analyzing"
                        ? "Detectando estructura, materiales y estilo del mueble"
                        : "Aplicando cambio quirúrgico con contexto completo"}
                    </div>
                  </div>
                  {analysisText && (
                    <div style={{ padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, maxWidth: 280 }}>
                      <div style={{ fontSize: 9, color: "var(--gold)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>Análisis IA</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{analysisText.slice(0, 200)}…</div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {stage === "error" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "#F87171", fontWeight: 600 }}>Error al editar</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 200, textAlign: "center" }}>{errorMsg}</div>
                  <button onClick={handleRetry} style={{ padding: "6px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* Accept edit buttons */}
            {stage === "done" && previewUrl && (
              <div style={{ position: "absolute", bottom: 14, right: 14, display: "flex", gap: 8 }}>
                <button onClick={handleRetry} style={{ padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Descartar
                </button>
                <button onClick={handleAcceptEdit} style={{ padding: "7px 16px", background: "var(--gold)", border: "none", borderRadius: 8, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ✓ Usar este resultado
                </button>
              </div>
            )}

            <style>{`
              @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              .zoom-img-wrap:hover .img-zoom-btn { opacity: 1 !important; }
            `}</style>
          </div>

          {/* Zoom overlay */}
          {zoomedImg && (
            <div onClick={() => setZoomedImg(null)} style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.96)",
              zIndex: 2000,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "zoom-out",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedImg} alt="Zoom" onClick={e => e.stopPropagation()} style={{ maxWidth: "94vw", maxHeight: "94vh", objectFit: "contain", borderRadius: 10, boxShadow: "0 0 60px rgba(0,0,0,0.8)" }} />
              <button onClick={() => setZoomedImg(null)} style={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* ── Right: Controls ─────────────────────────────────────────────── */}
          <div style={{
            width: 300, flexShrink: 0,
            borderLeft: "1px solid var(--border)",
            overflowY: "auto",
            display: "flex", flexDirection: "column",
          }}>

            {/* ── Smart AI Edit ─── */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <Scan size={12} color="var(--gold)" />
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Edición quirúrgica IA</div>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 10 }}>
                Gemini Vision analiza el mueble actual → aplica SOLO el cambio solicitado → Imagen 4 Ultra regenera con precisión.
              </div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                placeholder="Describe el cambio específico:&#10;· Cambiar el color a negro mate&#10;· Agregar puerta de vidrio al módulo superior&#10;· Cambiar las patas a acero inoxidable&#10;· Agregar iluminación LED azul interior"
                rows={5}
                disabled={stage === "analyzing" || stage === "generating"}
                style={{
                  width: "100%", background: "var(--surface-2)",
                  border: "1px solid var(--border)", borderRadius: 8,
                  padding: "9px 11px", color: "var(--text)", fontSize: 11,
                  lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "inherit",
                  opacity: stage === "analyzing" || stage === "generating" ? 0.5 : 1,
                }}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                onClick={handleSmartEdit}
                disabled={!editText.trim() || stage === "analyzing" || stage === "generating"}
                style={{
                  width: "100%", marginTop: 8, padding: "10px 14px",
                  background: (editText.trim() && stage !== "analyzing" && stage !== "generating") ? "var(--gold)" : "var(--border)",
                  color: (editText.trim() && stage !== "analyzing" && stage !== "generating") ? "#000" : "var(--text-dim)",
                  border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: (editText.trim() && stage !== "analyzing" && stage !== "generating") ? "pointer" : "not-allowed",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "all 0.15s",
                }}
              >
                {stage === "analyzing" || stage === "generating" ? (
                  <><div style={{ width: 12, height: 12, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} /> Procesando...</>
                ) : (
                  <><Sparkles size={13} /> Aplicar cambio con IA</>
                )}
              </button>
            </div>

            {/* ── Presets ─── */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Presets de color</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => setFilters(p.f)} style={{
                    padding: "5px 4px", borderRadius: 7, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                    background: JSON.stringify(filters) === JSON.stringify(p.f) ? "rgba(245,184,0,0.12)" : "var(--surface-2)",
                    border: `1px solid ${JSON.stringify(filters) === JSON.stringify(p.f) ? "var(--gold)" : "var(--border)"}`,
                    color: JSON.stringify(filters) === JSON.stringify(p.f) ? "var(--gold)" : "var(--text-muted)",
                    transition: "all 0.1s",
                  }}>{p.name}</button>
                ))}
              </div>
            </div>

            {/* ── Filter Sliders ─── */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Ajustes de imagen</div>
                {isDirty && (
                  <button onClick={() => setFilters(defaultFilters)} style={{ fontSize: 10, color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                    <RotateCcw size={9} /> Resetear
                  </button>
                )}
              </div>
              {([
                { key: "brightness" as keyof Filters, label: "Brillo",     min: 50,  max: 150 },
                { key: "contrast"   as keyof Filters, label: "Contraste",  min: 50,  max: 200 },
                { key: "saturation" as keyof Filters, label: "Saturación", min: 0,   max: 200 },
                { key: "warmth"     as keyof Filters, label: "Calidez",    min: 0,   max: 60  },
              ]).map(({ key, label, min, max }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 11, color: "var(--gold)", fontFamily: "monospace", fontWeight: 600 }}>
                      {key === "warmth" ? `${filters[key]}%` : `${filters[key] - 100 >= 0 ? "+" : ""}${filters[key] - 100}`}
                    </span>
                  </div>
                  <input type="range" min={min} max={max} value={filters[key]}
                    onChange={e => setF(key, Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--gold)", cursor: "pointer" }}
                  />
                </div>
              ))}
            </div>

            {/* ── Download ─── */}
            <div style={{ padding: "12px 16px" }}>
              <button onClick={handleDownload} style={{
                width: "100%", padding: "8px 14px",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text-muted)", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Download size={13} /> Descargar con filtros
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
