"use client";

import { useState } from "react";

const GOLD = "#F5B800";
const BG = "#0D1117";
const LINE = "#E6EDF3";
const DIM = "#58A6FF";
const MUTED = "#8B949E";
const ARROW = "#F5B800";
const FILL_A = "#1C2A1C";
const FILL_B = "#1A2535";
const FILL_C = "#2D1F1F";

interface Pieza {
  pieza: string;
  cantidad: number;
  largoMM: number;
  anchoMM: number;
  espesorMM: number;
  material: string;
  observaciones?: string;
}

interface Paso {
  paso: number;
  operacion: string;
  descripcion: string;
  herramientas: string[];
  tiempoMin: number;
}

interface Props {
  paso: Paso;
  cortes: Pieza[];
  totalPasos: number;
}

// Detecta qué piezas son relevantes para este paso
function piezasDelPaso(paso: Paso, cortes: Pieza[]): Pieza[] {
  const desc = (paso.operacion + " " + paso.descripcion).toLowerCase();
  const keywords = ["cajon", "cajón", "lateral", "base", "panel", "frente", "trasero", "superior",
    "inferior", "divisor", "estante", "vidrio", "puerta", "estructura", "riel", "soporte"];

  // Match por nombre de pieza o keyword en descripción
  const matched = cortes.filter(c => {
    const nombre = c.pieza.toLowerCase();
    return keywords.some(k => desc.includes(k) && nombre.includes(k));
  });

  // Si no encuentra match, toma las primeras según número de paso
  if (matched.length === 0) {
    const idx = (paso.paso - 1) % cortes.length;
    return cortes.slice(idx, idx + 2);
  }

  return matched.slice(0, 3);
}

// Escala una pieza para caber en el viewport del SVG
function scalePieza(largo: number, ancho: number, maxW: number, maxH: number) {
  const scaleX = maxW / largo;
  const scaleY = maxH / ancho;
  return Math.min(scaleX, scaleY, 0.15); // máximo 0.15 para no hacer piezas enormes
}

