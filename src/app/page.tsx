"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ScanLine, Building2, RefreshCw, Plus, Pencil,
  Trash2, X, Check, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { getRooms } from "@/lib/storage";
import type { RoomWithLatest } from "@/types";

// ─── Room Form Modal ──────────────────────────────────────────────────────────
interface RoomFormProps {
  initial?: { id: string; name: string; floor: string; building: string };
  existingGroups: { floors: string[]; buildings: string[] };
  onSave: (data: { id: string; name: string; floor: string; building: string }) => Promise<void>;
  onClose: () => void;
  isEdit?: boolean;
}

function RoomFormModal({ initial, existingGroups, onSave, onClose, isEdit }: RoomFormProps) {
  const [form, setForm] = useState({
    id:       initial?.id       ?? "",
    name:     initial?.name     ?? "",
    floor:    initial?.floor    ?? "",
    building: initial?.building ?? "",
  });
  const [customFloor,    setCustomFloor]    = useState("");
  const [customBuilding, setCustomBuilding] = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const floorValue    = form.floor    === "__custom__" ? customFloor    : form.floor;
  const buildingValue = form.building === "__custom__" ? customBuilding : form.building;

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      setError("กรุณากรอกรหัสห้องและชื่อห้อง"); return;
    }
    if (!floorValue.trim())    { setError("กรุณาระบุชั้น"); return; }
    if (!buildingValue.trim()) { setError("กรุณาระบุอาคาร/เฟส"); return; }

    setSaving(true);
    setError("");
    try {
      await onSave({
        id:       form.id.trim(),
        name:     form.name.trim(),
        floor:    floorValue.trim(),
        building: buildingValue.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    // backdrop
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* modal box — กึ่งกลาง, scrollable ถ้าเนื้อหาเยอะ */}
      <div
        className="bg-background w-full max-w-sm rounded-2xl shadow-xl
                   max-h-[calc(100vh-8rem)] overflow-y-auto
                   animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          {/* header */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">
              {isEdit ? "แก้ไขห้องพัก" : "เพิ่มห้องพัก"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center
                         hover:bg-muted/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* fields */}
          <div className="space-y-3">
            {/* รหัสห้อง */}
            <div className="space-y-1">
              <Label className="text-sm">รหัสห้อง</Label>
              <Input
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value, name: e.target.value }))}
                placeholder="เช่น A101"
                disabled={isEdit}
                className={isEdit ? "opacity-60" : ""}
              />
            </div>

            {/* ชื่อห้อง */}
            <div className="space-y-1">
              <Label className="text-sm">ชื่อห้อง (แสดงผล)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="เช่น A101"
              />
            </div>

            {/* อาคาร/เฟส */}
            <div className="space-y-1">
              <Label className="text-sm">อาคาร / เฟส</Label>
              <div className="relative">
                <select
                  value={form.building}
                  onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
                  className="w-full h-12 rounded-xl border-2 border-input bg-background
                             px-4 text-base appearance-none pr-10
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- เลือกอาคาร/เฟส --</option>
                  {existingGroups.buildings.map((b) => (
                    <option key={b} value={b}>อาคาร {b}</option>
                  ))}
                  <option value="__custom__">+ เพิ่มใหม่</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                                        text-muted-foreground pointer-events-none" />
              </div>
              {form.building === "__custom__" && (
                <Input
                  value={customBuilding}
                  onChange={(e) => setCustomBuilding(e.target.value)}
                  placeholder="ระบุชื่ออาคาร/เฟส เช่น C, เฟส3"
                  className="mt-1"
                />
              )}
            </div>

            {/* ชั้น */}
            <div className="space-y-1">
              <Label className="text-sm">ชั้น</Label>
              <div className="relative">
                <select
                  value={form.floor}
                  onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
                  className="w-full h-12 rounded-xl border-2 border-input bg-background
                             px-4 text-base appearance-none pr-10
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- เลือกชั้น --</option>
                  {existingGroups.floors.map((f) => (
                    <option key={f} value={f}>ชั้น {f}</option>
                  ))}
                  <option value="__custom__">+ เพิ่มใหม่</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                                        text-muted-foreground pointer-events-none" />
              </div>
              {form.floor === "__custom__" && (
                <Input
                  value={customFloor}
                  onChange={(e) => setCustomFloor(e.target.value)}
                  placeholder="ระบุชั้น เช่น 3, 4"
                  className="mt-1"
                />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="lg" className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check className="w-4 h-4" />}
              บันทึก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BuildingGroup ────────────────────────────────────────────────────────────
interface BuildingGroupProps {
  building: string;
  floors: Record<string, RoomWithLatest[]>;
  manageMode: boolean;
  onRoomClick: (room: RoomWithLatest) => void;
  onEdit: (room: RoomWithLatest) => void;
  onDelete: (room: RoomWithLatest) => void;
}

function BuildingGroup({
  building, floors, manageMode, onRoomClick, onEdit, onDelete,
}: BuildingGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totalRooms = Object.values(floors).flat().length;

  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-2 w-full py-1"
        onClick={() => setCollapsed((p) => !p)}
      >
        <span className="text-sm font-bold text-foreground">อาคาร {building}</span>
        <span className="text-xs text-muted-foreground">({totalRooms} ห้อง)</span>
        <div className="flex-1" />
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      </button>

      {!collapsed && (
        <div className="space-y-3">
          {Object.entries(floors)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([floor, roomList]) => (
              <div key={floor} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground pl-1">ชั้น {floor}</p>
                {roomList.map((room) => (
                  <RoomCardManage
                    key={room.id}
                    room={room}
                    manageMode={manageMode}
                    onClick={() => onRoomClick(room)}
                    onEdit={() => onEdit(room)}
                    onDelete={() => onDelete(room)}
                  />
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── RoomCardManage ───────────────────────────────────────────────────────────
interface RoomCardManageProps {
  room: RoomWithLatest;
  manageMode: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RoomCardManage({ room, manageMode, onClick, onEdit, onDelete }: RoomCardManageProps) {
  const elecRecord  = room.records.find((r) => r.type === "ELECTRIC") ?? null;
  const waterRecord = room.records.find((r) => r.type === "WATER")    ?? null;

  return (
    <div className={`bg-card rounded-2xl border border-border/60 shadow-sm flex items-center overflow-hidden
                     transition-all ${manageMode ? "ring-1 ring-border" : ""}`}>
      {/* กดเพื่อไปบันทึก */}
      <button
        className="flex-1 flex items-center gap-3 p-4 text-left active:bg-muted/50 transition-colors"
        onClick={onClick}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-bold text-sm">{room.name}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">ห้อง {room.name}</p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">
              ⚡ {elecRecord  ? elecRecord.value.toLocaleString()  : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              💧 {waterRecord ? waterRecord.value.toLocaleString() : "—"}
            </span>
          </div>
        </div>
        {!manageMode && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* manage buttons */}
      {manageMode && (
        <div className="flex items-center gap-1 pr-3">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [rooms,      setRooms]      = useState<RoomWithLatest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [manageMode, setManageMode] = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editRoom,   setEditRoom]   = useState<RoomWithLatest | null>(null);
  const [hotelName,  setHotelName]  = useState("หอพัก KP"); // ← เพิ่ม

  const loadRooms = useCallback(async () => {
    try {
      setError("");
      const [roomsData, settingsData] = await Promise.all([
        getRooms(),
        fetch("/api/settings").then((r) => r.json()) as Promise<{ hotelName: string }>,
      ]);
      setRooms(roomsData);
      setHotelName(settingsData.hotelName || "หอพัก KP");
    } catch {
      setError("โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    window.addEventListener("focus", loadRooms);
    return () => window.removeEventListener("focus", loadRooms);
  }, [loadRooms]);

  const existingGroups = {
    buildings: Array.from(new Set(rooms.map((r) => r.building))).sort(),
    floors:    Array.from(new Set(rooms.map((r) => r.floor))).sort(),
  };

  const grouped = rooms.reduce<Record<string, Record<string, RoomWithLatest[]>>>(
    (acc, room) => {
      if (!acc[room.building]) acc[room.building] = {};
      if (!acc[room.building][room.floor]) acc[room.building][room.floor] = [];
      acc[room.building][room.floor].push(room);
      return acc;
    },
    {}
  );

  const totalRooms    = rooms.length;
  const recordedRooms = rooms.filter((r) =>
    r.records.some((rec) => rec.type === "ELECTRIC")
  ).length;

  const handleAddRoom = async (data: {
    id: string; name: string; floor: string; building: string;
  }) => {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? "เพิ่มห้องไม่สำเร็จ");
    }
    await loadRooms();
  };

  const handleEditRoom = async (data: {
    id: string; name: string; floor: string; building: string;
  }) => {
    const res = await fetch(`/api/rooms/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, floor: data.floor, building: data.building }),
    });
    if (!res.ok) throw new Error("แก้ไขไม่สำเร็จ");
    await loadRooms();
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบห้อง ${name} ใช่หรือไม่?\nข้อมูลมิเตอร์ทั้งหมดของห้องนี้จะถูกลบด้วย`)) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("ลบไม่สำเร็จ"); return; }
    await loadRooms();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* ─── Header ─── */}
      <div className="bg-primary px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">KP Meter</span>
          </div>
          <button
            onClick={loadRooms}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ชื่อหอพักจาก settings */}
        <h1 className="text-white text-2xl font-bold mt-2">{hotelName}</h1>
        <p className="text-white/70 text-sm mt-0.5">
          บันทึกแล้ว {recordedRooms}/{totalRooms} ห้อง
        </p>
        <div className="mt-3 bg-white/20 rounded-full h-1.5">
          <div
            className="bg-white rounded-full h-1.5 transition-all duration-500"
            style={{ width: totalRooms > 0 ? `${(recordedRooms / totalRooms) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* ─── Quick actions ─── */}
      <div className="px-4 -mt-5 flex gap-2">
        <Button
          size="lg"
          className="flex-1 shadow-lg shadow-primary/30 gap-2"
          onClick={() => router.push("/scan")}
        >
          <ScanLine className="w-5 h-5" /> บันทึกมิเตอร์
        </Button>
        <Button
          size="lg"
          variant={manageMode ? "default" : "outline"}
          className="gap-2 shadow-sm"
          onClick={() => setManageMode((p) => !p)}
        >
          <Pencil className="w-4 h-4" />
          {manageMode ? "เสร็จสิ้น" : "จัดการ"}
        </Button>
      </div>

      {/* ─── Add room button ─── */}
      {manageMode && (
        <div className="px-4 mt-3">
          <Button
            variant="outline" size="sm"
            className="w-full gap-2 border-dashed"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4" /> เพิ่มห้องพักใหม่
          </Button>
        </div>
      )}

      {/* ─── Room list ─── */}
      <div className="px-4 mt-4 flex-1">
        <PageHeader
          title="รายการห้องพัก"
          subtitle={manageMode ? "กดปุ่ม ✎ เพื่อแก้ไข หรือ 🗑 เพื่อลบ" : "กดที่ห้องเพื่อบันทึกมิเตอร์"}
        />

        {loading ? (
          <div className="flex flex-col gap-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 mt-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadRooms}>
              ลองใหม่
            </Button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 space-y-3 mt-2">
            <p className="text-muted-foreground text-sm">ยังไม่มีห้องพัก</p>
            <Button size="sm" className="gap-2"
              onClick={() => { setManageMode(true); setShowAdd(true); }}>
              <Plus className="w-4 h-4" /> เพิ่มห้องพักแรก
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2 pb-4">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([building, floors]) => (
                <BuildingGroup
                  key={building}
                  building={building}
                  floors={floors}
                  manageMode={manageMode}
                  onRoomClick={(room) => router.push(`/scan?room=${room.id}`)}
                  onEdit={(room) => setEditRoom(room)}
                  onDelete={(room) => handleDeleteRoom(room.id, room.name)}
                />
              ))}
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      {showAdd && (
        <RoomFormModal
          existingGroups={existingGroups}
          onSave={handleAddRoom}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editRoom && (
        <RoomFormModal
          isEdit
          initial={editRoom}
          existingGroups={existingGroups}
          onSave={handleEditRoom}
          onClose={() => setEditRoom(null)}
        />
      )}
    </div>
  );
}