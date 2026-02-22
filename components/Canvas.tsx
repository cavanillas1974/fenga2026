"use client";

import { useState } from "react";
import Image from "next/image";
import { DesignParams, GenerationState } from "@/lib/types";
import { Download, CheckCircle2, FileText, RotateCcw, ZoomIn, Sliders } from "lucide-react";
import Lightbox from "./Lightbox";
import FichaTecnica from "./FichaTecnica";
import ImageEditor from "./ImageEditor";

interface Props {
  state: GenerationState;
  renders: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  onRenderUpdate: (index: number, newUrl: string) => void;
  params: DesignParams;
  onRegenerate: (overridePrompt: string) => void;
}

export default function Canvas({ state, renders, selected, onSelect, onRenderUpdate, params, onRegenerate }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaData, setFichaData] = useState<any>(null);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const selectedUrl = selected !== null ? renders[selected] : null;

  const handleDownload = async (url: string) => {
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(url)}`;
    a.download = `fenga-render-${Date.now()}.webp`;
    a.click();
  };

  const handleFicha = async () => {
    if (!selectedUrl) return;
    setFichaOpen(true);
    setFichaLoading(true);
    setFichaData(null);

    try {
      const res = await fetch("/api/ficha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params }),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error);
      setFichaData(data);
    } catch (err: any) {
      console.error("Ficha fetch error:", err);
      setFichaData(null);
    } finally {
      setFichaLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{
        height: 52,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 10,
        background: "var(--surface)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
          {state === "idle"      && "Configura el diseño y presiona Generar"}
          {state === "generating" && "Generando render con Imagen 4 Ultra..."}
          {state === "results"   && `Render listo${selected !== null ? " · Seleccionado para ficha técnica" : ""}`}
          {state === "error"     && "Error al generar — intenta de nuevo"}
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="/proyectos" style={{ textDecoration: "none" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 8,
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--text-dim)", fontSize: 11, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,184,0,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; }}
            >
              ⚙ Fábrica
            </button>
          </a>
          {state === "results" && renders.length > 0 && (
            <>
              <ActionBtn icon={<Download size={13} />}   label="Descargar"     onClick={() => { const url = renders[selected ?? 0]; if (url) handleDownload(url); }} />
              <ActionBtn icon={<Sliders size={13} />}    label="Editar"        onClick={() => { if (selected === null) onSelect(0); setEditorOpen(true); }} />
              <ActionBtn icon={<FileText size={13} />}   label="Ficha técnica" onClick={handleFicha} gold />
            </>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {state === "idle"      && <EmptyState />}
        {state === "generating" && <LoadingState />}
        {state === "error"     && <ErrorState />}
        {state === "results"   && (
          <ResultsGrid
            renders={renders}
            selected={selected}
            onSelect={onSelect}
            onZoom={setLightboxIndex}
          />
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          renders={renders}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNav={i => { setLightboxIndex(i); onSelect(i); }}
          onDownload={handleDownload}
        />
      )}

      {/* Image Editor */}
      {editorOpen && selectedUrl && selected !== null && (
        <ImageEditor
          imageUrl={selectedUrl}
          params={params}
          onClose={() => setEditorOpen(false)}
          onNewRender={newUrl => {
            onRenderUpdate(selected, newUrl);
            setEditorOpen(false);
          }}
        />
      )}

      {/* Ficha Técnica */}
      {fichaOpen && selectedUrl && (
        <FichaTecnica
          ficha={fichaData}
          loading={fichaLoading}
          renderUrl={selectedUrl}
          params={params}
          onClose={() => setFichaOpen(false)}
          onDownloadPDF={() => {}}
        />
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, gold }: { icon: React.ReactNode; label: string; onClick: () => void; gold?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 14px",
      background: gold ? "var(--gold)" : "var(--surface-2)",
      border: `1px solid ${gold ? "var(--gold)" : "var(--border)"}`,
      borderRadius: 8,
      color: gold ? "#000" : "var(--text-muted)",
      fontSize: 12, fontWeight: gold ? 700 : 400,
      cursor: "pointer", fontFamily: "inherit",
      transition: "opacity 0.15s",
    }}>
      {icon}{label}
    </button>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, minHeight: 400 }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: "var(--surface)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Image src="/logofenga.png" alt="Fenga" width={48} height={48} style={{ objectFit: "contain", opacity: 0.4 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>Describe tu proyecto</p>
        <p style={{ color: "var(--text-dim)", fontSize: 13, maxWidth: 340, lineHeight: 1.6, marginTop: 6 }}>
          Configura componentes, materiales y dimensiones. La IA generará un render fotorrealista y una ficha técnica completa de producción.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {["Render Imagen 4 Ultra", "Ficha técnica", "Planos DXF/SVG", "Cotización", "Editor IA"].map((t, i) => (
          <span key={i} style={{
            padding: "4px 12px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 20, fontSize: 11, color: "var(--text-dim)",
          }}>{t}</span>
        ))}
      </div>

      {/* Inspiration entry */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>¿Necesitas ideas antes de producir?</p>
        <a href="/inspiracion" style={{ textDecoration: "none" }}>
          <button style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 10,
            background: "rgba(245,184,0,0.06)",
            border: "1px solid rgba(245,184,0,0.25)",
            color: "var(--gold)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,184,0,0.12)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,184,0,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,184,0,0.06)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,184,0,0.25)"; }}
          >
            ✦ Explorar ideas en Fenga Inspiración
          </button>
        </a>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{
        aspectRatio: "4/3", borderRadius: 14,
        background: "var(--surface)", border: "1px solid var(--border)",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent, rgba(245,184,0,0.05), transparent)",
          animation: "shimmer 1.8s infinite",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 36, height: 36, border: "2px solid var(--gold)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Generando con Imagen 4 Ultra...</span>
        </div>
      </div>
      <style>{`@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} } @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, minHeight: 400 }}>
      <RotateCcw size={28} color="var(--text-dim)" />
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Error al generar. Verifica los parámetros e intenta de nuevo.</p>
    </div>
  );
}

function ResultsGrid({ renders, selected, onSelect, onZoom }: {
  renders: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  onZoom: (i: number) => void;
}) {
  if (renders.length === 1 && selected === null) {
    setTimeout(() => onSelect(0), 0);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {renders.map((src, i) => (
          <div
            key={i}
            style={{
              position: "relative", aspectRatio: "4/3", borderRadius: 14,
              overflow: "hidden",
              border: `2px solid ${selected === i ? "var(--gold)" : "var(--border)"}`,
              cursor: "pointer",
              boxShadow: selected === i ? "0 0 0 1px var(--gold), 0 8px 32px rgba(245,184,0,0.1)" : "0 4px 24px rgba(0,0,0,0.4)",
              transition: "all 0.2s",
            }}
            onClick={() => onSelect(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Render" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />

            {/* Hover overlay with zoom btn */}
            <div className="hover-overlay" style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}>
              <button
                onClick={e => { e.stopPropagation(); onZoom(i); }}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0, transition: "opacity 0.15s",
                }}
                className="zoom-btn"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {selected === i && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                background: "var(--gold)", borderRadius: "50%",
                width: 24, height: 24,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle2 size={14} color="#000" />
              </div>
            )}

            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "28px 14px 12px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
            }}>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Render Imagen 4 Ultra</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        div:hover .zoom-btn { opacity: 1 !important; }
        div:hover .hover-overlay { background: rgba(0,0,0,0.15) !important; }
      `}</style>
    </div>
  );
}
