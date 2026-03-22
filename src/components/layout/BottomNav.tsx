"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, Calculator, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",           label: "หน้าหลัก",  icon: Home       },
  { href: "/scan",       label: "บันทึก",    icon: ScanLine   },
  { href: "/calculate",  label: "คำนวณ",     icon: Calculator },
  { href: "/settings",   label: "ตั้งค่า",   icon: Settings   },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
      <div className="max-w-lg mx-auto flex items-stretch h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className={cn("w-5 h-5 transition-all", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}