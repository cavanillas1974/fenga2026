"use client";

import React, { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   MANUAL DE FABRICACIÓN — FENGA DISEÑO INDUSTRIAL
   3 hojas de planos profesionales:
     Hoja 1: Vistas ortogonales generales (ensamble completo)
     Hoja 2: Despiece individual de cada pieza (3 vistas + detalles)
     Hoja 3: Cortes transversales y detalles constructivos de uniones
   ─────────────────────────────────────────────────────────────────────────── */

const BG     = "#0D1117";
const GRID   = "#161B22";
const LINE   = "#C0C8D2";
const DIM    = "#58A6FF";
const GOLD   = "#F5B800";
const MUTED  = "#8B949E";
const LABEL  = "#E6EDF3";
const CUT    = "#FF6B6B";   // línea de corte
const CENTER = "#3FB950";   // líneas de centro

const TIPO_COLORS: Record<string, string> = {
  cajones:   "#1A2F45",
  panel:     "#1A2F1A",
  espejo:    "#1A2535",
  estructura:"#2D1B1B",
  base:      "#2D2A1A",
  union:     "#2A1F2A",
  default:   "#1C2128",
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Cota {
  tipo: "horizontal" | "vertical";
  desde: number;
  hasta: number;
  valor: string;
  descripcion: string;
}

interface Elemento {
  nombre: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  tipo: string;
}

interface Vista {
  anchoTotal: number;
  altoTotal: number;
  cotas: Cota[];
  elementos: Elemento[];
}

interface PlanosData {
  escala: string;
  unidades: string;
  vistaFrontal: Vista;
  vistaLateral: Vista;
  vistaSuperior: Vista;
  notas: string[];
}

interface Agujero {
  tipo: string;
  diametro: number;
  profundidad: number;
  xMM: number;
  yMM: number;
  descripcion: string;
}

interface Ranura {
  xMM: number;
  profundidadMM: number;
  anchoMM: number;
  longitudMM: number;
  orientacion: string;
  descripcion: string;
}

interface PiezaDetalle {
  pieza: string;
  agujeros?: Agujero[];
  ranuras?: Ranura[];
  cantosAplicar?: string[];
  direccionVeta?: string;
  notasCorte?: string;
}

interface CorteTransversal {
  id: string;
  nombre: string;
  descripcion: string;
  escala: string;
  elementos: Elemento[];
  cotas: Cota[];
  notas?: string[];
}

interface DetalleConstructivo {
  id: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  herramientas?: string[];
  tolerancia?: string;
  elementos: Elemento[];
  cotas: Cota[];
}

interface Pieza {
  pieza: string;
  cantidad: number;
  largoMM: number;
  anchoMM: number;
  espesorMM: number;
  material: string;
  observaciones?: string;
}

interface Props {
  planos: PlanosData | null;
  cortes: Pieza[];
  piezasDetalladas: PiezaDetalle[];
  cortesTransversales: CorteTransversal[];
  detallesConstructivos: DetalleConstructivo[];
  titulo: string;
  folio: string;
}

// ─── Constantes de dibujo ─────────────────────────────────────────────────────

const TITLE_H   = 36;   // alto del bloque de título
const DIM_GAP   = 22;   // espacio entre líneas de cota
const DIM_EXT   = 6;    // extensión de la línea auxiliar

// ─── Helper: escala una vista para caber en un viewport ───────────────────────
function autoScale(anchoTotal: number, altoTotal: number, viewW: number, viewH: number): number {
  if (!anchoTotal || !altoTotal) return 0.1;
  return Math.min(viewW / anchoTotal, viewH / altoTotal) * 0.82;
}

// ─── Arrowhead marker def ─────────────────────────────────────────────────────
function DimDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={`arr-${id}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill={DIM} />
      </marker>
      <marker id={`arr-rev-${id}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
        <path d="M0,0 L6,3 L0,6 Z" fill={DIM} />
      </marker>
      <pattern id={`grid-${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M 16 0 L 0 0 0 16" fill="none" stroke={GRID} strokeWidth="0.5" />
      </pattern>
    </defs>
  );
}

// ─── Cotas horizontales ───────────────────────────────────────────────────────
function CotasH({ cotas, ox, oy, drawH, scale, svgId }: {
  cotas: Cota[]; ox: number; oy: number; drawH: number; scale: number; svgId: string;
}) {
  const hCotas = cotas.filter(c => c.tipo === "horizontal");
  return (
    <>
      {hCotas.map((c, i) => {
        const x1 = ox + c.desde * scale;
        const x2 = ox + c.hasta * scale;
        const cy = oy + drawH + DIM_EXT + 14 + i * DIM_GAP;
        return (
          <g key={i}>
            <line x1={x1} y1={oy + drawH} x2={x1} y2={cy + 4} stroke={DIM} strokeWidth="0.6" strokeDasharray="3,2" />
            <line x1={x2} y1={oy + drawH} x2={x2} y2={cy + 4} stroke={DIM} strokeWidth="0.6" strokeDasharray="3,2" />
            <line x1={x1 + 2} y1={cy} x2={x2 - 2} y2={cy} stroke={DIM} strokeWidth="0.9"
              markerStart={`url(#arr-rev-${svgId})`} markerEnd={`url(#arr-${svgId})`} />
            <text x={(x1 + x2) / 2} y={cy - 4} textAnchor="middle" fontSize="7.5" fill={DIM} fontFamily="monospace" fontWeight="700">
              {c.valor}
            </text>
            {c.descripcion && (
              <text x={(x1 + x2) / 2} y={cy + 11} textAnchor="middle" fontSize="6" fill={MUTED} fontFamily="monospace">
                {c.descripcion}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

// ─── Cotas verticales ─────────────────────────────────────────────────────────
function CotasV({ cotas, ox, oy, scale, svgId }: {
  cotas: Cota[]; ox: number; oy: number; scale: number; svgId: string;
}) {
  const vCotas = cotas.filter(c => c.tipo === "vertical");
  return (
    <>
      {vCotas.map((c, i) => {
        const y1 = oy + c.desde * scale;
        const y2 = oy + c.hasta * scale;
        const cx = ox - DIM_EXT - 14 - i * DIM_GAP;
        return (
          <g key={i}>
            <line x1={ox} y1={y1} x2={cx - 4} y2={y1} stroke={DIM} strokeWidth="0.6" strokeDasharray="3,2" />
            <line x1={ox} y1={y2} x2={cx - 4} y2={y2} stroke={DIM} strokeWidth="0.6" strokeDasharray="3,2" />
            <line x1={cx} y1={y1 + 2} x2={cx} y2={y2 - 2} stroke={DIM} strokeWidth="0.9"
              markerStart={`url(#arr-rev-${svgId})`} markerEnd={`url(#arr-${svgId})`} />
            <text
              x={cx - 7} y={(y1 + y2) / 2}
              textAnchor="middle" fontSize="7.5" fill={DIM} fontFamily="monospace" fontWeight="700"
              transform={`rotate(-90, ${cx - 7}, ${(y1 + y2) / 2})`}>
              {c.valor}
            </text>
          </g>
        );
      })}
    </>
  );
}

// ─── Elementos de una vista ───────────────────────────────────────────────────
function ViewElements({ elementos, ox, oy, scale }: {
  elementos: Elemento[]; ox: number; oy: number; scale: number;
}) {
  return (
    <>
      {(elementos || []).map((el, i) => {
        const ex = ox + el.x * scale;
        const ey = oy + el.y * scale;
        const ew = Math.max(el.ancho * scale, 1);
        const eh = Math.max(el.alto * scale, 1);
        const color = TIPO_COLORS[el.tipo?.toLowerCase()] || TIPO_COLORS.default;
        return (
          <g key={i}>
            <rect x={ex} y={ey} width={ew} height={eh} fill={color} stroke={LINE} strokeWidth="0.9"
              strokeDasharray={el.tipo === "espejo" ? "5,2" : "none"} />
            {ew > 36 && eh > 16 && (
              <text x={ex + ew / 2} y={ey + eh / 2 + 3} textAnchor="middle" fontSize="7"
                fill={MUTED} fontFamily="monospace">
                {el.nombre?.length > 14 ? el.nombre.slice(0, 13) + "…" : el.nombre}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

// ─── ISO Title Block ──────────────────────────────────────────────────────────
function TitleBlock({ x, y, w, titulo, folio, pieza, escala, hoja, totalHojas }: {
  x: number; y: number; w: number;
  titulo: string; folio: string; pieza?: string;
  escala: string; hoja: number; totalHojas: number;
}) {
  const h = TITLE_H;
  const col1 = w * 0.45;
  const col2 = w * 0.72;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#0D1117" stroke={GOLD} strokeWidth="1" />
      <line x1={x + col1} y1={y} x2={x + col1} y2={y + h} stroke={GOLD} strokeWidth="0.5" />
      <line x1={x + col2} y1={y} x2={x + col2} y2={y + h} stroke={GOLD} strokeWidth="0.5" />
      <line x1={x} y1={y + h / 2} x2={x + col1} y2={y + h / 2} stroke={GOLD} strokeWidth="0.5" />

      {/* Col 1 — proyecto */}
      <text x={x + 5} y={y + 10} fontSize="6" fill={MUTED} fontFamily="monospace">PROYECTO</text>
      <text x={x + 5} y={y + 21} fontSize="9" fill={LABEL} fontFamily="monospace" fontWeight="700">
        {titulo?.length > 28 ? titulo.slice(0, 27) + "…" : titulo}
      </text>
      {pieza && (
        <>
          <text x={x + 5} y={y + h / 2 + 8} fontSize="6" fill={MUTED} fontFamily="monospace">PIEZA</text>
          <text x={x + 5} y={y + h / 2 + 18} fontSize="8" fill={DIM} fontFamily="monospace">
            {pieza?.length > 28 ? pieza.slice(0, 27) + "…" : pieza}
          </text>
        </>
      )}

      {/* Col 2 — datos técnicos */}
      <text x={x + col1 + 5} y={y + 9}  fontSize="6"  fill={MUTED}  fontFamily="monospace">ESCALA</text>
      <text x={x + col1 + 5} y={y + 20} fontSize="8.5" fill={LABEL} fontFamily="monospace" fontWeight="600">{escala}</text>
      <text x={x + col1 + 5} y={y + h / 2 + 8}  fontSize="6" fill={MUTED} fontFamily="monospace">FOLIO</text>
      <text x={x + col1 + 5} y={y + h / 2 + 18} fontSize="7.5" fill={DIM} fontFamily="monospace">{folio}</text>

      {/* Col 3 — Fenga + hoja */}
      <text x={x + col2 + 5} y={y + 9}  fontSize="7"  fill={GOLD} fontFamily="monospace" fontWeight="800">FENGA</text>
      <text x={x + col2 + 5} y={y + 19} fontSize="5.5" fill={MUTED} fontFamily="monospace">DISEÑO INDUSTRIAL</text>
      <text x={x + col2 + 5} y={y + h / 2 + 8}  fontSize="6" fill={MUTED} fontFamily="monospace">HOJA</text>
      <text x={x + col2 + 5} y={y + h / 2 + 18} fontSize="8" fill={LABEL} fontFamily="monospace" fontWeight="700">{hoja}/{totalHojas}</text>
    </g>
  );
}

// ─── HOJA 1: Vistas generales ortogonales ────────────────────────────────────
function Hoja1Generales({ planos, titulo, folio, onZoom }: {
  planos: PlanosData; titulo: string; folio: string; onZoom?: () => void;
}) {
  const svgW = 1060;
  const svgH = 440;
  const padL = 50;
  const padT = 20;

  // Dividir ancho entre las 3 vistas
  const vFrontalW = 440;
  const vLateralW = 280;
  const vSuperiorW = 290;
  const viewH = 300;

  function renderVista(vista: Vista, ox: number, oy: number, maxW: number, maxH: number, label: string, id: string) {
    if (!vista) return null;
    const sc = autoScale(vista.anchoTotal, vista.altoTotal, maxW - 60, maxH - 60);
    const dW = vista.anchoTotal * sc;
    const dH = vista.altoTotal * sc;
    const x0 = ox + (maxW - dW) / 2;
    const y0 = oy + (maxH - dH) / 2;

    return (
      <g>
        {/* Marco de la vista */}
        <rect x={ox} y={oy} width={maxW} height={maxH} fill="none" stroke="#30363D" strokeWidth="0.7" />
        {/* Bounding box del objeto */}
        <rect x={x0} y={y0} width={dW} height={dH} fill="none" stroke={LINE} strokeWidth="1.4" />
        <ViewElements elementos={vista.elementos || []} ox={x0} oy={y0} scale={sc} />
        <CotasH cotas={vista.cotas || []} ox={x0} oy={y0} drawH={dH} scale={sc} svgId={id} />
        <CotasV cotas={vista.cotas || []} ox={x0} oy={y0} scale={sc} svgId={id} />
        {/* Label de vista */}
        <text x={ox + maxW / 2} y={oy + maxH - 6} textAnchor="middle" fontSize="8" fill={GOLD} fontFamily="monospace" fontWeight="700" letterSpacing="1">
          {label}
        </text>
      </g>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <SheetLabel hoja={1} desc="Vistas ortogonales — Ensamble general" onZoom={onZoom} />
      <svg width={svgW} height={svgH} style={{ background: BG, borderRadius: "0 0 8px 8px", border: "1px solid #30363D", borderTop: "none", display: "block" }}>
        <DimDefs id="h1" />
        <rect width={svgW} height={svgH} fill={`url(#grid-h1)`} />

        {planos.vistaFrontal   && renderVista(planos.vistaFrontal,   padL,                        padT, vFrontalW,  viewH, "VISTA FRONTAL",          "vf")}
        {planos.vistaLateral   && renderVista(planos.vistaLateral,   padL + vFrontalW + 8,        padT, vLateralW,  viewH, "VISTA LATERAL DERECHA",  "vl")}
        {planos.vistaSuperior  && renderVista(planos.vistaSuperior,  padL + vFrontalW + vLateralW + 16, padT, vSuperiorW, viewH, "VISTA SUPERIOR / PLANTA","vs")}

        {/* Notas del plano */}
        <g>
          {(planos.notas || []).slice(0, 5).map((n, i) => (
            <text key={i} x={padL} y={viewH + padT + 36 + i * 14} fontSize="8" fill={MUTED} fontFamily="monospace">
              <tspan fill={GOLD} fontWeight="700">{i + 1}. </tspan>{n}
            </text>
          ))}
        </g>

        <TitleBlock x={0} y={svgH - TITLE_H} w={svgW} titulo={titulo} folio={folio} escala={planos.escala || "1:10"} hoja={1} totalHojas={3} />
      </svg>
    </div>
  );
}

// ─── HOJA 2: Despiece individual de piezas ────────────────────────────────────

function PiezaOrtho({ pieza, detalle, offsetX, offsetY }: {
  pieza: Pieza; detalle: PiezaDetalle | undefined; offsetX: number; offsetY: number;
}) {
  const L = pieza.largoMM;
  const A = pieza.anchoMM;
  const E = pieza.espesorMM;

  // Vistas: frontal (L×A), lateral (E×A), superior (L×E)
  const cellW = 190;
  const cellH = 120;
  const gap   = 14;

  const scF = autoScale(L, A, cellW - 30, cellH - 30);
  const scL = autoScale(E, A, cellW * 0.25, cellH - 30);
  const scS = autoScale(L, E, cellW - 30, cellH * 0.22);

  const fW = L * scF, fH = A * scF;
  const lW = E * scL, lH = A * scL;
  const sW = L * scS, sH = E * scS;

  // Posiciones base
  const bx = offsetX;
  const by = offsetY + 18; // 18px para label de pieza

  // Vista frontal — superior izquierda
  const fx = bx + 4, fy = by + 4;
  // Vista lateral — a la derecha de la frontal
  const lx = bx + cellW + gap, ly = by + 4;
  // Vista superior — debajo de la frontal
  const sx = bx + 4, sy = by + fH + 20;

  const totalW = cellW * 1.35 + gap;
  const totalH = Math.max(fH + sH + 40, lH + 30) + 30;

  return (
    <g>
      {/* Label de pieza */}
      <text x={bx + 4} y={offsetY + 13} fontSize="8.5" fill={GOLD} fontFamily="monospace" fontWeight="800">
        {pieza.pieza?.length > 22 ? pieza.pieza.slice(0, 21) + "…" : pieza.pieza}
      </text>
      <text x={bx + 4} y={offsetY + 24} fontSize="6.5" fill={MUTED} fontFamily="monospace">
        ×{pieza.cantidad}  {pieza.material}
      </text>

      {/* Borde del bloque */}
      <rect x={bx} y={by} width={totalW} height={totalH} fill="#0D1117" stroke="#30363D" strokeWidth="0.6" rx="3" />

      {/* Vista Frontal */}
      <rect x={fx} y={fy} width={fW} height={fH} fill={TIPO_COLORS.panel} stroke={LINE} strokeWidth="1" />
      {/* Agujeros en vista frontal */}
      {(detalle?.agujeros || []).map((ag, i) => {
        const ax = fx + Math.min(ag.xMM * scF, fW - 4);
        const ay = fy + Math.min(ag.yMM * scF, fH - 4);
        const r = Math.max(ag.diametro * scF / 2, 2);
        return (
          <g key={i}>
            <circle cx={ax} cy={ay} r={r} fill="none" stroke={DIM} strokeWidth="0.7" />
            <line x1={ax - r - 2} y1={ay} x2={ax + r + 2} y2={ay} stroke={CENTER} strokeWidth="0.5" strokeDasharray="3,2" />
            <line x1={ax} y1={ay - r - 2} x2={ax} y2={ay + r + 2} stroke={CENTER} strokeWidth="0.5" strokeDasharray="3,2" />
          </g>
        );
      })}
      {/* Ranuras */}
      {(detalle?.ranuras || []).filter(r => r.orientacion === "horizontal").map((ra, i) => {
        const rx = fx + Math.min(ra.xMM * scF, fW - 4);
        const rl = Math.min(ra.longitudMM * scF, fW - 4);
        const rh = Math.max(ra.anchoMM * scF, 1.5);
        return (
          <rect key={i} x={rx} y={fy + fH - rh - 2} width={rl} height={rh} fill="#0A0A0A" stroke={DIM} strokeWidth="0.6" strokeDasharray="2,1" />
        );
      })}
      {/* Cota ancho frontal */}
      <line x1={fx} y1={fy + fH + 8} x2={fx + fW} y2={fy + fH + 8} stroke={DIM} strokeWidth="0.7" markerStart="url(#arr-rev-h2)" markerEnd="url(#arr-h2)" />
      <text x={fx + fW / 2} y={fy + fH + 6} textAnchor="middle" fontSize="6.5" fill={DIM} fontFamily="monospace" fontWeight="700">{L}</text>
      {/* Cota alto frontal */}
      <line x1={fx - 8} y1={fy} x2={fx - 8} y2={fy + fH} stroke={DIM} strokeWidth="0.7" markerStart="url(#arr-rev-h2)" markerEnd="url(#arr-h2)" />
      <text x={fx - 14} y={fy + fH / 2} textAnchor="middle" fontSize="6.5" fill={DIM} fontFamily="monospace" fontWeight="700" transform={`rotate(-90, ${fx - 14}, ${fy + fH / 2})`}>{A}</text>
      <text x={fx + fW / 2} y={fy + fH - 4} textAnchor="middle" fontSize="6" fill={MUTED} fontFamily="monospace">FRONTAL</text>

      {/* Vista Lateral */}
      <rect x={lx} y={ly} width={lW} height={lH} fill={TIPO_COLORS.panel} stroke={LINE} strokeWidth="1" />
      <line x1={lx} y1={ly + lH + 8} x2={lx + lW} y2={ly + lH + 8} stroke={DIM} strokeWidth="0.7" markerStart="url(#arr-rev-h2)" markerEnd="url(#arr-h2)" />
      <text x={lx + lW / 2} y={ly + lH + 6} textAnchor="middle" fontSize="6.5" fill={DIM} fontFamily="monospace" fontWeight="700">{E}</text>
      <text x={lx + lW / 2} y={ly + lH - 4} textAnchor="middle" fontSize="6" fill={MUTED} fontFamily="monospace">LAT.</text>

      {/* Vista Superior */}
      <rect x={sx} y={sy} width={sW} height={sH} fill={TIPO_COLORS.base} stroke={LINE} strokeWidth="1" strokeDasharray="4,2" />
      <line x1={sx} y1={sy + sH + 7} x2={sx + sW} y2={sy + sH + 7} stroke={DIM} strokeWidth="0.7" markerStart="url(#arr-rev-h2)" markerEnd="url(#arr-h2)" />
      <text x={sx + sW / 2} y={sy + sH + 5} textAnchor="middle" fontSize="6.5" fill={DIM} fontFamily="monospace" fontWeight="700">{L}</text>
      <line x1={sx - 7} y1={sy} x2={sx - 7} y2={sy + sH} stroke={DIM} strokeWidth="0.7" markerStart="url(#arr-rev-h2)" markerEnd="url(#arr-h2)" />
      <text x={sx - 13} y={sy + sH / 2} textAnchor="middle" fontSize="6.5" fill={DIM} fontFamily="monospace" fontWeight="700" transform={`rotate(-90, ${sx - 13}, ${sy + sH / 2})`}>{E}</text>
      <text x={sx + sW / 2} y={sy + Math.max(sH - 2, 6)} textAnchor="middle" fontSize="6" fill={MUTED} fontFamily="monospace">PLANTA</text>

      {/* Espesor label */}
      <text x={lx} y={fy - 4} fontSize="6.5" fill={DIM} fontFamily="monospace">e={E}mm</text>

      {/* Notas de canto */}
      {(detalle?.cantosAplicar || []).slice(0, 1).map((c, i) => (
        <text key={i} x={bx + 4} y={by + totalH - 6} fontSize="6" fill={MUTED} fontFamily="monospace">▸ {c.slice(0, 38)}</text>
      ))}
    </g>
  );
}

function Hoja2Despiece({ cortes, piezasDetalladas, titulo, folio, onZoom }: {
  cortes: Pieza[]; piezasDetalladas: PiezaDetalle[]; titulo: string; folio: string; onZoom?: () => void;
}) {
  const detMap: Record<string, PiezaDetalle> = {};
  (piezasDetalladas || []).forEach(pd => { detMap[pd.pieza] = pd; });

  // Grid: 3 columnas
  const COLS = 3;
  const CELL_W = 290;
  const CELL_H = 200;
  const PAD_X = 20;
  const PAD_Y = 20;
  const pieces = cortes.slice(0, 12); // máx 12 piezas por hoja
  const rows = Math.ceil(pieces.length / COLS);
  const svgW = PAD_X * 2 + COLS * CELL_W + (COLS - 1) * 10;
  const svgH = PAD_Y * 2 + rows * CELL_H + TITLE_H;

  return (
    <div style={{ marginBottom: 24 }}>
      <SheetLabel hoja={2} desc="Despiece individual — Vistas ortogonales por pieza" onZoom={onZoom} />
      <svg width={svgW} height={svgH} style={{ background: BG, borderRadius: "0 0 8px 8px", border: "1px solid #30363D", borderTop: "none", display: "block" }}>
        <DimDefs id="h2" />
        <rect width={svgW} height={svgH} fill={`url(#grid-h2)`} />

        {pieces.map((p, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const ox = PAD_X + col * (CELL_W + 10);
          const oy = PAD_Y + row * CELL_H;
          return (
            <PiezaOrtho
              key={i}
              pieza={p}
              detalle={detMap[p.pieza]}
              offsetX={ox}
              offsetY={oy}
            />
          );
        })}

        <TitleBlock x={0} y={svgH - TITLE_H} w={svgW} titulo={titulo} folio={folio} escala="VARIAS" hoja={2} totalHojas={3} />
      </svg>
    </div>
  );
}

// ─── HOJA 3: Cortes transversales y detalles constructivos ────────────────────

function CorteView({ corte, ox, oy, w, h, svgId }: {
  corte: CorteTransversal; ox: number; oy: number; w: number; h: number; svgId: string;
}) {
  const sc = autoScale(
    Math.max(...(corte.elementos || []).map(e => e.x + e.ancho), 100),
    Math.max(...(corte.elementos || []).map(e => e.y + e.alto), 100),
    w - 40, h - 60
  );

  const maxX = Math.max(...(corte.elementos || [{ x: 0, ancho: 100 }]).map(e => e.x + e.ancho));
  const maxY = Math.max(...(corte.elementos || [{ y: 0, alto: 100 }]).map(e => e.y + e.alto));
  const dW = maxX * sc;
  const dH = maxY * sc;
  const x0 = ox + (w - dW) / 2;
  const y0 = oy + 20;

  return (
    <g>
      <rect x={ox} y={oy - 16} width={w} height={16} fill="#161B22" />
      <text x={ox + 5} y={oy - 4} fontSize="8" fill={GOLD} fontFamily="monospace" fontWeight="800">
        [{corte.id}] {corte.nombre}
      </text>
      <text x={ox + w - 5} y={oy - 4} textAnchor="end" fontSize="7" fill={MUTED} fontFamily="monospace">
        Escala {corte.escala || "1:2"}
      </text>

      <rect x={ox} y={oy} width={w} height={h} fill="#0D1117" stroke="#30363D" strokeWidth="0.7" />

      <ViewElements elementos={corte.elementos || []} ox={x0} oy={y0} scale={sc} />
      <CotasH cotas={corte.cotas || []} ox={x0} oy={y0} drawH={dH} scale={sc} svgId={svgId} />
      <CotasV cotas={corte.cotas || []} ox={x0} oy={y0} scale={sc} svgId={svgId} />

      {/* Líneas de corte */}
      <line x1={ox} y1={y0 + dH / 2} x2={x0 - 4} y2={y0 + dH / 2} stroke={CUT} strokeWidth="0.8" strokeDasharray="6,3,1,3" />
      <line x1={x0 + dW + 4} y1={y0 + dH / 2} x2={ox + w} y2={y0 + dH / 2} stroke={CUT} strokeWidth="0.8" strokeDasharray="6,3,1,3" />

      {/* Notas del corte */}
      {(corte.notas || []).map((n, i) => (
        <text key={i} x={ox + 5} y={oy + h - 6 - i * 11} fontSize="6.5" fill={MUTED} fontFamily="monospace">▸ {n}</text>
      ))}

      <text x={ox + w / 2} y={oy + h - 4} textAnchor="middle" fontSize="7" fill={DIM} fontFamily="monospace">{corte.descripcion?.slice(0, 55)}</text>
    </g>
  );
}

function DetalleView({ det, ox, oy, w, h, svgId }: {
  det: DetalleConstructivo; ox: number; oy: number; w: number; h: number; svgId: string;
}) {
  const sc = autoScale(
    Math.max(...(det.elementos || []).map(e => e.x + e.ancho), 80),
    Math.max(...(det.elementos || []).map(e => e.y + e.alto), 80),
    w - 40, h - 70
  );

  const maxX = Math.max(...(det.elementos || [{ x: 0, ancho: 80 }]).map(e => e.x + e.ancho));
  const maxY = Math.max(...(det.elementos || [{ y: 0, alto: 80 }]).map(e => e.y + e.alto));
  const dW = maxX * sc;
  const dH = maxY * sc;
  const x0 = ox + (w - dW) / 2;
  const y0 = oy + 22;

  return (
    <g>
      <rect x={ox} y={oy - 16} width={w} height={16} fill="#161B22" />
      <text x={ox + 5} y={oy - 4} fontSize="8" fill={DIM} fontFamily="monospace" fontWeight="800">
        [{det.id}] {det.nombre}
      </text>
      <rect x={ox} y={oy} width={w} height={h} fill="#0D1117" stroke="#30363D" strokeWidth="0.7" />

      <ViewElements elementos={det.elementos || []} ox={x0} oy={y0} scale={sc} />
      <CotasH cotas={det.cotas || []} ox={x0} oy={y0} drawH={dH} scale={sc} svgId={svgId} />
      <CotasV cotas={det.cotas || []} ox={x0} oy={y0} scale={sc} svgId={svgId} />

      {/* Descripción */}
      <text x={ox + 5} y={oy + h - 28} fontSize="7" fill={MUTED} fontFamily="monospace">
        {det.descripcion?.slice(0, 48)}
      </text>
      {/* Tolerancia */}
      {det.tolerancia && (
        <text x={ox + 5} y={oy + h - 16} fontSize="6.5" fill={DIM} fontFamily="monospace">
          TOL: {det.tolerancia}
        </text>
      )}
      {/* Herramientas */}
      {(det.herramientas || []).slice(0, 3).map((h2, i) => (
        <text key={i} x={ox + 5} y={oy + h - 4 + i * 0} fontSize="6" fill={MUTED} fontFamily="monospace" />
      ))}
    </g>
  );
}

function Hoja3Detalles({ cortesTransversales, detallesConstructivos, titulo, folio, onZoom }: {
  cortesTransversales: CorteTransversal[];
  detallesConstructivos: DetalleConstructivo[];
  titulo: string;
  folio: string;
  onZoom?: () => void;
}) {
  const svgW = 1060;
  const CT_H = 200;
  const DC_H = 180;
  const CT_W = (svgW - 40) / Math.max((cortesTransversales || []).slice(0, 3).length, 1);
  const DC_W = (svgW - 40) / Math.max((detallesConstructivos || []).slice(0, 4).length, 1);

  const cortes = (cortesTransversales || []).slice(0, 3);
  const dets   = (detallesConstructivos || []).slice(0, 4);

  const svgH = 30 + CT_H + 40 + DC_H + TITLE_H + 30;

  return (
    <div style={{ marginBottom: 24 }}>
      <SheetLabel hoja={3} desc="Cortes transversales y detalles constructivos de uniones" onZoom={onZoom} />
      <svg width={svgW} height={svgH} style={{ background: BG, borderRadius: "0 0 8px 8px", border: "1px solid #30363D", borderTop: "none", display: "block" }}>
        <DimDefs id="h3" />
        <rect width={svgW} height={svgH} fill={`url(#grid-h3)`} />

        {/* Label sección cortes */}
        <text x={20} y={18} fontSize="9" fill={GOLD} fontFamily="monospace" fontWeight="800" letterSpacing="1.5">
          A ── CORTES TRANSVERSALES
        </text>
        <line x1={20} y1={22} x2={svgW - 20} y2={22} stroke={CUT} strokeWidth="0.6" strokeDasharray="4,3" />

        {cortes.map((ct, i) => (
          <CorteView
            key={i}
            corte={ct}
            ox={20 + i * (CT_W + 4)}
            oy={30}
            w={CT_W - 4}
            h={CT_H}
            svgId={`ct${i}`}
          />
        ))}

        {/* Label sección detalles */}
        <text x={20} y={30 + CT_H + 24} fontSize="9" fill={DIM} fontFamily="monospace" fontWeight="800" letterSpacing="1.5">
          B ── DETALLES CONSTRUCTIVOS
        </text>
        <line x1={20} y1={30 + CT_H + 28} x2={svgW - 20} y2={30 + CT_H + 28} stroke={DIM} strokeWidth="0.6" strokeDasharray="4,3" />

        {dets.map((det, i) => (
          <DetalleView
            key={i}
            det={det}
            ox={20 + i * (DC_W + 4)}
            oy={30 + CT_H + 36}
            w={DC_W - 4}
            h={DC_H}
            svgId={`dc${i}`}
          />
        ))}

        <TitleBlock x={0} y={svgH - TITLE_H} w={svgW} titulo={titulo} folio={folio} escala="VARIAS" hoja={3} totalHojas={3} />
      </svg>
    </div>
  );
}

// ─── Sheet label header ───────────────────────────────────────────────────────
function SheetLabel({ hoja, desc, onZoom }: { hoja: number; desc: string; onZoom?: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 14px",
      background: "#161B22",
      border: "1px solid #30363D",
      borderRadius: "8px 8px 0 0",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "rgba(245,184,0,0.12)",
        border: "1px solid rgba(245,184,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color: GOLD, fontFamily: "monospace",
      }}>
        {hoja}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: LABEL, fontFamily: "monospace", letterSpacing: "0.5px" }}>
        HOJA {hoja} / 3 — {desc.toUpperCase()}
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
        {["FRONTAL", "LATERAL", "PLANTA"].map((v, i) => (
          <span key={i} style={{
            fontSize: 8, padding: "2px 6px", borderRadius: 10,
            background: "#1C2128", border: "1px solid #30363D",
            color: MUTED, fontFamily: "monospace",
          }}>{v}</span>
        ))}
        {onZoom && (
          <button onClick={onZoom} title="Ver en pantalla completa" style={{
            padding: "2px 8px", borderRadius: 10, fontSize: 9, cursor: "pointer",
            background: "rgba(245,184,0,0.08)", border: "1px solid rgba(245,184,0,0.3)",
            color: GOLD, fontFamily: "monospace", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            🔍 Ampliar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Zoom overlay for a sheet ─────────────────────────────────────────────────
function SheetZoomOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.96)",
      zIndex: 1500,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, cursor: "zoom-out",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: "98vw", maxHeight: "94vh",
        overflow: "auto",
        borderRadius: 8,
        border: "1px solid #30363D",
        cursor: "default",
      }}>
        {children}
      </div>
      <button onClick={onClose} style={{
        position: "absolute", top: 14, right: 14,
        width: 34, height: 34, borderRadius: "50%",
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
        color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>✕</button>
      <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
        Scroll para explorar · Click fuera o ✕ para cerrar
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ManualFabricacion({
  planos, cortes, piezasDetalladas, cortesTransversales, detallesConstructivos, titulo, folio
}: Props) {
  const [zoomedSheet, setZoomedSheet] = useState<number | null>(null);

  if (!planos && !cortes?.length) return null;

  const hasH1 = !!planos;
  const hasH2 = (cortes || []).length > 0;
  const hasH3 = (cortesTransversales || []).length > 0 || (detallesConstructivos || []).length > 0;

  return (
    <div id="manual-fabricacion">
      {/* Header del manual */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px",
        background: "#0D1117",
        border: "1px solid #30363D",
        borderRadius: 8,
        marginBottom: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, fontFamily: "monospace", letterSpacing: "1.5px" }}>
            MANUAL DE FABRICACIÓN — PLANOS TÉCNICOS INDUSTRIALES
          </div>
          <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", marginTop: 3 }}>
            3 hojas · Proyección ortogonal ISO · Cotas en mm · Escala indicada por hoja
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Piezas", val: cortes?.length || 0 },
            { label: "Cortes A-B", val: (cortesTransversales || []).length },
            { label: "Detalles", val: (detallesConstructivos || []).length },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: LABEL, fontFamily: "monospace" }}>{val}</div>
              <div style={{ fontSize: 8, color: MUTED, fontFamily: "monospace" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hoja 1 */}
      {hasH1 && (
        <Hoja1Generales planos={planos!} titulo={titulo} folio={folio} onZoom={() => setZoomedSheet(1)} />
      )}

      {/* Hoja 2 */}
      {hasH2 && (
        <Hoja2Despiece
          cortes={cortes}
          piezasDetalladas={piezasDetalladas || []}
          titulo={titulo}
          folio={folio}
          onZoom={() => setZoomedSheet(2)}
        />
      )}

      {/* Hoja 3 */}
      {hasH3 && (
        <Hoja3Detalles
          cortesTransversales={cortesTransversales || []}
          detallesConstructivos={detallesConstructivos || []}
          titulo={titulo}
          folio={folio}
          onZoom={() => setZoomedSheet(3)}
        />
      )}

      {/* Zoom overlays */}
      {zoomedSheet === 1 && hasH1 && (
        <SheetZoomOverlay onClose={() => setZoomedSheet(null)}>
          <Hoja1Generales planos={planos!} titulo={titulo} folio={folio} />
        </SheetZoomOverlay>
      )}
      {zoomedSheet === 2 && hasH2 && (
        <SheetZoomOverlay onClose={() => setZoomedSheet(null)}>
          <Hoja2Despiece cortes={cortes} piezasDetalladas={piezasDetalladas || []} titulo={titulo} folio={folio} />
        </SheetZoomOverlay>
      )}
      {zoomedSheet === 3 && hasH3 && (
        <SheetZoomOverlay onClose={() => setZoomedSheet(null)}>
          <Hoja3Detalles cortesTransversales={cortesTransversales || []} detallesConstructivos={detallesConstructivos || []} titulo={titulo} folio={folio} />
        </SheetZoomOverlay>
      )}
    </div>
  );
}
