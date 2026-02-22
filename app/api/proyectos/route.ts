import { NextRequest, NextResponse } from "next/server";
import { createProject, readIndex } from "@/lib/db";

// GET /api/proyectos — list all projects (summaries, no images)
export async function GET() {
  try {
    const projects = readIndex();
    return NextResponse.json(projects);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/proyectos — create a new project from Inspiración
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const project = createProject({
      nombre:       body.nombre      || "Proyecto sin nombre",
      estilo:       body.estilo      || "",
      presupuesto:  body.presupuesto || "",
      descripcion:  body.descripcion || "",
      materiales:   body.materiales  || [],
      dimensiones:  body.dimensiones || { width: "", height: "", depth: "" },
      componentes:  body.componentes || [],
      renderImage:  body.renderImage || "",
      techImages:   body.techImages  || [],
      techDoc:      body.techDoc     || {},
      fengarParams: body.fengarParams || {},
    });

    console.log(`✅ Proyecto creado: ${project.id} — ${project.nombre}`);
    // Return summary (no images in response to keep it fast)
    return NextResponse.json({
      id:          project.id,
      createdAt:   project.createdAt,
      status:      project.status,
      nombre:      project.nombre,
      estilo:      project.estilo,
      presupuesto: project.presupuesto,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/proyectos error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
