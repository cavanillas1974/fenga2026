"use client";

interface Concepto {
  concepto: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  total: number;
}

interface CotizacionData {
  conceptos: Concepto[];
  subtotalDirecto: number;
  gastosFijos: number;
  porcentajeGastos: number;
  utilidad: number;
  porcentajeUtilidad: number;
  subtotalFinal: number;
  iva: number;
  totalFinal: number;
  garantia: string;
  tiempoEntregaDias: number;
  validezDias: number;
  condicionesPago: string;
  incluye: string[];
  noIncluye: string[];
}

const CAT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  material:    { bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)",  label: "#58A6FF" },
  mano_obra:   { bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)",   label: "#4ADE80" },
  herraje:     { bg: "rgba(245,184,0,0.08)",   border: "rgba(245,184,0,0.25)",   label: "#F5B800" },
  acabado:     { bg: "rgba(168,85,247,0.08)",  border: "rgba(168,85,247,0.25)",  label: "#C084FC" },
  diseño:      { bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)",  label: "#FB923C" },
  default:     { bg: "rgba(139,148,158,0.08)", border: "rgba(139,148,158,0.2)",  label: "#8B949E" },
};

const CAT_LABELS: Record<string, string> = {
  material:  "Material",
  mano_obra: "Mano de obra",
  herraje:   "Herraje",
  acabado:   "Acabado",
  diseño:    "Diseño",
};

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
}

