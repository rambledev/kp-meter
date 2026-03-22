import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RoomBillRow } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const monthStr  = searchParams.get("month");
    const yearStr   = searchParams.get("year");
    const building  = searchParams.get("building") ?? undefined;
    const floor     = searchParams.get("floor")    ?? undefined;

    const now   = new Date();
    const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;
    const year  = yearStr  ? parseInt(yearStr)  : now.getFullYear();

    // ดึง settings สำหรับ rate
    const settings = await db.settings.findUnique({ where: { id: 1 } });
    const electricRate = settings?.electricRate ?? 8;
    const waterRate    = settings?.waterRate    ?? 18;

    // ดึงห้องทั้งหมด (filter ตาม building/floor)
    const rooms = await db.room.findMany({
      where: {
        ...(building ? { building } : {}),
        ...(floor    ? { floor }    : {}),
      },
      orderBy: [{ building: "asc" }, { floor: "asc" }, { id: "asc" }],
    });

    // ดึง record เดือนนี้และเดือนก่อนหน้าของทุกห้อง
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;

    const [currentRecords, prevRecords] = await Promise.all([
      db.meterRecord.findMany({
        where: { month, year },
        orderBy: { recordedAt: "desc" },
      }),
      db.meterRecord.findMany({
        where: { month: prevMonth, year: prevYear },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    // จัด index
    const currentMap = new Map<string, (typeof currentRecords)[0]>();
    const prevMap    = new Map<string, (typeof prevRecords)[0]>();

    for (const r of currentRecords) {
      const key = `${r.roomId}-${r.type}`;
      if (!currentMap.has(key)) currentMap.set(key, r);
    }
    for (const r of prevRecords) {
      const key = `${r.roomId}-${r.type}`;
      if (!prevMap.has(key)) prevMap.set(key, r);
    }

    // สร้าง bill rows
    const rows: RoomBillRow[] = rooms.map((room) => {
      const elecCurrent  = currentMap.get(`${room.id}-ELECTRIC`) ?? null;
      const elecPrev     = prevMap.get(`${room.id}-ELECTRIC`)    ?? null;
      const waterCurrent = currentMap.get(`${room.id}-WATER`)    ?? null;
      const waterPrev    = prevMap.get(`${room.id}-WATER`)       ?? null;

      const elecUnits  = elecCurrent?.units  ?? null;
      const waterUnits = waterCurrent?.units ?? null;
      const elecAmt    = elecUnits  !== null ? Math.round(elecUnits  * electricRate * 100) / 100 : null;
      const waterAmt   = waterUnits !== null ? Math.round(waterUnits * waterRate    * 100) / 100 : null;

      return {
        room: { ...room, createdAt: room.createdAt.toISOString() },
        electric: {
          current:  elecCurrent  ? { ...elecCurrent,  recordedAt: elecCurrent.recordedAt.toISOString()  } : null,
          previous: elecPrev     ? { ...elecPrev,     recordedAt: elecPrev.recordedAt.toISOString()     } : null,
          units:    elecUnits,
          amount:   elecAmt,
          recorded: !!elecCurrent,
        },
        water: {
          current:  waterCurrent ? { ...waterCurrent, recordedAt: waterCurrent.recordedAt.toISOString() } : null,
          previous: waterPrev    ? { ...waterPrev,    recordedAt: waterPrev.recordedAt.toISOString()    } : null,
          units:    waterUnits,
          amount:   waterAmt,
          recorded: !!waterCurrent,
        },
        totalAmount: (elecAmt ?? 0) + (waterAmt ?? 0),
      };
    });

    return NextResponse.json({ rows, electricRate, waterRate, month, year });
  } catch (error) {
    console.error("[GET /api/calculate]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}