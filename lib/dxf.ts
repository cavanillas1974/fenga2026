/**
 * DXF Generator — Fenga Diseño Industrial
 * Generates AutoCAD-compatible DXF from planos data
 * Format: DXF R2000 (AC1015)
 */

interface Elemento {
  nombre: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  tipo: string;
}

interface Cota {
  tipo: "horizontal" | "vertical";
  desde: number;
  hasta: number;
  valor: string;
  descripcion: string;
}

interface Vista {
  anchoTotal: number;
  altoTotal: number;
  elementos: Elemento[];
  cotas: Cota[];
}

interface PlanosData {
  escala: string;
  unidades: string;
  vistaFrontal: Vista;
  vistaLateral: Vista;
  vistaSuperior: Vista;
  notas: string[];
}

// DXF entity builders
function header(): string {
  return [
    "0", "SECTION",
    "2", "HEADER",
    "9", "$ACADVER", "1", "AC1015",
    "9", "$INSUNITS", "70", "4",      // 4 = millimeters
    "9", "$LUNITS",   "70", "2",      // 2 = decimal
    "9", "$LUPREC",   "70", "2",
    "9", "$ANGBASE",  "50", "0.0",
    "9", "$ANGDIR",   "70", "0",
    "0", "ENDSEC",
  ].join("\n");
}

function tables(): string {
  const layers = [
    { name: "FRONTAL",  color: 7 },   // white
    { name: "LATERAL",  color: 3 },   // green
    { name: "PLANTA",   color: 4 },   // cyan
    { name: "COTAS",    color: 1 },   // red
    { name: "TEXTO",    color: 2 },   // yellow
    { name: "TITULO",   color: 6 },   // magenta
  ];

  let t = ["0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER", "70", String(layers.length)].join("\n") + "\n";

  for (const l of layers) {
    t += ["0", "LAYER", "2", l.name, "70", "0", "62", String(l.color), "6", "Continuous"].join("\n") + "\n";
  }

  t += ["0", "ENDTAB", "0", "ENDSEC"].join("\n");
  return t;
}

function rect(layer: string, x: number, y: number, w: number, h: number): string {
  // Closed LWPOLYLINE for rectangle
  const lines: string[] = [
    "0", "LWPOLYLINE",
    "8", layer,
    "70", "1",    // closed
    "90", "4",    // 4 vertices
    "10", String(x),       "20", String(y),
    "10", String(x + w),   "20", String(y),
    "10", String(x + w),   "20", String(y + h),
    "10", String(x),       "20", String(y + h),
  ];
  return lines.join("\n");
}

function line(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return ["0", "LINE", "8", layer, "10", String(x1), "20", String(y1), "11", String(x2), "21", String(y2)].join("\n");
}

function text(layer: string, x: number, y: number, height: number, content: string): string {
  return ["0", "TEXT", "8", layer, "10", String(x), "20", String(y), "40", String(height), "1", content, "72", "1", "11", String(x), "21", String(y)].join("\n");
}

function mtext(layer: string, x: number, y: number, height: number, width: number, content: string): string {
  return ["0", "MTEXT", "8", layer, "10", String(x), "20", String(y), "40", String(height), "41", String(width), "71", "1", "1", content].join("\n");
}

function linearDim(layer: string, x1: number, y1: number, x2: number, y2: number, dx: number, dy: number, val: string): string {
  // Simplified dimension using lines + text
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return [
    line(layer, x1, y1, x1, y1 + dy),
    line(layer, x2, y2, x2, y2 + dy),
    line(layer, x1, y1 + dy, x2, y2 + dy),
    text(layer, mx, y1 + dy + 2, 3, val),
  ].join("\n");
}

function drawVista(vista: Vista, offsetX: number, offsetY: number, layer: string, entities: string[]): void {
  if (!vista) return;

  // Bounding box
  entities.push(rect(layer, offsetX, offsetY, vista.anchoTotal, vista.altoTotal));

  // Elements
  for (const el of (vista.elementos || [])) {
    entities.push(rect(layer, offsetX + el.x, offsetY + el.y, el.ancho, el.alto));
    // Label
    const cx = offsetX + el.x + el.ancho / 2;
    const cy = offsetY + el.y + el.alto / 2;
    if (el.ancho > 20 && el.alto > 10) {
      entities.push(text("TEXTO", cx, cy, 3, el.nombre?.slice(0, 20) || ""));
    }
  }

  // Horizontal dimensions below the view
  const hCotas = (vista.cotas || []).filter(c => c.tipo === "horizontal");
  hCotas.forEach((c, i) => {
    const dy = -15 - i * 12;
    entities.push(linearDim(
      "COTAS",
      offsetX + c.desde, offsetY,
      offsetX + c.hasta, offsetY,
      0, dy,
      `${c.valor}`,
    ));
  });

  // Vertical dimensions to the left
  const vCotas = (vista.cotas || []).filter(c => c.tipo === "vertical");
  vCotas.forEach((c, i) => {
    const dx = -15 - i * 12;
    // Vertical dim: lines going left, text rotated
    entities.push(
      line("COTAS", offsetX, offsetY + c.desde, offsetX + dx - 2, offsetY + c.desde),
      line("COTAS", offsetX, offsetY + c.hasta, offsetX + dx - 2, offsetY + c.hasta),
      line("COTAS", offsetX + dx, offsetY + c.desde, offsetX + dx, offsetY + c.hasta),
    );
    const ty = offsetY + (c.desde + c.hasta) / 2;
    entities.push(text("COTAS", offsetX + dx - 8, ty, 3, `${c.valor}`));
  });
}

