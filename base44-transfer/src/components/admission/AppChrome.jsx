import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  GraduationCap,
  Home,
  Inbox,
  ClipboardCheck,
  Users,
} from "lucide-react";

export const studentNav = [
  { to: "/", label: "홈", icon: Home },
  { to: "/universities", label: "목표대학", icon: GraduationCap },
  { to: "/grades", label: "성적표", icon: BarChart3 },
  { to: "/record", label: "생기부", icon: FileText },
  { to: "/checklist", label: "로드맵", icon: CheckSquare },
  { to: "/assignments", label: "과제", icon: ClipboardCheck },
  { to: "/counseling", label: "상담", icon: CalendarDays },
];

export const counselorNav = [
  { to: "/counselor-students", label: "학생관리", icon: Users },
  { to: "/counselor-requests", label: "상담신청", icon: Inbox },
];

export function MobileNav({ items = studentNav }) {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppSurface({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto min-h-screen max-w-md bg-background shadow-[0_0_0_1px_hsl(var(--border))]">
        <main className="px-4 pt-6 pb-24">{children}</main>
      </div>
    </div>
  );
}