// Dibuja una pieza en 2.5D (frontal + profundidad simulada)
function PiezaISO({ x, y, w, h, d, label, dim, fill, index }: {
  x: number; y: number; w: number; h: number; d: number;
  label: string; dim: string; fill: string; index: number;
}) {
  const dp = Math.min(d * 0.4, 20); // profundidad en pantalla
  return (
    <g>
      {/* Cara superior */}
      <polygon
        points={`${x},${y} ${x + w},${y} ${x + w + dp},${y - dp} ${x + dp},${y - dp}`}
        fill={fill} stroke={LINE} strokeWidth="0.8" opacity="0.7"
      />
      {/* Cara frontal */}
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={LINE} strokeWidth="1" />
      {/* Cara lateral */}
      <polygon
        points={`${x + w},${y} ${x + w + dp},${y - dp} ${x + w + dp},${y + h - dp} ${x + w},${y + h}`}
        fill={fill} stroke={LINE} strokeWidth="0.8" opacity="0.6"
      />

      {/* Label centrado */}
      {w > 30 && h > 14 && (
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="8"
          fill={LINE} fontFamily="monospace" fontWeight="600">
          {label.length > 10 ? label.slice(0, 9) + "…" : label}
        </text>
      )}

      {/* Cota de ancho */}
      <line x1={x} y1={y + h + 10} x2={x + w} y2={y + h + 10} stroke={DIM} strokeWidth="0.8" />
      <line x1={x} y1={y + h + 6} x2={x} y2={y + h + 14} stroke={DIM} strokeWidth="0.8" />
      <line x1={x + w} y1={y + h + 6} x2={x + w} y2={y + h + 14} stroke={DIM} strokeWidth="0.8" />
      <text x={x + w / 2} y={y + h + 22} textAnchor="middle" fontSize="7"
        fill={DIM} fontFamily="monospace">{dim}</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return (
    <g transform={`translate(${x1},${y1}) rotate(${angle})`}>
      <line x1="0" y1="0" x2={len - 8} y2="0" stroke={ARROW} strokeWidth="1.5" strokeDasharray="4,2" />
      <polygon points={`${len},0 ${len - 8},-4 ${len - 8},4`} fill={ARROW} />
    </g>
  );
}

function HerramientaIcon({ nombre, x, y }: { nombre: string; x: number; y: number }) {
  const n = nombre.toLowerCase();
  let icon = "🔧";
  if (n.includes("sierra") || n.includes("serrucho")) icon = "🪚";
  else if (n.includes("taladro")) icon = "🔩";
  else if (n.includes("nivel")) icon = "📏";
  else if (n.includes("lija")) icon = "🪵";
  else if (n.includes("pistola")) icon = "🎨";
  else if (n.includes("cautín") || n.includes("soldar")) icon = "⚡";
  else if (n.includes("cinta") || n.includes("metro")) icon = "📐";

  return (
    <text x={x} y={y} fontSize="14" textAnchor="middle">{icon}</text>
  );
}

export default function DiagramaEnsamble({ paso, cortes, totalPasos }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const piezas = piezasDelPaso(paso, cortes);
  const svgW = 520;
  const svgH = 200;

  // Posicionar piezas según cuántas hay
  const layouts = piezas.length === 1
    ? [{ x: 120, y: 60 }]
    : piezas.length === 2
      ? [{ x: 60, y: 60 }, { x: 300, y: 60 }]
      : [{ x: 30, y: 60 }, { x: 200, y: 60 }, { x: 370, y: 60 }];

  const fills = [FILL_A, FILL_B, FILL_C];

  return (
    <div style={{
      background: BG,
      border: "1px solid #30363D",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {/* Header del paso */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px",
        background: "#161B22",
        borderBottom: "1px solid #30363D",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(245,184,0,0.12)",
            border: "1px solid rgba(245,184,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, color: GOLD, fontFamily: "monospace",
          }}>
            {String(paso.paso).padStart(2, "0")}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: LINE, fontFamily: "monospace" }}>
            {paso.operacion}
          </span>
          {paso.tiempoMin && (
            <span style={{
              fontSize: 10, color: MUTED, fontFamily: "monospace",
              background: "#1C2128", padding: "2px 7px", borderRadius: 10,
              border: "1px solid #30363D",
            }}>
              ~{paso.tiempoMin} min
            </span>
          )}
        </div>
        {/* Herramientas + zoom btn */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {(paso.herramientas ?? []).slice(0, 4).map((h, i) => (
            <span key={i} title={h} style={{
              fontSize: 10, padding: "1px 7px", borderRadius: 10,
              background: "#1C2128", border: "1px solid #30363D",
              color: MUTED, fontFamily: "monospace",
            }}>{h}</span>
          ))}
          <button onClick={() => setZoomed(true)} title="Ampliar" style={{
            width: 22, height: 22, borderRadius: 6,
            background: "rgba(245,184,0,0.08)", border: "1px solid rgba(245,184,0,0.25)",
            color: GOLD, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, marginLeft: 4,
          }}>
            🔍
          </button>
        </div>
      </div>

      {/* Zona SVG de dibujo */}
      <div style={{ display: "flex" }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ background: BG }}>
          <defs>
            <pattern id={`grid-${paso.paso}`} width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#1C2128" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width={svgW} height={svgH} fill={`url(#grid-${paso.paso})`} />

          {/* Centro vertical */}
          <line x1={svgW / 2} y1="0" x2={svgW / 2} y2={svgH} stroke="#1C2128" strokeWidth="0.5" strokeDasharray="4,4" />

          {piezas.map((p, i) => {
            const layout = layouts[i] || { x: 100 + i * 150, y: 50 };
            const maxW = piezas.length === 1 ? 160 : piezas.length === 2 ? 140 : 110;
            const maxH = 80;
            const sc = scalePieza(p.largoMM, p.anchoMM, maxW, maxH);
            const w = Math.max(p.largoMM * sc, 40);
            const h = Math.max(p.anchoMM * sc, 25);
            const d = Math.max(p.espesorMM * sc * 3, 6);

            return (
              <PiezaISO
                key={i}
                x={layout.x}
                y={layout.y}
                w={w}
                h={h}
                d={d}
                label={p.pieza}
                dim={`${p.largoMM}×${p.anchoMM}×${p.espesorMM}`}
                fill={fills[i % fills.length]}
                index={i}
              />
            );
          })}

          {/* Flecha de ensamble entre piezas */}
          {piezas.length >= 2 && layouts[0] && layouts[1] && (() => {
            const sc0 = scalePieza(piezas[0].largoMM, piezas[0].anchoMM, 140, 80);
            const w0 = Math.max(piezas[0].largoMM * sc0, 40);
            const midY0 = layouts[0].y + Math.max(piezas[0].anchoMM * sc0, 25) / 2;
            const midY1 = layouts[1].y + Math.max(piezas[1].anchoMM * scalePieza(piezas[1].largoMM, piezas[1].anchoMM, 140, 80), 25) / 2;
            return (
              <Arrow
                x1={layouts[0].x + w0 + 4}
                y1={midY0}
                x2={layouts[1].x - 8}
                y2={midY1}
              />
            );
          })()}

          {/* Número de paso watermark */}
          <text x={svgW - 10} y={svgH - 8} textAnchor="end" fontSize="28"
            fill="#1C2128" fontFamily="monospace" fontWeight="900">
            {String(paso.paso).padStart(2, "0")}
          </text>
        </svg>

        {/* Panel lateral con instrucción y materiales */}
        <div style={{
          width: 200, flexShrink: 0,
          borderLeft: "1px solid #30363D",
          padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 10,
          background: "#0D1117",
        }}>
          <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.65, fontFamily: "monospace", margin: 0 }}>
            {paso.descripcion}
          </p>

          {piezas.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>
                Piezas
              </div>
              {piezas.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: LINE, fontFamily: "monospace" }}>
                    {p.pieza.slice(0, 18)}
                  </span>
                  <span style={{ fontSize: 10, color: DIM, fontFamily: "monospace" }}>
                    ×{p.cantidad}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Progreso */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", marginBottom: 3 }}>
              Paso {paso.paso} / {totalPasos}
            </div>
            <div style={{ height: 3, background: "#1C2128", borderRadius: 2 }}>
              <div style={{
                height: "100%",
                width: `${(paso.paso / totalPasos) * 100}%`,
                background: GOLD, borderRadius: 2,
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Zoom overlay */}
      {zoomed && (
        <div onClick={() => setZoomed(false)} style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.95)",
          zIndex: 1500,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: "zoom-out", gap: 12, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 8, overflow: "hidden", maxWidth: "95vw" }}>
            {/* Header clone */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#161B22", borderBottom: "1px solid #30363D" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(245,184,0,0.12)", border: "1px solid rgba(245,184,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: GOLD, fontFamily: "monospace" }}>
                  {String(paso.paso).padStart(2, "0")}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E6EDF3", fontFamily: "monospace" }}>{paso.operacion}</span>
              </div>
              <button onClick={() => setZoomed(false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
            {/* SVG full width */}
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "min(90vw, 1000px)", height: "auto", background: BG, display: "block" }}>
              <defs>
                <pattern id={`grid-zoom-${paso.paso}`} width="15" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#1C2128" strokeWidth="0.4" />
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill={`url(#grid-zoom-${paso.paso})`} />
              <line x1={svgW / 2} y1="0" x2={svgW / 2} y2={svgH} stroke="#1C2128" strokeWidth="0.5" strokeDasharray="4,4" />
              {piezas.map((p, i) => {
                const layout = layouts[i] || { x: 100 + i * 150, y: 50 };
                const maxW = piezas.length === 1 ? 160 : piezas.length === 2 ? 140 : 110;
                const sc = scalePieza(p.largoMM, p.anchoMM, maxW, 80);
                const w = Math.max(p.largoMM * sc, 40);
                const h = Math.max(p.anchoMM * sc, 25);
                const d = Math.max(p.espesorMM * sc * 3, 6);
                return <PiezaISO key={i} x={layout.x} y={layout.y} w={w} h={h} d={d} label={p.pieza} dim={`${p.largoMM}×${p.anchoMM}×${p.espesorMM}`} fill={fills[i % fills.length]} index={i} />;
              })}
              {piezas.length >= 2 && layouts[0] && layouts[1] && (() => {
                const sc0 = scalePieza(piezas[0].largoMM, piezas[0].anchoMM, 140, 80);
                const w0 = Math.max(piezas[0].largoMM * sc0, 40);
                const midY0 = layouts[0].y + Math.max(piezas[0].anchoMM * sc0, 25) / 2;
                const midY1 = layouts[1].y + Math.max(piezas[1].anchoMM * scalePieza(piezas[1].largoMM, piezas[1].anchoMM, 140, 80), 25) / 2;
                return <Arrow x1={layouts[0].x + w0 + 4} y1={midY0} x2={layouts[1].x - 8} y2={midY1} />;
              })()}
            </svg>
            {/* Description */}
            <div style={{ padding: "10px 16px", background: "#0D1117", borderTop: "1px solid #30363D" }}>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, fontFamily: "monospace", margin: 0 }}>{paso.descripcion}</p>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Click fuera o presiona ESC para cerrar</div>
        </div>
      )}
    </div>
  );
}
