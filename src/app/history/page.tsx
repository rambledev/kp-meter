"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Trash2, Filter, X, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryItem } from "@/components/HistoryItem";
import { getRecords, deleteRecord, getRooms } from "@/lib/storage";
import type { MeterRecord } from "@/types";

export default function HistoryPage() {
  const [records,   setRecords]   = useState<MeterRecord[]>([]);
  const [roomNames, setRoomNames] = useState<string[]>([]);
  const [search,    setSearch]    = useState("");
  const [activeRoom, setActiveRoom] = useState("ทั้งหมด");
  const [loading,   setLoading]   = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, rooms] = await Promise.all([
        getRecords(),
        getRooms(),
      ]);
      setRecords(recs);
      setRoomNames(rooms.map((r) => r.name));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchRoom =
        activeRoom === "ทั้งหมด" || r.room?.name === activeRoom;
      const matchSearch =
        !search ||
        r.room?.name.toLowerCase().includes(search.toLowerCase()) ||
        r.value.toString().includes(search) ||
        r.note.toLowerCase().includes(search.toLowerCase());
      return matchRoom && matchSearch;
    });
  }, [records, activeRoom, search]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("ลบรายการนี้ใช่หรือไม่?")) return;
    await deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!confirm("ต้องการลบประวัติทั้งหมดใช่หรือไม่?")) return;
    await Promise.all(records.map((r) => deleteRecord(r.id)));
    setRecords([]);
  }, [records]);

  const allRooms = ["ทั้งหมด", ...roomNames];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PageHeader
        title="ประวัติการบันทึก"
        subtitle={loading ? "กำลังโหลด..." : `${records.length} รายการทั้งหมด`}
        action={
          <div className="flex gap-1">
            <button onClick={loadData}
              className="w-9 h-9 rounded-xl flex items-center justify-center
                         text-muted-foreground hover:bg-accent transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            {records.length > 0 && (
              <button onClick={handleClearAll}
                className="w-9 h-9 rounded-xl flex items-center justify-center
                           text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      />

      {/* Search */}
      <div className="px-4 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาห้อง, เลขมิเตอร์, หมายเหตุ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Room filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allRooms.map((room) => (
            <button key={room} onClick={() => setActiveRoom(room)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeRoom === room
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}>
              {room}
            </button>
          ))}
        </div>
      </div>

      {(search || activeRoom !== "ทั้งหมด") && (
        <div className="px-4 mb-2">
          <p className="text-xs text-muted-foreground">
            พบ {filtered.length} รายการ
            {activeRoom !== "ทั้งหมด" && ` · ห้อง ${activeRoom}`}
            {search && ` · "${search}"`}
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasRecords={records.length > 0}
            onClear={() => { setSearch(""); setActiveRoom("ทั้งหมด"); }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((record) => (
              <HistoryItem key={record.id} record={record} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  hasRecords, onClear,
}: {
  hasRecords: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Filter className="w-8 h-8 text-muted-foreground" />
      </div>
      {hasRecords ? (
        <>
          <div>
            <p className="font-semibold">ไม่พบรายการ</p>
            <p className="text-sm text-muted-foreground mt-1">
              ลองเปลี่ยนคำค้นหาหรือ filter
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClear}>
            ล้างตัวกรอง
          </Button>
        </>
      ) : (
        <div>
          <p className="font-semibold">ยังไม่มีประวัติ</p>
          <p className="text-sm text-muted-foreground mt-1">
            เริ่มบันทึกมิเตอร์จากหน้า Scan
          </p>
        </div>
      )}
    </div>
  );
}