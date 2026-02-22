"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ArrowLeft, RefreshCw, Trash2, ZoomIn, X, ChevronRight,
  Package, Clock, Wrench, CheckCircle2, XCircle, Hammer,
  FileText, Layers, LayoutGrid, MessageSquare, Send,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "pendiente" | "en_produccion" | "completado" | "cancelado";

interface ProjectSummary {
  id: string; createdAt: string; status: Status;
  nombre: string; estilo: string; presupuesto: string; nota?: string;
}

interface TechImage { view: string; label: string; image: string; }

interface ProjectDetail extends ProjectSummary {
  descripcion: string; materiales: string[]; componentes: string[];
  dimensiones: { width: string; height: string; depth: string };
  renderImage: string; techImages: TechImage[];
  techDoc: any; fengarParams: any;
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<Status, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pendiente:     { label: "Pendiente",     color: "#F5B800", bg: "rgba(245,184,0,0.1)",   icon: <Clock size={11} /> },
  en_produccion: { label: "En producción", color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: <Wrench size={11} /> },
  completado:    { label: "Completado",    color: "#4ade80", bg: "rgba(74,222,128,0.1)",  icon: <CheckCircle2 size={11} /> },
  cancelado:     { label: "Cancelado",     color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: <XCircle size={11} /> },
};

const STATUS_ORDER: Status[] = ["pendiente", "en_produccion", "completado", "cancelado"];

const STYLE_COLORS: Record<string, string> = {
  industrial: "#ef4444", minimalista: "#8b5cf6", premium: "#F5B800",
  moderno: "#3b82f6", escandinavo: "#22c55e", rústico: "#f97316",
  "mid-century": "#ec4899",
};

