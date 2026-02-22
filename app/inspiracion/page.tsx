"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ChevronRight, ChevronLeft, Upload, X, Sparkles, Loader2,
  CheckCircle2, RefreshCw, Send, Hammer, ArrowLeft, ZoomIn,
  Package, Palette, DollarSign, ImageIcon, LayoutGrid,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InspirationConfig {
  type: string;
  description: string;
  style: string;
  materials: string[];
  dimensions: { width: number; height: number; depth: number };
  budget: number;
  components: string[];
  logoBase64?: string;
}

interface TechDoc {
  plans:              { view: string; description: string; dimensions: string }[];
  cutList:            { part: string; material: string; dimensions: string; quantity: number }[];
  hardware:           { item: string; quantity: number; purpose: string }[];
  assemblySteps:      string[];
  quotation:          { item: string; cost: number }[];
  totalEstimatedCost: number;
}

interface ChatMessage { role: "user" | "assistant"; text: string; }

// ─── Constants ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "concept", label: "Concepto",       icon: Package },
  { id: "config",  label: "Diseño",         icon: Palette },
  { id: "brand",   label: "Marca",          icon: DollarSign },
  { id: "review",  label: "Render",         icon: ImageIcon },
  { id: "control", label: "Control",        icon: LayoutGrid },
];

const STYLES = [
  { id: "Industrial",    desc: "Acero crudo, hardware expuesto" },
  { id: "Minimalista",   desc: "Limpio, Escandinavo, espacioso" },
  { id: "Premium",       desc: "Laca brillante, detalles dorados" },
  { id: "Escandinavo",   desc: "Madera clara, funcional y cálido" },
  { id: "Rústico",       desc: "Madera envejecida, artesanal" },
  { id: "Moderno",       desc: "Superficies brillantes, geométrico" },
  { id: "Mid-Century",   desc: "Formas orgánicas, patas cónicas" },
];

const MATERIALS = ["MDF","Melamina","Madera sólida","Acero","Aluminio","Acrílico","Vidrio","Triplay","PVC"];

const COMPONENTS = ["Cajones","Puertas","Repisas","Iluminación LED","Vidrio templado","Cerraduras","Ruedas"];

const DEFAULT_CONFIG: InspirationConfig = {
  type: "", description: "", style: "Moderno",
  materials: [], dimensions: { width: 120, height: 80, depth: 50 },
  budget: 15000, components: [],
};

const BUDGET_TIERS = [
  { max: 12000,  label: "Básico",   color: "#6b7280" },
  { max: 35000,  label: "Estándar", color: "#3b82f6" },
  { max: 80000,  label: "Premium",  color: "#8b5cf6" },
  { max: 150000, label: "Lujo",     color: "#F5B800" },
];

function getBudgetTier(b: number) {
  return BUDGET_TIERS.find(t => b <= t.max) || BUDGET_TIERS[BUDGET_TIERS.length - 1];
}