export function generateDXF(planos: PlanosData, titulo: string, folio: string): string {
  const entities: string[] = [];

  // Layout: 3 views arranged standard engineering projection
  // Frontal view at origin (0,0)
  // Lateral view to the right of frontal
  // Superior view below frontal

  const margin = 50;
  const fW = planos.vistaFrontal?.anchoTotal || 1200;
  const fH = planos.vistaFrontal?.altoTotal  || 1800;
  const lW = planos.vistaLateral?.anchoTotal || 500;
  const sW = planos.vistaSuperior?.anchoTotal || 1200;
  const sH = planos.vistaSuperior?.altoTotal  || 500;

  const fX = margin + 80;             // frontal origin X
  const fY = margin + sH + margin;    // frontal origin Y (superior view below)
  const lX = fX + fW + margin;        // lateral: right of frontal
  const lY = fY;
  const sX = fX;                      // superior: below frontal (mirrored Y in DXF)
  const sY = margin;

  if (planos.vistaFrontal) drawVista(planos.vistaFrontal,  fX, fY, "FRONTAL", entities);
  if (planos.vistaLateral) drawVista(planos.vistaLateral,  lX, lY, "LATERAL", entities);
  if (planos.vistaSuperior) drawVista(planos.vistaSuperior, sX, sY, "PLANTA",  entities);

  // View labels
  entities.push(text("TEXTO", fX + fW / 2 - 20, fY - 10, 5, "VISTA FRONTAL"));
  entities.push(text("TEXTO", lX + lW / 2 - 20, lY - 10, 5, "VISTA LATERAL DERECHA"));
  entities.push(text("TEXTO", sX + sW / 2 - 20, sY - 10, 5, "VISTA SUPERIOR (PLANTA)"));

  // Title block (bottom right)
  const tbX = fX + fW + margin;
  const tbY = margin;
  const tbW = 180;
  const tbH = 60;
  entities.push(rect("TITULO", tbX, tbY, tbW, tbH));
  entities.push(line("TITULO", tbX, tbY + tbH * 0.55, tbX + tbW, tbY + tbH * 0.55));
  entities.push(line("TITULO", tbX + tbW * 0.65, tbY, tbX + tbW * 0.65, tbY + tbH));

  entities.push(text("TITULO", tbX + 3, tbY + tbH - 8, 4.5, "FENGA DISENO INDUSTRIAL"));
  entities.push(text("TITULO", tbX + 3, tbY + tbH * 0.55 + tbH * 0.12, 3.5, titulo?.slice(0, 30) || "PROYECTO"));
  entities.push(text("TITULO", tbX + 3, tbY + 5, 3, `FOLIO: ${folio}`));
  entities.push(text("TITULO", tbX + tbW * 0.67, tbY + tbH - 8, 3, `ESCALA: ${planos.escala || "1:10"}`));
  entities.push(text("TITULO", tbX + tbW * 0.67, tbY + tbH * 0.55 + tbH * 0.12, 3, "UNIDADES: mm"));
  entities.push(text("TITULO", tbX + tbW * 0.67, tbY + 5, 3, new Date().toLocaleDateString("es-MX")));

  // Notes
  (planos.notas || []).slice(0, 5).forEach((n, i) => {
    entities.push(text("TEXTO", tbX, tbY + tbH + 10 + i * 8, 3, `${i + 1}. ${n}`));
  });

  const dxf = [
    header(),
    tables(),
    "0\nSECTION\n2\nENTITIES",
    ...entities,
    "0\nENDSEC",
    "0\nEOF",
  ].join("\n");

  return dxf;
}

