export type GenerationState = "idle" | "generating" | "results" | "error";

export interface Componentes {
  cajones: number;
  puertas: number;
  tipoPuerta: "abatible" | "corredera" | "plegable";
  repisas: number;
  repisasAjustables: boolean;
  iluminacionLED: boolean;
  tipLED: "tira_blanca" | "tira_rgb" | "empotrada" | "";
  espejo: boolean;
  vidrio: boolean;
  ruedas: boolean;
  candado: boolean;
  jalonesEspeciales: boolean;
  backpanel: boolean;
}

export interface LogoAnalysis {
  colors: string[];
  bgColor: string;
  text: string;
  shapes: string;
  style: string;
  promptDescription: string;
}

export interface DesignParams {
  description: string;
  style: string;
  materials: string[];
  dimensions: {
    width: string;
    height: string;
    depth: string;
  };
  budget: string;
  quantity: string;
  componentes: Componentes;
  logoBase64?: string;
  logoAnalysis?: LogoAnalysis;
  promptTier?: string;
}

export const defaultComponentes: Componentes = {
  cajones: 0,
  puertas: 0,
  tipoPuerta: "abatible",
  repisas: 0,
  repisasAjustables: false,
  iluminacionLED: false,
  tipLED: "",
  espejo: false,
  vidrio: false,
  ruedas: false,
  candado: false,
  jalonesEspeciales: false,
  backpanel: true,
};

export const STYLES = [
  { id: "industrial",  label: "Industrial",   icon: "⚙" },
  { id: "minimalista", label: "Minimalista",  icon: "◻" },
  { id: "moderno",     label: "Moderno",      icon: "◈" },
  { id: "corporativo", label: "Corporativo",  icon: "▣" },
  { id: "retail",      label: "Retail / POS", icon: "◉" },
  { id: "premium",     label: "Premium",      icon: "◆" },
];

export const MATERIALS = [
  "MDF",
  "Melamina",
  "Madera sólida",
  "Acero",
  "Aluminio",
  "Acrílico",
  "Vidrio",
  "Cartón corrugado",
  "Triplay",
  "PVC",
];