function styleColor(estilo: string) {
  return STYLE_COLORS[estilo.toLowerCase()] || "#6b7280";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProyectosPage() {
  const [projects, setProjects]   = useState<ProjectSummary[]>([]);
  const [selected, setSelected]   = useState<ProjectDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter]       = useState<Status | "todos">("todos");
  const [zoomedImg, setZoomedImg] = useState<{ src: string; label: string } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"render" | "planos" | "ficha">("render");

  // Highlight new project from URL param
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const nid = url.searchParams.get("nuevo");
    if (nid) setNewId(nid);
    loadProjects();
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proyectos");
      if (res.ok) setProjects(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActiveTab("render");
    try {
      const res = await fetch(`/api/proyectos/${id}`);
      if (res.ok) {
        const data: ProjectDetail = await res.json();
        setSelected(data);
        setNoteInput(data.nota || "");
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const updateStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setProjects(ps => ps.map(p => p.id === id ? { ...p, status } : p));
      if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
    }
  };

  const saveNote = async () => {
    if (!selected) return;
    setSavingNote(true);
    const res = await fetch(`/api/proyectos/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: selected.status, nota: noteInput }),
    });
    if (res.ok) {
      setSelected(s => s ? { ...s, nota: noteInput } : s);
      setProjects(ps => ps.map(p => p.id === selected.id ? { ...p, nota: noteInput } : p));
    }
    setSavingNote(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("¿Eliminar este proyecto? Esta acción es permanente.")) return;
    const res = await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects(ps => ps.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  const openInStudio = () => {
    if (!selected) return;
    try {
      localStorage.setItem("fenga_inspiration_transfer", JSON.stringify(selected.fengarParams));
      sessionStorage.setItem("fenga_inspiration_images", JSON.stringify({
        renderImage: selected.renderImage,
        techImages:  selected.techImages,
        techDoc:     selected.techDoc,
        furnitureName: `${selected.nombre} — ${selected.estilo}`,
      }));
    } catch { /* silent */ }
    window.location.href = "/";
  };

  // Stats
  const stats = {
    total:         projects.length,
    pendiente:     projects.filter(p => p.status === "pendiente").length,
    en_produccion: projects.filter(p => p.status === "en_produccion").length,
    completado:    projects.filter(p => p.status === "completado").length,
  };

  const filtered = filter === "todos" ? projects : projects.filter(p => p.status === filter);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .proj-card { animation: fadeIn 0.3s ease both; transition: border-color 0.15s, background 0.15s; }
        .proj-card:hover { border-color: rgba(255,255,255,0.12) !important; background: rgba(255,255,255,0.03) !important; }
        .detail-panel { animation: slideIn 0.3s ease both; }
        .tab-btn { transition: all 0.15s; }
        .status-btn { transition: all 0.15s; }
        .status-btn:hover { opacity: 0.8; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: 56, borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", padding: "0 24px", gap: 16,
        position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)", fontSize: 12, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
        >
          <ArrowLeft size={14} /> Fenga Studio
        </a>
        <div style={{ width: 1, height: 18, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 26, height: 26, background: "#000", border: "1px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/logofenga.png" alt="Fenga" width={20} height={20} style={{ objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.3px" }}>Fábrica</span>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/ Gestión de Proyectos</span>
        </div>

        {/* Stats chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Total",        value: stats.total,         color: "var(--text-dim)" },
            { label: "Pendientes",   value: stats.pendiente,     color: "#F5B800" },
            { label: "En producción",value: stats.en_produccion, color: "#3b82f6" },
            { label: "Completados",  value: stats.completado,    color: "#4ade80" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
            </div>
          ))}
        </div>

        <button onClick={loadProjects} title="Recargar"
          style={{ width: 30, height: 30, borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
          <RefreshCw size={13} />
        </button>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT — Project list */}
        <div style={{ width: 360, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Filter tabs */}
          <div style={{ padding: "12px 16px 0", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
              {([["todos", "Todos"], ["pendiente", "Pendientes"], ["en_produccion", "En producción"], ["completado", "Completados"], ["cancelado", "Cancelados"]] as [Status | "todos", string][]).map(([key, label]) => (
                <button
                  key={key}
                  className="tab-btn"
                  onClick={() => setFilter(key)}
                  style={{
                    padding: "6px 12px", borderRadius: "7px 7px 0 0", fontSize: 11, fontWeight: filter === key ? 700 : 400,
                    background: filter === key ? "var(--surface-2)" : "transparent",
                    border: `1px solid ${filter === key ? "var(--border)" : "transparent"}`,
                    borderBottom: filter === key ? "1px solid var(--surface-2)" : "1px solid transparent",
                    color: filter === key ? "var(--text)" : "var(--text-dim)",
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    marginBottom: filter === key ? "-1px" : 0,
                  }}
                >
                  {label}
                  {key !== "todos" && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: key === "pendiente" ? "#F5B800" : key === "en_produccion" ? "#3b82f6" : key === "completado" ? "#4ade80" : "#6b7280" }}>
                    {projects.filter(p => p.status === key).length}
                  </span>}
                </button>
              ))}
            </div>
          </div>

          {/* Project cards */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>Cargando proyectos...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Package size={32} style={{ color: "var(--text-dim)", marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 6px" }}>Sin proyectos {filter !== "todos" ? `con estado "${STATUS[filter as Status]?.label}"` : ""}</p>
                <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0 }}>Los proyectos de Fenga Inspiración aparecerán aquí.</p>
                <a href="/inspiracion" style={{ display: "inline-block", marginTop: 14, padding: "7px 16px", background: "rgba(245,184,0,0.08)", border: "1px solid rgba(245,184,0,0.25)", borderRadius: 8, color: "var(--gold)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                  ✦ Crear primer proyecto
                </a>
              </div>
            ) : filtered.map((p, i) => {
              const st = STATUS[p.status];
              const isNew = p.id === newId;
              const isSelected = selected?.id === p.id;
              return (
                <div
                  key={p.id}
                  className="proj-card"
                  onClick={() => loadDetail(p.id)}
                  style={{
                    padding: "13px 14px",
                    background: isSelected ? "var(--surface-2)" : "var(--surface)",
                    border: `1px solid ${isSelected ? "rgba(245,184,0,0.3)" : isNew ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                    borderRadius: 12, cursor: "pointer",
                    animationDelay: `${i * 0.04}s`,
                    position: "relative", overflow: "hidden",
                  }}
                >
                  {isNew && (
                    <div style={{ position: "absolute", top: 0, right: 0, background: "#4ade80", color: "#000", fontSize: 8, fontWeight: 900, padding: "2px 8px", borderRadius: "0 12px 0 8px" }}>NUEVO</div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {/* Style avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `${styleColor(p.estilo)}18`,
                      border: `1px solid ${styleColor(p.estilo)}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800,
                      color: styleColor(p.estilo),
                    }}>
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 6 }}>{p.estilo} · {formatDate(p.createdAt)}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                          color: st.color, background: st.bg, border: `1px solid ${st.color}30`,
                        }}>
                          {st.icon} {st.label}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)" }}>{p.presupuesto}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: 12 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Project detail */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!selected && !detailLoading ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Image src="/logofenga.png" alt="Fenga" width={48} height={48} style={{ objectFit: "contain", opacity: 0.3 }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 6px" }}>Selecciona un proyecto</p>
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
                  Haz clic en un proyecto para ver el render aprobado, los 7 planos mecánicos, la ficha técnica y gestionar su estado de producción.
                </p>
              </div>
            </div>
          ) : detailLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Cargando proyecto...</div>
            </div>
          ) : selected && (
            <div className="detail-panel" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Detail header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "var(--surface)" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.4px" }}>{selected.nombre}</h2>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{selected.estilo} · {formatDate(selected.createdAt)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{selected.presupuesto}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={openInStudio} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 8,
                    background: "rgba(245,184,0,0.08)", border: "1px solid rgba(245,184,0,0.25)",
                    color: "var(--gold)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <Hammer size={12} /> Abrir en Fenga Studio
                  </button>
                  <button onClick={() => deleteProject(selected.id)} style={{
                    width: 32, height: 32, borderRadius: 8, background: "transparent",
                    border: "1px solid var(--border)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-dim)",
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div style={{ flex: 1, overflow: "auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: 0 }}>
                {/* Main content */}
                <div style={{ padding: 20, overflow: "auto", borderRight: "1px solid var(--border)" }}>
                  {/* Tabs */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--surface-2)", padding: 3, borderRadius: 10, width: "fit-content" }}>
                    {([
                      { key: "render", label: "Render aprobado",    icon: <LayoutGrid size={11} /> },
                      { key: "planos", label: `Planos (${selected.techImages?.length || 0})`, icon: <Layers size={11} /> },
                      { key: "ficha",  label: "Ficha técnica",       icon: <FileText size={11} /> },
                    ] as { key: "render" | "planos" | "ficha"; label: string; icon: React.ReactNode }[]).map(t => (
                      <button
                        key={t.key}
                        className="tab-btn"
                        onClick={() => setActiveTab(t.key)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: activeTab === t.key ? 700 : 400,
                          background: activeTab === t.key ? "var(--surface)" : "transparent",
                          border: `1px solid ${activeTab === t.key ? "var(--border)" : "transparent"}`,
                          color: activeTab === t.key ? "var(--text)" : "var(--text-dim)",
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>

                  {/* RENDER TAB */}
                  {activeTab === "render" && selected.renderImage && (
                    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", cursor: "zoom-in" }}
                      onClick={() => setZoomedImg({ src: selected.renderImage, label: `Render · ${selected.nombre}` })}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.renderImage} alt="Render aprobado" style={{ width: "100%", display: "block" }} />
                      <div style={{ position: "absolute", bottom: 12, left: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(74,222,128,0.15)", backdropFilter: "blur(6px)", fontSize: 9, fontWeight: 700, color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                        ✓ Render aprobado por el cliente
                      </div>
                      <div style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 7, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ZoomIn size={13} style={{ color: "rgba(255,255,255,0.7)" }} />
                      </div>
                    </div>
                  )}

                  {/* PLANOS TAB */}
                  {activeTab === "planos" && (
                    <div>
                      {(!selected.techImages || selected.techImages.length === 0) ? (
                        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
                          Este proyecto no tiene planos técnicos. Los proyectos creados desde Fenga Inspiración incluyen 7 planos mecánicos automáticamente.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                          {selected.techImages.map((img, i) => (
                            <div
                              key={i}
                              onClick={() => setZoomedImg({ src: img.image, label: img.view })}
                              style={{
                                borderRadius: 10, overflow: "hidden",
                                border: "1px solid var(--border)", cursor: "zoom-in",
                                position: "relative", background: "var(--surface-2)",
                                aspectRatio: "1/1",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.image} alt={img.view} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{img.view}</div>
                                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{img.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* FICHA TAB */}
                  {activeTab === "ficha" && selected.techDoc && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Cut list */}
                      {selected.techDoc.cutList?.length > 0 && (
                        <FichaSection title="Lista de cortes">
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["Pieza", "Material", "Dimensiones", "Cant."].map(h => (
                                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {selected.techDoc.cutList.map((c: any, i: number) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 500, color: "var(--text)" }}>{c.part}</td>
                                  <td style={{ padding: "7px 10px", color: "var(--text-muted)" }}>{c.material}</td>
                                  <td style={{ padding: "7px 10px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 10 }}>{c.dimensions}</td>
                                  <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--gold)", textAlign: "center" }}>{c.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </FichaSection>
                      )}
                      {/* Hardware */}
                      {selected.techDoc.hardware?.length > 0 && (
                        <FichaSection title="Herrajes">
                          {selected.techDoc.hardware.map((h: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                              <div>
                                <div style={{ fontSize: 12, color: "var(--text)" }}>{h.item}</div>
                                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{h.purpose}</div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>×{h.quantity}</span>
                            </div>
                          ))}
                        </FichaSection>
                      )}
                      {/* Assembly */}
                      {selected.techDoc.assemblySteps?.length > 0 && (
                        <FichaSection title="Pasos de ensamble">
                          {selected.techDoc.assemblySteps.map((s: string, i: number) => (
                            <div key={i} style={{ display: "flex", gap: 10 }}>
                              <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(245,184,0,0.1)", border: "1px solid rgba(245,184,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--gold)", flexShrink: 0 }}>{i + 1}</div>
                              <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, paddingTop: 1 }}>{s}</p>
                            </div>
                          ))}
                        </FichaSection>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT PANEL — Status + info */}
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
                  {/* Status control */}
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Estado de producción</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {STATUS_ORDER.map(s => {
                        const sc = STATUS[s];
                        const isActive = selected.status === s;
                        return (
                          <button
                            key={s}
                            className="status-btn"
                            onClick={() => updateStatus(selected.id, s)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                              background: isActive ? sc.bg : "transparent",
                              border: `1px solid ${isActive ? `${sc.color}40` : "var(--border)"}`,
                              color: isActive ? sc.color : "var(--text-dim)",
                              fontSize: 12, fontWeight: isActive ? 700 : 400, textAlign: "left",
                            }}
                          >
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? sc.color : "var(--border)", flexShrink: 0 }} />
                            {sc.label}
                            {isActive && <span style={{ marginLeft: "auto", fontSize: 9 }}>●</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Factory note */}
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <MessageSquare size={11} style={{ color: "var(--text-dim)" }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Nota de fábrica</span>
                    </div>
                    <textarea
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      placeholder="Observaciones internas, notas de producción..."
                      rows={3}
                      style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px", color: "var(--text)", fontSize: 11, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
                    />
                    <button onClick={saveNote} disabled={savingNote} style={{
                      marginTop: 8, width: "100%", padding: "7px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: "rgba(245,184,0,0.08)", border: "1px solid rgba(245,184,0,0.2)", color: "var(--gold)",
                      cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    }}>
                      <Send size={11} />{savingNote ? "Guardando..." : "Guardar nota"}
                    </button>
                  </div>

                  {/* Project info */}
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Información del proyecto</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <InfoRow label="ID" value={selected.id.slice(0, 10) + "…"} mono />
                      <InfoRow label="Fecha" value={formatDate(selected.createdAt)} />
                      <InfoRow label="Estilo" value={selected.estilo} />
                      <InfoRow label="Presupuesto" value={selected.presupuesto} gold />
                      {selected.dimensiones && (
                        <InfoRow label="Dimensiones" value={`${selected.dimensiones.width}×${selected.dimensiones.height}×${selected.dimensiones.depth} cm`} />
                      )}
                      {selected.materiales?.length > 0 && (
                        <InfoRow label="Materiales" value={selected.materiales.slice(0, 2).join(", ")} />
                      )}
                      <InfoRow label="Planos" value={`${selected.techImages?.length || 0} vistas`} />
                    </div>
                  </div>

                  {/* Quotation */}
                  {selected.techDoc?.totalEstimatedCost && (
                    <div style={{ background: "#111", border: "1px solid rgba(245,184,0,0.15)", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,184,0,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Cotización estimada</div>
                      {selected.techDoc.quotation?.map((q: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                          <span style={{ color: "rgba(255,255,255,0.5)" }}>{q.item}</span>
                          <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.7)" }}>${q.cost?.toFixed(0)}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Total</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)", fontFamily: "monospace" }}>
                          ${selected.techDoc.totalEstimatedCost?.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Image zoom overlay ───────────────────────────────────────────────── */}
      {zoomedImg && (
        <div onClick={() => setZoomedImg(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.94)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <div style={{ maxWidth: "min(94vw, 1200px)", width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{zoomedImg.label}</span>
              <button onClick={() => setZoomedImg(null)} style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomedImg.src} alt={zoomedImg.label} style={{ width: "100%", borderRadius: 12, boxShadow: "0 40px 120px rgba(0,0,0,0.8)", cursor: "default" }} onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, background: "#000", border: "1px solid var(--border)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/logofenga.png" alt="Fenga" width={14} height={14} style={{ objectFit: "contain", opacity: 0.7 }} />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>Fenga Fábrica</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/iamanos.png" alt="iamanos" style={{ width: 16, height: 16, objectFit: "contain", opacity: 0.5 }} />
          <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
            Desarrollado por <a href="https://iamanos.com" target="_blank" rel="noreferrer" style={{ color: "var(--text-dim)", textDecoration: "none" }}>iamanos.com</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function FichaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 3, height: 12, borderRadius: 2, background: "var(--gold)" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{title}</span>
      </div>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 0 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, gold, mono }: { label: string; value: string; gold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: gold ? 700 : 500, color: gold ? "var(--gold)" : "var(--text-muted)", textAlign: "right", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}