export function downloadDXF(planos: PlanosData, titulo: string, folio: string): void {
  const content = generateDXF(planos, titulo, folio);
  const blob = new Blob([content], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folio}-planos.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSVG(planos: PlanosData, titulo: string, folio: string): void {
  // Generate SVG version (opens in Illustrator, Inkscape, CAD)
  const fW = planos.vistaFrontal?.anchoTotal || 1200;
  const fH = planos.vistaFrontal?.altoTotal  || 1800;
  const lW = planos.vistaLateral?.anchoTotal || 500;
  const sH = planos.vistaSuperior?.altoTotal  || 500;
  const M = 60;

  const totalW = M * 2 + fW + M + lW + M;
  const totalH = M * 2 + sH + M + fH + M + 50;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
<style>
  .obj { fill: #1a2f1a; stroke: #c0c8d2; stroke-width: 1; }
  .dim { fill: none; stroke: #58a6ff; stroke-width: 0.7; }
  .txt { font-family: monospace; font-size: 8px; fill: #8b949e; }
  .ttl { font-family: monospace; font-size: 10px; fill: #f5b800; font-weight: bold; }
  .lbl { font-family: monospace; font-size: 7px; fill: #e6edf3; }
  .box { fill: #0d1117; stroke: #c0c8d2; stroke-width: 1.5; }
</style>
<rect width="${totalW}" height="${totalH}" fill="#0d1117"/>
`;

  function svgVista(vista: Vista, ox: number, oy: number, label: string): string {
    if (!vista) return "";
    let v = `<rect x="${ox}" y="${oy}" width="${vista.anchoTotal}" height="${vista.altoTotal}" class="box"/>`;
    for (const el of (vista.elementos || [])) {
      v += `<rect x="${ox + el.x}" y="${oy + el.y}" width="${el.ancho}" height="${el.alto}" class="obj"/>`;
      if (el.ancho > 30 && el.alto > 14) {
        v += `<text x="${ox + el.x + el.ancho / 2}" y="${oy + el.y + el.alto / 2 + 3}" class="lbl" text-anchor="middle">${el.nombre?.slice(0, 16) || ""}</text>`;
      }
    }
    for (const c of (vista.cotas || []).filter(c => c.tipo === "horizontal")) {
      const y = oy + vista.altoTotal + 14;
      v += `<line x1="${ox + c.desde}" y1="${oy + vista.altoTotal}" x2="${ox + c.desde}" y2="${y + 3}" class="dim" stroke-dasharray="3,2"/>
<line x1="${ox + c.hasta}" y1="${oy + vista.altoTotal}" x2="${ox + c.hasta}" y2="${y + 3}" class="dim" stroke-dasharray="3,2"/>
<line x1="${ox + c.desde}" y1="${y}" x2="${ox + c.hasta}" y2="${y}" class="dim"/>
<text x="${ox + (c.desde + c.hasta) / 2}" y="${y - 3}" class="txt" text-anchor="middle">${c.valor}</text>`;
    }
    for (const c of (vista.cotas || []).filter(c => c.tipo === "vertical")) {
      const x = ox - 14;
      v += `<line x1="${ox}" y1="${oy + c.desde}" x2="${x - 3}" y2="${oy + c.desde}" class="dim" stroke-dasharray="3,2"/>
<line x1="${ox}" y1="${oy + c.hasta}" x2="${x - 3}" y2="${oy + c.hasta}" class="dim" stroke-dasharray="3,2"/>
<line x1="${x}" y1="${oy + c.desde}" x2="${x}" y2="${oy + c.hasta}" class="dim"/>
<text x="${x - 5}" y="${oy + (c.desde + c.hasta) / 2 + 3}" class="txt" text-anchor="middle" transform="rotate(-90 ${x - 5} ${oy + (c.desde + c.hasta) / 2 + 3})">${c.valor}</text>`;
    }
    v += `<text x="${ox + vista.anchoTotal / 2}" y="${oy - 6}" class="ttl" text-anchor="middle">${label}</text>`;
    return v;
  }

  const fX = M + 60, fY = M + sH + M;
  const lX = fX + fW + M, lY = fY;
  const sX = fX, sY = M;

  svg += svgVista(planos.vistaFrontal, fX, fY, "VISTA FRONTAL");
  svg += svgVista(planos.vistaLateral, lX, lY, "VISTA LATERAL DERECHA");
  svg += svgVista(planos.vistaSuperior, sX, sY, "VISTA SUPERIOR / PLANTA");

  // Title block
  const tbX = lX + lW + M;
  svg += `<rect x="${tbX}" y="${M}" width="180" height="70" fill="#161b22" stroke="#f5b800" stroke-width="1"/>
<text x="${tbX + 8}" y="${M + 15}" class="ttl">FENGA DISEÑO INDUSTRIAL</text>
<text x="${tbX + 8}" y="${M + 28}" class="lbl">${titulo?.slice(0, 28) || "PROYECTO"}</text>
<text x="${tbX + 8}" y="${M + 40}" class="txt">Folio: ${folio}</text>
<text x="${tbX + 8}" y="${M + 52}" class="txt">Escala: ${planos.escala || "1:10"} | mm</text>
<text x="${tbX + 8}" y="${M + 64}" class="txt">${new Date().toLocaleDateString("es-MX")}</text>`;

  svg += "\n</svg>";

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folio}-planos.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
