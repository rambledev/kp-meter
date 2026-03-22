export type MeterType = "ELECTRIC" | "WATER";

export interface Room {
  id: string;
  name: string;
  floor: string;
  building: string;
  createdAt: string;
}

export interface MeterRecord {
  id: string;
  roomId: string;
  room?: Room;
  type: MeterType;
  value: number;
  previousValue: number | null;
  units: number | null;
  imageUrl: string | null;
  note: string;
  recordedAt: string;
  month: number;
  year: number;
}

export interface RoomWithLatest extends Room {
  records: MeterRecord[];  // ← แก้จาก electricRecords/waterRecords เป็น records
}

export interface Settings {
  id: number;
  hotelName: string;
  address: string;
  phone: string;
  electricRate: number;
  waterRate: number;
}

export interface RoomBillRow {
  room: Room;
  electric: {
    current: MeterRecord | null;
    previous: MeterRecord | null;
    units: number | null;
    amount: number | null;
    recorded: boolean;
  };
  water: {
    current: MeterRecord | null;
    previous: MeterRecord | null;
    units: number | null;
    amount: number | null;
    recorded: boolean;
  };
  totalAmount: number;
}