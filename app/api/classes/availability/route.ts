import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ACTIVE_STATUSES = ["reservada", "confirmada", "ativa"];

type Schedule = {
  id: string;
  sport: string;
  category: string;
  class_name: string | null;
  professor: string | null;
  court_id: string | null;
  day_of_week: number;
  class_time: string;
  active: boolean;
};

type Enrollment = {
  id: string;
  sport: string;
  category: string;
  days_selected: string;
};

type ExtraLink = { enrollment_id: string; schedule_id: string };

function groupKey(s: Schedule): string {
  return JSON.stringify([s.sport, s.category, s.class_name ?? null, s.class_time]);
}

export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Configuração do servidor indisponível." }, { status: 503, headers });
    }

    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [enrollmentsResult, settingsResult, schedulesResult, linksResult] = await Promise.all([
      db.from("class_enrollments")
        .select("id, sport, category, days_selected")
        .in("status", ACTIVE_STATUSES),
      db.from("arena_settings")
        .select("class_capacity, class_capacity_map")
        .eq("id", 1)
        .single(),
      db.from("class_schedules")
        .select("id, sport, category, class_name, professor, court_id, day_of_week, class_time, active")
        .eq("active", true)
        .order("day_of_week", { ascending: true })
        .order("class_time", { ascending: true }),
      db.from("class_enrollment_extra_schedules")
        .select("enrollment_id, schedule_id"),
    ]);

    if (enrollmentsResult.error || settingsResult.error || schedulesResult.error || linksResult.error) {
      console.error("Erro ao consultar disponibilidade das aulas:", {
        enrollments: enrollmentsResult.error?.message,
        settings: settingsResult.error?.message,
        schedules: schedulesResult.error?.message,
        links: linksResult.error?.message,
      });
      return NextResponse.json({ error: "Não foi possível consultar as vagas das turmas." }, { status: 500, headers });
    }

    const schedules = (schedulesResult.data ?? []) as Schedule[];
    const enrollments = (enrollmentsResult.data ?? []) as Enrollment[];
    const links = (linksResult.data ?? []) as ExtraLink[];
    const groups = new Map<string, Schedule[]>();
    const groupBySchedule = new Map<string, string>();

    for (const schedule of schedules) {
      const key = groupKey(schedule);
      groups.set(key, [...(groups.get(key) ?? []), schedule]);
      groupBySchedule.set(schedule.id, key);
    }

    const occupiedByGroup = new Map<string, Set<string>>();
    const displayKeyByGroup = new Map<string, string>();
    for (const [key, entries] of groups) {
      const first = entries[0];
      const days = [...new Set(entries.map(s => Number(s.day_of_week)))].sort((a, b) => a - b);
      const label = `${days.map(day => DAYS[day]).join(" e ")} às ${Number(first.class_time.slice(0, 2))}h`;
      displayKeyByGroup.set(key, JSON.stringify([first.sport, first.category, label]));
      occupiedByGroup.set(key, new Set());
    }

    const activeIds = new Set(enrollments.map(enrollment => enrollment.id));
    for (const enrollment of enrollments) {
      const mainClass = String(enrollment.days_selected ?? "").split(" | Extras: ")[0].trim();
      for (const [key, displayKey] of displayKeyByGroup) {
        if (displayKey === JSON.stringify([enrollment.sport, enrollment.category, mainClass])) {
          occupiedByGroup.get(key)!.add(enrollment.id);
        }
      }
    }

    for (const link of links) {
      if (!activeIds.has(link.enrollment_id)) continue;
      const key = groupBySchedule.get(link.schedule_id);
      if (key) occupiedByGroup.get(key)!.add(link.enrollment_id);
    }

    const occupancy: Record<string, number> = {};
    const scheduleOccupancy: Record<string, number> = {};
    for (const [key, entries] of groups) {
      const count = occupiedByGroup.get(key)!.size;
      const displayKey = displayKeyByGroup.get(key)!;
      // Preserva o formato usado pela página do cliente.
      occupancy[displayKey] = Math.max(occupancy[displayKey] ?? 0, count);
      for (const entry of entries) scheduleOccupancy[entry.id] = count;
    }

    return NextResponse.json({
      success: true,
      occupancy,
      scheduleOccupancy,
      defaultCapacity: settingsResult.data?.class_capacity ?? 12,
      capacityMap: settingsResult.data?.class_capacity_map ?? {},
      schedules,
    }, { headers });
  } catch (error) {
    console.error("Erro ao consultar disponibilidade das aulas:", error);
    return NextResponse.json({ error: "Não foi possível consultar as vagas das turmas." }, { status: 500, headers });
  }
}
