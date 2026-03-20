export interface Room {
  id: string;
  name: string;
  floor: string;
}

export interface MeterRecord {
  id: string;
  roomId: string;
  roomName: string;
  value: number;
  previousValue: number | null;
  units: number | null;
  imageDataUrl: string | null;
  recordedAt: string; // ISO string
  note: string;
}
