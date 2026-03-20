import type { Room, MeterRecord } from "@/types";

export const MOCK_ROOMS: Room[] = [
  { id: "A101", name: "A101", floor: "ชั้น 1" },
  { id: "A102", name: "A102", floor: "ชั้น 1" },
  { id: "A103", name: "A103", floor: "ชั้น 1" },
  { id: "A201", name: "A201", floor: "ชั้น 2" },
  { id: "A202", name: "A202", floor: "ชั้น 2" },
  { id: "A203", name: "A203", floor: "ชั้น 2" },
  { id: "B101", name: "B101", floor: "ชั้น 1" },
  { id: "B102", name: "B102", floor: "ชั้น 1" },
  { id: "B201", name: "B201", floor: "ชั้น 2" },
  { id: "B202", name: "B202", floor: "ชั้น 2" },
];

const STORAGE_KEY = "kp-meter-records";

export function getRecords(): MeterRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MeterRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(record: MeterRecord): void {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getLatestRecordByRoom(roomId: string): MeterRecord | null {
  const records = getRecords();
  return records.find((r) => r.roomId === roomId) ?? null;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
  });
}
