import type { RoomWithLatest, MeterRecord } from "@/types";

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function getRooms(): Promise<RoomWithLatest[]> {
  const res = await fetch("/api/rooms", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch rooms");
  return res.json();
}

// ─── Records ──────────────────────────────────────────────────────────────────

export async function getRecords(params?: {
  roomId?: string;
  search?: string;
}): Promise<MeterRecord[]> {
  const qs = new URLSearchParams();
  if (params?.roomId) qs.set("roomId", params.roomId);
  if (params?.search)  qs.set("search",  params.search);
  const url = `/api/records${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch records");
  return res.json();
}

export async function saveRecord(data: {
  roomId: string;
  type: "ELECTRIC" | "WATER";
  value: number;
  imageUrl: string | null;
  note: string;
  month: number;
  year: number;
}): Promise<MeterRecord> {
  const res = await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Failed to save record");
  }
  return res.json();
}

export async function deleteRecord(id: string): Promise<void> {
  const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete record");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("th-TH", { month: "short", day: "numeric" });
}