"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Building2, Phone, MapPin, Zap, Droplets, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Settings } from "@/types";

export default function SettingsPage() {
  const [form, setForm] = useState<Omit<Settings, "id">>({
    hotelName: "", address: "", phone: "",
    electricRate: 8, waterRate: 18,
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: Settings) => {
        setForm({
          hotelName:    d.hotelName,
          address:      d.address,
          phone:        d.phone,
          electricRate: d.electricRate,
          waterRate:    d.waterRate,
        });
      })
      .catch(() => setError("โหลดข้อมูลไม่ได้"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PageHeader title="ตั้งค่า" subtitle="ข้อมูลหอพักและอัตราค่าบริการ" />

      <div className="flex flex-col gap-6 px-4 pt-4 pb-8">
        {/* ข้อมูลหอพัก */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            ข้อมูลหอพัก
          </p>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> ชื่อหอพัก
              </Label>
              <Input value={form.hotelName} onChange={set("hotelName")}
                placeholder="เช่น หอพัก KP" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> ที่อยู่
              </Label>
              <Input value={form.address} onChange={set("address")}
                placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" /> เบอร์โทรศัพท์
              </Label>
              <Input value={form.phone} onChange={set("phone")}
                type="tel" placeholder="0xx-xxx-xxxx" />
            </div>
          </div>
        </section>

        {/* อัตราค่าบริการ */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            อัตราค่าบริการ
          </p>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> ค่าไฟ (บาท/หน่วย)
              </Label>
              <div className="relative">
                <Input
                  value={form.electricRate}
                  onChange={set("electricRate")}
                  type="number" inputMode="decimal" step="0.5"
                  className="font-mono pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  บาท/หน่วย
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Droplets className="w-3.5 h-3.5 text-blue-500" /> ค่าน้ำ (บาท/หน่วย)
              </Label>
              <div className="relative">
                <Input
                  value={form.waterRate}
                  onChange={set("waterRate")}
                  type="number" inputMode="decimal" step="0.5"
                  className="font-mono pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  บาท/หน่วย
                </span>
              </div>
            </div>

            {/* ตัวอย่างการคำนวณ */}
            <div className="bg-muted/60 rounded-xl p-3 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">ตัวอย่าง (ใช้ 100 หน่วย)</p>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> ค่าไฟ
                </span>
                <span className="font-mono font-semibold">
                  {(100 * Number(form.electricRate)).toLocaleString()} บาท
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-500" /> ค่าน้ำ
                </span>
                <span className="font-mono font-semibold">
                  {(100 * Number(form.waterRate)).toLocaleString()} บาท
                </span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button size="lg" className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว</>
          ) : saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังบันทึก...</>
          ) : (
            <><Save className="w-4 h-4" /> บันทึกการตั้งค่า</>
          )}
        </Button>
      </div>
    </div>
  );
}