/**
 * Fenga — File-based project database
 * Uses the local filesystem (data/ directory) for JSON storage.
 * Import only from server-side code (API routes).
 */

import fs   from "fs";
import path from "path";

const DATA_DIR    = path.join(process.cwd(), "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const INDEX_FILE  = path.join(DATA_DIR, "proyectos.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR))     fs.mkdirSync(DATA_DIR,     { recursive: true });
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type ProjectStatus = "pendiente" | "en_produccion" | "completado" | "cancelado";

export interface ProjectSummary {
  id:          string;
  createdAt:   string;      // ISO date
  status:      ProjectStatus;
  nombre:      string;      // furniture type  e.g. "Escritorio ejecutivo"
  estilo:      string;
  presupuesto: string;      // "$15,000 MXN"
  nota?:       string;      // factory note
}

export interface TechImage  { view: string; label: string; image: string; }
export interface TechDocRow { [key: string]: unknown; }

export interface ProjectDetail extends ProjectSummary {
  descripcion:  string;
  materiales:   string[];
  dimensiones:  { width: string; height: string; depth: string };
  componentes:  string[];
  renderImage:  string;           // base64 of approved render
  techImages:   TechImage[];      // 7 mechanical drawings
  techDoc:      TechDocRow;       // full technical documentation object
  fengarParams: Record<string, unknown>; // fenga-app DesignParams for re-generation
}

// ─── Index (summary list — no images) ────────────────────────────────────────
export function readIndex(): ProjectSummary[] {
  ensureDirs();
  if (!fs.existsSync(INDEX_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8")); }
  catch { return []; }
}

function writeIndex(projects: ProjectSummary[]): void {
  ensureDirs();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

// ─── Individual project files ─────────────────────────────────────────────────
export function readProject(id: string): ProjectDetail | null {
  ensureDirs();
  const file = path.join(PROJECTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return null; }
}

function writeProjectFile(project: ProjectDetail): void {
  ensureDirs();
  fs.writeFileSync(
    path.join(PROJECTS_DIR, `${project.id}.json`),
    JSON.stringify(project),  // no pretty-print — images make it huge
    "utf-8",
  );
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export function createProject(data: Omit<ProjectDetail, "id" | "createdAt" | "status">): ProjectDetail {
  ensureDirs();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const project: ProjectDetail = {
    id,
    createdAt:  new Date().toISOString(),
    status:     "pendiente",
    ...data,
  };

  // Write full detail (with images)
  writeProjectFile(project);

  // Update index (summary only, no images)
  const summary: ProjectSummary = {
    id:          project.id,
    createdAt:   project.createdAt,
    status:      project.status,
    nombre:      project.nombre,
    estilo:      project.estilo,
    presupuesto: project.presupuesto,
  };
  const index = readIndex();
  index.unshift(summary); // newest first
  writeIndex(index);

  return project;
}

export function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  nota?: string,
): ProjectSummary | null {
  ensureDirs();

  // Update index
  const index = readIndex();
  const sumIdx = index.findIndex(p => p.id === id);
  if (sumIdx === -1) return null;
  index[sumIdx] = { ...index[sumIdx], status, ...(nota !== undefined ? { nota } : {}) };
  writeIndex(index);

  // Update detail file
  const detail = readProject(id);
  if (detail) {
    detail.status = status;
    if (nota !== undefined) detail.nota = nota;
    writeProjectFile(detail);
  }

  return index[sumIdx];
}

export function deleteProject(id: string): boolean {
  ensureDirs();
  const index = readIndex();
  const filtered = index.filter(p => p.id !== id);
  if (filtered.length === index.length) return false;
  writeIndex(filtered);
  const file = path.join(PROJECTS_DIR, `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return true;
}
