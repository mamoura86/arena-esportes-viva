"use client";

import React, { useState, useEffect, useRef } from "react";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import CheckoutModal from "@/components/CheckoutModal";
import { 
  MapPin, CheckCircle2, 
  User, Phone, Settings,
  MessageCircle, Search, XCircle, Tag, ShieldCheck,
  Share2, X, GraduationCap
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  surface: string;
  sports: string[];
  type: "society" | "areia";
}

interface ClassScheduleLock {
  id: string;
  court_id: string;
  day_of_week: number;
  class_time: string;
  active: boolean;
}

interface ClassScheduleException {
  schedule_id: string;
  class_date: string;
}

interface CourtHour {
  court_id: string;
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  active: boolean;
}

interface ArenaHoursRule {
  day_group: "weekdays" | "weekends_holidays";
  opening_time: string;
  closing_time: string;
}

interface ArenaHourOverride {
  override_date: string;
  court_id: string;
  slot_time: string;
  mode: "open" | "closed";
}

interface SelectedSlot {
  courtId: string;
  courtName: string;
  time: string;
  price: number;
}

interface StoredBooking {
  id?: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  courtName: string;
  courtId?: string;
  date: string;
  time: string;
  totalAmount: number;
  courtSubtotal?: number;
  bookingSlots?: { courtName: string; time: string; price: number }[];
  addons?: { name: string; price: number }[];
  sport?: string;
  status: "confirmada" | "cancelada" | "finalizada";
}

const AREIA_SPORTS = ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"];

