"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { DesignParams, GenerationState, STYLES, MATERIALS, Componentes, LogoAnalysis } from "@/lib/types";
import { Loader2, Sparkles, ChevronRight, Upload, X, Minus, Plus } from "lucide-react";
import BudgetPreview, { BudgetAnalysis } from "@/components/BudgetPreview";

interface Props {
  params: DesignParams;
  onChange: (p: DesignParams) => void;
  onGenerate: () => void;
  state: GenerationState;
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const styleBtn = (active: boolean): React.CSSProperties => ({
  background: active ? "rgba(245,184,0,0.1)" : "var(--surface-2)",
  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
  borderRadius: 8,
  padding: "7px 10px",
  color: active ? "var(--gold)" : "var(--text-muted)",
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  fontWeight: active ? 600 : 400,
  transition: "all 0.15s",
  display: "flex",
  alignItems: "center",
  gap: 6,
});

const materialBtn = (active: boolean): React.CSSProperties => ({
  background: active ? "rgba(245,184,0,0.1)" : "var(--surface-2)",
  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
  borderRadius: 20,
  padding: "4px 11px",
  color: active ? "var(--gold)" : "var(--text-muted)",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: active ? 600 : 400,
  transition: "all 0.15s",
});

const s: Record<string, React.CSSProperties> = {
  sidebar: { width: 340, minWidth: 340, height: "100vh", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" },
  header:  { padding: "16px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 },
  logoWrap:{ width: 34, height: 34, background: "#000", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  body:    { flex: 1, overflowY: "auto", padding: "16px 18px 0", display: "flex", flexDirection: "column", gap: 16 },
  section: { display: "flex", flexDirection: "column", gap: 8 },
  label:   { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" },
  textarea:{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 12, lineHeight: 1.6, resize: "none", outline: "none", width: "100%", fontFamily: "inherit", transition: "border-color 0.15s" },
  input:   { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 11px", color: "var(--text)", fontSize: 12, outline: "none", width: "100%", fontFamily: "inherit" },
  dimsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 },
  dimLabel:{ fontSize: 9, color: "var(--text-dim)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" },
  footer:  { padding: "14px 18px 18px", borderTop: "1px solid var(--border)" },
  divider: { height: 1, background: "var(--border)", margin: "2px 0" },
};

// ─── Counter control ────────────────────────────────────────────────────────────
function Counter({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 24, height: 24, border: "1px solid var(--border)", borderRadius: "6px 0 0 6px", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Minus size={10} />
      </button>
      <div style={{ width: 32, height: 24, border: "1px solid var(--border)", borderLeft: "none", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: value > 0 ? "var(--gold)" : "var(--text-dim)", background: "var(--surface-2)" }}>
        {value}
      </div>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 24, height: 24, border: "1px solid var(--border)", borderRadius: "0 6px 6px 0", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Plus size={10} />
      </button>
    </div>
  );
}

// ─── Toggle checkbox ────────────────────────────────────────────────────────────
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 9px", borderRadius: 7,
      background: checked ? "rgba(245,184,0,0.08)" : "var(--surface-2)",
      border: `1px solid ${checked ? "rgba(245,184,0,0.35)" : "var(--border)"}`,
      color: checked ? "var(--gold)" : "var(--text-muted)",
      fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: checked ? 600 : 400,
      transition: "all 0.15s",
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: 3,
        border: `1.5px solid ${checked ? "var(--gold)" : "var(--border-2)"}`,
        background: checked ? "var(--gold)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.15s",
      }}>
        {checked && <span style={{ fontSize: 8, color: "#000", fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      {label}
    </button>
  );
}

// ─── Section header ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", display: "flex", alignItems: "center", gap: 8 }}>
      {children}
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

// ─── Component row ──────────────────────────────────────────────────────────────
function CompRow({ label, value, onChange, children }: { label: string; value: number; onChange: (n: number) => void; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 12, color: value > 0 ? "var(--text)" : "var(--text-muted)", fontWeight: value > 0 ? 600 : 400, flex: 1 }}>{label}</span>
      {children}
      <Counter value={value} onChange={onChange} />
    </div>
  );
}

// ─── Main Sidebar ───────────────────────────────────────────────────────────────
export default function Sidebar({ params, onChange, onGenerate, state }: Props) {
  const isGenerating = state === "generating";
  const canGenerate = params.description.trim().length > 0 && !isGenerating;
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoAnalyzing, setLogoAnalyzing] = useState(false);

  // ── Budget Intelligence ──────────────────────────────────────────────────────
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Refs to always read latest values inside the async timeout
  const latestParams  = useRef(params);
  const latestOnChange = useRef(onChange);
  latestParams.current  = params;
  latestOnChange.current = onChange;

  useEffect(() => {
    const raw = params.budget?.replace(/[^0-9]/g, "");
    const budgetNum = Number(raw) || 0;
    if (budgetNum < 500) {
      setBudgetAnalysis(null);
      setBudgetLoading(false);
      return;
    }
    setBudgetLoading(true);

    const timer = setTimeout(async () => {
      const p = latestParams.current;
      try {
        const res = await fetch("/api/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budget: budgetNum,
            style: p.style,
            description: p.description,
            componentes: p.componentes,
          }),
        });
        if (res.ok) {
          const data: BudgetAnalysis = await res.json();
          setBudgetAnalysis(data);
          // Propagate promptTier so the generate route can use it
          latestOnChange.current({ ...latestParams.current, promptTier: data.promptTier });
        }
      } catch {
        // silent — budget widget just stays hidden
      } finally {
        setBudgetLoading(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.budget]);

  const handleApplyComponents = (
    comp: BudgetAnalysis["componentesFactibles"],
    dims: BudgetAnalysis["dimensionesFactibles"],
  ) => {
    onChange({
      ...params,
      componentes: {
        ...params.componentes,
        cajones:      comp.cajones,
        puertas:      comp.puertas,
        repisas:      comp.repisas,
        iluminacionLED: comp.iluminacionLED,
        vidrio:       comp.vidrio,
        ruedas:       comp.ruedas,
      },
      dimensions: {
        width:  String(dims.width),
        height: String(dims.height),
        depth:  String(dims.depth),
      },
    });
  };

  const setComp = (key: keyof Componentes, value: any) =>
    onChange({ ...params, componentes: { ...params.componentes, [key]: value } });

  const toggleMaterial = (m: string) => {
    const has = params.materials.includes(m);
    onChange({ ...params, materials: has ? params.materials.filter(x => x !== m) : [...params.materials, m] });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      // Show the logo immediately, clear any previous analysis
      latestOnChange.current({ ...latestParams.current, logoBase64: base64, logoAnalysis: undefined });
      // Analyze logo with Gemini Vision
      setLogoAnalyzing(true);
      try {
        const res = await fetch("/api/logo-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoBase64: base64 }),
        });
        if (res.ok) {
          const analysis: LogoAnalysis = await res.json();
          latestOnChange.current({ ...latestParams.current, logoBase64: base64, logoAnalysis: analysis });
        }
      } catch { /* silent — logo still shows without analysis */ } finally {
        setLogoAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const comp = params.componentes;

  return (
    <aside style={s.sidebar}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logoWrap}>
          <Image src="/logofenga.png" alt="Fenga" width={30} height={30} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>Fenga</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>Fábrica de Diseños AI</span>
        </div>
      </div>

      <div style={s.body}>

        {/* ── Logo de marca ─────────────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Logo de marca del cliente</SectionTitle>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
          {params.logoBase64 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={params.logoBase64} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {logoAnalyzing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Loader2 size={11} style={{ animation: "spin 1s linear infinite", color: "var(--gold)" }} />
                      <span style={{ fontSize: 11, color: "var(--gold)" }}>Analizando marca con IA...</span>
                    </div>
                  ) : params.logoAnalysis ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 700 }}>✓ Marca analizada</span>
                        {params.logoAnalysis.text && (
                          <span style={{ fontSize: 10, color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px" }}>
                            {params.logoAnalysis.text}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {params.logoAnalysis.colors.slice(0, 4).map((c, i) => {
                          const hex = c.match(/#[0-9a-fA-F]{3,6}/)?.[0];
                          return hex ? (
                            <div key={i} title={c} style={{ width: 10, height: 10, borderRadius: 2, background: hex, border: "1px solid rgba(255,255,255,0.15)" }} />
                          ) : null;
                        })}
                        <span style={{ fontSize: 9, color: "var(--text-dim)", marginLeft: 2 }}>{params.logoAnalysis.style}</span>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Logo cargado</span>
                  )}
                </div>
                <button onClick={() => { onChange({ ...params, logoBase64: undefined, logoAnalysis: undefined }); if (fileRef.current) fileRef.current.value = ""; }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", display: "flex" }}>
                  <X size={14} />
                </button>
              </div>
              {params.logoAnalysis && (
                <div style={{ fontSize: 9, color: "var(--text-dim)", padding: "5px 8px", background: "rgba(245,184,0,0.04)", border: "1px solid rgba(245,184,0,0.12)", borderRadius: 6, lineHeight: 1.5 }}>
                  {params.logoAnalysis.promptDescription.slice(0, 120)}{params.logoAnalysis.promptDescription.length > 120 ? "…" : ""}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--surface-2)",
              border: "1px dashed var(--border-2)",
              borderRadius: 8,
              color: "var(--text-dim)",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}>
              <Upload size={13} />
              Subir logo — se integrará en el mueble
            </button>
          )}
        </div>

        {/* ── Descripción ────────────────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Descripción del proyecto</SectionTitle>
          <textarea
            style={s.textarea}
            rows={4}
            placeholder="Ej: Estantería para tienda de ropa, 4 módulos verticales, fondo negro, sin puertas, con backpanel. Estructura de acero calibre 14 con repisas de MDF..."
            value={params.description}
            onChange={e => onChange({ ...params, description: e.target.value })}
            onFocus={e => (e.target.style.borderColor = "var(--gold)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* ── Estilo ─────────────────────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Estilo</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {STYLES.map(st => (
              <button
                key={st.id}
                style={styleBtn(params.style === st.id)}
                onClick={() => onChange({ ...params, style: params.style === st.id ? "" : st.id })}
              >
                <span style={{ fontSize: 13 }}>{st.icon}</span>
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Componentes del mueble ─────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Componentes del mueble</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>

            <CompRow label="Cajones" value={comp.cajones} onChange={v => setComp("cajones", v)} />
            <div style={s.divider} />

            <CompRow label="Puertas" value={comp.puertas} onChange={v => setComp("puertas", v)}>
              {comp.puertas > 0 && (
                <select
                  value={comp.tipoPuerta}
                  onChange={e => setComp("tipoPuerta", e.target.value)}
                  style={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 5, padding: "2px 5px", fontFamily: "inherit" }}>
                  <option value="abatible">Abatible</option>
                  <option value="corredera">Corredera</option>
                  <option value="plegable">Plegable</option>
                </select>
              )}
            </CompRow>
            <div style={s.divider} />

            <CompRow label="Repisas / entrepaños" value={comp.repisas} onChange={v => setComp("repisas", v)}>
              {comp.repisas > 0 && (
                <Toggle label="Ajust." checked={comp.repisasAjustables} onChange={v => setComp("repisasAjustables", v)} />
              )}
            </CompRow>

            <div style={s.divider} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Toggle label="Backpanel" checked={comp.backpanel} onChange={v => setComp("backpanel", v)} />
            </div>
          </div>
        </div>

        {/* ── Aditamentos especiales ─────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Aditamentos especiales</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <Toggle label="Iluminación LED"   checked={comp.iluminacionLED}      onChange={v => setComp("iluminacionLED", v)} />
            <Toggle label="Panel de espejo"   checked={comp.espejo}              onChange={v => setComp("espejo", v)} />
            <Toggle label="Vidrio templado"   checked={comp.vidrio}              onChange={v => setComp("vidrio", v)} />
            <Toggle label="Ruedas / rodajas"  checked={comp.ruedas}              onChange={v => setComp("ruedas", v)} />
            <Toggle label="Candado / llave"   checked={comp.candado}             onChange={v => setComp("candado", v)} />
            <Toggle label="Jalones especiales" checked={comp.jalonesEspeciales}  onChange={v => setComp("jalonesEspeciales", v)} />
          </div>
          {comp.iluminacionLED && (
            <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
              {(["tira_blanca", "tira_rgb", "empotrada"] as const).map(t => (
                <button key={t} onClick={() => setComp("tipLED", t)} style={{
                  padding: "3px 9px", borderRadius: 12, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                  background: comp.tipLED === t ? "rgba(245,184,0,0.12)" : "var(--surface-2)",
                  border: `1px solid ${comp.tipLED === t ? "var(--gold)" : "var(--border)"}`,
                  color: comp.tipLED === t ? "var(--gold)" : "var(--text-muted)",
                }}>
                  {t === "tira_blanca" ? "Tira blanca" : t === "tira_rgb" ? "Tira RGB" : "Empotrada"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Materiales ─────────────────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Materiales</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {MATERIALS.map(m => (
              <button key={m} style={materialBtn(params.materials.includes(m))} onClick={() => toggleMaterial(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dimensiones ────────────────────────────────── */}
        <div style={s.section}>
          <SectionTitle>Dimensiones (cm)</SectionTitle>
          <div style={s.dimsRow}>
            {(["width", "height", "depth"] as const).map(d => (
              <div key={d}>
                <div style={s.dimLabel}>{d === "width" ? "Ancho" : d === "height" ? "Alto" : "Prof."}</div>
                <input style={s.input} type="number" placeholder="—"
                  value={params.dimensions[d]}
                  onChange={e => onChange({ ...params, dimensions: { ...params.dimensions, [d]: e.target.value } })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Presupuesto + Cantidad ─────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <div style={s.section}>
            <SectionTitle>Presupuesto (MXN)</SectionTitle>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-dim)", pointerEvents: "none" }}>$</span>
              <input
                style={{ ...s.input, paddingLeft: 22 }}
                type="text"
                inputMode="numeric"
                placeholder="45,000"
                value={params.budget}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const formatted = raw ? Number(raw).toLocaleString("es-MX") : "";
                  onChange({ ...params, budget: formatted });
                }}
              />
            </div>
          </div>
          <div style={s.section}>
            <SectionTitle>Cantidad</SectionTitle>
            <input style={s.input} type="number" min="1" placeholder="1"
              value={params.quantity}
              onChange={e => onChange({ ...params, quantity: e.target.value })}
            />
          </div>
        </div>

        {/* ── Budget Intelligence Preview ─────────────────── */}
        {(budgetLoading || budgetAnalysis) && (
          <BudgetPreview
            analysis={budgetAnalysis}
            loading={budgetLoading}
            onApplyComponents={handleApplyComponents}
          />
        )}

        <div style={{ height: 4 }} />
      </div>

      {/* Desarrollado por */}
      <div style={{ padding: "8px 18px 0", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--surface)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/iamanos.png" alt="iamanos" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 4, opacity: 0.75 }} />
        <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
          Desarrollado por <a href="https://iamanos.com" target="_blank" rel="noreferrer" style={{ color: "var(--text-dim)", textDecoration: "none" }}>iamanos.com</a>
        </span>
      </div>

      {/* CTA */}
      <div style={s.footer}>
        <button
          style={{
            width: "100%", padding: "13px 20px",
            background: !canGenerate ? "var(--border)" : "var(--gold)",
            color: !canGenerate ? "var(--text-dim)" : "#000",
            border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: !canGenerate ? "not-allowed" : "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, transition: "all 0.15s", letterSpacing: "-0.2px",
          }}
          onClick={onGenerate} disabled={!canGenerate}
        >
          {isGenerating ? (
            <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generando...</>
          ) : (
            <><Sparkles size={16} /> Generar Render <ChevronRight size={14} style={{ marginLeft: "auto" }} /></>
          )}
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </aside>
  );
}
