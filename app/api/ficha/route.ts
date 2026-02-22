import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 120;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-2.0-flash";

async function callAgent(prompt: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON from agent. Raw: ${raw.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

function buildContext(params: any): string {
  const styles: Record<string, string> = {
    industrial: "Industrial (acero expuesto, acabados en crudo, funcional)",
    minimalista: "Minimalista (superficies limpias, líneas puras, colores neutros)",
    moderno: "Moderno Contemporáneo (superficies brillantes, formas geométricas)",
    corporativo: "Corporativo Premium (acabados de alto nivel, paleta neutra)",
    retail: "Retail / Punto de Venta (alta visibilidad, fácil reposición de producto)",
    premium: "Premium Luxury (materiales de lujo, detalles dorados, acabados perfectos)",
  };

  const c = params.componentes || {};
  const componentesStr = [
    c.cajones > 0    ? `Cajones: ${c.cajones} unidades` : null,
    c.puertas > 0    ? `Puertas: ${c.puertas} unidades (${c.tipoPuerta || "abatible"})` : "Sin puertas",
    c.repisas > 0    ? `Repisas/entrepaños: ${c.repisas} unidades${c.repisasAjustables ? " (ajustables)" : " (fijas)"}` : "Sin repisas",
    c.backpanel      ? "Backpanel trasero: Sí" : "Backpanel trasero: No (estructura abierta)",
    c.iluminacionLED ? `Iluminación LED: Sí (${c.tipLED === "tira_blanca" ? "tira LED blanca" : c.tipLED === "tira_rgb" ? "tira LED RGB" : "luminaria empotrada"})` : null,
    c.espejo         ? "Panel de espejo: Sí" : null,
    c.vidrio         ? "Vidrio templado: Sí" : null,
    c.ruedas         ? "Ruedas/rodajas: Sí" : null,
    c.candado        ? "Sistema de candado/llave: Sí" : null,
    c.jalonesEspeciales ? "Jalones de diseño especial: Sí" : null,
  ].filter(Boolean).join("\n");

  return `PROYECTO: ${params.description}
ESTILO: ${styles[params.style] || params.style || "Moderno"}
MATERIALES: ${params.materials?.join(", ") || "MDF, Melamina, Acero"}
DIMENSIONES: ${params.dimensions?.width ? `${params.dimensions.width}cm ancho × ${params.dimensions.height}cm alto × ${params.dimensions.depth || "45"}cm profundidad` : "Estándar"}
PRESUPUESTO: ${params.budget ? `$${params.budget} MXN` : "Flexible"}
CANTIDAD: ${params.quantity || "1"} pieza(s)

COMPONENTES REALES DEL MUEBLE (ÚSALOS EXACTAMENTE — NO INVENTES ELEMENTOS QUE NO ESTÁN AQUÍ):
${componentesStr}`;
}

export async function POST(req: NextRequest) {
  try {
    const { params } = await req.json();
    const ctx = buildContext(params);
    const folio = `FNG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const compResumen = (() => {
      const c = params.componentes || {};
      const parts: string[] = [];
      if (c.cajones > 0) parts.push(`${c.cajones} cajón${c.cajones > 1 ? "es" : ""}`);
      if (c.puertas > 0) parts.push(`${c.puertas} puerta${c.puertas > 1 ? "s" : ""} ${c.tipoPuerta}`);
      if (c.repisas > 0) parts.push(`${c.repisas} repisa${c.repisas > 1 ? "s" : ""}${c.repisasAjustables ? " ajustables" : ""}`);
      if (c.backpanel) parts.push("backpanel");
      if (c.iluminacionLED) parts.push("LED");
      if (c.espejo) parts.push("espejo");
      if (c.vidrio) parts.push("vidrio");
      if (c.ruedas) parts.push("ruedas");
      return parts.length ? parts.join(", ") : "estructura básica";
    })();

    // ─── FASE 1: 5 agentes en paralelo ──────────────────────────────────────
    const [agente1, agente2, agente3, agente4, agente5] = await Promise.all([

      callAgent(`Eres INGENIERO ESTRUCTURAL de Fenga (manufactura industrial México).
${ctx}

INSTRUCCIÓN CRÍTICA: La lista de cortes debe reflejar EXACTAMENTE los componentes indicados arriba.
- Si dice "Sin puertas" → NO incluyas piezas de puertas
- Si dice "Repisas: 4" → incluye exactamente 4 repisas
- Si dice "Cajones: 3" → incluye todos los componentes de 3 cajones (frente, base, laterales, trasero)
- Si dice "Backpanel: No" → no incluyas panel trasero como pieza de cort

Responde SOLO JSON válido sin markdown:
{"titulo":"nombre comercial máx 5 palabras","folio":"${folio}","descripcionTecnica":"4-5 oraciones técnicas específicas de este mueble: función, componentes reales (${compResumen}), estructura, capacidades","especificaciones":[{"clave":"Dimensión total (mm)","valor":"0000 × 0000 × 000"},{"clave":"Peso estimado","valor":"00 kg"},{"clave":"Capacidad de carga","valor":"000 kg"},{"clave":"Estructura principal","valor":"descripción"},{"clave":"Tipo de ensamble","valor":"descripción"},{"clave":"Resistencia humedad","valor":"Alta/Media/Baja"},{"clave":"Dificultad fabricación","valor":"Básico/Medio/Avanzado"},{"clave":"Norma aplicable","valor":"norma o N/A"}],"listaCortesDetallada":[{"pieza":"nombre exacto","cantidad":1,"largoMM":1800,"anchoMM":400,"espesorMM":18,"material":"MDF 18mm","observaciones":"nota de corte"}]}
MÍNIMO 8 piezas con dimensiones exactas en mm que correspondan exactamente a los componentes reales del mueble.`),

      callAgent(`Eres ESPECIALISTA EN MATERIALES de Fenga (manufactura industrial México).
${ctx}

Responde SOLO JSON válido sin markdown:
{"materiales":[{"descripcion":"nombre","especificacion":"grado/calibre/espesor","cantidad":"número","unidad":"m2/ml/pza/kg/lts","codigoColor":"RAL 0000 o Pantone 000 o Natural","proveedor":"nombre proveedor México"}],"acabadoFinal":{"tipo":"tipo acabado","producto":"nombre comercial","codigoColor":"RAL 0000","capas":2,"instrucciones":"instrucciones detalladas de aplicación"},"acabados":["acabado 1","acabado 2"]}
IMPORTANTE: Incluye SOLO los materiales necesarios para los componentes reales de este mueble. Si tiene LED incluye perfil de aluminio y fuente de poder. Si tiene vidrio incluye vidrio templado. Si tiene cartón corrugado inclúyelo. Mínimo 5 materiales exactos.`),

      callAgent(`Eres JEFE DE PRODUCCIÓN de Fenga (manufactura industrial México).
${ctx}

Responde SOLO JSON válido sin markdown:
{"herrajes":[{"descripcion":"nombre específico","especificacion":"medida/modelo exacto","cantidad":4,"unidad":"pza","uso":"función específica en este mueble"}],"secuenciaEnsamble":[{"paso":1,"operacion":"nombre operación","descripcion":"descripción detallada y específica del paso para este mueble","herramientas":["herramienta1"],"tiempoMin":30}],"herramientasNecesarias":["herramienta1"],"tiempoEstimadoHoras":40,"tiempoEntregaDias":15,"procesosFabricacion":["Proceso 1"]}
IMPORTANTE: Los herrajes deben corresponder EXACTAMENTE a los componentes reales: ${compResumen}. Si no hay puertas, no incluyas bisagras. Si hay cajones, incluye rieles telescópicos. Mínimo 6 herrajes específicos. Ensamble con 8-12 pasos detallados.`),

      callAgent(`Eres DIRECTOR DE CALIDAD de Fenga (manufactura industrial México).
${ctx}

Responde SOLO JSON válido sin markdown:
{"controlCalidad":[{"punto":"punto de inspección específico para este mueble","criterio":"criterio medible de aceptación"}],"notasTaller":"instrucciones críticas específicas para fabricar este mueble: riesgos, seguridad, tolerancias, procesos especiales","notas":"nota para cliente: garantías, cuidados específicos de los materiales usados, instrucciones de instalación y mantenimiento"}
Mínimo 8 puntos de control con criterios medibles.`),

      callAgent(`Eres el DIRECTOR COMERCIAL de Fenga (manufactura industrial México). Genera cotización detallada para ESTE mueble específico basada en costos reales de mercado mexicano 2025.
${ctx}

Responde SOLO JSON válido sin markdown:
{"conceptos":[{"concepto":"Descripción del concepto","categoria":"material/mano_obra/herraje/acabado/diseño","cantidad":1,"unidad":"m2/ml/pza/hrs/lts","costoUnitario":180,"total":180}],"subtotalDirecto":0,"gastosFijos":0,"porcentajeGastos":15,"utilidad":0,"porcentajeUtilidad":25,"subtotalFinal":0,"iva":0,"totalFinal":0,"garantia":"12 meses en estructura","tiempoEntregaDias":15,"validezDias":30,"condicionesPago":"50% anticipo, 50% contra entrega","incluye":["Diseño y planos","Fabricación completa","Instalación","Garantía"],"noIncluye":["Transporte especial","Permisos municipales"]}
Genera mínimo 8 conceptos con costos unitarios reales MXN. Solo incluye costos de componentes que EXISTEN en este mueble (${compResumen}). Calcula: subtotalDirecto=suma de totales. gastosFijos=subtotalDirecto×${15}/100. utilidad=(subtotalDirecto+gastosFijos)×${25}/100. subtotalFinal=subtotalDirecto+gastosFijos+utilidad. iva=subtotalFinal×0.16. totalFinal=subtotalFinal+iva.`),
    ]);

    // ─── FASE 2: 3 agentes con contexto completo ───────────────────────────
    const cortesResumen = (agente1.listaCortesDetallada ?? [])
      .map((c: any) => `• ${c.pieza} (×${c.cantidad}): ${c.largoMM}×${c.anchoMM}×${c.espesorMM}mm — ${c.material}`)
      .join("\n");

    const herrajesResumen = (agente3.herrajes ?? [])
      .map((h: any) => `• ${h.descripcion} ${h.especificacion} ×${h.cantidad}`)
      .join("\n");

    const ensambleResumen = (agente3.secuenciaEnsamble ?? [])
      .map((s: any) => `Paso ${s.paso}: ${s.operacion} — ${s.descripcion}`)
      .join("\n");

    const dimTotal = (agente1.especificaciones ?? []).find((e: any) => e.clave.toLowerCase().includes("dimensión"))?.valor || "";

    const [agente6, agente7, agente8] = await Promise.all([

      callAgent(`Eres el INGENIERO DE PLANOS MECÁNICOS senior de Fenga. Genera datos precisos para planos técnicos ortogonales del ensamble completo.
${ctx}
DIMENSIÓN TOTAL: ${dimTotal}
LISTA DE CORTES REAL:\n${cortesResumen}
HERRAJES:\n${herrajesResumen}

Genera EXACTAMENTE las 3 vistas ortogonales del ensamble. Usa las dimensiones reales del proyecto.

Responde SOLO JSON válido sin markdown:
{
  "planos": {
    "escala": "1:10",
    "unidades": "mm",
    "vistaFrontal": {
      "anchoTotal": 1200,
      "altoTotal": 1800,
      "cotas": [
        {"tipo": "horizontal", "desde": 0, "hasta": 600, "valor": "600", "descripcion": "Módulo A"},
        {"tipo": "vertical", "desde": 0, "hasta": 900, "valor": "900", "descripcion": "Zona inferior"}
      ],
      "elementos": [
        {"nombre": "Panel lateral izq", "x": 0, "y": 0, "ancho": 18, "alto": 1800, "tipo": "panel"}
      ]
    },
    "vistaLateral": {
      "anchoTotal": 500,
      "altoTotal": 1800,
      "cotas": [
        {"tipo": "horizontal", "desde": 0, "hasta": 500, "valor": "500", "descripcion": "Profundidad"},
        {"tipo": "vertical", "desde": 0, "hasta": 1800, "valor": "1800", "descripcion": "Altura total"}
      ],
      "elementos": [
        {"nombre": "Panel lateral", "x": 0, "y": 0, "ancho": 500, "alto": 1800, "tipo": "panel"}
      ]
    },
    "vistaSuperior": {
      "anchoTotal": 1200,
      "altoTotal": 500,
      "cotas": [
        {"tipo": "horizontal", "desde": 0, "hasta": 1200, "valor": "1200", "descripcion": "Ancho total"},
        {"tipo": "vertical", "desde": 0, "hasta": 500, "valor": "500", "descripcion": "Profundidad"}
      ],
      "elementos": [
        {"nombre": "Cubierta superior", "x": 0, "y": 0, "ancho": 1200, "alto": 500, "tipo": "panel"}
      ]
    },
    "notas": [
      "Todas las cotas en milímetros",
      "Tolerancia de fabricación ±1mm"
    ]
  }
}
IMPORTANTE: anchoTotal/altoTotal de CADA vista deben coincidir con las dimensiones reales. vistaFrontal debe mostrar TODOS los elementos visibles desde el frente (paneles laterales, cajones, puertas, repisas, etc.). Incluye SOLO los elementos que existen en este mueble.`),

      callAgent(`Eres DIBUJANTE TÉCNICO INDUSTRIAL ESPECIALISTA A de Fenga. Genera datos de detalle por pieza.
${ctx}
LISTA DE CORTES:\n${cortesResumen}
COMPONENTES: ${compResumen}

Para cada pieza, especifica agujeros (espigas/tornillos), ranuras, cantos y notas de corte.

Responde SOLO JSON válido sin markdown:
{
  "piezasDetalladas": [
    {
      "pieza": "nombre exacto igual al de la lista de cortes",
      "agujeros": [
        {"tipo": "espiga", "diametro": 8, "profundidad": 20, "xMM": 40, "yMM": 50, "descripcion": "Unión con base inferior"}
      ],
      "ranuras": [
        {"xMM": 6, "profundidadMM": 6, "anchoMM": 6, "longitudMM": 400, "orientacion": "horizontal", "descripcion": "Ranura para backpanel"}
      ],
      "cantosAplicar": ["Canto PVC 0.4mm en todos los cantos visibles"],
      "direccionVeta": "longitudinal",
      "notasCorte": "Verificar escuadra a 90°"
    }
  ]
}
Genera datos para todas las piezas. Solo incluye ranuras de backpanel si el mueble tiene backpanel.`),

      callAgent(`Eres DIBUJANTE TÉCNICO INDUSTRIAL ESPECIALISTA B de Fenga. Genera cortes transversales y detalles constructivos.
${ctx}
DIMENSIÓN TOTAL: ${dimTotal}
LISTA DE CORTES:\n${cortesResumen}
HERRAJES:\n${herrajesResumen}
ENSAMBLE:\n${ensambleResumen}

Genera cortes y detalles de las uniones más críticas de ESTE mueble específico.

Responde SOLO JSON válido sin markdown:
{
  "cortesTransversales": [
    {
      "id": "CT-A",
      "nombre": "Corte A-A — nombre de la unión",
      "plano": "frontal",
      "posicionMM": 0,
      "descripcion": "Descripción específica de esta unión",
      "escala": "1:2",
      "elementos": [
        {"nombre": "Pieza A", "x": 0, "y": 0, "ancho": 18, "alto": 80, "tipo": "panel"},
        {"nombre": "Pieza B", "x": 18, "y": 60, "ancho": 420, "alto": 18, "tipo": "base"}
      ],
      "cotas": [
        {"tipo": "horizontal", "desde": 0, "hasta": 18, "valor": "18", "descripcion": "Espesor panel"},
        {"tipo": "vertical", "desde": 0, "hasta": 60, "valor": "60", "descripcion": "Ranura"}
      ],
      "notas": ["Cola PVA tipo D3", "Espiga 8×20mm"]
    }
  ],
  "detallesConstructivos": [
    {
      "id": "DC-1",
      "tipo": "union",
      "nombre": "Unión específica de este mueble",
      "descripcion": "Descripción técnica detallada",
      "herramientas": ["Taladro de banco", "Prensa de tornillo"],
      "tolerancia": "±0.5mm en posición de agujeros",
      "elementos": [
        {"nombre": "Panel A", "x": 0, "y": 0, "ancho": 18, "alto": 60, "tipo": "panel"},
        {"nombre": "Panel B", "x": 18, "y": 40, "ancho": 80, "alto": 18, "tipo": "panel"}
      ],
      "cotas": [
        {"tipo": "horizontal", "desde": 0, "hasta": 18, "valor": "18", "descripcion": "Espesor"}
      ]
    }
  ]
}
Genera mínimo 3 cortes transversales de las uniones críticas de ESTE mueble específico. Mínimo 3 detalles constructivos. Las dimensiones deben coincidir con los datos reales.`),
    ]);

    // ─── Combinar ─────────────────────────────────────────────────────────────
    const ficha = {
      titulo: agente1.titulo || "Proyecto Fenga",
      folio: agente1.folio || folio,
      descripcionTecnica: agente1.descripcionTecnica || "",
      especificaciones: agente1.especificaciones || [],
      listaCortesDetallada: agente1.listaCortesDetallada || [],
      materiales: agente2.materiales || [],
      acabadoFinal: agente2.acabadoFinal || null,
      acabados: agente2.acabados || [],
      herrajes: agente3.herrajes || [],
      secuenciaEnsamble: agente3.secuenciaEnsamble || [],
      herramientasNecesarias: agente3.herramientasNecesarias || [],
      tiempoEstimadoHoras: agente3.tiempoEstimadoHoras || null,
      tiempoEntregaDias: agente3.tiempoEntregaDias || null,
      procesosFabricacion: agente3.procesosFabricacion || [],
      controlCalidad: agente4.controlCalidad || [],
      notasTaller: agente4.notasTaller || "",
      notas: agente4.notas || "",
      cotizacion: agente5 || null,
      planos: agente6.planos || null,
      piezasDetalladas: agente7.piezasDetalladas || [],
      cortesTransversales: agente8.cortesTransversales || [],
      detallesConstructivos: agente8.detallesConstructivos || [],
    };

    return NextResponse.json(ficha);
  } catch (err: any) {
    console.error("Ficha error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