const defaultCourts: Court[] = [
  { id: "futebol-1", name: "Campo de Futebol Society", surface: "Grama Sintética", sports: ["Futebol Society"], type: "society" },
  { id: "areia-1", name: "Quadra 1 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-2", name: "Quadra 2 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-3", name: "Quadra 3 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-4", name: "Quadra 4 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-5", name: "Quadra 5 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-6", name: "Quadra 6 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
];

const HOLIDAYS = ["01-01", "03-19", "03-25", "04-21", "05-01", "09-07", "08-15", "10-12", "11-02", "11-15", "11-20", "12-25"];

type ActiveClassSchedule = {
  id: string;
  sport: string;
  category: string;
  class_name: string | null;
  professor: string | null;
  court_id: string;
  day_of_week: number;
  class_time: string;
  active: boolean;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_EXTRA_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// As opções de matrícula são montadas exclusivamente com turmas ativas da Base V2.
// Turmas com o mesmo nome, horário, modalidade e categoria formam um único grupo.
function buildClassOptions(schedules: ActiveClassSchedule[]) {
  const grouped = new Map<string, ActiveClassSchedule[]>();
  for (const schedule of schedules) {
    if (!schedule.active || !schedule.sport || !schedule.category || !schedule.class_time) continue;
    const key = JSON.stringify([schedule.sport, schedule.category, schedule.class_name ?? "", schedule.class_time.slice(0, 5)]);
    grouped.set(key, [...(grouped.get(key) ?? []), schedule]);
  }
  const result: Record<string, Record<string, { label: string; days: number[]; professor: string; courtIds: string[] }[]>> = {};
  for (const entries of grouped.values()) {
    const first = entries[0];
    const days = [...new Set(entries.map(entry => Number(entry.day_of_week)))].sort((a, b) => a - b);
    const hour = Number(first.class_time.slice(0, 2));
    const dayLabel = days.map(day => DAY_NAMES[day]).filter(Boolean).join(" e ");
    const label = `${dayLabel} às ${hour}h`;
    result[first.sport] ??= {};
    result[first.sport][first.category] ??= [];
    // Mantém rótulos compatíveis com as matrículas existentes e a contagem de vagas.
    if (!result[first.sport][first.category].some(item => item.label === label)) {
      result[first.sport][first.category].push({
        label,
        days,
        professor: first.professor ?? "",
        courtIds: [...new Set(entries.map(entry => entry.court_id))],
      });
    }
  }
  return result;
}

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const getBrazilDateString = () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(date);
  const d = parts.find(p => p.type === 'day')?.value || '01';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const y = parts.find(p => p.type === 'year')?.value || '2026';
  return `${y}-${m}-${d}`;
};

type BookingOccupancy = {
  court_id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at?: string | null;
};

type CourtLock = {
  court_id: string;
  lock_time: string;
  lock_type: string;
  lock_date: string | null;
  day_of_week: number | null;
  class_schedule_id: string | null;
};

type ClassOccupancy = {
  sport: string;
  category: string;
  days_selected: string;
  count: number;
};

type ClassPrices = Record<string, { mensal: number; trimestral: number; semestral: number }>;
type UpgradeConfig = {
  volleyEnabled: boolean;
  volleyPrice: number;
  beachTennisEnabled: boolean;
  beachTennisPrice: number;
  societyEnabled: boolean;
  societyPrice: number;
  promo?: { enabled?: boolean; startHour?: string; endHour?: string };
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "classes" | "manage">("book");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [selectedSport, setSelectedSport] = useState(currentArena.sports[0]);
  const [todayString, setTodayString] = useState("");
  const [currentClientTime, setCurrentClientTime] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState("");
  
  // Horário ativo selecionado para ver as quadras
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
   
  const [upgradesConfig, setUpgradesConfig] = useState<UpgradeConfig>({
    volleyEnabled: false, volleyPrice: 10,
    beachTennisEnabled: false, beachTennisPrice: 10,
    societyEnabled: false, societyPrice: 15
  });
  const [selectedUpgradeKey, setSelectedUpgradeKey] = useState<string>("");

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountPercent: number; discountFixed: number } | null>(null);
  const [couponError, setCouponError] = useState("");

  const [classSport, setClassSport] = useState("");
  const [classCategory, setClassCategory] = useState("");
  const [selectedClassOption, setSelectedClassOption] = useState<string>("");
  const [classPlanType, setClassPlanType] = useState<"mensal" | "trimestral" | "semestral">("mensal");
  const [extraDaysCount, setExtraDaysCount] = useState(0);
  const [extraDay1, setExtraDay1] = useState("");
  const [extraDay2, setExtraDay2] = useState("");

  const selectedExtraDays = [extraDay1, extraDay2].slice(0, extraDaysCount).filter(Boolean);

  const [allCourts, setAllCourts] = useState<Court[]>([]);
  const [courtHours, setCourtHours] = useState<CourtHour[]>([]);
  const [arenaHoursRules, setArenaHoursRules] = useState<ArenaHoursRule[]>([]);
  const [arenaClosedDates, setArenaClosedDates] = useState<string[]>([]);
  const [arenaHourOverrides, setArenaHourOverrides] = useState<ArenaHourOverride[]>([]);
  const [activeBookings, setActiveBookings] = useState<BookingOccupancy[]>([]);
  const [courtLocks, setCourtLocks] = useState<CourtLock[]>([]);
  const [classSchedules, setClassSchedules] = useState<ClassScheduleLock[]>([]);
  const [classExceptions, setClassExceptions] = useState<ClassScheduleException[]>([]);
  const [courtAvailabilityReady, setCourtAvailabilityReady] = useState(false);
  const [classEnrollmentsList, setClassEnrollmentsList] = useState<ClassOccupancy[]>([]);
  const [activeClassSchedules, setActiveClassSchedules] = useState<ActiveClassSchedule[]>([]);
  const classOptions = buildClassOptions(activeClassSchedules);
  const currentClassOptions = classOptions[classSport]?.[classCategory] ?? [];
  const selectedClassInfo = currentClassOptions.find(option => option.label === selectedClassOption);
  const [classesReady, setClassesReady] = useState(false);
  const [classCapacityMap, setClassCapacityMap] = useState<Record<string, number>>({});
  const [defaultCapacity, setDefaultCapacity] = useState<number>(12);
  const [classPricesMap, setClassPricesMap] = useState<ClassPrices>({
    "Vôlei de Praia": { mensal: 200, trimestral: 540, semestral: 960 },
    "Beach Tennis": { mensal: 200, trimestral: 540, semestral: 960 },
    "Futevôlei": { mensal: 200, trimestral: 540, semestral: 960 },
    "Escolinha de Futebol": { mensal: 200, trimestral: 540, semestral: 960 }
  });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutBookingDetails, setCheckoutBookingDetails] = useState({
    amount: 0,
    baseAmount: 0,
    description: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    isClass: false,
    slots: [] as SelectedSlot[],
    selectedSport: "",
    selectedDate: "",
    upgradeItemCost: 0,
    upgradeItemName: "",
    addonKey: "",
  });

  const loadCloudData = async () => {
    try {
      // Configurações não são lidas diretamente pelo navegador: a API usa acesso seguro no servidor.
      // Consulta somente ocupação; dados pessoais não são enviados ao navegador.
       const availabilityResponse = await fetch("/api/availability", { cache: "no-store" });
       if (!availabilityResponse.ok) throw new Error("Não foi possível carregar a disponibilidade das quadras.");
       const availabilityData = await availabilityResponse.json();
       const apiUpgrades = availabilityData.upgrades;
       if (apiUpgrades && typeof apiUpgrades === "object") {
         setUpgradesConfig({
           volleyEnabled: apiUpgrades.volleyEnabled === true,
           volleyPrice: Number(apiUpgrades.volleyPrice ?? 10),
           beachTennisEnabled: apiUpgrades.beachTennisEnabled === true,
           beachTennisPrice: Number(apiUpgrades.beachTennisPrice ?? 10),
           societyEnabled: apiUpgrades.societyEnabled === true,
           societyPrice: Number(apiUpgrades.societyPrice ?? 15),
           promo: apiUpgrades.promo,
         });
       } else {
         setUpgradesConfig((previous) => ({ ...previous, volleyEnabled: false, beachTennisEnabled: false, societyEnabled: false }));
       }
       // Mantém a leitura existente das configurações de aulas, sem depender dela para os adicionais.
       const { data: settingsData } = await supabase.from("arena_settings").select("class_capacity,class_capacity_map,class_prices").eq("id", 1).maybeSingle();
       if (settingsData) {
         if (settingsData.class_capacity) setDefaultCapacity(Number(settingsData.class_capacity));
         if (settingsData.class_capacity_map) setClassCapacityMap(settingsData.class_capacity_map);
         if (settingsData.class_prices) setClassPricesMap(settingsData.class_prices);
       }
       // Restaura quadras e expediente usados na grade de horários.
       if (!Array.isArray(availabilityData.courts) || !Array.isArray(availabilityData.courtHours)) {
         setCourtAvailabilityReady(false);
         throw new Error("Dados de quadras e horários inválidos.");
       }
       const activeCourtIds = new Set<string>(
         availabilityData.courts.map((court: { id: string }) => court.id)
       );
       setAllCourts(defaultCourts.filter((court) => activeCourtIds.has(court.id)));
       setCourtHours(availabilityData.courtHours as CourtHour[]);
      // Evita atualizar o estado quando a ocupação não mudou.
      const incomingBookings = Array.isArray(availabilityData.bookings) ? availabilityData.bookings : [];
      setActiveBookings((previous) => {
        const normalizeBooking = (b: BookingOccupancy) => `${b.court_id}|${b.booking_date}|${b.booking_time}|${b.status}|${b.created_at ?? ""}`;
        const previousKeys = previous.map(normalizeBooking).sort();
        const incomingKeys = incomingBookings.map(normalizeBooking).sort();
        if (previousKeys.length === incomingKeys.length && previousKeys.every((key, i) => key === incomingKeys[i])) {
          return previous;
        }
        return incomingBookings;
      });

       // Horário comercial, exceções pontuais e bloqueios são carregados juntos.
       // Se algum deles falhar, nunca oferecemos horários possivelmente fechados.
       const [locksResult, schedulesResult, exceptionsResult, hoursRulesResult, closedDatesResult, hoursOverridesResult] = await Promise.all([
         supabase.from("court_locks").select("*"),
         supabase.from("class_schedules").select("id,court_id,day_of_week,class_time,active"),
         supabase.from("class_schedule_exceptions").select("schedule_id,class_date"),
         supabase.from("arena_hours_rules").select("day_group,opening_time,closing_time"),
         supabase.from("arena_closed_dates").select("closed_date"),
         supabase.from("arena_hour_overrides").select("override_date,court_id,slot_time,mode"),
       ]);
       if (locksResult.error || schedulesResult.error || exceptionsResult.error ||
           hoursRulesResult.error || closedDatesResult.error || hoursOverridesResult.error ||
           !Array.isArray(hoursRulesResult.data) || hoursRulesResult.data.length !== 2) {
         setCourtAvailabilityReady(false);
         throw new Error("Não foi possível verificar os horários de funcionamento e bloqueios da arena.");
       }
       setCourtLocks(locksResult.data ?? []);
       setClassSchedules(schedulesResult.data ?? []);
       setClassExceptions(exceptionsResult.data ?? []);
       setArenaHoursRules(hoursRulesResult.data as ArenaHoursRule[]);
       setArenaClosedDates((closedDatesResult.data ?? []).map(item => item.closed_date));
       setArenaHourOverrides((hoursOverridesResult.data ?? []) as ArenaHourOverride[]);
       setCourtAvailabilityReady(true);

      
setClassesReady(false);
const classesResponse = await fetch("/api/classes/availability", {
  cache: "no-store",
});

if (!classesResponse.ok) {
  throw new Error("Não foi possível carregar as vagas das turmas.");
}

const classesData = await classesResponse.json();

if (!classesData.success || !classesData.occupancy || !Array.isArray(classesData.schedules)) {
  throw new Error("Resposta inválida da API de disponibilidade.");
}

setActiveClassSchedules(classesData.schedules.filter((item: ActiveClassSchedule) => item.active));
setDefaultCapacity(Number(classesData.defaultCapacity ?? 12));
setClassCapacityMap(classesData.capacityMap ?? {});
setClassesReady(true);

const incomingEnrollments = Object.entries(classesData.occupancy).map(
  ([key, count]) => {
    const [sport, category, mainClass] = JSON.parse(key);

    return {
      sport,
      category,
      days_selected: mainClass,
      count: Number(count),
    };
  }
);

setClassEnrollmentsList((previous) => {
  const normalize = (items: ClassOccupancy[]) =>
    items
      .map((en) => `${en.sport}|${en.category}|${en.days_selected}|${en.count}`)
      .sort();

  const previousKeys = normalize(previous);
  const incomingKeys = normalize(incomingEnrollments);

  if (
    previousKeys.length === incomingKeys.length &&
    previousKeys.every((key, index) => key === incomingKeys[index])
  ) {
    return previous;
  }

  return incomingEnrollments;
});



    } catch (err) {
      console.error(err);
      setClassesReady(false);
    }
  };

  const [searchCodeInput, setSearchCodeInput] = useState("");
  const [searchPhoneInput, setSearchPhoneInput] = useState("");

  useEffect(() => {
    let initializationActive = true;
    // Inicialização após a montagem, sem atualizações síncronas no corpo do efeito.
    queueMicrotask(() => {
      if (!initializationActive) return;
      setMounted(true);
      const todayFormatted = getBrazilDateString();
      setTodayString(todayFormatted);
      setSelectedDate(todayFormatted);
      setCurrentClientTime(new Date().getTime());
    });

    const queryParams = new URLSearchParams(window.location.search);
    const statusParam = queryParams.get("status");
    const codeParam = queryParams.get("code");
    const phoneParam = queryParams.get("phone");

    if (statusParam === "success" && codeParam) {
      alert(`Reserva efetuada com sucesso!\nO seu código de reserva é: ${codeParam}`);
      queueMicrotask(() => {
        if (!initializationActive) return;
        setSearchCodeInput(codeParam);
        if (phoneParam) setSearchPhoneInput(phoneParam);
        setActiveTab("manage");
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    queueMicrotask(() => {
      if (initializationActive) void loadCloudData();
    });

    const channel = supabase
      .channel("public:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "court_locks" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_schedules" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_settings" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_hours_rules" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_closed_dates" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_hour_overrides" }, () => loadCloudData())
      .subscribe();

    return () => {
      initializationActive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const [searchedBookings, setSearchedBookings] = useState<StoredBooking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const getDayOfWeekFromDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.getDay();
  };

  const isWeekendOrHoliday = (dateStr: string) => {
    if (!dateStr) return false;
    const day = getDayOfWeekFromDate(dateStr);
    if (day === 0 || day === 6) return true;
    const monthDay = dateStr.substring(5);
    return HOLIDAYS.includes(monthDay);
  };

  const getCourtPrice = (court: Court, time: string) => {
    const hour = parseInt(time.split(":")[0], 10);
     
    const settingsPromo = upgradesConfig?.promo;
    const startPromo = settingsPromo?.startHour ? parseInt(settingsPromo.startHour.split(":")[0], 10) : 16;
    const endPromo = settingsPromo?.endHour ? parseInt(settingsPromo.endHour.split(":")[0], 10) : 19;
    const isPromoActive = settingsPromo?.enabled ?? true;

    const isPromoSlot = isPromoActive && (hour >= startPromo && hour < endPromo);
    const hasDiscount = isPromoSlot && !isWeekendOrHoliday(selectedDate);

    if (court.type === "society") {
      return hasDiscount ? 60.0 : 80.0;
    } else {
      return hasDiscount ? 40.0 : 60.0;
    }
  };

  const isTimeTooCloseOrPassed = (timeStr: string) => {
    if (!todayString || selectedDate !== todayString || !currentClientTime) return false;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date(currentClientTime);
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);
    return ((slotTime.getTime() - now.getTime()) / (1000 * 60)) < 10;
  };

  const minutesOf = (value: string) => {
    const [hour, minute] = value.slice(0, 5).split(":").map(Number);
    return hour * 60 + minute;
  };

  // O feriado tem prioridade sobre o grupo de dias úteis, como no banco.
  const ruleForSelectedDate = arenaHoursRules.find(rule =>
    rule.day_group === (isWeekendOrHoliday(selectedDate) ? "weekends_holidays" : "weekdays")
  );
  const isEntireDayClosed = !selectedDate || arenaClosedDates.includes(selectedDate);
  const overrideFor = (courtId: string, time: string) => arenaHourOverrides.find(item =>
    item.override_date === selectedDate && item.court_id === courtId &&
    item.slot_time.slice(0, 5) === time
  )?.mode;
  const isWithinArenaHours = (time: string) => Boolean(
    ruleForSelectedDate &&
    minutesOf(time) >= minutesOf(ruleForSelectedDate.opening_time) &&
    minutesOf(time) + 60 <= minutesOf(ruleForSelectedDate.closing_time)
  );

  const courtHasScheduledHours = (courtId: string, time: string) => {
    const weekday = getDayOfWeekFromDate(selectedDate);
    const start = minutesOf(time);
    return courtHours.some(hours =>
      hours.court_id === courtId && hours.day_of_week === weekday && hours.active &&
      start >= minutesOf(hours.opening_time) && start + 60 <= minutesOf(hours.closing_time)
    );
  };

  const isCourtOpenAt = (courtId: string, time: string) => {
    if (!courtAvailabilityReady || isEntireDayClosed) return false;
    if (!courtHasScheduledHours(courtId, time)) return false;
    const override = overrideFor(courtId, time);
    if (override === "closed") return false;
    if (override === "open") return true;
    return isWithinArenaHours(time);
  };

  // Fora do expediente: esconder. Dentro dele: mostrar mesmo se
  // reservado ou fechado manualmente (o botão será desabilitado).
  // Uma abertura manual fora do expediente também deve aparecer.
  const businessHours = Array.from(new Set(
    courtHours.filter(hours => hours.day_of_week === getDayOfWeekFromDate(selectedDate) && hours.active)
      .flatMap(hours => {
        const start = minutesOf(hours.opening_time);
        const end = minutesOf(hours.closing_time);
        const times: string[] = [];
        for (let minute = Math.ceil(start / 60) * 60; minute + 60 <= end; minute += 60) {
          times.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:00`);
        }
        return times;
      })
  )).filter(time =>
    courtAvailabilityReady && !isEntireDayClosed &&
    (isWithinArenaHours(time) || allCourts.some(court =>
      courtHasScheduledHours(court.id, time) && overrideFor(court.id, time) === "open"
    ))
  ).sort();

  const isCourtLocked = (courtId: string, time: string) => {
    if (!isCourtOpenAt(courtId, time)) return true;
    const hasBooking = activeBookings.some((b) =>
      b.court_id === courtId && b.booking_date === selectedDate &&
      b.booking_time === time && b.status === "confirmada"
    );
    if (hasBooking || !courtAvailabilityReady) return true;
    const dayOfWeek = getDayOfWeekFromDate(selectedDate);
    const isClassCancelled = (scheduleId: string) =>
      classExceptions.some((exception) =>
        exception.schedule_id === scheduleId && exception.class_date === selectedDate
      );

    // Bloqueios manuais continuam independentes das aulas canceladas.
    const hasCourtLock = courtLocks.some((lock) => {
      if (lock.court_id !== courtId || lock.lock_time !== time) return false;
      if (lock.lock_type === "date") return lock.lock_date === selectedDate;
      if (lock.lock_type !== "weekly" || lock.day_of_week !== dayOfWeek) return false;
      if (!lock.class_schedule_id) return true;
      const linkedClass = classSchedules.find((schedule) => schedule.id === lock.class_schedule_id);
      return Boolean(linkedClass?.active && !isClassCancelled(linkedClass.id));
    });
    if (hasCourtLock) return true;

    // Turmas cadastradas também bloqueiam a quadra, mesmo sem court_lock associado.
    return classSchedules.some((schedule) =>
      schedule.active &&
      schedule.court_id === courtId &&
      schedule.day_of_week === dayOfWeek &&
      schedule.class_time === time &&
      !isClassCancelled(schedule.id)
    );
  };

  const isWeekend = isWeekendOrHoliday(selectedDate);

  // Uma quadra só é elegível se estiver livre em TODOS os horários selecionados.
  const availableCourtsForSelectedHours = selectedHours.length === 0 ? [] : allCourts.filter((court) =>
    court.sports.some((sport) => normalize(sport) === normalize(selectedSport)) &&
    selectedHours.every((time) => !isTimeTooCloseOrPassed(time) && !isCourtLocked(court.id, time))
  );

  const toggleHour = (time: string) => {
    setSelectedHours((previous) => previous.includes(time) ? previous.filter((h) => h !== time) : [...previous, time].sort());
    // A escolha de quadra deve corresponder à combinação atual de horários.
    setSelectedSlots([]);
  };

  const toggleCourtForAllHours = (court: Court) => {
    if (!selectedHours.length || !selectedHours.every((time) => !isCourtLocked(court.id, time) && !isTimeTooCloseOrPassed(time))) return;
    setSelectedSlots((previous) => {
      const alreadySelected = selectedHours.every((time) => previous.some((slot) => slot.courtId === court.id && slot.time === time));
      if (alreadySelected) return previous.filter((slot) => slot.courtId !== court.id);
      const withoutCourt = previous.filter((slot) => slot.courtId !== court.id);
      return [...withoutCourt, ...selectedHours.map((time) => ({
        courtId: court.id, courtName: court.name, time, price: getCourtPrice(court, time)
      }))];
    });
  };

  const removeSlot = (courtId: string, time: string) => {
    setSelectedSlots((prev) => prev.filter((s) => !(s.courtId === courtId && s.time === time)));
  };

  const subtotalCourts = selectedSlots.reduce((acc, s) => acc + s.price, 0);

  let upgradeItemCost = 0;
  let upgradeItemName = "";
  if (selectedSport === "Vôlei de Praia" && upgradesConfig.volleyEnabled === true && selectedUpgradeKey === "volley") {
    upgradeItemCost = Number(upgradesConfig.volleyPrice || 10);
    upgradeItemName = "Upgrade: Bola Mikasa Pro Oficial";
  } else if (selectedSport === "Beach Tennis" && upgradesConfig.beachTennisEnabled === true && selectedUpgradeKey === "beachtennis") {
    upgradeItemCost = Number(upgradesConfig.beachTennisPrice || 10);
    upgradeItemName = "Aluguel de Raquete de Beach Tennis";
  } else if (selectedSport === "Futebol Society" && upgradesConfig.societyEnabled === true && selectedUpgradeKey === "society") {
    upgradeItemCost = Number(upgradesConfig.societyPrice || 15);
    upgradeItemName = "Aluguel de Coletes";
  }

  const handleApplyCoupon = async (contextType: "quadras" | "aulas") => {
    setCouponError("");
    const codeClean = couponCodeInput.trim().toUpperCase();
    if (!codeClean) return;

    try {
      const { data, error } = await supabase.from("coupons").select("*").eq("code", codeClean).eq("active", true).single();
      if (error || !data) {
        setCouponError("Cupom inválido ou expirado.");
        return;
      }

      const scope = data.scope || "ambos";
      if (scope === "quadras" && contextType === "aulas") {
        setCouponError("Este cupom é válido apenas para reserva de quadras.");
        return;
      }
      if (scope === "aulas" && contextType === "quadras") {
        setCouponError("Este cupom é válido apenas para inscrição em aulas.");
        return;
      }
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setCouponError("Este cupom já atingiu o limite máximo de utilizações.");
        return;
      }

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discountPercent: data.discount_type === "percent" ? Number(data.discount_value) : 0,
        discountFixed: data.discount_type === "fixed" ? Number(data.discount_value) : 0,
      });
    } catch (err) {
      console.error(err);
      setCouponError("Erro ao validar cupom.");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponError("");
  };

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent > 0) {
      discountAmount = (subtotalCourts * appliedCoupon.discountPercent) / 100;
    } else {
      discountAmount = appliedCoupon.discountFixed;
    }
  }

  const totalAmount = selectedSlots.length > 0 
    ? Math.max(0, subtotalCourts - discountAmount) + upgradeItemCost 
    : 0;

  const getPackageTotalPrice = () => {
    const priceSport = classSport === "Escolinha de Futebol" ? "Futebol Society" : classSport;
    const sportPrices = classPricesMap[priceSport] || { mensal: 200, trimestral: 540, semestral: 960 };
    let monthlyBase = Number(sportPrices.mensal) || 200.0;
    let multiplier = 1;

    if (classPlanType === "trimestral") {
      const quarterlyTotal = Number(sportPrices.trimestral) || 540.0;
      monthlyBase = quarterlyTotal / 3;
      multiplier = 3;
    } else if (classPlanType === "semestral") {
      const semiannualTotal = Number(sportPrices.semestral) || 960.0;
      monthlyBase = semiannualTotal / 6;
      multiplier = 6;
    }

    const basePackagePrice = monthlyBase * multiplier;
    const extraDaysTotal = extraDaysCount * 80.0 * multiplier;
    return basePackagePrice + extraDaysTotal;
  };

  const totalClassPackagePrice = getPackageTotalPrice();

  let classDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent > 0) {
      classDiscountAmount = (totalClassPackagePrice * appliedCoupon.discountPercent) / 100;
    } else {
      classDiscountAmount = appliedCoupon.discountFixed;
    }
  }

  const finalClassAmount = Math.max(0, totalClassPackagePrice - classDiscountAmount);

  const getCapacityForTurma = (turmaStr: string) => {
    if (classCapacityMap && classCapacityMap[turmaStr] !== undefined) {
      return Number(classCapacityMap[turmaStr]);
    }
    return defaultCapacity;
  };
  
const countEnrollmentsForSpecificClass = (targetTurma: string) => {
  if (!classSport || !classCategory) return 0;

  return classEnrollmentsList.reduce((total, en) => {
    const sameSport = en.sport === classSport;
    const sameCategory = en.category === classCategory;
    const sameClass = en.days_selected === targetTurma;

    if (sameSport && sameCategory && sameClass) {
      return total + Number(en.count || 0);
    }

    return total;
  }, 0);
};

  const getRemainingSlotsForOption = (optionStr: string) => {
    const maxCap = getCapacityForTurma(optionStr);
    const used = countEnrollmentsForSpecificClass(optionStr);
    return Math.max(0, maxCap - used);
  };

  const formatSlotsForSummary = (slots: SelectedSlot[]) => {
    const byCourt: { [key: string]: string[] } = {};
    slots.forEach((s) => {
      if (!byCourt[s.courtName]) byCourt[s.courtName] = [];
      byCourt[s.courtName].push(s.time);
    });

    let summary = Object.entries(byCourt)
      .map(([courtName, times]) => {
        const sorted = times.sort();
        return `• ${courtName}: ${sorted.join(", ")} (${sorted.length}h)`;
      }).join("\n");

    if (upgradeItemCost > 0 && upgradeItemName) {
      summary += `\n• Adicional: ${upgradeItemName} (R$ ${upgradeItemCost.toFixed(2)})`;
    }
    return summary;
  };

  const bookingSubmissionInProgress = useRef(false);

  const handleDirectBookingSuccess = async (_method: string, _installments: number, totalPaid: number): Promise<boolean> => {
    void _method;
    void _installments;
    void totalPaid;
    if (bookingSubmissionInProgress.current) return false;
    bookingSubmissionInProgress.current = true;
    const isClass = checkoutBookingDetails.isClass;
    let bookingCode = "";

    try {

if (isClass) {
  // O servidor valida a turma, calcula o preço e registra
  // a matrícula de forma transacional no Supabase.
  if (appliedCoupon) {
    throw new Error(
      "Matrículas com cupom ainda não estão disponíveis. Remova o cupom e tente novamente."
    );
  }

  const response = await fetch("/api/classes/enroll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerName: checkoutBookingDetails.customerName,
      customerPhone: checkoutBookingDetails.customerPhone,
      customerEmail: checkoutBookingDetails.customerEmail,
      sport: classSport,
      category: classCategory,
      mainClass: selectedClassOption,
      planType: classPlanType,
      extraDays: selectedExtraDays,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true || typeof result.code !== "string") {
    throw new Error(
      result?.error || "Não foi possível registrar a matrícula."
    );
  }

  bookingCode = result.code;

} else {
        // A API calcula os preços e grava todos os horários de forma atômica.
        // Cupons ainda precisam de suporte no servidor.
        if (appliedCoupon) {
          throw new Error("Reservas com cupom ainda não estão disponíveis nesta etapa. Remova o cupom e tente novamente.");
        }

        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: checkoutBookingDetails.customerName,
            customerPhone: checkoutBookingDetails.customerPhone,
            customerEmail: checkoutBookingDetails.customerEmail,
            selectedSport: checkoutBookingDetails.selectedSport,
            selectedDate: checkoutBookingDetails.selectedDate,
            addonKey: checkoutBookingDetails.addonKey || null,
            slots: checkoutBookingDetails.slots.map((slot) => ({
              courtId: slot.courtId,
              time: slot.time,
            })),
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success || typeof result.code !== "string") {
          throw new Error(result?.error || "Não foi possível confirmar a reserva.");
        }
        bookingCode = result.code;

      }

      setIsCheckoutModalOpen(false);
      window.location.assign(new URL(`/?status=success&code=${encodeURIComponent(bookingCode)}`, window.location.origin).toString());
      return true;
    } catch (err: unknown) {
      console.error("Erro ao salvar reserva no banco:", err);
      alert("Erro ao registrar reserva: " + (err instanceof Error ? err.message : "Tente novamente."));
      return false;
    } finally {
      bookingSubmissionInProgress.current = false;
    }
  };

  const handleActionClick = () => {
    if (activeTab === "book") {
      if (customerName.trim().length < 3 || !/^\d{10,11}$/.test(customerPhone.replace(/\D/g, ""))) {
        alert("Informe nome com pelo menos 3 caracteres e WhatsApp com DDD (10 ou 11 dígitos).");
        return;
      }
      if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
        alert("Informe um e-mail válido ou deixe o campo em branco.");
        return;
      }
      if (selectedSlots.length === 0 || !courtAvailabilityReady || selectedSlots.some((slot) => isCourtLocked(slot.courtId, slot.time) || isTimeTooCloseOrPassed(slot.time))) {
        alert("Selecione horários disponíveis antes de confirmar a reserva.");
        return;
      }

      setCheckoutBookingDetails({
        amount: totalAmount,
        baseAmount: subtotalCourts,
        description: `Reserva Arena CT Viva - ${formatSlotsForSummary(selectedSlots)}`,
        customerName,
        customerPhone,
        customerEmail: customerEmail.trim().toLowerCase(),
        isClass: false,
        slots: selectedSlots,
        selectedSport,
        selectedDate,
        upgradeItemCost,
        upgradeItemName,
        addonKey: upgradeItemName ? selectedUpgradeKey : "",
      });
      setIsCheckoutModalOpen(true);

    } else {
      if (customerName.trim().length < 3 || !/^\d{10,11}$/.test(customerPhone.replace(/\D/g, ""))) {
        alert("Informe nome com pelo menos 3 caracteres e WhatsApp com DDD (10 ou 11 dígitos).");
        return;
      }
      if (!classesReady || !selectedClassInfo || !classSport || !classCategory || !selectedClassOption) {
        alert("Por favor, selecione a Modalidade, a Categoria e a Turma/Horário desejados.");
        return;
      }
      if (selectedExtraDays.length !== extraDaysCount || new Set(selectedExtraDays).size !== selectedExtraDays.length || selectedExtraDays.some(id => !extraClassById(id)) || new Set(selectedExtraClassDays).size !== selectedExtraClassDays.length) {
        alert("Selecione as turmas extras disponíveis, sem repetir dias.");
        return;
      }
      if (selectedExtraDays.length > 0) {
        alert("A seleção das turmas extras está pronta. O registro ficará disponível após a atualização da API e do banco de dados.");
        return;
      }
      if (getRemainingSlotsForOption(selectedClassOption) <= 0) {
        alert("Desculpe, esta turma já atingiu o limite máximo de vagas.");
        return;
      }

      setCheckoutBookingDetails({
        amount: finalClassAmount,
        baseAmount: totalClassPackagePrice,
        description: `Matrícula Aula - ${classSport} (${classCategory}) - ${selectedClassOption}${selectedExtraDays.length ? ` | Turmas extras: ${selectedExtraDays.map(id => { const turma = extraClassById(id); return turma ? `${DAY_EXTRA_NAMES[turma.day_of_week]} ${turma.class_time.slice(0, 5)} (${turma.category})` : id; }).join(", ")}` : ""}`,
        customerName,
        customerPhone,
        customerEmail: customerEmail.trim().toLowerCase(),
        isClass: true,
        slots: [],
        selectedSport: classSport,
        selectedDate: getBrazilDateString(),
        upgradeItemCost: 0,
        upgradeItemName: "",
        addonKey: "",
      });
      setIsCheckoutModalOpen(true);
    }
  };

  const generateHelpWhatsAppUrl = () => {
    const text = encodeURIComponent(`Olá, CT Viva Esportes! Estou no site de reservas e gostaria de tirar uma dúvida.`);
    return `https://wa.me/55${currentArena.whatsapp}?text=${text}`;
  };

  const generateShareGroupMessage = (b: StoredBooking) => {
    const text = `Fala, galera! Nosso play está garantido!\n\n` +
      `Local: ${currentArena.name}\nEndereço: ${currentArena.address}\nComo chegar: ${currentArena.mapsUrl}\n` +
      `Data: ${formatDateToBR(b.date)}\n\nEspaços & Horários Agendados:\n${b.courtName}\n\n` +
      `Valor Total a Acertar na Recepção: R$ ${b.totalAmount.toFixed(2)} (vamos dividir!)\n\nBora pro jogo! Não se atrasem.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelStatusMsg(null);
    setHasSearched(true);
    const rawCode = searchCodeInput.trim().toUpperCase();
    const rawPhoneDigits = searchPhoneInput.replace(/\D/g, "");

    if (!rawCode || rawPhoneDigits.length < 8) {
      alert("Por segurança, informe tanto o Código quanto o WhatsApp cadastrado.");
      return;
    }

    try {
      if (rawCode.startsWith("VIVA-")) {
        const response = await fetch("/api/bookings/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ code: rawCode, phone: rawPhoneDigits }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setSearchedBookings([]);
          setCancelStatusMsg({
            text: result?.error || "Não foi possível consultar a reserva. Tente novamente.",
            error: true,
          });
          return;
        }
        if (!result?.booking || typeof result.booking.bookingCode !== "string") {
          throw new Error("Resposta inesperada ao consultar a reserva.");
        }
        setSearchedBookings([result.booking as StoredBooking]);
        return;
      }


const response = await fetch("/api/classes/manage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  cache: "no-store",
  body: JSON.stringify({
    code: rawCode,
    phone: rawPhoneDigits,
  }),
});

const result = await response.json().catch(() => null);

if (!response.ok) {
  setSearchedBookings([]);
  setCancelStatusMsg({
    text: result?.error || "Não foi possível consultar a matrícula.",
    error: true,
  });
  return;
}

if (!result?.booking || typeof result.booking.bookingCode !== "string") {
  throw new Error("Resposta inesperada ao consultar a matrícula.");
}

setSearchedBookings([result.booking as StoredBooking]);
return;
    } catch (err) {
      console.error(err);
      setSearchedBookings([]);
      setCancelStatusMsg({ text: "Erro ao consultar a reserva. Tente novamente.", error: true });
    }
  };


const handleCancelReservation = async (booking: StoredBooking) => {
  const confirmed = window.confirm(
    `Confirma o cancelamento da reserva ${booking.bookingCode}?\n\nAo confirmar, o horário será liberado.`
  );

  if (!confirmed) return;

  setCancelStatusMsg(null);

  try {
    if (booking.bookingCode.startsWith("VIVA-")) {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          code: booking.bookingCode,
          phone: searchPhoneInput.replace(/\D/g, ""),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.error || "Não foi possível cancelar a reserva."
        );
      }

} else if (booking.bookingCode.startsWith("AULA-")) {
  const response = await fetch("/api/classes/cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      code: booking.bookingCode,
      phone: searchPhoneInput.replace(/\D/g, ""),
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.error || "Não foi possível cancelar a matrícula."
    );
  }

    } else {
      throw new Error("Código de reserva inválido.");
    }

    setSearchedBookings((previous) =>
      previous.map((item) =>
        item.bookingCode === booking.bookingCode
          ? { ...item, status: "cancelada" }
          : item
      )
    );

    await loadCloudData();

    setCancelStatusMsg({
      text: "Cancelamento realizado com sucesso!",
      error: false,
    });
  } catch (error: unknown) {
    console.error("Erro ao cancelar reserva:", error);

    setCancelStatusMsg({
      text:
        (error instanceof Error ? error.message : null) ||
        "Não foi possível cancelar a reserva. Tente novamente.",
      error: true,
    });
  }
};

  if (!mounted) return null;

  // Cada opção representa uma aula específica: dia, categoria, horário e turma.
  // A API de matrícula precisará receber estes IDs e verificar a capacidade atomicamente.
  const availableExtraClasses = activeClassSchedules
    .filter(schedule => schedule.active && schedule.sport === classSport &&
      !selectedClassInfo?.days.includes(Number(schedule.day_of_week)))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.class_time.localeCompare(b.class_time));
  const extraClassById = (id: string) => availableExtraClasses.find(schedule => schedule.id === id);
  const selectedExtraClassDays = selectedExtraDays.map(id => extraClassById(id)?.day_of_week);
  const availableExtraDays = [...new Set(availableExtraClasses.map(schedule => DAY_EXTRA_NAMES[schedule.day_of_week]))];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-28 relative">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CT Viva Esportes" className="h-10 w-auto rounded object-contain bg-[#041E8C]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase italic">{currentArena.name}</h1>
              <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium"><MapPin className="w-3 h-3 text-[#00E599]" /> Fortaleza - CE</p>
            </div>
          </div>
          <a href="/admin" className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition cursor-pointer">
            <Settings className="w-3.5 h-3.5 text-[#00E599]" /> Gestor
          </a>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        <div className="flex bg-[#041E8C]/10 p-1 rounded-xl gap-1">
          <button onClick={() => setActiveTab("book")} className={`flex-1 py-2 text-xs font-black rounded-lg transition cursor-pointer ${activeTab === "book" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}>Reservar Quadras</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}><GraduationCap className="w-3.5 h-3.5" /> Aulas / Treinos</button>
          <button onClick={() => setActiveTab("manage")} className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${activeTab === "manage" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}><Search className="w-3.5 h-3.5" /> Gerenciar Reserva</button>
        </div>

        {activeTab === "manage" ? (
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00E599]" /><h2 className="text-sm font-bold text-slate-800">Gerenciar Minha Reserva ou Matrícula</h2></div>
              <p className="text-xs text-slate-500 mt-0.5">Informe o <strong>Código</strong> e o <strong>WhatsApp</strong> cadastrado.</p>
            </div>
            <form onSubmit={handleSearchBooking} className="space-y-2.5">
              <div className="space-y-2">
                <div className="relative"><Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Ex: VIVA-4K8P ou AULA-7M2X" value={searchCodeInput} onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] tracking-wider outline-none" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Digite apenas números com DDD" value={searchPhoneInput} onChange={(e) => setSearchPhoneInput(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#041E8C] text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5 cursor-pointer"><Search className="w-3.5 h-3.5" /> Localizar Registro</button>
            </form>
            {cancelStatusMsg && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${cancelStatusMsg.error ? "bg-red-50 text-red-800 border-red-200" : "bg-amber-50 text-amber-950 border-amber-300"}`}>
                <p className="font-semibold leading-relaxed">{cancelStatusMsg.text}</p>
              </div>
            )}
            {hasSearched && searchedBookings.length === 0 && <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">Nenhum registro encontrado.</div>}
            <div className="space-y-3">
              {searchedBookings.map((b) => (
                <div key={b.bookingCode} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div><span className="text-[10px] uppercase font-bold text-slate-400">Código</span><p className="font-mono font-black text-sm text-[#041E8C]">{b.bookingCode}</p></div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {b.status === "confirmada" ? "Confirmada" : b.status === "finalizada" ? "Concluída" : "Cancelada"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div><span className="text-slate-400 block text-[10px]">Cliente</span><span className="font-semibold text-slate-700">{b.customerName}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">Data</span><span className="font-semibold text-slate-700">{formatDateToBR(b.date)}</span></div>
                    {!b.bookingCode.startsWith("VIVA-") && (
                      <div><span className="text-slate-400 block text-[10px]">Detalhes</span><span className="font-semibold text-slate-700 whitespace-pre-line leading-relaxed">{b.courtName}</span></div>
                    )}
                    {b.bookingCode.startsWith("VIVA-") && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                        <p className="text-[11px] font-black text-[#041E8C]">Detalhamento da Reserva</p>
                        {b.bookingSlots?.map((slot, index) => (
                          <div key={`${slot.courtName}-${slot.time}-${index}`} className="flex justify-between gap-3 text-xs">
                            <span className="text-slate-600">{slot.courtName} · {slot.time} (1h)</span>
                            <span className="font-semibold whitespace-nowrap">{slot.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                          </div>
                        ))}
                        {b.addons?.map((addon, index) => (
                          <div key={`${addon.name}-${index}`} className="flex justify-between gap-3 text-xs">
                            <span className="text-slate-600">{addon.name}</span>
                            <span className="font-semibold whitespace-nowrap">{addon.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-200">
                          <span className="text-xs font-black text-slate-800">Total a pagar</span>
                          <span className="text-base font-black text-[#041E8C]">{Number(b.totalAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Pagamento presencial na arena</p>
                      </div>
                    )}
                  </div>
                  {b.status === "confirmada" && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      {!b.bookingCode.startsWith("AULA-") && (
                        <a href={generateShareGroupMessage(b)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"><Share2 className="w-4 h-4" /> Compartilhar no WhatsApp</a>
                      )}
                      <button type="button" onClick={() => handleCancelReservation(b)} className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"><XCircle className="w-4 h-4" /> Solicitar Cancelamento</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "classes" ? (
          <div className="space-y-4">
            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-[#00E599]" /> Inscrição em Aulas & Escolinhas</h2>
              <div className="space-y-2">
                <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Digite Nome e Sobrenome" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Digite apenas números com DDD" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
                <div className="relative"><input type="email" placeholder="E-mail (opcional, para receber detalhes por e-mail)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} maxLength={254} autoComplete="email" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Modalidade</label>
              {!classesReady && <p className="text-xs text-amber-700">Carregando turmas cadastradas...</p>}
              {classesReady && Object.keys(classOptions).length === 0 && <p className="text-xs text-slate-500">Nenhuma turma ativa cadastrada.</p>}
              <select value={classSport} onChange={(e) => { setClassSport(e.target.value); setClassCategory(""); setSelectedClassOption(""); setExtraDaysCount(0); setExtraDay1(""); setExtraDay2(""); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none cursor-pointer">
                <option value="" disabled>Escolher Modalidade</option>
                {Object.keys(classOptions).sort().map(sport => <option key={sport} value={sport}>{sport}</option>)}
              </select>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block pt-2">Categoria / Nível</label>
              <select value={classCategory} onChange={(e) => { setClassCategory(e.target.value); setSelectedClassOption(""); setExtraDaysCount(0); setExtraDay1(""); setExtraDay2(""); }} disabled={!classSport} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none disabled:opacity-50 cursor-pointer">
                <option value="" disabled>Selecionar Nível</option>
                {classSport && classOptions[classSport] && Object.keys(classOptions[classSport]).sort().map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {classSport && classCategory && currentClassOptions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Selecione a Turma / Horário Desejado</label>
                  <div className="space-y-2">
                    {currentClassOptions.map((option, idx) => {
                      const optionLabel = option.label;
                      const remaining = getRemainingSlotsForOption(optionLabel);
                      const isSelected = selectedClassOption === optionLabel;
                      const isSoldOut = remaining <= 0;
                      const maxCap = getCapacityForTurma(optionLabel);

                      return (
                        <div key={idx} onClick={() => !isSoldOut && setSelectedClassOption(optionLabel)} className={`p-3 rounded-xl border text-xs flex justify-between items-center transition ${isSoldOut ? "bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed" : isSelected ? "bg-emerald-50 border-[#00E599] ring-2 ring-[#00E599] cursor-pointer" : "bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"}`}>
                          <div>
                            <span className="font-bold text-slate-900 block">📅 {optionLabel}</span>
                            {option.professor && <span className="text-[10px] text-slate-500 block">Professor: {option.professor}</span>}
                            <span className={`text-[10px] font-bold ${isSoldOut ? "text-red-600" : "text-emerald-700"}`}>{isSoldOut ? "Esgotado (0 vagas)" : `${remaining} vagas restantes (Máx: ${maxCap})`}</span>
                          </div>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{isSelected ? "✓" : "+"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedClassOption && (
                <div className="pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicionar Dias Extras (+ R$ 80,00 / mês por dia extra)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button type="button" onClick={() => { setExtraDaysCount(Math.max(0, extraDaysCount - 1)); if(extraDaysCount <= 1) setExtraDay2(""); if(extraDaysCount <= 0) setExtraDay1(""); }} className="w-8 h-8 rounded-lg bg-slate-100 font-bold cursor-pointer">-</button>
                    <span className="text-xs font-bold">{extraDaysCount} dia(s) extra(s) (Máx: {Math.min(2, availableExtraDays.length)})</span>
                    <button type="button" onClick={() => { if(extraDaysCount < Math.min(2, availableExtraDays.length)) setExtraDaysCount(extraDaysCount + 1); }} className="w-8 h-8 rounded-lg bg-slate-100 font-bold cursor-pointer">+</button>
                  </div>
                  {extraDaysCount >= 1 && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block">Escolher 1ª Turma Extra:</label>
                      <select value={extraDay1} onChange={(e) => setExtraDay1(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium cursor-pointer">
                        <option value="" disabled>Selecione a turma e o horário...</option>
                        {availableExtraClasses.map((turma) => (<option key={turma.id} value={turma.id} disabled={turma.id === extraDay2 || (extraClassById(extraDay2)?.day_of_week === turma.day_of_week)}>{DAY_EXTRA_NAMES[turma.day_of_week]} · {turma.class_time.slice(0, 5)} · {turma.category}{turma.class_name ? ` · ${turma.class_name}` : ""}</option>))}
                      </select>
                    </div>
                  )}
                  {extraDaysCount >= 2 && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block">Escolher 2ª Turma Extra:</label>
                      <select value={extraDay2} onChange={(e) => setExtraDay2(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium cursor-pointer">
                        <option value="" disabled>Selecione a turma e o horário...</option>
                        {availableExtraClasses.map((turma) => (<option key={turma.id} value={turma.id} disabled={turma.id === extraDay1 || (extraClassById(extraDay1)?.day_of_week === turma.day_of_week)}>{DAY_EXTRA_NAMES[turma.day_of_week]} · {turma.class_time.slice(0, 5)} · {turma.category}{turma.class_name ? ` · ${turma.class_name}` : ""}</option>))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Plano de Fidelização</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button type="button" onClick={() => setClassPlanType("mensal")} className={`p-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${classPlanType === "mensal" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}>Mensal<br/><span className="text-[10px] opacity-80">R$ {classPricesMap[classSport === "Escolinha de Futebol" ? "Futebol Society" : (classSport || "Vôlei de Praia")]?.mensal || 200}</span></button>
                  <button type="button" onClick={() => setClassPlanType("trimestral")} className={`p-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${classPlanType === "trimestral" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}>Trimestral<br/><span className="text-[10px] opacity-80">R$ {classPricesMap[classSport === "Escolinha de Futebol" ? "Futebol Society" : (classSport || "Vôlei de Praia")]?.trimestral || 540}</span></button>
                  <button type="button" onClick={() => setClassPlanType("semestral")} className={`p-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${classPlanType === "semestral" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}>Semestral<br/><span className="text-[10px] opacity-80">R$ {classPricesMap[classSport === "Escolinha de Futebol" ? "Futebol Society" : (classSport || "Vôlei de Praia")]?.semestral || 960}</span></button>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo da Matrícula</h3>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                {appliedCoupon ? (
                  <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs"><span className="font-bold text-emerald-800">Cupom <strong>{appliedCoupon.code}</strong> aplicado</span><button type="button" onClick={removeCoupon} className="text-red-600 font-bold hover:underline text-[11px] cursor-pointer">Remover</button></div>
                ) : (
                  <div className="flex gap-2"><input type="text" placeholder="Digite seu cupom" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} className="flex-1 p-2 bg-white border rounded-lg text-xs font-bold uppercase tracking-wider outline-none" /><button type="button" onClick={() => handleApplyCoupon("aulas")} className="px-4 py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg cursor-pointer">Aplicar</button></div>
                )}
                {couponError && <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>}
              </div>

              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between text-slate-600"><span>Plano {classPlanType.toUpperCase()} (Pacote Integral)</span><span>R$ {totalClassPackagePrice.toFixed(2)}</span></div>
                {classDiscountAmount > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span>Desconto do Cupom</span><span>- R$ {classDiscountAmount.toFixed(2)}</span></div>}
                <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                  <span>Valor Total no Local</span>
                  <span className="text-[#041E8C] text-base font-black">R$ {finalClassAmount.toFixed(2)}</span>
                </div>
              </div>

              <button type="button" onClick={handleActionClick} className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow flex items-center justify-center gap-2 text-xs cursor-pointer">
                <CheckCircle2 className="w-4 h-4" /> CONCLUIR INSCRIÇÃO
              </button>
            </section>
          </div>
        ) : (
          <>
            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">1. Identificação do Cliente</label>
              <div className="space-y-2">
                <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Digite Nome e Sobrenome" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Digite apenas números com DDD" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
                <div className="relative"><input type="email" placeholder="E-mail (opcional, para receber detalhes por e-mail)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} maxLength={254} autoComplete="email" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">2. Escolha a Modalidade</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {currentArena.sports.map((sport) => (
                  <button key={sport} type="button" onClick={() => { setSelectedSport(sport); setSelectedSlots([]); setSelectedHours([]); }} className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition font-bold cursor-pointer ${selectedSport === sport ? "bg-[#041E8C] text-white border-[#041E8C] shadow-sm" : "bg-white text-slate-600 border-slate-200"}`}>{sport}</button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">3. Escolha a Data do Jogo</label>{isWeekend && <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">Final de Semana / Feriado</span>}</div>
              <input type="date" min={todayString || undefined} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlots([]); setSelectedHours([]); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none cursor-pointer" />
            </section>

            {/* SEÇÃO 4: GRADE ORIGINAL COM ACUMULAÇÃO LIVRE DE MÚLTIPLOS HORÁRIOS */}
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">4. Selecionar Horários & Quadras</label>
                <span className="text-[10px] text-slate-500 font-medium">Marque todas as horas desejadas e depois escolha uma quadra livre em todas elas</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {businessHours.map((time) => {
                  const isPicked = selectedHours.includes(time);
                  const hour = parseInt(time.split(":")[0], 10);
                  const isPast = isTimeTooCloseOrPassed(time);
                  
                  const eligibleCourts = allCourts.filter((court) =>
                    court.sports.some((sport) => normalize(sport) === normalize(selectedSport))
                  );
                  const isUnavailable = !courtAvailabilityReady || !eligibleCourts.some((court) => !isCourtLocked(court.id, time));
                  const isDisabled = isPast || isUnavailable;
                  const promo = upgradesConfig?.promo;
                  const promoStart = parseInt((promo?.startHour || "16:00").split(":")[0], 10);
                  const promoEnd = parseInt((promo?.endHour || "19:00").split(":")[0], 10);
                  const isPromo = (promo?.enabled ?? true) && hour >= promoStart && hour < promoEnd && !isWeekend;
                  const selectedCountInThisHour = selectedSlots.filter((s) => s.time === time).length;


                  return (
                    <button 
                      key={time} 
                      type="button" 
                      disabled={isDisabled} 
                      onClick={() => toggleHour(time)} 
                      className={`min-h-[50px] p-2 rounded-xl border text-center transition relative flex flex-col items-center justify-center cursor-pointer ${
                        isDisabled
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                          : isPicked 
                          ? "border-[#041E8C] bg-blue-50/70 ring-2 ring-[#041E8C]" 
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className={`text-xs font-bold ${isDisabled ? "text-slate-400" : "text-slate-800"}`}>{time}</span>
                      {(isPast || isUnavailable || isPromo) && (
                        <span className={`text-[9px] font-semibold mt-0.5 ${isDisabled ? "text-slate-400" : "text-green-600"}`}>
                          {isPast ? "Encerrado" : isUnavailable ? "Indisponível" : "Promocional"}
                        </span>
                      )}
                      {selectedCountInThisHour > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#00E599] text-[#041E8C] font-black text-[9px] rounded-full flex items-center justify-center">
                          {selectedCountInThisHour}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Quadras livres em todos os horários:</span>
                  <span className="text-[11px] text-slate-400">{availableCourtsForSelectedHours.length} disponíveis</span>
                </div>
                {selectedHours.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">{courtAvailabilityReady ? "Selecione uma ou mais horas acima. Depois escolha a quadra." : "Carregando disponibilidade das quadras..."}</div>
                ) : availableCourtsForSelectedHours.length > 0 ? (
                  <>
                    <p className="text-xs text-slate-600">Horários: {selectedHours.join(", ")} ({selectedHours.length}h). Escolha uma quadra para reservar todas essas horas.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {availableCourtsForSelectedHours.map((court) => {
                        const isSelected = selectedHours.every((time) => selectedSlots.some((slot) => slot.courtId === court.id && slot.time === time));
                        const price = selectedHours.reduce((sum, time) => sum + getCourtPrice(court, time), 0);
                        return (
                          <button key={court.id} type="button" onClick={() => toggleCourtForAllHours(court)} className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${isSelected ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200 bg-white"}`}>
                            <div className="flex justify-between items-start">
                              <div><p className="text-xs font-bold text-slate-800">{court.name}</p><p className="text-[10px] text-slate-400">{court.surface}</p></div>
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border">{isSelected ? "✓" : "+"}</span>
                            </div>
                            <div className="pt-2 text-right"><span className="text-xs font-black text-[#041E8C]">R$ {price.toFixed(2)}</span><span className="text-[9px] text-slate-500"> / {selectedHours.length}h</span></div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-red-50 rounded-xl text-center text-xs text-red-700">Nenhuma quadra está livre durante todos os horários selecionados. Remova ou altere alguma hora.</div>
                )}
              </div>

              {selectedSlots.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-600">Horários Selecionados no Carrinho ({selectedSlots.length})</span><button type="button" onClick={() => setSelectedSlots([])} className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer">Limpar todos</button></div>
                  <p className="text-[11px] text-slate-600">Cada quadra marcada será reservada em todos os horários escolhidos acima.</p>
                  <div className="space-y-1.5">
                    {[...selectedSlots].sort((a, b) => a.courtName.localeCompare(b.courtName) || a.time.localeCompare(b.time)).map((slot) => (
                      <div key={`${slot.courtId}-${slot.time}`} className="flex justify-between items-center p-2 bg-white rounded-xl border text-xs">
                        <div><strong className="text-slate-800">{slot.courtName}</strong><span className="text-slate-500 text-[11px] ml-2 font-mono">às {slot.time}</span></div>
                        <div className="flex items-center gap-2"><span className="font-bold text-[#041E8C]">R$ {slot.price.toFixed(2)}</span><button type="button" onClick={() => removeSlot(slot.courtId, slot.time)} className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"><X className="w-3.5 h-3.5" /></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {selectedSlots.length > 0 && (
              <>
                {selectedSport === "Vôlei de Praia" && upgradesConfig.volleyEnabled === true && (
                  <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicional Opcional</label>
                    <div onClick={() => setSelectedUpgradeKey(selectedUpgradeKey === "volley" ? "" : "volley")} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedUpgradeKey === "volley" ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200"}`}>
                      <div><p className="text-xs font-bold text-slate-800">Upgrade: Bola Mikasa Pro Oficial</p><p className="text-[10px] text-[#041E8C] font-semibold">+ R$ {Number(upgradesConfig.volleyPrice || 10).toFixed(2)}</p></div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedUpgradeKey === "volley" ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{selectedUpgradeKey === "volley" ? "✓" : "+"}</span>
                    </div>
                  </section>
                )}

                {selectedSport === "Beach Tennis" && upgradesConfig.beachTennisEnabled === true && (
                  <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicional Opcional</label>
                    <div onClick={() => setSelectedUpgradeKey(selectedUpgradeKey === "beachtennis" ? "" : "beachtennis")} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedUpgradeKey === "beachtennis" ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200"}`}>
                      <div><p className="text-xs font-bold text-slate-800">Aluguel de Raquete de Beach Tennis</p><p className="text-[10px] text-[#041E8C] font-semibold">+ R$ {Number(upgradesConfig.beachTennisPrice || 10).toFixed(2)}</p></div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedUpgradeKey === "beachtennis" ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{selectedUpgradeKey === "beachtennis" ? "✓" : "+"}</span>
                    </div>
                  </section>
                )}

                {selectedSport === "Futebol Society" && upgradesConfig.societyEnabled === true && (
                  <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicional Opcional</label>
                    <div onClick={() => setSelectedUpgradeKey(selectedUpgradeKey === "society" ? "" : "society")} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedUpgradeKey === "society" ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200"}`}>
                      <div><p className="text-xs font-bold text-slate-800">Aluguel de Coletes</p><p className="text-[10px] text-[#041E8C] font-semibold">+ R$ {Number(upgradesConfig.societyPrice || 15).toFixed(2)}</p></div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedUpgradeKey === "society" ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{selectedUpgradeKey === "society" ? "✓" : "+"}</span>
                    </div>
                  </section>
                )}
              </>
            )}

            {selectedSlots.length > 0 && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo do Pedido</h3>

                <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
                  {appliedCoupon ? (
                    <div className="flex justify-between items-center p-2 bg-emerald-50 border rounded-lg text-xs"><span className="font-bold text-emerald-800">Cupom <strong>{appliedCoupon.code}</strong> aplicado</span><button type="button" onClick={removeCoupon} className="text-red-600 font-bold hover:underline text-[11px] cursor-pointer">Remover</button></div>
                  ) : (
                    <div className="flex gap-2"><input type="text" placeholder="Digite seu cupom" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} className="flex-1 p-2 bg-white border rounded-lg text-xs font-bold uppercase outline-none" /><button type="button" onClick={() => handleApplyCoupon("quadras")} className="px-4 py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg cursor-pointer">Aplicar</button></div>
                  )}
                  {couponError && <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>}
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between text-slate-600"><span>Locação de Quadras</span><span>R$ {subtotalCourts.toFixed(2)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span>Desconto do Cupom</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                  {upgradeItemCost > 0 && <div className="flex justify-between text-slate-600"><span>Adicional ({upgradeItemName})</span><span>R$ {upgradeItemCost.toFixed(2)}</span></div>}
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                    <span>Total a Pagar no Local</span>
                    <span className="text-[#041E8C] text-base font-black">R$ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button type="button" onClick={handleActionClick} className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow flex items-center justify-center gap-2 text-sm cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" /> CONCLUIR RESERVA
                </button>
              </section>
            )}
          </>
        )}
      </div>

      <a href={generateHelpWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="fixed bottom-4 right-4 z-40 bg-[#00E599] text-[#041E8C] px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black transition transform hover:scale-105 border-2 border-white cursor-pointer"><MessageCircle className="w-4 h-4 fill-current" /> Dúvidas? Chame no Zap</a>

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        bookingDetails={checkoutBookingDetails}
        onSuccess={handleDirectBookingSuccess}
      />
    </main>
  );
}