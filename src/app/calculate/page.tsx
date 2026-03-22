"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Zap, Droplets, ChevronDown, Download,
  Pencil, Check, X, RefreshCw, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import type { RoomBillRow } from "@/types";

const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

interface CalcResponse {
  rows: RoomBillRow[];
  electricRate: number;
  waterRate: number;
  month: number;
  year: number;
}

export default function CalculatePage() {
  const now = new Date();
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year, setYear]           = useState(now.getFullYear());
  const [building, setBuilding]   = useState<string>("ทั้งหมด");
  const [floor, setFloor]         = useState<string>("ทั้งหมด");
  const [data, setData]           = useState<CalcResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ electric: string; water: string }>({
    electric: "", water: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        month: month.toString(),
        year:  year.toString(),
        ...(building !== "ทั้งหมด" ? { building } : {}),
        ...(floor    !== "ทั้งหมด" ? { floor }    : {}),
      });
      const res = await fetch(`/api/calculate?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }, [month, year, building, floor]);

  useEffect(() => { loadData(); }, [loadData]);

  // รายการ building/floor จาก data
  const buildings = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.rows.map((r) => r.room.building))].sort();
  }, [data]);

  const floors = useMemo(() => {
    if (!data) return [];
    return [...new Set(
      data.rows
        .filter((r) => building === "ทั้งหมด" || r.room.building === building)
        .map((r) => r.room.floor)
    )].sort();
  }, [data, building]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((r) => {
      const matchBuilding = building === "ทั้งหมด" || r.room.building === building;
      const matchFloor    = floor    === "ทั้งหมด" || r.room.floor    === floor;
      return matchBuilding && matchFloor;
    });
  }, [data, building, floor]);

  const summary = useMemo(() => ({
    totalRooms:    filteredRows.length,
    recordedElec:  filteredRows.filter((r) => r.electric.recorded).length,
    recordedWater: filteredRows.filter((r) => r.water.recorded).length,
    totalAmount:   filteredRows.reduce((s, r) => s + r.totalAmount, 0),
  }), [filteredRows]);

  // Edit inline
  const startEdit = useCallback((row: RoomBillRow) => {
    setEditingId(row.room.id);
    setEditValues({
      electric: row.electric.current?.value?.toString() ?? "",
      water:    row.water.current?.value?.toString()    ?? "",
    });
  }, []);

  const saveEdit = useCallback(async (row: RoomBillRow) => {
    try {
      const calls: Promise<void>[] = [];
      if (row.electric.current && editValues.electric) {
        calls.push(
          fetch(`/api/records/${row.electric.current.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: parseFloat(editValues.electric) }),
          }).then(() => {})
        );
      }
      if (row.water.current && editValues.water) {
        calls.push(
          fetch(`/api/records/${row.water.current.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: parseFloat(editValues.water) }),
          }).then(() => {})
        );
      }
      await Promise.all(calls);
      setEditingId(null);
      loadData();
    } catch {
      // silently fail
    }
  }, [editValues, loadData]);

  // Export Excel (simple CSV)
  const exportCSV = useCallback(() => {
    const headers = [
      "ห้อง", "อาคาร", "ชั้น",
      "มิเตอร์ไฟเดือนก่อน", "มิเตอร์ไฟเดือนนี้", "หน่วยไฟ", "ค่าไฟ",
      "มิเตอร์น้ำเดือนก่อน", "มิเตอร์น้ำเดือนนี้", "หน่วยน้ำ", "ค่าน้ำ",
      "รวม",
    ];
    const csvRows = filteredRows.map((r) => [
      r.room.name, r.room.building, r.room.floor,
      r.electric.previous?.value ?? "",
      r.electric.current?.value  ?? "",
      r.electric.units            ?? "",
      r.electric.amount           ?? "",
      r.water.previous?.value    ?? "",
      r.water.current?.value     ?? "",
      r.water.units               ?? "",
      r.water.amount              ?? "",
      r.totalAmount,
    ]);
    const csv = [headers, ...csvRows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `bill-${year}-${month.toString().padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRows, month, year]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PageHeader
        title="คำนวณค่าใช้จ่าย"
        subtitle={`${MONTHS_TH[month - 1]} ${year + 543}`}
        action={
          <button onClick={loadData}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        }
      />

      {/* ─── Filters ─── */}
      <div className="px-4 pb-3 space-y-3">
        {/* เดือน/ปี */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full h-10 rounded-xl border-2 border-input bg-background
                         px-3 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MONTHS_TH.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-10 rounded-xl border-2 border-input bg-background
                         px-3 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* อาคาร/ชั้น chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["ทั้งหมด", ...buildings].map((b) => (
            <button key={b} onClick={() => { setBuilding(b); setFloor("ทั้งหมด"); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                building === b
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
              {b === "ทั้งหมด" ? "ทุกอาคาร" : `อาคาร ${b}`}
            </button>
          ))}
          {floors.map((f) => (
            <button key={f} onClick={() => setFloor(floor === f ? "ทั้งหมด" : f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                floor === f
                  ? "bg-primary/80 text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
              ชั้น {f}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Summary ─── */}
      {data && !loading && (
        <div className="px-4 mb-3">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">บันทึกไฟแล้ว</p>
              <p className="font-bold text-sm">
                {summary.recordedElec}/{summary.totalRooms} ห้อง
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">บันทึกน้ำแล้ว</p>
              <p className="font-bold text-sm">
                {summary.recordedWater}/{summary.totalRooms} ห้อง
              </p>
            </div>
            <div className="col-span-2 border-t border-primary/10 pt-2 text-center">
              <p className="text-xs text-muted-foreground">ยอดรวมทั้งหมด</p>
              <p className="font-bold text-lg text-primary">
                {summary.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="w-10 h-10 text-destructive/50" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>ลองใหม่</Button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">ไม่มีข้อมูลในช่วงเวลานี้</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredRows.map((row) => (
              <RoomBillCard
                key={row.room.id}
                row={row}
                isEditing={editingId === row.room.id}
                editValues={editValues}
                onEditChange={setEditValues}
                onStartEdit={() => startEdit(row)}
                onSaveEdit={() => saveEdit(row)}
                onCancelEdit={() => setEditingId(null)}
                electricRate={data!.electricRate}
                waterRate={data!.waterRate}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Export ─── */}
      {!loading && filteredRows.length > 0 && (
        <div className="sticky bottom-16 px-4 pb-3 bg-background/95 backdrop-blur-sm border-t border-border/50 pt-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Excel (CSV)
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5"
              onClick={() => window.print()}>
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RoomBillCard ─────────────────────────────────────────────────────────────
interface RoomBillCardProps {
  row: RoomBillRow;
  isEditing: boolean;
  editValues: { electric: string; water: string };
  onEditChange: (v: { electric: string; water: string }) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  electricRate: number;
  waterRate: number;
}

function RoomBillCard({
  row, isEditing, editValues, onEditChange,
  onStartEdit, onSaveEdit, onCancelEdit,
  electricRate, waterRate,
}: RoomBillCardProps) {
  // คำนวณ realtime ขณะ edit
  const previewElecUnits  = isEditing
    ? (parseFloat(editValues.electric) - (row.electric.previous?.value ?? 0)) || null
    : row.electric.units;
  const previewWaterUnits = isEditing
    ? (parseFloat(editValues.water) - (row.water.previous?.value ?? 0)) || null
    : row.water.units;
  const previewElecAmt    = previewElecUnits  != null ? previewElecUnits  * electricRate : row.electric.amount;
  const previewWaterAmt   = previewWaterUnits != null ? previewWaterUnits * waterRate    : row.water.amount;
  const previewTotal      = (previewElecAmt ?? 0) + (previewWaterAmt ?? 0);

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${
      isEditing ? "border-primary ring-1 ring-primary/30" : "border-border/60"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">ห้อง {row.room.name}</span>
          <span className="text-xs text-muted-foreground">
            อาคาร {row.room.building} ชั้น {row.room.floor}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-primary">
            {previewTotal > 0
              ? previewTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 }) + " ฿"
              : "—"}
          </span>
          {!isEditing ? (
            <button onClick={onStartEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                         text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={onSaveEdit}
                className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={onCancelEdit}
                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body — 2 rows: ไฟ + น้ำ */}
      <div className="divide-y divide-border/40">
        {/* ค่าไฟ */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">ก่อน:</span>
              <span className="font-mono text-xs">
                {row.electric.previous?.value?.toLocaleString() ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">→ นี้:</span>
              {isEditing ? (
                <Input
                  type="number" inputMode="decimal"
                  value={editValues.electric}
                  onChange={(e) => onEditChange({ ...editValues, electric: e.target.value })}
                  className="h-7 w-24 text-xs font-mono px-2"
                />
              ) : (
                <span className="font-mono text-xs font-semibold">
                  {row.electric.current?.value?.toLocaleString() ?? "—"}
                </span>
              )}
            </div>
            {previewElecUnits != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {previewElecUnits.toFixed(1)} หน่วย × {electricRate} ={" "}
                <span className="text-amber-600 font-semibold">
                  {(previewElecAmt ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                </span>
              </p>
            )}
          </div>
          <StatusBadge recorded={row.electric.recorded} />
        </div>

        {/* ค่าน้ำ */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">ก่อน:</span>
              <span className="font-mono text-xs">
                {row.water.previous?.value?.toLocaleString() ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">→ นี้:</span>
              {isEditing ? (
                <Input
                  type="number" inputMode="decimal"
                  value={editValues.water}
                  onChange={(e) => onEditChange({ ...editValues, water: e.target.value })}
                  className="h-7 w-24 text-xs font-mono px-2"
                />
              ) : (
                <span className="font-mono text-xs font-semibold">
                  {row.water.current?.value?.toLocaleString() ?? "—"}
                </span>
              )}
            </div>
            {previewWaterUnits != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {previewWaterUnits.toFixed(1)} หน่วย × {waterRate} ={" "}
                <span className="text-blue-600 font-semibold">
                  {(previewWaterAmt ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                </span>
              </p>
            )}
          </div>
          <StatusBadge recorded={row.water.recorded} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ recorded }: { recorded: boolean }) {
  return (
    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
      recorded
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700"
    }`}>
      {recorded ? "บันทึกแล้ว" : "ยังไม่บันทึก"}
    </span>
  );
}