// ─── Spectacular prompt library ────────────────────────────────────────────────
const SPECTACULAR_PROMPTS: { type: string; style: string; description: string }[] = [
  {
    type: "Bar privado con isla de mármol y panel de botellas iluminado",
    style: "Premium",
    description: "Mueble bar de lujo con superficie de mármol Calacatta blanco de 3 cm, cuerpo en madera de nogal lacada en negro mate, gavetas ocultas con apertura push-to-open, iluminación LED ambiental dorada dentro del gabinete de cristalería, panel trasero con nichos individuales retroiluminados para 36 botellas en vidrio esmerilado y dos cajones refrigerados para vinos de temperatura controlada",
  },
  {
    type: "Escritorio CEO flotante con compartimento secreto biométrico",
    style: "Moderno",
    description: "Escritorio ejecutivo de apariencia flotante sobre base de acero negro pulido, tablero de roble americano de 6 cm de grosor con veteado natural seleccionado, cajón central con apertura por huella dactilar completamente oculto en el frente, pasacables integrados en la pata derecha, superficie LED difusa de temperatura ajustable y bandeja retráctil para teclado con amortiguador neumático",
  },
  {
    type: "Librería de piso a techo con escalera corrediza de latón",
    style: "Mid-Century",
    description: "Librería de madera de cerezo oscuro con estructura de acero cobrizo, 14 módulos combinables de diferentes alturas creando una composición asimétrica, escalera corrediza en riel de latón pulido, iluminación empotrada cálida en cada estante, compartimentos con puertas de vidrio esmaltado verde salvia y cajones ocultos en la base con amortiguamiento suave",
  },
  {
    type: "Cama King cabecero de terciopelo capitoné con base LED flotante",
    style: "Premium",
    description: "Cama de 2×2m en estructura de madera de roble blanco, cabecero de 1.6m de alto tapizado en terciopelo azul noche con capitoné en rombo y botones de latón envejecido, sistema de almacenamiento hidráulico que eleva el colchón para acceder a cajones internos de 40 cm, patas de latón pulido de 15 cm y tira LED perimetral en la base flotante de 2700K que crea efecto de levitación",
  },
  {
    type: "Walk-in closet masculino estilo galería con vitrina de relojes",
    style: "Premium",
    description: "Closet de 4×3m con concepto de galería de arte para ropa y accesorios de lujo, estructura en madera de nogal oscuro lacado, vitrina curva de vidrio antirreflejo para 12 relojes con iluminación UV, cajones de gamuza antracita para accesorios, sistema de barrotes en latón envejecido, zapatera inclinada con espejo en cada nivel y pared de espejos biselados de piso a techo con iluminación teatral regulable",
  },
  {
    type: "Mesa de comedor orgánica para 12 personas en nogal macizo",
    style: "Mid-Century",
    description: "Mesa de comedor de 4 m en madera de nogal americano macizo con tablero de 8 cm de grosor y veteado seleccionado a mano, patas cónicas de roble blanqueado en ángulo de 12 grados con terminación de latón en la base, extensión central oculta deslizante de 60 cm para ampliar a 14 personas, junta central resaltada con resina negra brillante y juego de 12 sillas en boucle crema con estructura de madera curvada",
  },
  {
    type: "Cocina industrial con isla de acero y extracción integrada",
    style: "Industrial",
    description: "Isla de cocina en acero inoxidable calibre 14 con encimera de cuarzo blanco nevado de 3 cm, cajones con amortiguador neumático y frentes en acero brushed, sistema de extracción de 90 cm en acero negro mate integrado en la estructura de la isla, repisa de tubería forjada negra para utensilios colgantes, iluminación de riel de acero con focos orientables de 3000K y muebles base en laca blanca satín anti-huella",
  },
  {
    type: "Estación de gaming triple con estructura de perfiles industriales",
    style: "Industrial",
    description: "Mesa de trabajo en L extendida para tres monitores ultrawide, estructura de perfiles de acero negro 40×80mm soldados con soldadura TIG vista, tablero de MDF negro de 25 mm con recubrimiento de vinil antirayones mate, canaletas de gestión de cables en aluminio integradas en toda la longitud, bandeja giratoria para torre, repisa superior perforada para ventilación de equipos y sistema de iluminación LED RGB en todos los perfiles con control por app",
  },
  {
    type: "Vestidor femenino en H con isla central y luz cenital tipo galería",
    style: "Minimalista",
    description: "Vestidor de 5×4m en melamina blanca polar con módulos de 2.6m de alto, isla central con cajones de cedro natural para joyería con tapa de vidrio, espejos de cuerpo completo con iluminación LED de 5000K en todo el perímetro inferior, barra de colgar doble nivel con altura ajustable, zapatera inclinada de acrílico transparente y luz cenital empotrada de carril con regulación desde app para efecto galería de arte",
  },
  {
    type: "Mueble TV con chimenea eléctrica de llama 3D integrada",
    style: "Moderno",
    description: "Mueble multimedia de 3.2m en madera de roble ahumado con chimenea eléctrica de llama 3D de 120 cm integrada en el centro con efecto de brasas LED reales y calefactor opcional, módulos laterales con puertas de listones verticales en aluminio negro anodizado, consola central flotante de 60 cm de profundidad con ventilación para equipo AV y tira LED detrás del televisor para Ambilight extendido",
  },
  {
    type: "Recepción corporativa curva en resina retroiluminada con ámbar",
    style: "Premium",
    description: "Mostrador de recepción en arco de 4.5m, estructura de acero inoxidable brushed, frente completo en resina traslúcida con veteado dorado retroiluminada con LED blanco cálido que crea efecto de ámbar líquido en movimiento, tablero superior de mármol negro Marquina de 3 cm, logo corporativo en acero cortado con láser y retroiluminado empotrado en el frente, parte trasera en paneles de madera de roble con textura vertical",
  },
  {
    type: "Cantina speakeasy estilo años 20 con techo de cristalería",
    style: "Industrial",
    description: "Mueble bar estilo Art Decó en madera de encino envejecido con molduras de acero forjado, techo de la barra con estantes de cristal escalonados iluminados desde abajo para exhibir copas y spirits, pared posterior de espejo biselado con marco de latón, barra de servicio en mármol negro de 5cm, grifo de acero negro, cuatro taburetes de cuero envejecido con patas de tubo negro y sistema de iluminación con regulación de intensidad",
  },
  {
    type: "Oficina plegable cama Murphy queen con escritorio oculto",
    style: "Escandinavo",
    description: "Sistema multifunción de pared completa de 3.6m en madera de abedul natural con terminación aceite nórdico, cama Murphy queen que se pliega hacia arriba oculta detrás de un panel con espejo de longitud completa, al cerrarse queda un escritorio de 1.8m, librería flotante a ambos lados, iluminación de temperatura variable de 2700-5000K controlada por sensor, cajones de cierre soft-close y colchón de 22cm que permanece tendido permanentemente",
  },
  {
    type: "Spa home con vanity de teca y tina adosada retroiluminada",
    style: "Minimalista",
    description: "Vanity de baño de 2.6m en madera de teca sólida con tratamiento antihumedad certificado, doble lavabo sobre encimera de piedra Dekton blanco ártico, gavetas con frente sin tirador y cierre suave, espejo retroiluminado perimetral con regulación de temperatura e intensidad por tacto, módulo de tina exenta adosada de acrílico mate blanco con repisa perimetral de teca y mezcladora monocromática negra empotrada en el mueble lateral",
  },
  {
    type: "Cocina exterior de acero para terraza de lujo con parrilla integrada",
    style: "Industrial",
    description: "Módulo de cocina exterior 100% en acero inoxidable 316L anti-intemperie, parrilla de carbón de 100 cm con tapa de acero, quemadores de gas de 15,000 BTU para wok, nevera de acero bajo cubierta de 120 litros, lavabo con grifo de cuello de cisne extensible, área de preparación de 1.8m con tabla de corte de teca integrada, iluminación exterior IP65 empotrada en la cubierta y sistema de extracción con chimenea de acero negro de 4m",
  },
  {
    type: "Librería infantil con tobogán integrado y casita en la base",
    style: "Escandinavo",
    description: "Mueble multifunción de madera de pino finlandés natural para cuarto de niños, con litera a 1.9m de altura, tobogán de madera curvada en el lateral izquierdo con barandal de cuerda trenzada, zona de juegos tipo casita en la base con pizarrón en la pared interior, ventana circular de acrílico transparente en la casita, escalera de peldaños-cajón extraíbles en colores naturales y LED nocturno suave en la cama superior",
  },
  {
    type: "Mostrador de joyería con fondo de terciopelo y luz UV polarizada",
    style: "Premium",
    description: "Vitrina de exhibición para joyería de 2.4m en madera de caoba lacada en crema marfil mate, vidrio antirreflejo curvo de 10mm en el frente, base interior forrada en terciopelo negro de alta densidad, bandejas removibles individuales en terciopelo por categoría de pieza, sistema de iluminación dual LED 5000K para mostrar detalles y UV para verificación de autenticidad de gemas, cerradura mecánica de seguridad por módulo y perfilería de latón en todas las esquinas",
  },
  {
    type: "Estantería Bauhaus asimétrica de acero y vidrio ahumado",
    style: "Industrial",
    description: "Sistema de estantes asimétrico en tubo de acero negro 25mm soldado con diseño geométrico inspirado en la Bauhaus, estantes de vidrio templado ahumado de 10mm con borde pulido biselado, seis módulos de diferentes dimensiones que crean composición visual dinámica de tensión y equilibrio, montaje en pared oculto en perfil de aluminio para efecto flotante total, dos módulos con fondos de latón perforado y uno con puerta pivotante de vidrio esmaltado verde militar",
  },
  {
    type: "Estudio de música con mueble rack y booth de grabación integrado",
    style: "Industrial",
    description: "Mueble de control central de 3m en madera de MDF lacado negro con frentes de aluminio perforado, rack de 19 pulgadas de 24U integrado con cubierta de vidrio, escritorio de monitoreo de 1.4m de profundidad con reposa brazos acolchonado en cuero negro, sistema de cable management invisible, booth de grabación lateral de 1×1m con paneles acústicos de espuma piramidal montados en marco de madera y ventana doble vidrio 6+6mm de aislamiento acústico",
  },
  {
    type: "Aparador comedor de diseñador con vinoteca y luz cenital",
    style: "Moderno",
    description: "Aparador de 2.8m en madera de roble europeo natural con puertas de listones verticales en acabado cepillado, vinoteca integrada de 18 botellas con temperatura controlada y puerta de vidrio negro, cajones inferiores de cedro aromático para mantelería, módulo central abierto con estante de mármol Emperador para exhibición, iluminación cenital de carril LED de 2700K que realza las vetas naturales de la madera y frente biselado superior",
  },
];