export default function Cotizador({ cotizacion }: { cotizacion: CotizacionData | null }) {
  if (!cotizacion) return null;

  const conceptos = cotizacion.conceptos || [];

  // Agrupar por categoría para subtotales
  const byCat: Record<string, number> = {};
  conceptos.forEach(c => {
    const cat = c.categoria || "default";
    byCat[cat] = (byCat[cat] || 0) + (c.total || 0);
  });

  const subtotal = cotizacion.subtotalDirecto || conceptos.reduce((a, c) => a + (c.total || 0), 0);
  const gastos   = cotizacion.gastosFijos || subtotal * 0.15;
  const utilidad = cotizacion.utilidad    || (subtotal + gastos) * 0.25;
  const subFinal = cotizacion.subtotalFinal || subtotal + gastos + utilidad;
  const iva      = cotizacion.iva || subFinal * 0.16;
  const total    = cotizacion.totalFinal || subFinal + iva;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Tabla de conceptos */}
      <div>
        {/* Header tabla */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "3fr 80px 70px 80px 80px 90px",
          gap: 0,
          padding: "7px 12px",
          background: "#161B22",
          border: "1px solid #30363D",
          borderRadius: "6px 6px 0 0",
          fontSize: 9,
          fontWeight: 700,
          color: "#8B949E",
          fontFamily: "monospace",
          textTransform: "uppercase" as const,
          letterSpacing: "0.6px",
        }}>
          <span>Concepto</span>
          <span style={{ textAlign: "right" }}>Ctd.</span>
          <span>Unidad</span>
          <span style={{ textAlign: "right" }}>Precio U.</span>
          <span style={{ textAlign: "right" }}>Categoría</span>
          <span style={{ textAlign: "right" }}>Total</span>
        </div>

        {/* Filas */}
        {conceptos.map((c, i) => {
          const cat = CAT_COLORS[c.categoria] || CAT_COLORS.default;
          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "3fr 80px 70px 80px 80px 90px",
              gap: 0,
              padding: "8px 12px",
              background: i % 2 === 0 ? "#0D1117" : "#0F1117",
              borderLeft: "1px solid #30363D",
              borderRight: "1px solid #30363D",
              borderBottom: "1px solid #1C2128",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 11, color: "#E6EDF3", fontFamily: "monospace" }}>{c.concepto}</span>
              <span style={{ fontSize: 11, color: "#8B949E", fontFamily: "monospace", textAlign: "right" }}>{c.cantidad}</span>
              <span style={{ fontSize: 10, color: "#8B949E", fontFamily: "monospace" }}>{c.unidad}</span>
              <span style={{ fontSize: 11, color: "#8B949E", fontFamily: "monospace", textAlign: "right" }}>{fmt(c.costoUnitario)}</span>
              <span style={{ textAlign: "right" }}>
                <span style={{
                  fontSize: 9, padding: "2px 6px", borderRadius: 8,
                  background: cat.bg, border: `1px solid ${cat.border}`,
                  color: cat.label, fontFamily: "monospace",
                }}>
                  {CAT_LABELS[c.categoria] || c.categoria}
                </span>
              </span>
              <span style={{ fontSize: 11, color: "#E6EDF3", fontFamily: "monospace", textAlign: "right", fontWeight: 600 }}>
                {fmt(c.total)}
              </span>
            </div>
          );
        })}

        {/* Borde inferior */}
        <div style={{ height: 1, background: "#30363D" }} />
      </div>

      {/* Resumen financiero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Desglose por categoría */}
        <div style={{
          padding: "14px 16px",
          background: "#0D1117",
          border: "1px solid #30363D",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 9, color: "#F5B800", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 10, textTransform: "uppercase" as const }}>
            Desglose por categoría
          </div>
          {Object.entries(byCat).map(([cat, total]) => {
            const c = CAT_COLORS[cat] || CAT_COLORS.default;
            const pct = subtotal > 0 ? (total / subtotal) * 100 : 0;
            return (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: c.label, fontFamily: "monospace" }}>
                    {CAT_LABELS[cat] || cat}
                  </span>
                  <span style={{ fontSize: 10, color: "#E6EDF3", fontFamily: "monospace", fontWeight: 600 }}>
                    {fmt(total)}
                  </span>
                </div>
                <div style={{ height: 3, background: "#1C2128", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: c.label, borderRadius: 2, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Totales */}
        <div style={{
          padding: "14px 16px",
          background: "#0D1117",
          border: "1px solid #30363D",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}>
          <div style={{ fontSize: 9, color: "#F5B800", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 10, textTransform: "uppercase" as const }}>
            Resumen de costos
          </div>

          {[
            { label: "Subtotal directo",     val: subtotal, muted: true },
            { label: `Gastos fijos (${cotizacion.porcentajeGastos || 15}%)`, val: gastos, muted: true },
            { label: `Utilidad (${cotizacion.porcentajeUtilidad || 25}%)`,   val: utilidad, muted: true },
            { label: "Subtotal s/IVA",       val: subFinal, muted: false },
            { label: "IVA 16%",              val: iva, muted: true },
          ].map(({ label, val, muted }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #1C2128",
            }}>
              <span style={{ fontSize: 11, color: muted ? "#8B949E" : "#E6EDF3", fontFamily: "monospace" }}>{label}</span>
              <span style={{ fontSize: 11, color: muted ? "#8B949E" : "#E6EDF3", fontFamily: "monospace", fontWeight: muted ? 400 : 600 }}>{fmt(val)}</span>
            </div>
          ))}

          {/* Total final */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "10px 12px",
            marginTop: 6,
            background: "rgba(245,184,0,0.08)",
            border: "1px solid rgba(245,184,0,0.3)",
            borderRadius: 6,
          }}>
            <span style={{ fontSize: 13, color: "#F5B800", fontFamily: "monospace", fontWeight: 800 }}>TOTAL c/IVA</span>
            <span style={{ fontSize: 14, color: "#F5B800", fontFamily: "monospace", fontWeight: 900 }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Condiciones y garantía */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {/* KPIs */}
        {[
          { label: "Entrega",   val: `${cotizacion.tiempoEntregaDias || 15} días hábiles` },
          { label: "Validez",   val: `${cotizacion.validezDias || 30} días` },
          { label: "Garantía",  val: cotizacion.garantia || "12 meses" },
        ].map(({ label, val }) => (
          <div key={label} style={{
            padding: "10px 14px",
            background: "#0D1117",
            border: "1px solid #30363D",
            borderRadius: 8,
            textAlign: "center" as const,
          }}>
            <div style={{ fontSize: 9, color: "#8B949E", fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: "#E6EDF3", fontFamily: "monospace", fontWeight: 700 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Condiciones de pago + incluye/no incluye */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Incluye */}
        <div style={{ padding: "12px 14px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: "#4ADE80", fontFamily: "monospace", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const }}>
            ✓ Incluye
          </div>
          {(cotizacion.incluye || []).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "flex-start" }}>
              <span style={{ color: "#4ADE80", fontSize: 10, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 10, color: "#8B949E", fontFamily: "monospace", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
          {cotizacion.condicionesPago && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1C2128" }}>
              <div style={{ fontSize: 9, color: "#8B949E", fontFamily: "monospace", fontWeight: 700, marginBottom: 3 }}>PAGO</div>
              <div style={{ fontSize: 10, color: "#E6EDF3", fontFamily: "monospace" }}>{cotizacion.condicionesPago}</div>
            </div>
          )}
        </div>

        {/* No incluye */}
        <div style={{ padding: "12px 14px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: "#F87171", fontFamily: "monospace", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const }}>
            ✕ No incluye
          </div>
          {(cotizacion.noIncluye || []).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "flex-start" }}>
              <span style={{ color: "#F87171", fontSize: 10, flexShrink: 0 }}>✕</span>
              <span style={{ fontSize: 10, color: "#8B949E", fontFamily: "monospace", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
