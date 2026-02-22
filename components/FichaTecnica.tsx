"use client";

import Image from "next/image";
import { useState } from "react";
import { X, Download, Loader2, FileText, Clock, Package, Wrench, CheckSquare, Scissors, Settings, AlertTriangle, Ruler, Check, ZoomIn } from "lucide-react";
import { DesignParams } from "@/lib/types";
import ManualFabricacion from "./ManualFabricacion";
import DiagramaEnsamble from "./DiagramaEnsamble";
import Cotizador from "./Cotizador";
import { downloadDXF, downloadSVG } from "@/lib/dxf";

interface Props {
  ficha: any | null;
  loading: boolean;
  renderUrl: string;
  params: DesignParams;
  onClose: () => void;
  onDownloadPDF: () => void;
}

export default function FichaTecnica({ ficha, loading, renderUrl, params, onClose, onDownloadPDF }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [zoomRender, setZoomRender] = useState(false);

  const toggleCheck = (i: number) =>
    setChecked(prev => ({ ...prev, [i]: !prev[i] }));

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const totalItems = (ficha?.controlCalidad ?? []).length;

  const handlePrint = async () => {
    if (!ficha) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const cortes  = (ficha.listaCortesDetallada ?? []);
    const herrajes = (ficha.herrajes ?? []);
    const ensamble = (ficha.secuenciaEnsamble ?? []);
    const cot = ficha.cotizacion;
    const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
    const origin = window.location.origin;

    // ── Capture SVG drawings from DOM ──────────────────────────────────────────
    const svgEls = Array.from(document.querySelectorAll("#manual-fabricacion svg"));
    const svgStrings = svgEls.map(svgEl => {
      let s = new XMLSerializer().serializeToString(svgEl);
      // Make SVG responsive for print
      const wm = s.match(/width="(\d+)"/);
      const hm = s.match(/height="(\d+)"/);
      if (wm && hm) {
        if (!s.includes("viewBox")) {
          s = s.replace(`width="${wm[1]}" height="${hm[1]}"`,
            `viewBox="0 0 ${wm[1]} ${hm[1]}" width="100%" height="auto"`);
        } else {
          s = s.replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="auto"');
        }
      }
      return s;
    });

    // ── KPI data ───────────────────────────────────────────────────────────────
    const totalCost = cot?.totalFinal || 0;
    const kpis = [
      { icon: "⏱", label: "Fabricación",  val: ficha.tiempoEstimadoHoras ? `${ficha.tiempoEstimadoHoras} hrs` : "—",  color: "#F5B800" },
      { icon: "📦", label: "Entrega",      val: ficha.tiempoEntregaDias ? `${ficha.tiempoEntregaDias} días` : "—",    color: "#58A6FF" },
      { icon: "✂️",  label: "Piezas",       val: String(cortes.length),                                                color: "#4ADE80" },
      { icon: "🔩", label: "Herrajes",     val: String(herrajes.length) + " items",                                   color: "#FB923C" },
      { icon: "📋", label: "Pasos",        val: String(ensamble.length),                                              color: "#A78BFA" },
      { icon: "💰", label: "Total c/IVA",  val: totalCost ? `$${totalCost.toLocaleString("es-MX")}` : "—",           color: "#F5B800" },
    ];

    // ── Category breakdown for chart ──────────────────────────────────────────
    const catTotals: Record<string, number> = {};
    (cot?.conceptos || []).forEach((c: any) => {
      catTotals[c.categoria] = (catTotals[c.categoria] || 0) + (c.total || 0);
    });
    const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const maxCat = catEntries[0]?.[1] || 1;
    const catColors: Record<string, string> = {
      material: "#58A6FF", mano_obra: "#4ADE80", herraje: "#F5B800",
      acabado: "#A78BFA", diseño: "#FB923C", default: "#8B949E",
    };

    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/>
<title>Ficha Técnica — ${ficha.titulo || "Fenga"} — ${ficha.folio}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{margin:10mm;size:A4}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10px;line-height:1.55}

/* ── Cover ─────────────────────────────────────────────── */
.cover{background:linear-gradient(150deg,#0D1117 0%,#161B22 55%,#1C2128 100%);color:#fff;padding:36px 40px 32px;page-break-after:always;min-height:260mm;display:flex;flex-direction:column}
.cover-brand{display:flex;align-items:center;gap:12px;margin-bottom:32px}
.cover-brand img{width:44px;height:44px;object-fit:contain}
.cover-brand-text{font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#F5B800}
.cover-title{font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:6px;line-height:1.2}
.cover-folio{font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px}
.cover-desc{font-size:11px;color:rgba(255,255,255,0.7);max-width:600px;line-height:1.7;margin-top:10px}
.cover-render{margin-top:24px;flex:1;display:flex;align-items:center;justify-content:center}
.cover-render img{max-width:100%;max-height:320px;object-fit:contain;border-radius:10px;box-shadow:0 0 60px rgba(0,0,0,0.8);border:1px solid rgba(245,184,0,0.2)}
.cover-footer{margin-top:24px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between}
.cover-footer-left{font-size:9px;color:rgba(255,255,255,0.35)}
.cover-footer-right{display:flex;align-items:center;gap:8px}
.cover-footer-right img{width:22px;height:22px;object-fit:contain;opacity:.6}
.cover-footer-right span{font-size:9px;color:rgba(255,255,255,0.35)}

/* ── Layout ─────────────────────────────────────────────── */
.page{padding:16px 20px}
h2{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin:20px 0 8px;padding:5px 0 5px 10px;border-left:3px solid #F5B800;color:#1a1a1a;display:flex;align-items:center;gap:6px}
h2.blue{border-left-color:#58A6FF}
h2.green{border-left-color:#4ADE80}
h2.purple{border-left-color:#A78BFA}

/* ── Dashboard ───────────────────────────────────────────── */
.dashboard{background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin-bottom:16px}
.dash-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#888;margin-bottom:12px}
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px}
.kpi{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:10px 8px;text-align:center;position:relative;overflow:hidden}
.kpi::before{content:"";position:absolute;top:0;left:0;right:0;height:3px}
.kpi-gold::before{background:#F5B800}
.kpi-blue::before{background:#58A6FF}
.kpi-green::before{background:#4ADE80}
.kpi-orange::before{background:#FB923C}
.kpi-purple::before{background:#A78BFA}
.kpi-icon{font-size:16px;margin-bottom:4px}
.kpi-val{font-size:13px;font-weight:900;color:#1a1a1a;margin-bottom:2px}
.kpi-lbl{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:.6px}

/* ── Charts ──────────────────────────────────────────────── */
.chart-row{display:flex;gap:20px;margin-top:8px}
.chart-col{flex:1}
.chart-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#666;margin-bottom:6px}
.bar-item{margin-bottom:5px}
.bar-label{display:flex;justify-content:space-between;margin-bottom:2px}
.bar-label span:first-child{font-size:9px;color:#444}
.bar-label span:last-child{font-size:9px;font-weight:700;color:#1a1a1a}
.bar-track{height:6px;background:#ebebeb;border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px}

/* ── Tables ──────────────────────────────────────────────── */
table{width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:0}
th{background:#F5B800;color:#000;padding:5px 8px;text-align:left;font-weight:800;font-size:8.5px;text-transform:uppercase;letter-spacing:.4px}
td{padding:5px 8px;border-bottom:1px solid #ebebeb}
tr:nth-child(even) td{background:#fafafa}
.col-key{font-weight:700;width:35%;color:#1a1a1a}
.total-row td{font-weight:800;background:#FFF8E0!important;border-top:2px solid #F5B800}
.iva-row td{color:#666;background:#fafafa!important}
.final-row td{font-weight:900;font-size:12px!important;background:#F5B800!important;color:#000}

/* ── Assembly steps ──────────────────────────────────────── */
.paso{display:flex;gap:10px;padding:8px 10px;border:1px solid #ebebeb;border-radius:6px;margin-bottom:5px;page-break-inside:avoid}
.paso-num{width:26px;height:26px;border-radius:50%;background:#F5B800;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:10px;flex-shrink:0;color:#000}
.paso-body strong{font-size:10px}
.paso-body .desc{font-size:9.5px;color:#555;margin-top:1px}
.paso-body .tools{font-size:8.5px;color:#999;margin-top:2px}

/* ── SVG drawings ────────────────────────────────────────── */
.drawing-wrap{background:#0D1117;border-radius:8px;overflow:hidden;margin-bottom:12px;page-break-inside:avoid}
.drawing-wrap svg{width:100%;height:auto;display:block}

/* ── QC checklist ────────────────────────────────────────── */
.qc-item{display:flex;gap:10px;padding:7px 10px;border:1px solid #ebebeb;border-radius:6px;margin-bottom:4px;page-break-inside:avoid}
.qc-box{width:14px;height:14px;border:2px solid #ccc;border-radius:3px;flex-shrink:0;margin-top:1px}
.qc-punto{font-size:10px;font-weight:600}
.qc-criterio{font-size:9px;color:#666;margin-top:1px}

/* ── Grid helpers ────────────────────────────────────────── */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.no-break{page-break-inside:avoid}

/* ── Footer ──────────────────────────────────────────────── */
.doc-footer{margin-top:24px;padding:10px 0 0;border-top:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between}
.doc-footer-left{font-size:8.5px;color:#aaa}
.doc-footer-right{display:flex;align-items:center;gap:7px}
.doc-footer-right img{width:18px;height:18px;object-fit:contain}
.doc-footer-right span{font-size:8.5px;color:#aaa}

@media print{.page-break{page-break-before:always}}
</style></head><body>

<!-- ════════════════════════════════════════════════════════
     PORTADA
══════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-brand">
    <img src="${origin}/logofenga.png" onerror="this.style.display='none'" />
    <span class="cover-brand-text">Fenga Diseño Industrial</span>
  </div>
  <div>
    <div style="font-size:9px;color:rgba(245,184,0,0.7);font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Ficha Técnica de Producción</div>
    <div class="cover-title">${ficha.titulo || "Proyecto Fenga"}</div>
    <div class="cover-folio">Folio: <strong>${ficha.folio}</strong> &nbsp;·&nbsp; ${fecha}</div>
    ${params.budget ? `<div class="cover-folio">Presupuesto: <strong>$${params.budget} MXN</strong></div>` : ""}
    <div class="cover-desc">${ficha.descripcionTecnica || ""}</div>
  </div>
  <div class="cover-render">
    <img src="${renderUrl}" />
  </div>
  <div class="cover-footer">
    <div class="cover-footer-left">${ficha.folio} &nbsp;·&nbsp; Documento generado automáticamente &nbsp;·&nbsp; ${fecha}</div>
    <div class="cover-footer-right">
      <img src="${origin}/iamanos.png" onerror="this.style.display='none'" />
      <span>Desarrollado por iamanos.com</span>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     CONTENIDO
══════════════════════════════════════════════════════════ -->
<div class="page">

<!-- DASHBOARD ──────────────────────────────────────────── -->
<div class="dashboard">
  <div class="dash-title">Dashboard de producción — Resumen ejecutivo</div>
  <div class="kpi-grid">
    ${kpis.map((k, i) => {
      const colorClass = ["kpi-gold","kpi-blue","kpi-green","kpi-orange","kpi-purple","kpi-gold"][i];
      return `<div class="kpi ${colorClass}"><div class="kpi-icon">${k.icon}</div><div class="kpi-val">${k.val}</div><div class="kpi-lbl">${k.label}</div></div>`;
    }).join("")}
  </div>
  <div class="chart-row">
    ${catEntries.length > 0 ? `
    <div class="chart-col">
      <div class="chart-label">Desglose por categoría</div>
      ${catEntries.map(([cat, val]) => {
        const pct = Math.round((val / (totalCost || 1)) * 100);
        const col = catColors[cat] || catColors.default;
        return `<div class="bar-item"><div class="bar-label"><span>${cat.replace("_"," ")}</span><span>$${val.toLocaleString("es-MX")} (${pct}%)</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round((val/maxCat)*100)}%;background:${col}"></div></div></div>`;
      }).join("")}
    </div>` : ""}
    <div class="chart-col">
      <div class="chart-label">Estado del proyecto</div>
      ${[
        { label: "Lista de cortes",  pct: cortes.length > 0 ? 100 : 0,  col: "#4ADE80" },
        { label: "Materiales",       pct: (ficha.materiales||[]).length > 0 ? 100 : 0, col: "#58A6FF" },
        { label: "Herrajes",         pct: herrajes.length > 0 ? 100 : 0, col: "#F5B800" },
        { label: "Secuencia ensamble", pct: ensamble.length > 0 ? 100 : 0, col: "#A78BFA" },
        { label: "Planos técnicos",  pct: svgStrings.length > 0 ? 100 : 0, col: "#FB923C" },
        { label: "Cotización",       pct: cot ? 100 : 0, col: "#F5B800" },
      ].map(({ label, pct, col }) =>
        `<div class="bar-item"><div class="bar-label"><span>${label}</span><span style="color:${pct===100?"#22c55e":"#888"}">${pct===100?"✓ Completo":"Pendiente"}</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${col}"></div></div></div>`
      ).join("")}
    </div>
  </div>
</div>

<!-- ESPECIFICACIONES ──────────────────────────────────────── -->
${(ficha.especificaciones ?? []).length > 0 ? `
<h2>⚙ Especificaciones técnicas</h2>
<div class="grid2">
  <table><tbody>
  ${(ficha.especificaciones ?? []).slice(0, Math.ceil((ficha.especificaciones||[]).length/2)).map((e: any, i: number) =>
    `<tr><td class="col-key">${e.clave}</td><td>${e.valor}</td></tr>`
  ).join("")}
  </tbody></table>
  <table><tbody>
  ${(ficha.especificaciones ?? []).slice(Math.ceil((ficha.especificaciones||[]).length/2)).map((e: any, i: number) =>
    `<tr><td class="col-key">${e.clave}</td><td>${e.valor}</td></tr>`
  ).join("")}
  </tbody></table>
</div>` : ""}

<!-- LISTA DE CORTES ────────────────────────────────────────── -->
${cortes.length > 0 ? `
<h2 class="blue">✂ Lista de cortes (${cortes.length} piezas)</h2>
<table><thead><tr><th>Pieza</th><th>Cant.</th><th>Largo mm</th><th>Ancho mm</th><th>Esp. mm</th><th>Material</th><th>Observaciones</th></tr></thead>
<tbody>${cortes.map((c: any, i: number) => `<tr><td style="font-weight:700">${c.pieza}</td><td>${c.cantidad}</td><td>${c.largoMM}</td><td>${c.anchoMM}</td><td>${c.espesorMM}</td><td>${c.material}</td><td style="color:#666">${c.observaciones||"—"}</td></tr>`).join("")}</tbody></table>` : ""}

<!-- MATERIALES + HERRAJES ──────────────────────────────────── -->
<div class="grid2 no-break" style="margin-top:0">
${(ficha.materiales ?? []).length > 0 ? `
<div>
<h2 class="green">📦 Materiales</h2>
<table><thead><tr><th>Material</th><th>Especificación</th><th>Cant.</th><th>Und.</th><th>Color</th></tr></thead>
<tbody>${(ficha.materiales ?? []).map((m: any) => `<tr><td style="font-weight:700">${m.descripcion}</td><td>${m.especificacion}</td><td>${m.cantidad}</td><td>${m.unidad}</td><td>${m.codigoColor||"—"}</td></tr>`).join("")}</tbody></table>
</div>` : ""}
${herrajes.length > 0 ? `
<div>
<h2>🔩 Herrajes y fijaciones</h2>
<table><thead><tr><th>Herraje</th><th>Especificación</th><th>Cant.</th><th>Uso</th></tr></thead>
<tbody>${herrajes.map((h: any) => `<tr><td style="font-weight:700">${h.descripcion}</td><td>${h.especificacion}</td><td>${h.cantidad} ${h.unidad}</td><td>${h.uso}</td></tr>`).join("")}</tbody></table>
</div>` : ""}
</div>

<!-- SECUENCIA DE ENSAMBLE ──────────────────────────────────── -->
${ensamble.length > 0 ? `
<h2 class="purple">▶ Secuencia de ensamble (${ensamble.length} pasos)</h2>
${ensamble.map((s: any) => `
<div class="paso">
  <div class="paso-num">${String(s.paso||"").padStart(2,"0")}</div>
  <div class="paso-body">
    <strong>${s.operacion}</strong>${s.tiempoMin ? ` <span style="color:#888;font-weight:400;font-size:9px">~${s.tiempoMin} min</span>` : ""}
    <div class="desc">${s.descripcion}</div>
    ${s.herramientas?.length ? `<div class="tools">${s.herramientas.join(" · ")}</div>` : ""}
  </div>
</div>`).join("")}` : ""}

<!-- CONTROL DE CALIDAD ─────────────────────────────────────── -->
${(ficha.controlCalidad ?? []).length > 0 ? `
<h2 class="green">✓ Control de calidad (${(ficha.controlCalidad||[]).length} puntos)</h2>
<div class="grid2">
${(ficha.controlCalidad ?? []).map((c: any) => `
<div class="qc-item no-break">
  <div class="qc-box"></div>
  <div>
    <div class="qc-punto">${c.punto}</div>
    <div class="qc-criterio">${c.criterio}</div>
  </div>
</div>`).join("")}
</div>` : ""}

<!-- PLANOS TÉCNICOS ─────────────────────────────────────────── -->
${svgStrings.length > 0 ? `
<div class="page-break"></div>
<h2>📐 Manual de fabricación — Planos técnicos industriales</h2>
<p style="font-size:9px;color:#888;margin-bottom:12px">Proyección ortogonal ISO · Cotas en mm · ${svgStrings.length} hoja${svgStrings.length>1?"s":""}</p>
${svgStrings.map((svgStr, i) => `
<div class="drawing-wrap no-break" style="margin-bottom:16px">
  <div style="padding:6px 12px;background:#161B22;border-bottom:1px solid #30363D;font-size:9px;font-weight:800;color:#F5B800;font-family:monospace;letter-spacing:1px">HOJA ${i+1} / ${svgStrings.length} — PLANOS TÉCNICOS</div>
  ${svgStr}
</div>`).join("")}` : ""}

<!-- COTIZACIÓN ─────────────────────────────────────────────── -->
${cot ? `
<div class="page-break"></div>
<h2>💰 Cotización de producción</h2>
<table><thead><tr><th>Concepto</th><th>Ctd.</th><th>Unidad</th><th>Precio U.</th><th>Categoría</th><th>Total</th></tr></thead>
<tbody>
${(cot.conceptos||[]).map((c: any) => `<tr><td>${c.concepto}</td><td>${c.cantidad}</td><td>${c.unidad}</td><td>$${(c.costoUnitario||0).toLocaleString("es-MX")}</td><td>${c.categoria}</td><td style="font-weight:700">$${(c.total||0).toLocaleString("es-MX")}</td></tr>`).join("")}
<tr class="total-row"><td colspan="5">Subtotal directo</td><td>$${(cot.subtotalDirecto||0).toLocaleString("es-MX")}</td></tr>
<tr class="iva-row"><td colspan="5">Gastos fijos (${cot.porcentajeGastos||15}%)</td><td>$${(cot.gastosFijos||0).toLocaleString("es-MX")}</td></tr>
<tr class="iva-row"><td colspan="5">Utilidad (${cot.porcentajeUtilidad||25}%)</td><td>$${(cot.utilidad||0).toLocaleString("es-MX")}</td></tr>
<tr class="iva-row"><td colspan="5">IVA 16%</td><td>$${(cot.iva||0).toLocaleString("es-MX")}</td></tr>
<tr class="final-row"><td colspan="5" style="font-size:12px">TOTAL CON IVA</td><td style="font-size:14px">$${(cot.totalFinal||0).toLocaleString("es-MX")}</td></tr>
</tbody></table>
<p style="margin-top:8px;font-size:9px;color:#666;padding:8px 12px;background:#FFF8E0;border-left:3px solid #F5B800;border-radius:0 4px 4px 0">
  Entrega: ${cot.tiempoEntregaDias||15} días hábiles &nbsp;·&nbsp; Validez: ${cot.validezDias||30} días &nbsp;·&nbsp; Garantía: ${cot.garantia||"12 meses"} &nbsp;·&nbsp; ${cot.condicionesPago||"50% anticipo, 50% contra entrega"}
</p>` : ""}

<!-- NOTAS ─────────────────────────────────────────────────── -->
${ficha.notasTaller ? `<div style="margin-top:14px;padding:10px 12px;background:#FFF8E0;border-left:3px solid #F5B800;border-radius:0 6px 6px 0"><div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#c49000;margin-bottom:4px">Nota de taller</div><p style="font-size:10px;color:#444;line-height:1.6">${ficha.notasTaller}</p></div>` : ""}
${ficha.notas ? `<div style="margin-top:10px;padding:10px 12px;background:#f0fff4;border-left:3px solid #22c55e;border-radius:0 6px 6px 0"><div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#16a34a;margin-bottom:4px">Nota para el cliente</div><p style="font-size:10px;color:#444;line-height:1.6">${ficha.notas}</p></div>` : ""}

<!-- FOOTER ─────────────────────────────────────────────────── -->
<div class="doc-footer">
  <div class="doc-footer-left">
    <img src="${origin}/logofenga.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px" onerror="this.style.display='none'" />
    Fenga Diseño Industrial &nbsp;·&nbsp; Folio ${ficha.folio} &nbsp;·&nbsp; ${fecha} &nbsp;·&nbsp; Documento generado automáticamente
  </div>
  <div class="doc-footer-right">
    <img src="${origin}/iamanos.png" onerror="this.style.display='none'" />
    <span>Desarrollado por iamanos.com</span>
  </div>
</div>

</div><!-- /page -->
<script>window.onload=()=>window.print();</script>
</body></html>`);
    w.document.close();
  };
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.88)",
      zIndex: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "min(98vw, 1200px)",
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
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          background: "var(--surface-2)",
        }}>
          <div style={{
            width: 30, height: 30,
            background: "rgba(245,184,0,0.12)",
            border: "1px solid rgba(245,184,0,0.3)",
            borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText size={14} color="var(--gold)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
              {loading ? "Generando ficha de producción..." : ficha?.titulo || "Ficha Técnica de Producción"}
            </div>
            {ficha && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                Folio {ficha.folio} · {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} · Fenga Diseño Industrial
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {ficha && (
              <button onClick={handlePrint} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px",
                background: "var(--gold)", border: "none",
                borderRadius: 7, color: "#000",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
                <Download size={13} /> Descargar PDF
              </button>
            )}
            <button onClick={onClose} style={{
              width: 30, height: 30,
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 7, color: "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Loader2 size={28} color="var(--gold)" style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>Analizando proyecto...</p>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                Generando lista de cortes, herrajes, secuencia de ensamble y control de calidad
              </p>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : ficha ? (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* LEFT PANEL — resumen */}
            <div style={{
              width: 260, flexShrink: 0,
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
              display: "flex", flexDirection: "column",
            }}>
              {/* Render con zoom */}
              <div
                style={{ position: "relative", width: "100%", aspectRatio: "4/3", flexShrink: 0, cursor: "zoom-in" }}
                onClick={() => setZoomRender(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={renderUrl} alt="Render" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 55%, rgba(0,0,0,0.7))" }} />
                {/* Zoom hint */}
                <div className="zoom-hint" style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0 }} className="zoom-icon">
                    <ZoomIn size={16} color="#fff" />
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 10, left: 12 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.8px", textTransform: "uppercase" }}>Render aprobado · Click para ampliar</div>
                </div>
              </div>
              {/* Zoom overlay */}
              {zoomRender && (
                <div
                  onClick={() => setZoomRender(false)}
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={renderUrl} alt="Render" style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 0 60px rgba(0,0,0,0.8)" }} />
                  <button onClick={() => setZoomRender(false)} style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <style>{`.zoom-hint:hover { background: rgba(0,0,0,0.2) !important; } .zoom-hint:hover .zoom-icon { opacity: 1 !important; }`}</style>

              <div style={{ padding: "14px 14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* KPIs */}
                <KPI label="Tiempo fabricación" value={ficha.tiempoEstimadoHoras ? `${ficha.tiempoEstimadoHoras} horas` : "—"} icon={<Clock size={12} />} />
                <KPI label="Entrega estimada" value={ficha.tiempoEntregaDias ? `${ficha.tiempoEntregaDias} días hábiles` : "—"} icon={<Clock size={12} />} />
                <KPI label="Piezas de corte" value={`${(ficha.listaCortesDetallada ?? []).length} piezas`} icon={<Scissors size={12} />} />
                <KPI label="Tipos de herraje" value={`${(ficha.herrajes ?? []).length} items`} icon={<Settings size={12} />} />
                <KPI label="Pasos de ensamble" value={`${(ficha.secuenciaEnsamble ?? []).length} pasos`} icon={<Package size={12} />} />
                {params.budget && <KPI label="Presupuesto" value={`$${params.budget} MXN`} icon={<span style={{ fontSize: 10, fontWeight: 700 }}>$</span>} gold />}

                {/* Acabado final */}
                {ficha.acabadoFinal && (
                  <div style={{ marginTop: 4 }}>
                    <SectionMini>Acabado final</SectionMini>
                    <div style={{
                      padding: 10, borderRadius: 8,
                      background: "var(--surface-2)", border: "1px solid var(--border)",
                      marginTop: 6,
                    }}>
                      <Row label="Tipo" value={ficha.acabadoFinal.tipo} />
                      <Row label="Producto" value={ficha.acabadoFinal.producto} />
                      <Row label="Color" value={ficha.acabadoFinal.codigoColor} />
                      <Row label="Capas" value={`${ficha.acabadoFinal.capas} capas`} />
                      {ficha.acabadoFinal.instrucciones && (
                        <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.5 }}>
                          {ficha.acabadoFinal.instrucciones}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Herramientas */}
                {(ficha.herramientasNecesarias ?? []).length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <SectionMini>Herramientas necesarias</SectionMini>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {(ficha.herramientasNecesarias ?? []).map((h: string, i: number) => (
                        <span key={i} style={{
                          padding: "3px 8px", borderRadius: 12,
                          background: "var(--surface-2)", border: "1px solid var(--border)",
                          fontSize: 10, color: "var(--text-muted)",
                        }}>{h}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nota taller */}
                {ficha.notasTaller && (
                  <div style={{
                    marginTop: 4, padding: 10, borderRadius: 8,
                    background: "rgba(255,160,0,0.06)", border: "1px solid rgba(255,160,0,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                      <AlertTriangle size={11} color="#F5B800" />
                      <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>Nota de taller</span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>{ficha.notasTaller}</p>
                  </div>
                )}

                {/* Fenga */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <Image src="/logofenga.png" alt="Fenga" width={18} height={18} style={{ objectFit: "contain" }} />
                  <span style={{ fontSize: 10, color: "var(--text-dim)" }}>Fenga · Diseño Industrial AI</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL — documento técnico */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Descripción técnica */}
              <Section icon={<FileText size={13} />} title="Descripción técnica">
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                  {ficha.descripcionTecnica}
                </p>
              </Section>

              {/* Especificaciones generales */}
              {(ficha.especificaciones ?? []).length > 0 && (
                <Section icon={<Settings size={13} />} title="Especificaciones generales">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    {(ficha.especificaciones ?? []).map((e: any, i: number) => (
                      <div key={i} style={{
                        background: i % 4 < 2 ? "var(--surface)" : "var(--surface-2)",
                        padding: "8px 12px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{e.clave}</span>
                        <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, textAlign: "right" }}>{e.valor}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Lista de cortes */}
              {(ficha.listaCortesDetallada ?? []).length > 0 && (
                <Section icon={<Scissors size={13} />} title="Lista de cortes">
                  <TableHeader cols={["Pieza", "Cant.", "Largo mm", "Ancho mm", "Esp. mm", "Material", "Obs."]} widths="2fr 40px 80px 80px 70px 1.5fr 1.5fr" />
                  {(ficha.listaCortesDetallada ?? []).map((c: any, i: number) => (
                    <TableRow key={i} odd={i % 2 !== 0} cols={[
                      c.pieza,
                      String(c.cantidad),
                      String(c.largoMM),
                      String(c.anchoMM),
                      String(c.espesorMM),
                      c.material,
                      c.observaciones || "—",
                    ]} widths="2fr 40px 80px 80px 70px 1.5fr 1.5fr" highlight={[0]} />
                  ))}
                </Section>
              )}

              {/* Materiales */}
              {(ficha.materiales ?? []).length > 0 && (
                <Section icon={<Package size={13} />} title="Materiales y cantidades">
                  <TableHeader cols={["Descripción", "Especificación", "Cant.", "Unidad", "Color/Código", "Proveedor"]} widths="2fr 1.5fr 60px 60px 1fr 1fr" />
                  {(ficha.materiales ?? []).map((m: any, i: number) => (
                    <TableRow key={i} odd={i % 2 !== 0} cols={[
                      m.descripcion,
                      m.especificacion,
                      String(m.cantidad),
                      m.unidad,
                      m.codigoColor || "—",
                      m.proveedor || "—",
                    ]} widths="2fr 1.5fr 60px 60px 1fr 1fr" highlight={[0]} />
                  ))}
                </Section>
              )}

              {/* Herrajes */}
              {(ficha.herrajes ?? []).length > 0 && (
                <Section icon={<Wrench size={13} />} title="Herrajes y fijaciones">
                  <TableHeader cols={["Descripción", "Especificación", "Cant.", "Unidad", "Uso"]} widths="2fr 1.5fr 60px 60px 2fr" />
                  {(ficha.herrajes ?? []).map((h: any, i: number) => (
                    <TableRow key={i} odd={i % 2 !== 0} cols={[
                      h.descripcion,
                      h.especificacion,
                      String(h.cantidad),
                      h.unidad,
                      h.uso,
                    ]} widths="2fr 1.5fr 60px 60px 2fr" highlight={[0]} />
                  ))}
                </Section>
              )}

              {/* Secuencia de ensamble — instrucciones gráficas */}
              {(ficha.secuenciaEnsamble ?? []).length > 0 && (
                <Section icon={<Package size={13} />} title="Manual de ensamble — Instrucciones gráficas">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(ficha.secuenciaEnsamble ?? []).map((s: any) => (
                      <DiagramaEnsamble
                        key={s.paso}
                        paso={s}
                        cortes={ficha.listaCortesDetallada ?? []}
                        totalPasos={(ficha.secuenciaEnsamble ?? []).length}
                      />
                    ))}
                  </div>
                </Section>
              )}

              {/* Control de calidad */}
              {(ficha.controlCalidad ?? []).length > 0 && (
                <Section icon={<CheckSquare size={13} />} title={`Control de calidad — ${totalChecked}/${totalItems} verificados`}>
                  {/* Barra de progreso */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${totalItems > 0 ? (totalChecked / totalItems) * 100 : 0}%`,
                        background: totalChecked === totalItems && totalItems > 0 ? "#22c55e" : "var(--gold)",
                        borderRadius: 2,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                    {totalChecked === totalItems && totalItems > 0 && (
                      <div style={{ fontSize: 11, color: "#22c55e", marginTop: 5, fontWeight: 600 }}>
                        ✓ Control de calidad completado
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(ficha.controlCalidad ?? []).map((c: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => toggleCheck(i)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "10px 12px",
                          background: checked[i] ? "rgba(34,197,94,0.06)" : i % 2 === 0 ? "var(--surface-2)" : "var(--surface)",
                          border: `1px solid ${checked[i] ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 20, height: 20, flexShrink: 0,
                          borderRadius: 5,
                          border: `2px solid ${checked[i] ? "#22c55e" : "var(--border-2)"}`,
                          background: checked[i] ? "#22c55e" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          marginTop: 1,
                          transition: "all 0.15s",
                        }}>
                          {checked[i] && <Check size={12} color="#000" strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 500,
                            color: checked[i] ? "var(--text-muted)" : "var(--text)",
                            textDecoration: checked[i] ? "line-through" : "none",
                            transition: "all 0.15s",
                          }}>{c.punto}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                            Criterio: {c.criterio}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 10, color: checked[i] ? "#22c55e" : "var(--text-dim)",
                          fontWeight: 600, alignSelf: "center", minWidth: 60, textAlign: "right",
                        }}>
                          {checked[i] ? "✓ OK" : "Pendiente"}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Manual de fabricación — planos mecánicos completos */}
              <Section icon={<Ruler size={13} />} title="Manual de fabricación — Planos técnicos industriales (3 hojas)" action={
                ficha.planos && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => downloadSVG(ficha.planos, ficha.titulo, ficha.folio)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.3)", borderRadius: 6, color: "#58A6FF", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <Download size={10} /> SVG / Illustrator
                    </button>
                    <button onClick={() => downloadDXF(ficha.planos, ficha.titulo, ficha.folio)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(245,184,0,0.1)", border: "1px solid rgba(245,184,0,0.3)", borderRadius: 6, color: "var(--gold)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <Download size={10} /> DXF / AutoCAD
                    </button>
                  </div>
                )
              }>
                <ManualFabricacion
                  planos={ficha.planos}
                  cortes={ficha.listaCortesDetallada ?? []}
                  piezasDetalladas={ficha.piezasDetalladas ?? []}
                  cortesTransversales={ficha.cortesTransversales ?? []}
                  detallesConstructivos={ficha.detallesConstructivos ?? []}
                  titulo={ficha.titulo}
                  folio={ficha.folio}
                />
              </Section>

              {/* Cotización */}
              {ficha.cotizacion && (
                <Section icon={<FileText size={13} />} title="Cotización de producción">
                  <Cotizador cotizacion={ficha.cotizacion} />
                </Section>
              )}

              {/* Nota para el cliente */}
              {ficha.notas && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(245,184,0,0.05)",
                  border: "1px solid rgba(245,184,0,0.2)",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>
                    Nota para el cliente
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>{ficha.notas}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <div style={{ width: 3, height: 14, background: "var(--gold)", borderRadius: 2 }} />
        <span style={{ color: "var(--gold)" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.8px", flex: 1 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionMini({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 8 }}>
      {children}
    </div>
  );
}

function KPI({ label, value, icon, gold }: { label: string; value: string; icon: React.ReactNode; gold?: boolean }) {
  return (
    <div style={{
      padding: "8px 10px",
      background: gold ? "rgba(245,184,0,0.07)" : "var(--surface-2)",
      border: `1px solid ${gold ? "rgba(245,184,0,0.25)" : "var(--border)"}`,
      borderRadius: 7,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ color: gold ? "var(--gold)" : "var(--text-dim)" }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: gold ? "var(--gold)" : "var(--text)" }}>{value}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function TableHeader({ cols, widths }: { cols: string[]; widths: string }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: widths,
      padding: "7px 12px",
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderBottom: "none",
      borderRadius: "8px 8px 0 0",
    }}>
      {cols.map(c => (
        <span key={c} style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700 }}>{c}</span>
      ))}
    </div>
  );
}

function TableRow({ cols, widths, odd, highlight = [] }: { cols: string[]; widths: string; odd: boolean; highlight?: number[] }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: widths,
      padding: "8px 12px",
      background: odd ? "var(--surface-2)" : "var(--surface)",
      border: "1px solid var(--border)",
      borderTop: "none",
    }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          fontSize: 12,
          color: highlight.includes(i) ? "var(--text)" : "var(--text-muted)",
          fontWeight: highlight.includes(i) ? 500 : 400,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{c}</span>
      ))}
    </div>
  );
}