// ─── Style map for Canvas → Main app ──────────────────────────────────────────
const STYLE_TO_FENGA: Record<string, string> = {
  Industrial: "industrial", Minimalista: "minimalista", Premium: "premium",
  Escandinavo: "minimalista", Rústico: "industrial", Moderno: "moderno",
  "Mid-Century": "premium",
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InspirationPage() {
  const [step, setStep]           = useState(0);
  const [config, setConfig]       = useState<InspirationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading]         = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0); // 0–100
  const [renderUrl, setRenderUrl]     = useState<string | null>(null);
  const [techDoc, setTechDoc]         = useState<TechDoc | null>(null);
  const [techImages, setTechImages]   = useState<{ view: string; label: string; image: string }[]>([]);
  const [zoomedDrawing, setZoomedDrawing] = useState<{ view: string; label: string; image: string } | null>(null);
  const [chat, setChat]           = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [editPrompt, setEditPrompt]   = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [logoAnalysis, setLogoAnalysis] = useState<any>(null);
  const [zoomedRender, setZoomedRender] = useState(false);
  const [transferred, setTransferred]   = useState(false);
  const [promptGenerating, setPromptGenerating] = useState(false);
  const [promptFlash, setPromptFlash]   = useState(false);
  // Track last used prompt index to avoid immediate repeats
  const lastPromptIdx = useRef(-1);

  const fileRef    = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ── Generate spectacular prompt ─────────────────────────────────────────────
  const handleGeneratePrompt = useCallback(async () => {
    if (promptGenerating) return;
    setPromptGenerating(true);
    await delay(620); // magical "thinking" pause
    // Pick a random prompt that isn't the same as last time
    let idx: number;
    do { idx = Math.floor(Math.random() * SPECTACULAR_PROMPTS.length); }
    while (idx === lastPromptIdx.current && SPECTACULAR_PROMPTS.length > 1);
    lastPromptIdx.current = idx;
    const picked = SPECTACULAR_PROMPTS[idx];
    setConfig(c => ({ ...c, type: picked.type, description: picked.description, style: picked.style }));
    setPromptGenerating(false);
    setPromptFlash(true);
    setTimeout(() => setPromptFlash(false), 1800);
  }, [promptGenerating]);

  // ── Logo upload ─────────────────────────────────────────────────────────────
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setConfig(c => ({ ...c, logoBase64: base64 }));
      // Analyze logo via existing route
      try {
        const res = await fetch("/api/logo-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoBase64: base64 }),
        });
        if (res.ok) setLogoAnalysis(await res.json());
      } catch { /* silent */ }
    };
    reader.readAsDataURL(file);
  };

  // ── Generate render ──────────────────────────────────────────────────────────
  const handleGenerateRender = async () => {
    setLoading(true);
    setLoadingMsg("Analizando tu diseño con IA...");
    try {
      await delay(800);
      setLoadingMsg("Generando render fotorrealista con Imagen 4 Ultra...");
      const res = await fetch("/api/inspiracion/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, logoAnalysis }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al generar");
      setRenderUrl(data.image);
      setStep(3);
    } catch (err: any) {
      alert("Error generando render: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Approve: generate docs + 7 technical drawings in parallel ───────────────
  const handleApprove = async () => {
    if (!renderUrl) return;
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMsg("Calculando cortes, herrajes y pasos de ensamble...");

    // Simulate progress while waiting for both calls
    const progressInterval = setInterval(() => {
      setLoadingProgress(p => Math.min(p + 3, 88));
    }, 600);

    try {
      // Run docs + drawings in parallel
      const [docsRes, drawingsRes] = await Promise.all([
        fetch("/api/inspiracion/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }),
        (() => {
          setLoadingMsg("Generando 7 planos mecánicos con medidas en Imagen 4 Ultra...");
          return fetch("/api/inspiracion/techdrawings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config }),
          });
        })(),
      ]);

      const docsData     = await docsRes.json();
      const drawingsData = await drawingsRes.json();

      if (!docsRes.ok || docsData.error)     throw new Error(docsData.error     || "Error en documentación");
      if (!drawingsRes.ok || drawingsData.error) throw new Error(drawingsData.error || "Error en planos");

      clearInterval(progressInterval);
      setLoadingProgress(100);

      setTechDoc(docsData);
      setTechImages(drawingsData.drawings || []);
      await delay(300);
      setStep(4);
    } catch (err: any) {
      clearInterval(progressInterval);
      alert("Error generando ficha técnica: " + err.message);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // ── Edit render ──────────────────────────────────────────────────────────────
  const handleEditRender = async () => {
    if (!editPrompt.trim() || !renderUrl) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/inspiracion/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { ...config, description: `${config.description}. Cambios específicos: ${editPrompt}` },
          logoAnalysis,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error editando");
      setRenderUrl(data.image);
      setEditPrompt("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    setChat(c => [...c, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/inspiracion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, config }),
      });
      const data = await res.json();
      setChat(c => [...c, { role: "assistant", text: data.response || "No pude responder." }]);
    } catch {
      setChat(c => [...c, { role: "assistant", text: "Error de conexión, intenta de nuevo." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Send to Fenga ────────────────────────────────────────────────────────────
  const handleSendToFenga = useCallback(async () => {
    setTransferred(true);

    // Build studio params for transfer
    const studioParams = {
      description: `${config.type}. ${config.description}`.trim(),
      style:       STYLE_TO_FENGA[config.style] || "moderno",
      materials:   config.materials,
      dimensions: {
        width:  String(config.dimensions.width),
        height: String(config.dimensions.height),
        depth:  String(config.dimensions.depth),
      },
      budget:     config.budget.toLocaleString("es-MX"),
      logoBase64: config.logoBase64,
      logoAnalysis,
      componentes: {
        cajones:  config.components.includes("Cajones")   ? 2 : 0,
        puertas:  config.components.includes("Puertas")   ? 2 : 0,
        tipoPuerta: "abatible",
        repisas:  config.components.includes("Repisas")   ? 2 : 0,
        repisasAjustables: false,
        iluminacionLED: config.components.includes("Iluminación LED"),
        tipLED: "",
        espejo:   false,
        vidrio:   config.components.includes("Vidrio templado"),
        ruedas:   config.components.includes("Ruedas"),
        candado:  config.components.includes("Cerraduras"),
        jalonesEspeciales: false,
        backpanel: true,
      },
    };
    localStorage.setItem("fenga_inspiration_transfer", JSON.stringify(studioParams));

    // Images + full package → sessionStorage (larger, same-tab transfer)
    try {
      const imagePackage = {
        renderImage: renderUrl,
        techImages,
        techDoc,
        furnitureName: `${config.type} — ${config.style}`,
      };
      sessionStorage.setItem("fenga_inspiration_images", JSON.stringify(imagePackage));
    } catch {
      sessionStorage.removeItem("fenga_inspiration_images");
    }

    // Create project in DB and redirect to factory page
    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:      config.type || "Mueble personalizado",
          estilo:      config.style,
          presupuesto: `$${config.budget.toLocaleString("es-MX")} MXN`,
          descripcion: config.description,
          materiales:  config.materials,
          dimensiones: {
            width:  String(config.dimensions.width),
            height: String(config.dimensions.height),
            depth:  String(config.dimensions.depth),
          },
          componentes:  config.components,
          renderImage:  renderUrl || "",
          techImages:   techImages,
          techDoc:      techDoc || {},
          fengarParams: studioParams,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setTimeout(() => { window.location.href = `/proyectos?nuevo=${data.id}`; }, 800);
      } else {
        setTimeout(() => { window.location.href = "/proyectos"; }, 800);
      }
    } catch {
      setTimeout(() => { window.location.href = "/proyectos"; }, 800);
    }
  }, [config, logoAnalysis, renderUrl, techImages, techDoc]);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen message={loadingMsg} progress={loadingProgress} />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,184,0,0); }
          50%       { box-shadow: 0 0 0 8px rgba(245,184,0,0.12); }
        }
        @keyframes shimmerGold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .step-content { animation: fadeSlideIn 0.4s ease both; }
        .hover-gold:hover { border-color: var(--gold) !important; color: var(--gold) !important; }
        .btn-gold-pulse { animation: goldPulse 2s ease-in-out infinite; }
        .material-chip:hover { background: rgba(245,184,0,0.08) !important; border-color: rgba(245,184,0,0.35) !important; }
        .style-card:hover { border-color: rgba(245,184,0,0.4) !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .comp-toggle:hover { background: rgba(245,184,0,0.06) !important; border-color: rgba(245,184,0,0.2) !important; }
        .chat-bubble { animation: fadeSlideIn 0.25s ease both; }
        input[type=range].budget-slider { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
        input[type=range].budget-slider::-webkit-slider-runnable-track { height: 4px; background: var(--border); border-radius: 2px; }
        input[type=range].budget-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--gold); margin-top: -7px; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
        .render-img { transition: transform 0.4s cubic-bezier(0.23,1,0.32,1); cursor: zoom-in; }
        .render-img:hover { transform: scale(1.01); }
        .prompt-magic-btn { background-size: 200% auto; }
        .prompt-magic-btn:hover { box-shadow: 0 0 48px rgba(245,184,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08) !important; transform: scale(1.03); }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        height: 58, display: "flex", alignItems: "center",
        padding: "0 28px", gap: 20,
      }}>
        {/* Back */}
        <a href="/" style={{
          display: "flex", alignItems: "center", gap: 6,
          color: "var(--text-dim)", fontSize: 12, textDecoration: "none",
          transition: "color 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
        >
          <ArrowLeft size={14} /> Fenga Studio
        </a>

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 28, height: 28, background: "#000", border: "1px solid var(--border)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            <Image src="/logofenga.png" alt="Fenga" width={22} height={22} style={{ objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>Inspiración</span>
            <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.8px" }}>by Fenga</span>
          </div>
        </div>

        {/* Step progress */}
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {STEPS.map((s, i) => {
            const done    = step > i;
            const active  = step === i;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  opacity: done || active ? 1 : 0.35,
                  transition: "opacity 0.3s",
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `1.5px solid ${active ? "var(--gold)" : done ? "rgba(74,222,128,0.8)" : "var(--border)"}`,
                    background: active ? "rgba(245,184,0,0.12)" : done ? "rgba(74,222,128,0.1)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700,
                    color: active ? "var(--gold)" : done ? "#4ade80" : "var(--text-dim)",
                    transition: "all 0.3s",
                  }}>
                    {done ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: active ? 600 : 400,
                    color: active ? "var(--text)" : "var(--text-dim)",
                    display: "none",
                  }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 16, height: 1, background: step > i ? "rgba(74,222,128,0.3)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ════ STEP 0: CONCEPTO ════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="step-content" style={{ maxWidth: 680, margin: "0 auto" }}>
            {/* Hero heading */}
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 14px", borderRadius: 20,
                border: "1px solid rgba(245,184,0,0.25)",
                background: "rgba(245,184,0,0.05)",
                marginBottom: 20,
              }}>
                <Sparkles size={11} style={{ color: "var(--gold)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Diseño IA · Fenga
                </span>
              </div>
              <h1 style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
                margin: "0 0 16px",
              }}>
                ¿Qué mueble<br />
                <span style={{
                  background: "linear-gradient(135deg, #F5B800 0%, #FFD966 50%, #F5B800 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "shimmerGold 3s linear infinite",
                }}>imaginas?</span>
              </h1>
              <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 460, margin: "0 auto" }}>
                Describe tu idea y la IA generará un render fotorrealista junto con toda la documentación técnica para fabricarlo con Fenga.
              </p>
            </div>

            {/* ── Spectacular prompt generator ── */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <button
                className="prompt-magic-btn"
                onClick={handleGeneratePrompt}
                disabled={promptGenerating}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "13px 32px", borderRadius: 50,
                  background: promptGenerating
                    ? "var(--surface-2)"
                    : "linear-gradient(135deg, rgba(245,184,0,0.18) 0%, rgba(255,217,102,0.10) 50%, rgba(245,184,0,0.18) 100%)",
                  border: `1.5px solid ${promptGenerating ? "var(--border)" : "rgba(245,184,0,0.55)"}`,
                  color: promptGenerating ? "var(--text-dim)" : "var(--gold)",
                  fontSize: 14, fontWeight: 700,
                  cursor: promptGenerating ? "not-allowed" : "pointer",
                  fontFamily: "inherit", letterSpacing: "0.2px",
                  transition: "all 0.25s",
                  boxShadow: promptGenerating ? "none" : "0 0 28px rgba(245,184,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                  animation: promptGenerating ? "none" : "shimmerGold 2.5s linear infinite",
                }}
              >
                {promptGenerating ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                    Generando idea...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} style={{ filter: "drop-shadow(0 0 4px rgba(245,184,0,0.6))" }} />
                    Sorpréndeme
                    <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>✦</span>
                  </>
                )}
              </button>
              <div style={{
                fontSize: 10, marginTop: 9,
                transition: "all 0.4s", opacity: promptFlash ? 1 : 0.55,
                color: promptFlash ? "#4ade80" : "var(--text-dim)",
              }}>
                {promptFlash ? "✓ Concepto generado — revisa los campos" : "Genera un concepto de mueble extraordinario · cada clic es una joya"}
              </div>
            </div>

            {/* ── Divider ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>o describe tu idea</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: 8 }}>
                  Tipo de mueble
                </label>
                <input
                  type="text"
                  placeholder="Ej: Escritorio ejecutivo, Mostrador de tienda, Librero modular..."
                  value={config.type}
                  onChange={e => setConfig(c => ({ ...c, type: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = "var(--gold)"; e.target.style.boxShadow = "0 0 0 3px rgba(245,184,0,0.08)"; }}
                  onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  style={{
                    width: "100%", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: 10,
                    padding: "14px 16px", color: "var(--text)", fontSize: 15,
                    outline: "none", fontFamily: "inherit",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: 8 }}>
                  Descripción detallada
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe el uso, el ambiente donde estará, materiales preferidos, cualquier detalle importante..."
                  value={config.description}
                  onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = "var(--gold)"; e.target.style.boxShadow = "0 0 0 3px rgba(245,184,0,0.08)"; }}
                  onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  style={{
                    width: "100%", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: 10,
                    padding: "14px 16px", color: "var(--text)", fontSize: 13,
                    lineHeight: 1.6, resize: "none", outline: "none",
                    fontFamily: "inherit",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                />
              </div>
            </div>

            <StepNav
              step={step} setStep={setStep}
              canNext={config.type.trim().length > 0}
              totalSteps={STEPS.length}
            />
          </div>
        )}

        {/* ════ STEP 1: CONFIGURACIÓN ═══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="step-content">
            <StepHeader step={1} title="Configura el diseño" subtitle="Estilo, materiales, dimensiones y componentes." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Left: style + materials */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Style cards */}
                <div>
                  <SectionLabel>Estilo</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {STYLES.map(s => {
                      const active = config.style === s.id;
                      return (
                        <button
                          key={s.id}
                          className="style-card"
                          onClick={() => setConfig(c => ({ ...c, style: s.id }))}
                          style={{
                            background: active ? "rgba(245,184,0,0.08)" : "var(--surface-2)",
                            border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                            borderRadius: 10, padding: "10px 12px",
                            textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                            transition: "all 0.18s",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--gold)" : "var(--text)" }}>{s.id}</div>
                          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <SectionLabel>Materiales</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {MATERIALS.map(m => {
                      const active = config.materials.includes(m);
                      return (
                        <button
                          key={m}
                          className="material-chip"
                          onClick={() => setConfig(c => ({
                            ...c,
                            materials: active ? c.materials.filter(x => x !== m) : [...c.materials, m],
                          }))}
                          style={{
                            padding: "5px 12px", borderRadius: 20, fontSize: 11,
                            cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 600 : 400,
                            background: active ? "rgba(245,184,0,0.1)" : "var(--surface-2)",
                            border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                            color: active ? "var(--gold)" : "var(--text-muted)",
                            transition: "all 0.15s",
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: dimensions + components */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Dimensions */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                  <SectionLabel>Dimensiones (cm)</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {(["width", "height", "depth"] as const).map(d => (
                      <div key={d}>
                        <div style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                          {d === "width" ? "Ancho" : d === "height" ? "Alto" : "Prof."}
                        </div>
                        <input
                          type="number"
                          value={config.dimensions[d]}
                          onChange={e => setConfig(c => ({ ...c, dimensions: { ...c.dimensions, [d]: Number(e.target.value) || 0 } }))}
                          style={{
                            width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: 7, padding: "7px 10px", color: "var(--text)", fontSize: 13,
                            fontFamily: "inherit", outline: "none", textAlign: "center",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Components */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
                  <SectionLabel>Componentes</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {COMPONENTS.map(comp => {
                      const active = config.components.includes(comp);
                      return (
                        <button
                          key={comp}
                          className="comp-toggle"
                          onClick={() => setConfig(c => ({
                            ...c,
                            components: active ? c.components.filter(x => x !== comp) : [...c.components, comp],
                          }))}
                          style={{
                            display: "flex", alignItems: "center", gap: 9,
                            padding: "7px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                            background: active ? "rgba(245,184,0,0.07)" : "transparent",
                            border: `1px solid ${active ? "rgba(245,184,0,0.3)" : "transparent"}`,
                            color: active ? "var(--gold)" : "var(--text-muted)",
                            fontSize: 12, fontWeight: active ? 600 : 400, textAlign: "left",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{
                            width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                            border: `1.5px solid ${active ? "var(--gold)" : "var(--border-2, rgba(255,255,255,0.2))"}`,
                            background: active ? "var(--gold)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}>
                            {active && <span style={{ fontSize: 9, color: "#000", fontWeight: 900 }}>✓</span>}
                          </div>
                          {comp}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <StepNav step={step} setStep={setStep} totalSteps={STEPS.length} />
          </div>
        )}

        {/* ════ STEP 2: MARCA Y PRESUPUESTO ════════════════════════════════════ */}
        {step === 2 && (
          <div className="step-content" style={{ maxWidth: 720, margin: "0 auto" }}>
            <StepHeader step={2} title="Marca y Presupuesto" subtitle="Personaliza con el logo de tu marca y define la inversión." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Logo upload */}
              <div>
                <SectionLabel>Logo del cliente (opcional)</SectionLabel>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                {config.logoBase64 ? (
                  <div style={{
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={config.logoBase64} alt="Logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: "var(--surface)" }} />
                      <div style={{ flex: 1 }}>
                        {logoAnalysis ? (
                          <>
                            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>✓ Marca analizada</div>
                            <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{logoAnalysis.style}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Logo cargado</div>
                        )}
                      </div>
                      <button onClick={() => { setConfig(c => ({ ...c, logoBase64: undefined })); setLogoAnalysis(null); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", display: "flex" }}>
                        <X size={14} />
                      </button>
                    </div>
                    {logoAnalysis?.promptDescription && (
                      <div style={{ fontSize: 9, color: "var(--text-dim)", padding: "6px 10px", background: "rgba(245,184,0,0.04)", border: "1px solid rgba(245,184,0,0.12)", borderRadius: 7, lineHeight: 1.5 }}>
                        {logoAnalysis.promptDescription.slice(0, 100)}…
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: "100%", aspectRatio: "16/9",
                      background: "var(--surface-2)", border: "2px dashed var(--border)",
                      borderRadius: 14, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 10,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,184,0,0.35)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,184,0,0.03)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                  >
                    <Upload size={22} style={{ color: "var(--text-dim)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Subir logo de marca</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>PNG, JPG · La IA lo integrará en el render</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Budget */}
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <SectionLabel>Presupuesto máximo</SectionLabel>

                {/* Tier badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: `${getBudgetTier(config.budget).color}18`,
                    color: getBudgetTier(config.budget).color,
                    border: `1px solid ${getBudgetTier(config.budget).color}40`,
                    transition: "all 0.3s",
                  }}>
                    {getBudgetTier(config.budget).label}
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)", letterSpacing: "-1px" }}>
                    ${config.budget.toLocaleString("es-MX")}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-dim)", marginLeft: 3 }}>MXN</span>
                  </span>
                </div>

                <input
                  type="range" min={2000} max={150000} step={1000}
                  value={config.budget}
                  onChange={e => setConfig(c => ({ ...c, budget: Number(e.target.value) }))}
                  className="budget-slider"
                  style={{ width: "100%" }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-dim)" }}>
                  {BUDGET_TIERS.map(t => (
                    <span key={t.label} style={{ color: config.budget <= t.max ? t.color : "var(--text-dim)", fontWeight: config.budget <= t.max ? 700 : 400, transition: "all 0.3s" }}>
                      {t.label}
                    </span>
                  ))}
                </div>

                <div style={{ padding: "10px 12px", background: "rgba(245,184,0,0.05)", border: "1px solid rgba(245,184,0,0.12)", borderRadius: 9 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Sparkles size={13} style={{ color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                      La IA ajustará materiales y complejidad para que el diseño sea factible dentro de este presupuesto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <StepNav
              step={step} setStep={setStep}
              totalSteps={STEPS.length}
              nextLabel="Generar Render"
              onNext={handleGenerateRender}
            />
          </div>
        )}

        {/* ════ STEP 3: REVISIÓN DE RENDER ═════════════════════════════════════ */}
        {step === 3 && renderUrl && (
          <div className="step-content">
            <StepHeader step={3} title="Revisión de Diseño" subtitle="¿Te gusta la propuesta? Puedes solicitar cambios o aprobar para generar la ficha técnica completa." />

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Render */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  position: "relative", borderRadius: 16, overflow: "hidden",
                  border: "1px solid var(--border)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={renderUrl}
                    alt="Render AI"
                    className="render-img"
                    onClick={() => setZoomedRender(true)}
                    style={{ width: "100%", display: "block" }}
                  />
                  <button
                    onClick={() => setZoomedRender(true)}
                    style={{
                      position: "absolute", top: 12, right: 12,
                      width: 32, height: 32, borderRadius: 8,
                      background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <ZoomIn size={15} />
                  </button>
                  <div style={{
                    position: "absolute", bottom: 12, left: 12,
                    padding: "4px 10px", borderRadius: 20,
                    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
                    fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)",
                    textTransform: "uppercase", letterSpacing: "0.8px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    Propuesta AI · Imagen 4 Ultra
                  </div>
                </div>

                {/* Edit bar */}
                <div style={{
                  display: "flex", gap: 8,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "6px 8px",
                }}>
                  <input
                    type="text"
                    placeholder='Solicita cambios (ej: "hazlo más alto", "agrega puertas de vidrio")'
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleEditRender()}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "var(--text)", fontSize: 12, fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={handleEditRender}
                    disabled={editLoading || !editPrompt.trim()}
                    style={{
                      padding: "6px 14px", borderRadius: 7,
                      background: editLoading || !editPrompt.trim() ? "var(--border)" : "rgba(245,184,0,0.12)",
                      border: `1px solid ${editLoading || !editPrompt.trim() ? "var(--border)" : "var(--gold)"}`,
                      color: editLoading || !editPrompt.trim() ? "var(--text-dim)" : "var(--gold)",
                      fontSize: 11, fontWeight: 600, cursor: editLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
                      transition: "all 0.15s",
                    }}
                  >
                    {editLoading ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={11} />}
                    {editLoading ? "Actualizando..." : "Aplicar"}
                  </button>
                </div>
              </div>

              {/* Right panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Design summary */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Resumen del diseño</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <SummaryRow label="Tipo"     value={config.type} />
                    <SummaryRow label="Estilo"   value={config.style} />
                    <SummaryRow label="Dims"     value={`${config.dimensions.width}×${config.dimensions.height}×${config.dimensions.depth} cm`} />
                    <SummaryRow label="Presupuesto" value={`$${config.budget.toLocaleString("es-MX")} MXN`} gold />
                    {config.materials.length > 0 && (
                      <SummaryRow label="Materiales" value={config.materials.slice(0, 2).join(", ")} />
                    )}
                  </div>
                </div>

                {/* CTA approve */}
                <button
                  onClick={handleApprove}
                  className="btn-gold-pulse"
                  style={{
                    width: "100%", padding: "14px 20px",
                    background: "var(--gold)", border: "none", borderRadius: 12,
                    color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 8, transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <CheckCircle2 size={16} />
                  Aprobar y generar ficha
                </button>

                <button
                  onClick={handleGenerateRender}
                  style={{
                    width: "100%", padding: "10px 16px",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 12, color: "var(--text-muted)", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-2, rgba(255,255,255,0.15))"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <RefreshCw size={13} /> Nueva propuesta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEP 4: CENTRO DE CONTROL ══════════════════════════════════════ */}
        {step === 4 && renderUrl && techDoc && (
          <div className="step-content">
            {/* Send to Fenga Banner */}
            {!transferred ? (
              <div style={{
                background: "linear-gradient(135deg, rgba(245,184,0,0.12) 0%, rgba(245,184,0,0.06) 100%)",
                border: "1px solid rgba(245,184,0,0.3)",
                borderRadius: 16, padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 16,
                marginBottom: 28,
              }}>
                <div style={{ width: 44, height: 44, background: "var(--gold)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Hammer size={20} style={{ color: "#000" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                    ¿Listo para fabricarlo con Fenga?
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Envía este diseño directamente al estudio de producción de Fenga con un clic. Todos los parámetros se transferirán automáticamente.
                  </div>
                </div>
                <button
                  onClick={handleSendToFenga}
                  style={{
                    padding: "12px 24px", background: "var(--gold)",
                    border: "none", borderRadius: 10,
                    color: "#000", fontSize: 13, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 8,
                    flexShrink: 0, transition: "transform 0.15s, opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Send size={14} />
                  Enviar a Fenga para fabricar
                </button>
              </div>
            ) : (
              <div style={{
                background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)",
                borderRadius: 16, padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 14,
                marginBottom: 28,
              }}>
                <Loader2 size={20} style={{ color: "#4ade80", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>Creando proyecto en Fenga Fábrica...</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Registrando diseño en la base de datos de producción.</div>
                </div>
              </div>
            )}

            {/* ── Technical Drawings Gallery ───────────────────────────────────── */}
            {techImages.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: "var(--gold)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
                    Planos Mecánicos — {techImages.length} vistas con medidas
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 4, padding: "2px 8px", background: "rgba(245,184,0,0.08)", border: "1px solid rgba(245,184,0,0.2)", borderRadius: 12 }}>
                    Imagen 4 Ultra
                  </span>
                </div>

                {/* Primary view (large) */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                  {techImages.slice(0, 1).map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setZoomedDrawing(img)}
                      style={{
                        gridRow: "span 2",
                        borderRadius: 12, overflow: "hidden",
                        border: "1px solid var(--border)",
                        cursor: "zoom-in", position: "relative",
                        background: "var(--surface-2)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image} alt={img.view} style={{ width: "100%", display: "block" }} />
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                        padding: "20px 12px 10px",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{img.view}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{img.label}</div>
                      </div>
                      <div style={{
                        position: "absolute", top: 8, right: 8,
                        width: 26, height: 26, borderRadius: 6,
                        background: "rgba(0,0,0,0.5)", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <ZoomIn size={13} style={{ color: "rgba(255,255,255,0.7)" }} />
                      </div>
                    </div>
                  ))}

                  {/* Remaining 6 in 2×3 grid */}
                  {techImages.slice(1).map((img, i) => (
                    <div
                      key={i + 1}
                      onClick={() => setZoomedDrawing(img)}
                      style={{
                        borderRadius: 10, overflow: "hidden",
                        border: "1px solid var(--border)",
                        cursor: "zoom-in", position: "relative",
                        background: "var(--surface-2)",
                        aspectRatio: "1/1",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image} alt={img.view} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        padding: "16px 8px 6px",
                        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{img.view}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Left: render + docs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Render */}
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={renderUrl} alt="Render aprobado" style={{ width: "100%", display: "block", cursor: "zoom-in" }} onClick={() => setZoomedRender(true)} />
                  <div style={{ position: "absolute", bottom: 12, left: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(74,222,128,0.15)", backdropFilter: "blur(6px)", fontSize: 9, fontWeight: 700, color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    ✓ Diseño aprobado
                  </div>
                </div>

                {/* Plans */}
                <DocSection title="Planos técnicos" accent="var(--gold)">
                  {techDoc.plans.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface-2)", borderRadius: 9, border: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{p.view}</div>
                        <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{p.description}</div>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "monospace", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 8px", color: "var(--text-muted)" }}>{p.dimensions}</span>
                    </div>
                  ))}
                </DocSection>

                {/* Cut list */}
                <DocSection title="Lista de cortes">
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["Pieza", "Material", "Dimensiones", "Cant."].map(h => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {techDoc.cutList.map((c, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <td style={{ padding: "9px 10px", fontWeight: 500, color: "var(--text)" }}>{c.part}</td>
                            <td style={{ padding: "9px 10px", color: "var(--text-muted)" }}>{c.material}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 10 }}>{c.dimensions}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 700, color: "var(--gold)", textAlign: "center" }}>{c.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DocSection>

                {/* Assembly steps */}
                <DocSection title="Pasos de ensamble">
                  {techDoc.assemblySteps.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                        background: "rgba(245,184,0,0.1)", border: "1px solid rgba(245,184,0,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: "var(--gold)",
                      }}>{i + 1}</div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, paddingTop: 3 }}>{s}</p>
                    </div>
                  ))}
                </DocSection>
              </div>

              {/* Right: cost + hardware + chat */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 74 }}>
                {/* Cost summary */}
                <div style={{ background: "#111", border: "1px solid rgba(245,184,0,0.2)", borderRadius: 14, padding: 18, overflow: "hidden" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,184,0,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Cotización estimada</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {techDoc.quotation.map((q, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{q.item}</span>
                        <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.7)" }}>${Number(q.cost).toLocaleString("es-MX", { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Total estimado</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)", fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                      ${Number(techDoc.totalEstimatedCost).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-dim)", marginLeft: 3 }}>MXN</span>
                    </span>
                  </div>
                </div>

                {/* Hardware */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Herrajes requeridos</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {techDoc.hardware.map((h, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text)" }}>{h.item}</div>
                          <div style={{ fontSize: 9, color: "var(--text-dim)" }}>{h.purpose}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>×{h.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workshop chat */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: 320 }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", animation: "goldPulse 2s ease-in-out infinite" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Asistente de taller</span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {chat.length === 0 && (
                      <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: "20px 8px", lineHeight: 1.6 }}>
                        Haz cualquier pregunta técnica sobre este diseño, materiales, costos o proceso de fabricación.
                      </div>
                    )}
                    {chat.map((m, i) => (
                      <div key={i} className="chat-bubble" style={{
                        maxWidth: "88%",
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        background: m.role === "user" ? "rgba(245,184,0,0.1)" : "var(--surface)",
                        border: `1px solid ${m.role === "user" ? "rgba(245,184,0,0.2)" : "var(--border)"}`,
                        borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                        padding: "8px 12px",
                        fontSize: 11, lineHeight: 1.55,
                        color: m.role === "user" ? "var(--gold)" : "var(--text-muted)",
                      }}>
                        {m.text}
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: "flex", gap: 4, padding: "8px 12px" }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-dim)", animation: `goldPulse ${0.6 + i * 0.2}s ease-in-out infinite` }} />
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Duda técnica..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleChat()}
                      style={{
                        flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "6px 10px", color: "var(--text)",
                        fontSize: 11, outline: "none", fontFamily: "inherit",
                      }}
                    />
                    <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} style={{
                      width: 30, height: 30, borderRadius: 8, border: "none",
                      background: chatLoading || !chatInput.trim() ? "var(--border)" : "var(--gold)",
                      color: chatLoading || !chatInput.trim() ? "var(--text-dim)" : "#000",
                      cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s", flexShrink: 0,
                    }}>
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: "#000", border: "1px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/logofenga.png" alt="Fenga" width={18} height={18} style={{ objectFit: "contain", opacity: 0.7 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "1px", textTransform: "uppercase" }}>Fenga · Inspiración</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/iamanos.png" alt="iamanos" style={{ width: 18, height: 18, objectFit: "contain", opacity: 0.6 }} />
          <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
            Desarrollado por <a href="https://iamanos.com" target="_blank" rel="noreferrer" style={{ color: "var(--text-dim)", textDecoration: "none" }}>iamanos.com</a>
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 9, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          <span>Imagen 4 Ultra</span>
          <span>Gemini 2.0 Flash</span>
          <span>Vision AI</span>
        </div>
      </footer>

      {/* ── Render zoom overlay ──────────────────────────────────────────────── */}
      {zoomedRender && renderUrl && (
        <div
          onClick={() => setZoomedRender(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={renderUrl} alt="Zoom"
            style={{ maxWidth: "min(92vw, 1200px)", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedRender(false)}
            style={{
              position: "absolute", top: 20, right: 20,
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Drawing zoom overlay ─────────────────────────────────────────── */}
      {zoomedDrawing && (
        <div
          onClick={() => setZoomedDrawing(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.94)", backdropFilter: "blur(10px)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: 24, cursor: "zoom-out",
          }}
        >
          <div style={{
            maxWidth: "min(94vw, 1100px)", width: "100%",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{zoomedDrawing.view}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{zoomedDrawing.label}</div>
              </div>
              <button
                onClick={() => setZoomedDrawing(null)}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedDrawing.image}
              alt={zoomedDrawing.view}
              style={{
                width: "100%", borderRadius: 12,
                boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
                cursor: "default",
              }}
              onClick={e => e.stopPropagation()}
            />
            {/* Navigate between drawings */}
            {techImages.length > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {techImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setZoomedDrawing(img); }}
                    style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                      background: zoomedDrawing === img ? "rgba(245,184,0,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${zoomedDrawing === img ? "rgba(245,184,0,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: zoomedDrawing === img ? "var(--gold)" : "rgba(255,255,255,0.5)",
                      transition: "all 0.15s",
                    }}
                  >
                    {img.view}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
        Paso {step + 1} de {STEPS.length}
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.7px", margin: "0 0 6px", color: "var(--text)" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: gold ? 700 : 500, color: gold ? "var(--gold)" : "var(--text-muted)", textAlign: "right", lineHeight: 1.3 }}>{value}</span>
    </div>
  );
}

function DocSection({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: "var(--surface-2)", border: `1px solid var(--border)`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        {accent && <div style={{ width: 3, height: 14, borderRadius: 2, background: accent }} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{title}</span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function StepNav({
  step, setStep, canNext = true, totalSteps,
  nextLabel, onNext,
}: {
  step: number; setStep: (s: number) => void;
  canNext?: boolean; totalSteps: number;
  nextLabel?: string; onNext?: () => void;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border)",
    }}>
      <button
        onClick={() => setStep(Math.max(0, step - 1))}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "10px 18px", borderRadius: 10,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          color: step === 0 ? "transparent" : "var(--text-muted)",
          fontSize: 12, cursor: step === 0 ? "default" : "pointer",
          fontFamily: "inherit", pointerEvents: step === 0 ? "none" : "auto",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (step > 0) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <ChevronLeft size={14} /> Atrás
      </button>

      <button
        onClick={onNext || (() => setStep(Math.min(totalSteps - 1, step + 1)))}
        disabled={!canNext}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 28px", borderRadius: 10,
          background: canNext ? "var(--gold)" : "var(--border)",
          border: "none",
          color: canNext ? "#000" : "var(--text-dim)",
          fontSize: 13, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed",
          fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (canNext) e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        {nextLabel || "Siguiente"} <ChevronRight size={14} />
      </button>
    </div>
  );
}

function LoadingScreen({ message, progress = 0 }: { message: string; progress?: number }) {
  const stages = [
    "Analizando diseño...",
    "Generando render fotorrealista...",
    "Calculando lista de cortes...",
    "Generando planos mecánicos...",
    "Verificando medidas y herrajes...",
    "Compilando ficha técnica completa...",
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 24, padding: 40, textAlign: "center",
    }}>
      <div style={{ position: "relative" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: "var(--surface)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <Image src="/logofenga.png" alt="Fenga" width={54} height={54} style={{ objectFit: "contain", opacity: 0.9 }} />
        </div>
        <div style={{
          position: "absolute", inset: -10,
          border: "2px solid rgba(245,184,0,0.15)",
          borderRadius: 32, borderTopColor: "var(--gold)",
          animation: "spin 1.5s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: -18,
          border: "1px solid rgba(245,184,0,0.06)",
          borderRadius: 40, borderRightColor: "rgba(245,184,0,0.25)",
          animation: "spin 3s linear infinite reverse",
        }} />
      </div>

      <div style={{ maxWidth: 400 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
          Preparando tu ficha técnica
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{message}</p>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: "linear-gradient(90deg, var(--gold), #FFD966)",
              width: `${progress}%`,
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>{progress}%</div>
        </div>
      )}

      {/* Stage indicators */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 320 }}>
        {stages.map((stage, i) => {
          const stageProgress = (i / (stages.length - 1)) * 100;
          const done = progress > stageProgress;
          const active = progress >= stageProgress && progress < (((i + 1) / (stages.length - 1)) * 100);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              opacity: done || active ? 1 : 0.25, transition: "opacity 0.4s",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: `1.5px solid ${done ? "#4ade80" : active ? "var(--gold)" : "var(--border)"}`,
                background: done ? "rgba(74,222,128,0.15)" : active ? "rgba(245,184,0,0.1)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, transition: "all 0.4s",
              }}>
                {done && <span style={{ color: "#4ade80", fontWeight: 900 }}>✓</span>}
                {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", animation: "goldPulse 1s ease-in-out infinite" }} />}
              </div>
              <span style={{ fontSize: 11, color: done ? "#4ade80" : active ? "var(--gold)" : "var(--text-dim)", textAlign: "left" }}>{stage}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes goldPulse { 0%,100%{opacity:0.4;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
