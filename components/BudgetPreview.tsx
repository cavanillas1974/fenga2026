"use client";

import { AlertTriangle, CheckCircle2, Loader2, TrendingUp, ArrowRight } from "lucide-react";

export interface BudgetAnalysis {
  tier: "basico" | "estandar" | "premium" | "luxury";
  tierLabel: string;
  tierColor: string;
  presupuesto: number;
  costoDirecto: number;
  desglose: Array<{ concepto: string; monto: number; porcentaje: number }>;
  materialPrincipal: string;
  acabado: string;
  componentesFactibles: {
    cajones: number;
    puertas: number;
    repisas: number;
    iluminacionLED: boolean;
    vidrio: boolean;
    ruedas: boolean;
    softClose: boolean;
  };
  dimensionesFactibles: { width: number; height: number; depth: number };
  calidad: string;
  recomendacion: string;
  promptTier: string;
  advertencias: string[];
}

const TIER_CONFIG = {
  basico:    { color: "#8B949E", bg: "rgba(139,148,158,0.1)", border: "rgba(139,148,158,0.25)", icon: "◈" },
  estandar:  { color: "#58A6FF", bg: "rgba(88,166,255,0.1)",  border: "rgba(88,166,255,0.25)",  icon: "◆" },
  premium:   { color: "#F5B800", bg: "rgba(245,184,0,0.1)",   border: "rgba(245,184,0,0.25)",   icon: "★" },
  luxury:    { color: "#C084FC", bg: "rgba(192,132,252,0.1)", border: "rgba(192,132,252,0.25)", icon: "♦" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
}

interface Props {
  analysis: BudgetAnalysis | null;
  loading: boolean;
  onApplyComponents?: (comp: BudgetAnalysis["componentesFactibles"], dims: BudgetAnalysis["dimensionesFactibles"]) => void;
}

export default function BudgetPreview({ analysis, loading, onApplyComponents }: Props) {
  if (loading) {
    return (
      <div style={{
        padding: "12px 14px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Loader2 size={14} color="var(--gold)" style={{ animation: "spin 1s linear infinite" }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>Analizando presupuesto...</div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>Consultando precios de mercado MX 2025</div>
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!analysis) return null;

  const tier = TIER_CONFIG[analysis.tier] || TIER_CONFIG.estandar;
  const hasWarnings = (analysis.advertencias || []).length > 0;

  return (
    <div style={{
      background: "var(--surface-2)",
      border: `1px solid ${hasWarnings ? "rgba(248,113,113,0.4)" : tier.border}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>

      {/* Tier badge header */}
      <div style={{
        padding: "9px 14px",
        background: tier.bg,
        borderBottom: `1px solid ${tier.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{tier.icon}</span>
          <div>
            <span style={{ fontSize: 12, fontWeight: 800, color: tier.color }}>{analysis.tierLabel}</span>
            <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 6 }}>— {analysis.materialPrincipal}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: tier.color, fontFamily: "monospace" }}>
            {fmt(analysis.presupuesto)}
          </div>
          <div style={{ fontSize: 9, color: "var(--text-dim)" }}>total con IVA</div>
        </div>
      </div>

      <div style={{ padding: "11px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Cost breakdown bars */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>
            Desglose del presupuesto
          </div>
          {(analysis.desglose || []).map((d, i) => {
            const barColors = [tier.color, "#4ADE80", "#FB923C", "#A78BFA"];
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.concepto}</span>
                  <span style={{ fontSize: 10, color: "var(--text)", fontFamily: "monospace", fontWeight: 600 }}>
                    {fmt(d.monto)}
                    <span style={{ fontWeight: 400, color: "var(--text-dim)", fontSize: 9 }}> ({d.porcentaje}%)</span>
                  </span>
                </div>
                <div style={{ height: 4, background: "#1C2128", borderRadius: 2 }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${d.porcentaje}%`,
                    background: barColors[i % barColors.length],
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feasible dimensions */}
        {analysis.dimensionesFactibles && (
          <div style={{
            display: "flex", gap: 6,
            padding: "7px 10px",
            background: "rgba(88,166,255,0.06)",
            border: "1px solid rgba(88,166,255,0.15)",
            borderRadius: 7,
            alignItems: "center",
          }}>
            <span style={{ fontSize: 9, color: "#58A6FF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>Dimensiones factibles</span>
            <span style={{ fontSize: 11, color: "var(--text)", fontFamily: "monospace", fontWeight: 700 }}>
              {analysis.dimensionesFactibles.width} × {analysis.dimensionesFactibles.height} × {analysis.dimensionesFactibles.depth} cm
            </span>
          </div>
        )}

        {/* Feasible components */}
        {analysis.componentesFactibles && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
              Componentes factibles con este presupuesto
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {[
                { label: `${analysis.componentesFactibles.cajones} cajón${analysis.componentesFactibles.cajones !== 1 ? "es" : ""}`, ok: analysis.componentesFactibles.cajones > 0 },
                { label: `${analysis.componentesFactibles.puertas} puerta${analysis.componentesFactibles.puertas !== 1 ? "s" : ""}`, ok: analysis.componentesFactibles.puertas > 0 },
                { label: `${analysis.componentesFactibles.repisas} repisa${analysis.componentesFactibles.repisas !== 1 ? "s" : ""}`, ok: analysis.componentesFactibles.repisas > 0 },
                { label: "Iluminación LED", ok: analysis.componentesFactibles.iluminacionLED },
                { label: "Soft-close", ok: analysis.componentesFactibles.softClose },
                { label: "Vidrio", ok: analysis.componentesFactibles.vidrio },
                { label: "Ruedas", ok: analysis.componentesFactibles.ruedas },
              ].filter(item => {
                // Always show drawers/doors/shelves even if 0, hide others if false
                if (["Iluminación LED", "Soft-close", "Vidrio", "Ruedas"].includes(item.label)) return item.ok;
                return true;
              }).map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 12, fontSize: 10,
                  background: item.ok ? "rgba(74,222,128,0.08)" : "rgba(139,148,158,0.08)",
                  border: `1px solid ${item.ok ? "rgba(74,222,128,0.25)" : "rgba(139,148,158,0.2)"}`,
                  color: item.ok ? "#4ADE80" : "var(--text-dim)",
                }}>
                  {item.ok ? <CheckCircle2 size={9} /> : <span style={{ fontSize: 9 }}>—</span>}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quality description */}
        <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
          {analysis.calidad}
        </p>

        {/* Recommendation */}
        {analysis.recomendacion && (
          <div style={{
            display: "flex", gap: 7, padding: "7px 10px",
            background: "rgba(245,184,0,0.05)",
            border: "1px solid rgba(245,184,0,0.15)",
            borderRadius: 7,
          }}>
            <TrendingUp size={12} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{analysis.recomendacion}</span>
          </div>
        )}

        {/* Warnings */}
        {(analysis.advertencias || []).map((w, i) => (
          <div key={i} style={{
            display: "flex", gap: 7, padding: "8px 10px",
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 7,
          }}>
            <AlertTriangle size={12} color="#F87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 10, color: "#F87171", lineHeight: 1.5 }}>{w}</span>
          </div>
        ))}

        {/* Apply suggestion button */}
        {onApplyComponents && analysis.componentesFactibles && (
          <button
            onClick={() => onApplyComponents(analysis.componentesFactibles, analysis.dimensionesFactibles)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 14px",
              background: tier.bg,
              border: `1px solid ${tier.border}`,
              borderRadius: 8,
              color: tier.color,
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            <ArrowRight size={12} /> Aplicar componentes sugeridos
          </button>
        )}
      </div>
    </div>
  );
}
