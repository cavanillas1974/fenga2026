import { NextRequest, NextResponse } from "next/server";
import { readProject, updateProjectStatus, deleteProject, ProjectStatus } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/proyectos/[id] — full project detail with images
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const project = readProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/proyectos/[id] — update status and/or factory note
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { status, nota } = await req.json() as { status?: ProjectStatus; nota?: string };
    if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });
    const updated = updateProjectStatus(id, status, nota);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/proyectos/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ok = deleteProject(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
