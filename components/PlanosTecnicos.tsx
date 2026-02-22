"use client";

const GOLD = "#F5B800";
const BG = "#0D1117";
const GRID = "#1C2128";
const LINE = "#C0C8D2";
const DIM = "#58A6FF";
const LABEL = "#E6EDF3";
const MUTED = "#8B949E";

const TIPO_COLORS: Record<string, string> = {
  cajones: "#1E3A5F",
  panel: "#1A2F1A",
  espejo: "#1E2D3D",
  estructura: "#2D1B1B",
  base: "#2D2A1A",
  default: "#1C2128",
};

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

const PAD = 60;
const DIM_OFFSET = 28;
const VIEW_W = 320;
const VIEW_H = 260;

function scaleVista(vista: Vista, viewW: number, viewH: number) {
  const scaleX = viewW / vista.anchoTotal;
  const scaleY = viewH / vista.altoTotal;
  return Math.min(scaleX, scaleY) * 0.85;
}

function DrawingView({
  title, vista, svgW, svgH,
}: {
  title: string;
  vista: Vista;
  svgW: number;
  svgH: number;
}) {
  if (!vista) return null;

  const scale = scaleVista(vista, svgW - PAD * 2, svgH - PAD * 2);
  const drawW = vista.anchoTotal * scale;
  const drawH = vista.altoTotal * scale;
  const ox = (svgW - drawW) / 2;
  const oy = PAD;

  return (
    <svg width={svgW} height={svgH} style={{ background: BG, borderRadius: 8, border: `1px solid #30363D` }}>
      {/* Grid */}
      <defs>
        <pattern id={`grid-${title}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={GRID} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={svgW} height={svgH} fill={`url(#grid-${title})`} />

      {/* Main bounding box */}
      <rect x={ox} y={oy} width={drawW} height={drawH} fill="none" stroke={LINE} strokeWidth="1.5" />

      {/* Elements */}
      {(vista.elementos || []).map((el, i) => {
        const ex = ox + el.x * scale;
        const ey = oy + el.y * scale;
        const ew = el.ancho * scale;
        const eh = el.alto * scale;
        const color = TIPO_COLORS[el.tipo?.toLowerCase()] || TIPO_COLORS.default;
        return (
          <g key={i}>
            <rect x={ex} y={ey} width={ew} height={eh} fill={color} stroke={LINE} strokeWidth="0.8" strokeDasharray={el.tipo === "espejo" ? "4,2" : "none"} />
            {ew > 40 && eh > 20 && (
              <text x={ex + ew / 2} y={ey + eh / 2 + 4} textAnchor="middle" fontSize="8" fill={MUTED} fontFamily="monospace">
                {el.nombre?.length > 12 ? el.nombre.slice(0, 12) + "…" : el.nombre}
              </text>
            )}
          </g>
        );
      })}

      {/* Cotas horizontales */}
      {(vista.cotas || []).filter(c => c.tipo === "horizontal").map((c, i) => {
        const cx1 = ox + c.desde * scale;
        const cx2 = ox + c.hasta * scale;
        const cy = oy + drawH + DIM_OFFSET + i * 18;
        return (
          <g key={`h-${i}`}>
            <line x1={cx1} y1={oy + drawH} x2={cx1} y2={cy + 4} stroke={DIM} strokeWidth="0.7" strokeDasharray="3,2" />
            <line x1={cx2} y1={oy + drawH} x2={cx2} y2={cy + 4} stroke={DIM} strokeWidth="0.7" strokeDasharray="3,2" />
            <line x1={cx1} y1={cy} x2={cx2} y2={cy} stroke={DIM} strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />
            <text x={(cx1 + cx2) / 2} y={cy - 4} textAnchor="middle" fontSize="8" fill={DIM} fontFamily="monospace" fontWeight="600">
              {c.valor}
            </text>
          </g>
        );
      })}

      {/* Cotas verticales */}
      {(vista.cotas || []).filter(c => c.tipo === "vertical").map((c, i) => {
        const cy1 = oy + c.desde * scale;
        const cy2 = oy + c.hasta * scale;
        const cx = ox - DIM_OFFSET - i * 18;
        return (
          <g key={`v-${i}`}>
            <line x1={ox} y1={cy1} x2={cx - 4} y2={cy1} stroke={DIM} strokeWidth="0.7" strokeDasharray="3,2" />
            <line x1={ox} y1={cy2} x2={cx - 4} y2={cy2} stroke={DIM} strokeWidth="0.7" strokeDasharray="3,2" />
            <line x1={cx} y1={cy1} x2={cx} y2={cy2} stroke={DIM} strokeWidth="1" />
            <text x={cx - 6} y={(cy1 + cy2) / 2 + 4} textAnchor="middle" fontSize="8" fill={DIM} fontFamily="monospace" fontWeight="600" transform={`rotate(-90, ${cx - 6}, ${(cy1 + cy2) / 2 + 4})`}>
              {c.valor}
            </text>
          </g>
        );
      })}

      {/* Title */}
      <text x={svgW / 2} y={svgH - 10} textAnchor="middle" fontSize="9" fill={GOLD} fontFamily="monospace" fontWeight="700" letterSpacing="1">
        {title.toUpperCase()}
      </text>
    </svg>
  );
}

export default function PlanosTecnicos({ planos, titulo, folio }: { planos: PlanosData; titulo: string; folio: string }) {
  if (!planos) return null;

  return (
    <div>
      {/* Encabezado */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "#0D1117",
        border: "1px solid #30363D",
        borderBottom: "none",
        borderRadius: "8px 8px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {["─", "─ ─", "─ ─ ─"].map((s, i) => (
              <div key={i} style={{ width: 20, height: 2, background: [LINE, DIM, GOLD][i], borderRadius: 1 }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px" }}>
            PLANOS TÉCNICOS — PROYECCIÓN ORTOGONAL
          </span>
        </div>
        <div style={{ fontSize: 10, color: MUTED, fontFamily: "monospace" }}>
          Escala {planos.escala} · {planos.unidades} · {folio}
        </div>
      </div>

      {/* Vistas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 1,
        background: "#30363D",
        border: "1px solid #30363D",
        borderRadius: "0 0 0 0",
      }}>
        <DrawingView title="Vista Frontal" vista={planos.vistaFrontal} svgW={360} svgH={320} />
        <DrawingView title="Vista Lateral" vista={planos.vistaLateral} svgW={260} svgH={320} />
        <DrawingView title="Vista Superior (Planta)" vista={planos.vistaSuperior} svgW={360} svgH={260} />
      </div>

      {/* Leyenda y notas */}
      <div style={{
        background: "#0D1117",
        border: "1px solid #30363D",
        borderTop: "none",
        borderRadius: "0 0 8px 8px",
        padding: "10px 14px",
        display: "flex",
        gap: 24,
        alignItems: "flex-start",
      }}>
        {/* Leyenda de tipos */}
        <div>
          <div style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px", marginBottom: 6 }}>LEYENDA</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(TIPO_COLORS).filter(([k]) => k !== "default").map(([tipo, color]) => (
              <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, background: color, border: `1px solid ${LINE}`, borderRadius: 2 }} />
                <span style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", textTransform: "capitalize" }}>{tipo}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 14, height: 2, background: DIM }} />
              <span style={{ fontSize: 9, color: MUTED, fontFamily: "monospace" }}>Cota (mm)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 14, height: 1, borderTop: `1px dashed ${LINE}` }} />
              <span style={{ fontSize: 9, color: MUTED, fontFamily: "monospace" }}>Elemento virtual</span>
            </div>
          </div>
        </div>

        {/* Notas del plano */}
        {(planos.notas ?? []).length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px", marginBottom: 6 }}>NOTAS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {(planos.notas ?? []).map((n: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", fontWeight: 700 }}>{i + 1}.</span>
                  <span style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", lineHeight: 1.5 }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carátula */}
        <div style={{
          minWidth: 150,
          border: "1px solid #30363D",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <div style={{ background: GOLD, padding: "3px 8px" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#000", fontFamily: "monospace" }}>FENGA DISEÑO INDUSTRIAL</span>
          </div>
          <div style={{ padding: "6px 8px", background: "#0D1117" }}>
            <div style={{ fontSize: 8, color: MUTED, fontFamily: "monospace" }}>PROYECTO</div>
            <div style={{ fontSize: 9, color: LABEL, fontFamily: "monospace", fontWeight: 600 }}>{titulo}</div>
            <div style={{ fontSize: 8, color: MUTED, fontFamily: "monospace", marginTop: 4 }}>FOLIO</div>
            <div style={{ fontSize: 9, color: DIM, fontFamily: "monospace" }}>{folio}</div>
            <div style={{ fontSize: 8, color: MUTED, fontFamily: "monospace", marginTop: 4 }}>FECHA</div>
            <div style={{ fontSize: 9, color: LABEL, fontFamily: "monospace" }}>
              {new Date().toLocaleDateString("es-MX")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
