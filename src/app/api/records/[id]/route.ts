import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as { value: number };
    const value = parseFloat(body.value as unknown as string);
    if (isNaN(value)) {
      return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    }

    const existing = await db.meterRecord.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const units =
      existing.previousValue !== null && value > existing.previousValue
        ? Math.round((value - existing.previousValue) * 10) / 10
        : null;

    const updated = await db.meterRecord.update({
      where: { id: params.id },
      data: { value, units },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/records/:id]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.meterRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/records/:id]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}