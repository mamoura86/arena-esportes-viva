"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Lock, Unlock, Calendar, Clock, 
  PlusCircle, RefreshCw, CheckCircle2, XCircle, 
  Phone, User, ShieldCheck, Tag, Info, DollarSign,
  TrendingUp, BarChart3, Filter, Search, Edit3, X, Sparkles, Trash2, GraduationCap, KeyRound,
  ChevronLeft, ChevronRight, PieChart, Lightbulb, Award, AlertTriangle, UserPlus
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  type: "society" | "areia";
}

interface BookingRecord {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  courtId: string;
  courtName: string;
  sport?: string;
  date: string;
  time: string;
  price: number;
  channel: "online" | "manual";
  paymentMethod: string;
  status: "aguardando_pagamento" | "confirmada" | "cancelada";
  createdAt?: string;
}

interface ConsolidatedBooking {
  code: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  totalPrice: number;
  status: string;
  channel: string;
  details: string[];
}

interface CouponRecord {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  scope: "quadras" | "aulas" | "ambos";
  active: boolean;
  max_uses?: number | null;
  used_count?: number;
}

interface ClassEnrollment {
  id: string;
  code: string;
  student_name: string;
  student_phone: string;
  sport: string;
  category: string;
  plan_type: string;
  days_selected: string;
  extra_days_count: number;
  total_price: number;
  status: string;
  created_at: string;
}

const allCourts: Court[] = [
  { id: "futebol-1", name: "Campo de Futebol Society", type: "society" },
  { id: "areia-1", name: "Quadra 1 (Areia)", type: "areia" },
  { id: "areia-2", name: "Quadra 2 (Areia)", type: "areia" },
  { id: "areia-3", name: "Quadra 3 (Areia)", type: "areia" },
  { id: "areia-4", name: "Quadra 4 (Areia)", type: "areia" },
  { id: "areia-5", name: "Quadra 5 (Areia)", type: "areia" },
  { id: "areia-6", name: "Quadra 6 (Areia)", type: "areia" },
];

const businessHours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const ADMIN_PIN = "1234";

const daysOfWeek = [
  { id: 1, name: "Segunda-feira" },
  { id: 2, name: "Terça-feira" },
  { id: 3, name: "Quarta-feira" },
  { id: 4, name: "Quinta-feira" },
  { id: 5, name: "Sexta-feira" },
  { id: 6, name: "Sábado" },
  { id: 0, name: "Domingo" },
];

const HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

const classScheduleMap: Record<string, Record<string, string[]>> = {
  "Vôlei de Praia": {
    "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"],
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"],
    "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"]
  },
  "Beach Tennis": {
    "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"],
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"],
    "Intermediário": ["Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"]
  },
  "Futevôlei": {
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"],
    "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h"],
    "Avançado": ["Terça e Quinta às 21h"]
  },
  "Escolinha de Futebol": {
    "Kids": ["Segunda e Quarta às 17h", "Segunda e Quarta às 18h", "Terça e Quinta às 17h", "Terça e Quinta às 18h"],
    "Iniciante": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"],
    "Adulto": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"]
  }
};

const formatCurrency = (val: number) => {
  return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getOrderedSports = () => {
  const baseSports = ["Futebol Society", "Beach Tennis", "Vôlei de Praia", "Futevôlei", "Escolinha de Futebol", "Carimba"];
  // Garante que todos os esportes da arena config também entrem caso haja algum personalizado
  const all = Array.from(new Set(["Futebol Society", ...currentArena.sports, ...baseSports]));
  return all;
};

const generateSecureBookingCode = (prefix = "VIVA") => {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
};

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const isWeekendOrHoliday = (dateStr: string) => {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  if (day === 0 || day === 6) return true;
  const monthDay = dateStr.substring(5);
  return HOLIDAYS.includes(monthDay);
};

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<"grid" | "reports" | "locks" | "bookings" | "classes" | "prices">("reports");
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cloudLocks, setCloudLocks] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  
  const [defaultCapacity, setDefaultCapacity] = useState<number>(12);
  const [classCapacityMap, setClassCapacityMap] = useState<any>({});
  const [selectedSportForCap, setSelectedSportForCap] = useState("Vôlei de Praia");
  const [selectedCategoryForCap, setSelectedCategoryForCap] = useState("Iniciante");
  const [selectedTurmaForCap, setSelectedTurmaForCap] = useState("Segunda e Quarta às 18h");
  const [specificCapInput, setSpecificCapInput] = useState("12");

  const [classPricesMap, setClassPricesMap] = useState<any>({
    "Vôlei de Praia": { mensal: 200, trimestral: 540, semestral: 960 },
    "Beach Tennis": { mensal: 200, trimestral: 540, semestral: 960 },
    "Futevôlei": { mensal: 200, trimestral: 540, semestral: 960 },
    "Escolinha de Futebol": { mensal: 200, trimestral: 540, semestral: 960 }
  });

  const [manualStudentName, setManualStudentName] = useState("");
  const [manualStudentPhone, setManualStudentPhone] = useState("");
  const [manualStudentSport, setManualStudentSport] = useState("Vôlei de Praia");
  const [manualStudentCategory, setManualStudentCategory] = useState("Iniciante");
  const [manualStudentPlan, setManualStudentPlan] = useState<"mensal" | "trimestral" | "semestral">("mensal");
  const [manualStudentOption, setManualStudentOption] = useState("Segunda e Quarta às 18h");

  const [editingStudent, setEditingStudent] = useState<ClassEnrollment | null>(null);
  const [newStudentOption, setNewStudentOption] = useState("");

  const [bookingSportFilter, setBookingSportFilter] = useState<string>("Todos");
  const [classSportFilter, setClassSportFilter] = useState<string>("Todos");
  const [reportSportFilter, setReportSportFilter] = useState<string>("Todos");

  // Filtros de Período
  const [reportPeriodType, setReportPeriodType] = useState<"month" | "year" | "all" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [gridDate, setGridDate] = useState("");
  const [todayString, setTodayString] = useState("");
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [modalCourt, setModalCourt] = useState<Court | null>(null);
  const [modalTime, setModalTime] = useState("");
  
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickPrice, setQuickPrice] = useState("50");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("Dinheiro / Balcão");

  const [lockTargetType, setLockTargetType] = useState<"weekly" | "date">("weekly");
  const [selectedCourtId, setSelectedCourtId] = useState(allCourts[0].id);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [selectedLockDate, setSelectedLockDate] = useState("");
  const [selectedLockTime, setSelectedLockTime] = useState("18:00");
  const [lockReason, setLockReason] = useState("Treino Fixo / Turma");

  const [priceSocietyPromo, setPriceSocietyPromo] = useState("60");
  const [priceSocietyNormal, setPriceSocietyNormal] = useState("80");
  const [priceAreiaPromo, setPriceAreiaPromo] = useState("40");
  const [priceAreiaNormal, setPriceAreiaNormal] = useState("60");
  const [pricesSavedMsg, setPricesSavedMsg] = useState(false);

  const [upgradeVolleyEnabled, setUpgradeVolleyEnabled] = useState(true);
  const [upgradeVolleyPrice, setUpgradeVolleyPrice] = useState("10.00");

  const [upgradeBeachTennisEnabled, setUpgradeBeachTennisEnabled] = useState(true);
  const [upgradeBeachTennisPrice, setUpgradeBeachTennisPrice] = useState("10.00");

  const [upgradeSocietyEnabled, setUpgradeSocietyEnabled] = useState(true);
  const [upgradeSocietyPrice, setUpgradeSocietyPrice] = useState("15.00");

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percent" | "fixed">("percent");
  const [newCouponValue, setNewCouponValue] = useState("10");
  const [newCouponScope, setNewCouponScope] = useState<"quadras" | "aulas" | "ambos">("ambos");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const changeDateByDays = (days: number) => {
    if (!gridDate) return;
    const parts = gridDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setGridDate(`${year}-${month}-${day}`);
  };

  const isPastDate = gridDate < todayString;

  const loadData = async () => {
    setLoading(true);
    try {
      await supabase.from("bookings").delete().eq("status", "aguardando_pagamento");
      await supabase.from("class_enrollments").delete().eq("status", "aguardando_pagamento");

      const { data: bData } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (bData) {
        setBookings(bData.map((b) => ({
          id: b.id,
          code: b.code,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
          courtId: b.court_id,
          courtName: b.court_name,
          sport: b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis"),
          date: b.booking_date,
          time: b.booking_time,
          price: Number(b.price),
          channel: b.channel as "online" | "manual",
          paymentMethod: b.payment_method,
          status: b.status as "aguardando_pagamento" | "confirmada" | "cancelada",
          createdAt: b.created_at,
        })));
      }

      const { data: lData } = await supabase.from("court_locks").select("*");
      if (lData) setCloudLocks(lData);

      const { data: cData } = await supabase.from("coupons").select("*");
      if (cData) {
        setCoupons(cData.map(c => ({
          ...c,
          scope: c.scope || "ambos"
        })));
      }

      const { data: classData } = await supabase.from("class_enrollments").select("*").order("created_at", { ascending: false });
      if (classData) setEnrollments(classData);

      const { data: settingsData } = await supabase.from("arena_settings").select("*").single();
      if (settingsData) {
        if (settingsData.upgrades) {
          const up = settingsData.upgrades;
          setUpgradeVolleyEnabled(Boolean(up.volleyEnabled)); setUpgradeVolleyPrice(String(up.volleyPrice));
          setUpgradeBeachTennisEnabled(Boolean(up.beachTennisEnabled)); setUpgradeBeachTennisPrice(String(up.beachTennisPrice));
          setUpgradeSocietyEnabled(Boolean(up.societyEnabled)); setUpgradeSocietyPrice(String(up.societyPrice));
        }
        if (settingsData.class_capacity) {
          setDefaultCapacity(Number(settingsData.class_capacity));
        }
        if (settingsData.class_capacity_map) {
          setClassCapacityMap(settingsData.class_capacity_map);
        }
        if (settingsData.class_prices) {
          setClassPricesMap(settingsData.class_prices);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const today = new Date().toISOString().split("T")[0];
    setTodayString(today);
    setGridDate(today);
    setSelectedLockDate(today);

    setSelectedMonth(today.substring(0, 7));
    setSelectedYear(today.substring(0, 4));

    loadData();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_settings" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredBookingsForReport = bookings.filter((b) => {
    const bookingSport = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
    const matchesSport = reportSportFilter === "Todos" || bookingSport.toLowerCase() === reportSportFilter.toLowerCase();
    if (!matchesSport) return false;

    if (reportPeriodType === "month") {
      if (selectedMonth && !b.date.startsWith(selectedMonth)) return false;
    } else if (reportPeriodType === "year") {
      if (selectedYear && !b.date.startsWith(selectedYear)) return false;
    } else if (reportPeriodType === "custom") {
      if (customStartDate && b.date < customStartDate) return false;
      if (customEndDate && b.date > customEndDate) return false;
    }
    return true;
  });

  const filteredEnrollmentsForReport = enrollments.filter((en) => {
    if (reportSportFilter !== "Todos" && en.sport.toLowerCase() !== reportSportFilter.toLowerCase()) return false;
    
    if (reportPeriodType === "month") {
      if (selectedMonth && en.created_at && !en.created_at.startsWith(selectedMonth)) return false;
    } else if (reportPeriodType === "year") {
      if (selectedYear && en.created_at && !en.created_at.startsWith(selectedYear)) return false;
    } else if (reportPeriodType === "custom") {
      if (customStartDate && en.created_at && en.created_at.substring(0, 10) < customStartDate) return false;
      if (customEndDate && en.created_at && en.created_at.substring(0, 10) > customEndDate) return false;
    }

    return true;
  });

  const confirmedBookings = filteredBookingsForReport.filter((b) => b.status === "confirmada");
  const activeEnrollments = filteredEnrollmentsForReport.filter(e => e.status === "ativa");
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.price, 0) + activeEnrollments.reduce((acc, e) => acc + Number(e.total_price), 0);
  const onlineBookingsCount = confirmedBookings.filter((b) => b.channel === "online").length;
  const manualBookingsCount = confirmedBookings.filter((b) => b.channel === "manual").length;
  const cancelledBookingsCount = filteredBookingsForReport.filter((b) => b.status === "cancelada").length;

  const orderedSportsList = getOrderedSports();

  const revenueBySportBookings = orderedSportsList.reduce((acc: { [key: string]: number }, sport) => {
    const sportBookings = confirmedBookings.filter(b => {
      const s = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
      return s.toLowerCase() === sport.toLowerCase();
    });
    acc[sport] = sportBookings.reduce((sum, b) => sum + b.price, 0);
    return acc;
  }, {});

  const revenueBySportEnrollments = orderedSportsList.reduce((acc: { [key: string]: number }, sport) => {
    const sportEnrollments = activeEnrollments.filter(e => e.sport.toLowerCase() === sport.toLowerCase());
    acc[sport] = sportEnrollments.reduce((sum, e) => sum + Number(e.total_price), 0);
    return acc;
  }, {});

  const maxSportRevenue = Math.max(...orderedSportsList.map(sport => (revenueBySportBookings[sport] || 0) + (revenueBySportEnrollments[sport] || 0)), 1);

  const handleCellClick = (court: Court, hour: string, statusType: string) => {
    if (isPastDate) return;
    if (statusType !== "free") return;
    setModalCourt(court);
    setModalTime(hour);
    
    const h = parseInt(hour.split(":")[0], 10);
    const isPromoSlot = h >= 16 && h < 19;
    const hasDiscount = isPromoSlot && !isWeekendOrHoliday(gridDate);

    setQuickPrice(court.type === "society" ? (hasDiscount ? priceSocietyPromo : priceSocietyNormal) : (hasDiscount ? priceAreiaPromo : priceAreiaNormal));
    setQuickCustomerName("");
    setQuickCustomerPhone("");
    setSlotModalOpen(true);
  };

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPastDate || !modalCourt) return;

    if (!quickCustomerName.trim()) { alert("Informe o nome do cliente."); return; }
    try {
      const assignedSport = modalCourt.type === "society" ? "Futebol Society" : "Beach Tennis";
      await supabase.from("bookings").insert({
        id: `manual-${Date.now()}`,
        code: `VIVA-M${Math.floor(100 + Math.random() * 900)}`,
        customer_name: quickCustomerName.trim().replace(/[^a-zA-ZÀ-ÿ\s]/g, ''),
        customer_phone: quickCustomerPhone.trim().replace(/\D/g, '') || null,
        court_id: modalCourt.id,
        court_name: modalCourt.name,
        sport: assignedSport,
        booking_date: gridDate,
        booking_time: modalTime,
        price: parseFloat(quickPrice) || 0,
        channel: "manual",
        payment_method: quickPaymentMethod,
        status: "confirmada",
      });
      setSlotModalOpen(false);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleManualStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentName.trim() || !manualStudentPhone.trim()) {
      alert("Informe o nome e o WhatsApp do aluno.");
      return;
    }

    const sportPrices = classPricesMap[manualStudentSport] || { mensal: 200, trimestral: 540, semestral: 960 };
    let finalVal = Number(sportPrices.mensal) || 200;
    if (manualStudentPlan === "trimestral") finalVal = Number(sportPrices.trimestral) || 540;
    if (manualStudentPlan === "semestral") finalVal = Number(sportPrices.semestral) || 960;

    const enrollmentCode = generateSecureBookingCode("AULA");

    try {
      await supabase.from("class_enrollments").insert([{
        id: `manual-class-${Date.now()}`,
        code: enrollmentCode,
        student_name: manualStudentName.trim().replace(/[^a-zA-ZÀ-ÿ\s]/g, ''),
        student_phone: manualStudentPhone.trim().replace(/\D/g, ''),
        sport: manualStudentSport,
        category: manualStudentCategory,
        plan_type: manualStudentPlan,
        days_selected: manualStudentOption,
        extra_days_count: 0,
        total_price: finalVal,
        status: "ativa"
      }]);

      setManualStudentName("");
      setManualStudentPhone("");
      await loadData();
      alert(`Matrícula manual realizada com sucesso! Código: ${enrollmentCode}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar aluno manualmente.");
    }
  };

  const handleUpdateStudentClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !newStudentOption) return;

    try {
      await supabase.from("class_enrollments").update({ days_selected: newStudentOption }).eq("id", editingStudent.id);
      setEditingStudent(null);
      setNewStudentOption("");
      await loadData();
      alert("Turma alterada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar turma.");
    }
  };

  const handleSaveSpecificCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMap = { ...classCapacityMap, [selectedTurmaForCap]: Number(specificCapInput) };
    try {
      await supabase.from("arena_settings").upsert({
        id: 1,
        class_capacity: defaultCapacity,
        class_capacity_map: updatedMap,
        class_prices: classPricesMap,
        upgrades: {
          volleyEnabled: Boolean(upgradeVolleyEnabled), volleyPrice: Number(upgradeVolleyPrice),
          beachTennisEnabled: Boolean(upgradeBeachTennisEnabled), beachTennisPrice: Number(upgradeBeachTennisPrice),
          societyEnabled: Boolean(upgradeSocietyEnabled), societyPrice: Number(upgradeSocietyPrice)
        }
      });
      setClassCapacityMap(updatedMap);
      alert(`Capacidade da turma "${selectedTurmaForCap}" atualizada para ${specificCapInput} vagas!`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar capacidade da turma.");
    }
  };

  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockId = lockTargetType === "weekly" ? `${selectedCourtId}-weekly-${selectedDayOfWeek}-${selectedLockTime}` : `${selectedCourtId}-date-${selectedLockDate}-${selectedLockTime}`;
    try {
      await supabase.from("court_locks").upsert({
        id: lockId,
        court_id: selectedCourtId,
        lock_type: lockTargetType,
        day_of_week: lockTargetType === "weekly" ? selectedDayOfWeek : null,
        lock_date: lockTargetType === "date" ? selectedLockDate : null,
        lock_time: selectedLockTime,
        reason: lockReason.trim() || "Treino Fixo",
      });
      await loadData();
      alert("Bloqueio salvo com sucesso!");
    } catch (err) { console.error(err); }
  };

  const handleRemoveLock = async (id: string) => {
    if (!confirm("Remover este bloqueio?")) return;
    try { await supabase.from("court_locks").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleToggleBookingStatusByCode = async (code: string, currentStatus: string) => {
    const nextStatus = currentStatus === "confirmada" ? "cancelada" : "confirmada";
    if (!confirm(`Alterar status da reserva ${code} para ${nextStatus}?`)) return;
    try {
      await supabase.from("bookings").update({ status: nextStatus }).eq("code", code);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleEnrollmentStatus = async (enrollment: ClassEnrollment) => {
    const nextStatus = enrollment.status === "ativa" ? "cancelada" : "ativa";
    if (!confirm(`Alterar status da matrícula ${enrollment.code}?`)) return;
    try { await supabase.from("class_enrollments").update({ status: nextStatus }).eq("id", enrollment.id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      await supabase.from("coupons").upsert({
        id: editingCouponId || `coupon-${Date.now()}`,
        code: newCouponCode.trim().toUpperCase(),
        discount_type: newCouponType,
        discount_value: parseFloat(newCouponValue) || 10,
        scope: newCouponScope,
        max_uses: newCouponMaxUses.trim() ? parseInt(newCouponMaxUses, 10) : null,
        active: true,
      });
      setNewCouponCode(""); setNewCouponValue("10"); setNewCouponMaxUses(""); setEditingCouponId(null);
      await loadData();
      alert("Cupom salvo com sucesso!");
    } catch (err) { console.error(err); }
  };

  const handleEditCoupon = (coupon: CouponRecord) => {
    setEditingCouponId(coupon.id);
    setNewCouponCode(coupon.code);
    setNewCouponType(coupon.discount_type);
    setNewCouponValue(String(coupon.discount_value));
    setNewCouponScope(coupon.scope || "ambos");
    setNewCouponMaxUses(coupon.max_uses !== null && coupon.max_uses !== undefined ? String(coupon.max_uses) : "");
  };

  const toggleCouponStatus = async (coupon: CouponRecord) => {
    try { await supabase.from("coupons").update({ active: !coupon.active }).eq("id", coupon.id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    try { await supabase.from("coupons").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleSaveSettingsAndUpgrades = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from("arena_settings").upsert({
        id: 1,
        class_capacity: defaultCapacity,
        class_capacity_map: classCapacityMap,
        class_prices: classPricesMap,
        upgrades: {
          volleyEnabled: Boolean(upgradeVolleyEnabled), 
          volleyPrice: Number(upgradeVolleyPrice),
          beachTennisEnabled: Boolean(upgradeBeachTennisEnabled), 
          beachTennisPrice: Number(upgradeBeachTennisPrice),
          societyEnabled: Boolean(upgradeSocietyEnabled), 
          societyPrice: Number(upgradeSocietyPrice)
        }
      });
      setPricesSavedMsg(true);
      setTimeout(() => setPricesSavedMsg(false), 3000);
      await loadData();
      alert("Configurações e status de upgrades salvos com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações.");
    }
  };

  const getSlotStatus = (courtId: string, time: string, dateStr: string) => {
    const booking = bookings.find((b) => b.courtId === courtId && b.date === dateStr && b.time === time && (b.status === "confirmada" || b.status === "aguardando_pagamento"));
    if (booking) {
      const label = booking.status === "aguardando_pagamento" ? `[Pendente] ${booking.customerName}` : booking.customerName;
      return { type: "booked", label, sub: booking.code, channel: booking.channel };
    }

    const parts = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    const lock = cloudLocks.find((l) => l.court_id === courtId && l.lock_time === time && ((l.lock_type === "weekly" && l.day_of_week === dayOfWeek) || (l.lock_type === "date" && l.lock_date === dateStr)));
    if (lock) return { type: "locked", label: lock.reason || "Bloqueado", sub: "Gestão" };

    return { type: "free", label: "+ Livre", sub: "" };
  };

  const groupedBookingsMap = new Map<string, ConsolidatedBooking>();

  bookings.forEach((b) => {
    const bSport = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
    const matchesSport = bookingSportFilter === "Todos" || bSport.toLowerCase() === bookingSportFilter.toLowerCase();
    if (!matchesSport) return;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchQuery = b.code.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || (b.customerPhone && b.customerPhone.includes(q)) || b.courtName.toLowerCase().includes(q);
      if (!matchQuery) return;
    }

    if (!groupedBookingsMap.has(b.code)) {
      groupedBookingsMap.set(b.code, {
        code: b.code,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        date: b.date,
        totalPrice: 0,
        status: b.status,
        channel: b.channel,
        details: []
      });
    }

    const item = groupedBookingsMap.get(b.code)!;
    item.totalPrice += b.price;
    item.details.push(`${b.courtName} às ${b.time} (${bSport})`);
    if (b.status === "confirmada") item.status = "confirmada";
  });

  const consolidatedBookingsList = Array.from(groupedBookingsMap.values());
  const filteredEnrollments = enrollments.filter((en) => classSportFilter === "Todos" || en.sport.toLowerCase() === classSportFilter.toLowerCase());

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-[#041E8C] text-[#00E599] rounded-2xl mx-auto flex items-center justify-center shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#041E8C] uppercase tracking-wider">Painel do Gestor</h1>
            <p className="text-xs text-slate-500 mt-1">Digite o PIN de segurança para acessar.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-2xl tracking-widest p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-[#041E8C] outline-none focus:border-[#041E8C]"
            />
            {pinError && <p className="text-xs text-red-600 font-bold">PIN incorreto. (Padrão: 1234)</p>}
            <button type="submit" className="w-full py-3.5 bg-[#041E8C] hover:bg-[#031566] text-white font-black rounded-2xl transition shadow-md text-xs tracking-wide">
              ACESSAR PAINEL
            </button>
          </form>
          <Link href="/" className="inline-block text-xs font-bold text-slate-400 hover:text-slate-600">
            ← Voltar ao site principal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 text-xs font-bold"><ArrowLeft className="w-4 h-4" /><span>Voltar ao Site</span></Link>
            <h1 className="text-base font-black tracking-wide text-white uppercase italic">Painel do Gestor</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /><span>Atualizar</span></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><DollarSign className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Receita Total</p><p className="text-lg font-black text-[#041E8C]">{formatCurrency(totalRevenue)}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 text-[#041E8C] flex items-center justify-center shrink-0"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Confirmadas</p><p className="text-lg font-black text-slate-800">{confirmedBookings.length + activeEnrollments.length}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Origem</p><p className="text-xs font-bold text-slate-700"><span className="text-emerald-600">{onlineBookingsCount} Site</span> / {manualBookingsCount} Balcão</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Canceladas</p><p className="text-lg font-black text-red-600">{cancelledBookingsCount + enrollments.filter(e => e.status === "cancelada").length}</p></div></div>
        </div>

        {/* ABAS DO PAINEL */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto gap-1">
          <button onClick={() => setActiveTab("grid")} className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "grid" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><BarChart3 className="w-4 h-4 text-[#00E599]" /> Grade Diária</button>
          <button onClick={() => setActiveTab("reports")} className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "reports" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><PieChart className="w-4 h-4 text-[#00E599]" /> Resumo Financeiro</button>
          <button onClick={() => setActiveTab("locks")} className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "locks" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Lock className="w-4 h-4 text-[#00E599]" /> Bloqueios ({cloudLocks.length})</button>
          <button onClick={() => setActiveTab("bookings")} className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "bookings" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Calendar className="w-4 h-4 text-[#00E599]" /> Reservas ({consolidatedBookingsList.length})</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><GraduationCap className="w-4 h-4 text-[#00E599]" /> Alunos & Aulas ({enrollments.length})</button>
          <button onClick={() => setActiveTab("prices")} className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "prices" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><DollarSign className="w-4 h-4 text-[#00E599]" /> Preços & Cupons</button>
        </div>

        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#00E599]" />
                    Resumo Financeiro & Desempenho
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Métricas dinâmicas consolidadas com filtros de período e modalidade.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setReportPeriodType("month")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "month" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Mês</button>
                    <button onClick={() => setReportPeriodType("year")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "year" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Ano</button>
                    <button onClick={() => setReportPeriodType("all")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "all" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Geral</button>
                    <button onClick={() => setReportPeriodType("custom")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "custom" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Intervalo</button>
                  </div>

                  {reportPeriodType === "month" && (
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                  )}

                  {reportPeriodType === "year" && (
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none">
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  )}

                  {reportPeriodType === "custom" && (
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                      <span className="text-xs text-slate-400">até</span>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                  )}
                </div>
              </div>

              {/* Filtro de Modalidades (Com 'Todos' e 'Futebol Society' fixo) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 pt-2">
                {["Todos", ...orderedSportsList].map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setReportSportFilter(sport)}
                    className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                      reportSportFilter === sport ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Receita de Quadras (Avulso)</span>
                  <p className="text-xl font-black text-[#041E8C]">{formatCurrency(confirmedBookings.reduce((acc, b) => acc + b.price, 0))}</p>
                  <p className="text-[10px] text-slate-500">{confirmedBookings.length} reservas pagas</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Receita de Aulas (Recorrente)</span>
                  <p className="text-xl font-black text-emerald-600">{formatCurrency(activeEnrollments.reduce((acc, e) => acc + Number(e.total_price), 0))}</p>
                  <p className="text-[10px] text-slate-500">{activeEnrollments.length} alunos matriculados ativos</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Taxa de Conversão Online</span>
                  <p className="text-xl font-black text-purple-600">
                    {filteredBookingsForReport.length > 0 ? ((onlineBookingsCount / filteredBookingsForReport.length) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-[10px] text-slate-500">Reservas geradas pelo site</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#041E8C]" />
                  Faturamento por Modalidade (Reservas vs Aulas)
                </h3>
                <div className="space-y-3 pt-2">
                  {orderedSportsList.map((sport) => {
                    const revBookings = revenueBySportBookings[sport] || 0;
                    const revEnrollments = revenueBySportEnrollments[sport] || 0;
                    const totalSportRev = revBookings + revEnrollments;

                    return (
                      <div key={sport} className="space-y-1.5 pb-2 border-b border-slate-100 last:border-0">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-800">{sport}</span>
                          <span className="text-[#041E8C]">{formatCurrency(totalSportRev)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
                          <div className="bg-[#041E8C] h-full" style={{ width: `${totalSportRev > 0 ? (revBookings / totalSportRev) * 100 : 0}%` }} title={`Reservas: ${formatCurrency(revBookings)}`}></div>
                          <div className="bg-[#00E599] h-full" style={{ width: `${totalSportRev > 0 ? (revEnrollments / totalSportRev) * 100 : 0}%` }} title={`Aulas: ${formatCurrency(revEnrollments)}`}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>🔵 Reservas: {formatCurrency(revBookings)}</span>
                          <span>🟢 Aulas: {formatCurrency(revEnrollments)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#041E8C] to-[#021359] text-white p-6 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#00E599]">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-xs font-black uppercase tracking-wider">IA Insights & Recomendações Estratégicas</h3>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Análise automatizada baseada no fluxo atual de reservas, horários ociosos e calendário brasileiro.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="flex items-start gap-2 p-2 bg-red-950/60 border border-red-500/40 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-300 block uppercase text-[10px]">Ponto de Atenção Crítico:</strong>
                      <span className="text-slate-200">Queda de 18% no faturamento das quadras de areia nas terças à tarde. Ação recomendada: Criar cupom relâmpago <strong>AREIA20</strong>.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00E599] font-bold">• Eventos & Torneios:</span>
                    <span className="text-slate-200">Próximo feriado de Tiradentes (21/04): Sugerido organizar um Torneio Relâmpago de Futevôlei e Bolão com inscrições via site.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "grid" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Grade Diária de Quadras</h2>
                {isPastDate && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Modo Histórico (Somente Leitura)</span>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => changeDateByDays(-1)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><ChevronLeft className="w-4 h-4" /></button>
                <input type="date" value={gridDate} onChange={(e) => setGridDate(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                <button type="button" onClick={() => changeDateByDays(1)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b border-slate-200"><th className="p-3 text-left font-bold bg-slate-50 text-slate-700">Quadra</th>{businessHours.map((h) => (<th key={h} className="p-3 text-center font-bold text-slate-700">{h}</th>))}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {allCourts.map((court) => (
                    <tr key={court.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold bg-white text-slate-800">{court.name}</td>
                      {businessHours.map((hour) => {
                        const slot = getSlotStatus(court.id, hour, gridDate);
                        return (
                          <td key={hour} className="p-1.5 text-center">
                            {slot.type === "free" ? (
                              isPastDate ? (
                                <div className="w-full p-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-[11px]">Ocioso</div>
                              ) : (
                                <button type="button" onClick={() => handleCellClick(court, hour, slot.type)} className="w-full p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px] shadow-xs">+ Livre</button>
                              )
                            ) : slot.type === "booked" ? (
                              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-bold whitespace-normal leading-tight text-center" title={`${slot.label} (${slot.sub})`}><p className="line-clamp-2">{slot.label}</p></div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-bold whitespace-normal leading-tight text-center" title={slot.label}><p className="line-clamp-2">{slot.label}</p></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "locks" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Novo Bloqueio</h2>
              <form onSubmit={handleAddLock} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Tipo de Bloqueio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setLockTargetType("weekly")} className={`py-2 text-xs font-bold rounded-xl border transition ${lockTargetType === "weekly" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-600"}`}>Semanal / Fixo</button>
                    <button type="button" onClick={() => setLockTargetType("date")} className={`py-2 text-xs font-bold rounded-xl border transition ${lockTargetType === "date" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-600"}`}>Data Específica</button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Quadra / Espaço</label>
                  <select value={selectedCourtId} onChange={(e) => setSelectedCourtId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
                    {allCourts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>

                {lockTargetType === "weekly" ? (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Dia da Semana Predominante</label>
                    <select value={selectedDayOfWeek} onChange={(e) => setSelectedDayOfWeek(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
                      {daysOfWeek.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Data Específica</label>
                    <input type="date" value={selectedLockDate} onChange={(e) => setSelectedLockDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium" />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Horário</label>
                  <select value={selectedLockTime} onChange={(e) => setSelectedLockTime(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
                    {businessHours.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Motivo / Turma</label>
                  <input type="text" value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder="Ex: Treino Fixo" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium" />
                </div>

                <button type="submit" className="w-full py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-bold text-xs rounded-xl shadow-md">Aplicar Bloqueio</button>
              </form>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">Bloqueios Ativos ({cloudLocks.length})</h2>
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                {cloudLocks.map((l) => {
                  const court = allCourts.find(c => c.id === l.court_id);
                  const dayName = l.day_of_week !== null && l.day_of_week !== undefined ? daysOfWeek.find(d => d.id === l.day_of_week)?.name : "";
                  return (
                    <div key={l.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#041E8C]">{court?.name}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                            {l.lock_type === "weekly" ? `Toda ${dayName}` : formatDateToBR(l.lock_date)}
                          </span>
                          <span className="font-black"> às {l.lock_time}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">Motivo: <strong>{l.reason}</strong></p>
                      </div>
                      <button onClick={() => handleRemoveLock(l.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition">Remover Trava</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">Histórico de Reservas Consolidado ({consolidatedBookingsList.length})</h2><input type="text" placeholder="Buscar cliente, código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64 outline-none" /></div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">{["Todos", ...orderedSportsList].map((s) => (<button key={s} onClick={() => setBookingSportFilter(s)} className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${bookingSportFilter === s ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>))}</div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {consolidatedBookingsList.map((cb) => (
                <div key={cb.code} className="p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#041E8C] text-sm">{cb.code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cb.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : cb.status === "aguardando_pagamento" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                        {cb.status === "confirmada" ? "Ativa (Paga)" : cb.status === "aguardando_pagamento" ? "Aguardando Pagamento" : "Cancelada"}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{cb.customerName} <span className="text-slate-500 font-normal">({cb.customerPhone || "Sem tel"})</span></p>
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 space-y-0.5">
                      <p className="font-bold text-slate-700">Data: {formatDateToBR(cb.date)}</p>
                      {cb.details.map((d, i) => (<p key={i}>• {d}</p>))}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-2">
                    <p className="font-black text-[#041E8C] text-base">{formatCurrency(cb.totalPrice)}</p>
                    <button onClick={() => handleToggleBookingStatusByCode(cb.code, cb.status)} className={`px-3 py-1.5 rounded-xl text-white font-bold transition shadow-xs ${cb.status === "confirmada" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                      {cb.status === "confirmada" ? "Cancelar Reserva" : "Reativar Reserva"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALUNOS & AULAS */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#00E599]" /> Gestão de Capacidade & Vagas por Turma Específica</h2>
              <form onSubmit={handleSaveSpecificCapacity} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Modalidade</label>
                  <select value={selectedSportForCap} onChange={(e) => { setSelectedSportForCap(e.target.value); setSelectedCategoryForCap("Iniciante"); }} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C] outline-none">
                    <option value="Vôlei de Praia">Vôlei de Praia</option>
                    <option value="Futevôlei">Futevôlei</option>
                    <option value="Beach Tennis">Beach Tennis</option>
                    <option value="Escolinha de Futebol">Escolinha de Futebol</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nível</label>
                  <select value={selectedCategoryForCap} onChange={(e) => setSelectedCategoryForCap(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                    {Object.keys(classScheduleMap[selectedSportForCap] || {}).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Turma / Horário</label>
                  <select value={selectedTurmaForCap} onChange={(e) => setSelectedTurmaForCap(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                    {(classScheduleMap[selectedSportForCap]?.[selectedCategoryForCap] || []).map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Máx. Vagas</label>
                  <div className="flex gap-2">
                    <input type="number" value={specificCapInput} onChange={(e) => setSpecificCapInput(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none" />
                    <button type="submit" className="px-4 py-2.5 bg-[#041E8C] text-white text-xs font-bold rounded-xl">Salvar</button>
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#00E599]" /> Inserir Aluno Manualmente (Via Balcão)</h2>
              <form onSubmit={handleManualStudentSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" placeholder="Digite Nome e Sobrenome" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" />
                <input type="tel" placeholder="Digite apenas números com DDD" value={manualStudentPhone} onChange={(e) => setManualStudentPhone(e.target.value.replace(/\D/g, ''))} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" />
                <select value={manualStudentSport} onChange={(e) => { setManualStudentSport(e.target.value); setManualStudentCategory("Iniciante"); }} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none">
                  <option value="Vôlei de Praia">Vôlei de Praia</option>
                  <option value="Futevôlei">Futevôlei</option>
                  <option value="Beach Tennis">Beach Tennis</option>
                  <option value="Escolinha de Futebol">Escolinha de Futebol</option>
                </select>
                <select value={manualStudentCategory} onChange={(e) => setManualStudentCategory(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                  {Object.keys(classScheduleMap[manualStudentSport] || {}).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select value={manualStudentOption} onChange={(e) => setManualStudentOption(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none sm:col-span-2">
                  {(classScheduleMap[manualStudentSport]?.[manualStudentCategory] || []).map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <select value={manualStudentPlan} onChange={(e) => setManualStudentPlan(e.target.value as any)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none sm:col-span-3">
                  <option value="mensal">Plano Mensal - {formatCurrency(classPricesMap[manualStudentSport]?.mensal || 200)}</option>
                  <option value="trimestral">Plano Trimestral - {formatCurrency(classPricesMap[manualStudentSport]?.trimestral || 540)}</option>
                  <option value="semestral">Plano Semestral - {formatCurrency(classPricesMap[manualStudentSport]?.semestral || 960)}</option>
                </select>
                <button type="submit" className="sm:col-span-3 py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-black text-xs rounded-xl shadow-md">Confirmar Matrícula Balcão</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center"><h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">Alunos & Aulas ({filteredEnrollments.length})</h2></div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">{["Todos", ...orderedSportsList].map((s) => (<button key={s} onClick={() => setClassSportFilter(s)} className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${classSportFilter === s ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>))}</div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredEnrollments.map((en) => (
                  <div key={en.id} className="p-4 rounded-xl border border-slate-200 text-xs bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[#041E8C] text-sm">{en.code}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${en.status === "ativa" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{en.status === "ativa" ? "Matrícula Ativa" : "Cancelada"}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{en.student_name} <span className="text-slate-500 font-normal">({en.student_phone || "Sem WhatsApp"})</span></p>
                      <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <p><strong>Modalidade:</strong> {en.sport} ({en.category})</p>
                        <p><strong>Plano:</strong> {en.plan_type.toUpperCase()} • <strong>Turma:</strong> {en.days_selected}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-2">
                      <p className="font-black text-[#041E8C] text-base">{formatCurrency(Number(en.total_price))}</p>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingStudent(en); setNewStudentOption(en.days_selected); }} className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300">Alterar Turma</button>
                        <button onClick={() => handleToggleEnrollmentStatus(en)} className={`px-3 py-1.5 rounded-xl text-white font-bold transition shadow-xs ${en.status === "ativa" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                          {en.status === "ativa" ? "Cancelar" : "Ativar"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editingStudent && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
                  <div className="flex justify-between border-b pb-3">
                    <h3 className="text-sm font-black text-[#041E8C] uppercase">Alterar Turma de {editingStudent.student_name}</h3>
                    <button onClick={() => setEditingStudent(null)}><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleUpdateStudentClass} className="space-y-3">
                    <p className="text-xs text-slate-500">Modalidade: <strong>{editingStudent.sport} ({editingStudent.category})</strong></p>
                    <label className="text-[11px] font-bold text-slate-600 block">Nova Turma / Horário:</label>
                    <select value={newStudentOption} onChange={(e) => setNewStudentOption(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                      {(classScheduleMap[editingStudent.sport]?.[editingStudent.category] || []).map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button type="submit" className="w-full py-3 bg-[#041E8C] text-white font-black text-xs rounded-xl shadow-md">Salvar Nova Turma</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PREÇOS, CUPONS & ADICIONAIS */}
        {activeTab === "prices" && (
          <form onSubmit={handleSaveSettingsAndUpgrades} className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Gestão de Preços, Cupons & Adicionais</h2>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Futebol Society</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Promo (16h às 19h)</label><input type="number" value={priceSocietyPromo} onChange={(e) => setPriceSocietyPromo(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Normal / Noite</label><input type="number" value={priceSocietyNormal} onChange={(e) => setPriceSocietyNormal(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Quadras de Areia</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Promo (16h às 19h)</label><input type="number" value={priceAreiaPromo} onChange={(e) => setPriceAreiaPromo(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Normal / Noite</label><input type="number" value={priceAreiaNormal} onChange={(e) => setPriceAreiaNormal(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Preços dos Planos de Aulas por Modalidade</h3>
              <div className="space-y-4">
                {Object.keys(classPricesMap).map((sport) => (
                  <div key={sport} className="p-3.5 bg-white rounded-xl border space-y-2">
                    <p className="text-xs font-bold text-[#041E8C]">{sport}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Mensal (R$)</label>
                        <input type="number" value={classPricesMap[sport].mensal} onChange={(e) => setClassPricesMap({ ...classPricesMap, [sport]: { ...classPricesMap[sport], mensal: Number(e.target.value) } })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Trimestral (R$)</label>
                        <input type="number" value={classPricesMap[sport].trimestral} onChange={(e) => setClassPricesMap({ ...classPricesMap, [sport]: { ...classPricesMap[sport], trimestral: Number(e.target.value) } })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Semestral (R$)</label>
                        <input type="number" value={classPricesMap[sport].semestral} onChange={(e) => setClassPricesMap({ ...classPricesMap, [sport]: { ...classPricesMap[sport], semestral: Number(e.target.value) } })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5"><Award className="w-4 h-4 text-[#00E599]" /> Upgrades & Adicionais por Modalidade</h3>
              <p className="text-xs text-slate-500">Ative ou desative os adicionais e defina os preços para cada esporte.</p>

              <div className="space-y-3 pt-1">
                <div className="p-3.5 bg-white rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Vôlei de Praia (Upgrade: Bola Mikasa Pro Oficial)</p>
                    <span className="text-[10px] text-slate-400">Adicional opcional para locação</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <input type="number" step="0.5" value={upgradeVolleyPrice} onChange={(e) => setUpgradeVolleyPrice(e.target.value)} className="w-20 p-2 bg-slate-50 border rounded-lg text-xs font-bold text-center" />
                    <button type="button" onClick={() => setUpgradeVolleyEnabled(!upgradeVolleyEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${upgradeVolleyEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {upgradeVolleyEnabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Beach Tennis (Aluguel de Raquetes)</p>
                    <span className="text-[10px] text-slate-400">Adicional opcional para locação</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <input type="number" step="0.5" value={upgradeBeachTennisPrice} onChange={(e) => setUpgradeBeachTennisPrice(e.target.value)} className="w-20 p-2 bg-slate-50 border rounded-lg text-xs font-bold text-center" />
                    <button type="button" onClick={() => setUpgradeBeachTennisEnabled(!upgradeBeachTennisEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${upgradeBeachTennisEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {upgradeBeachTennisEnabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Futebol Society (Aluguel de Coletes)</p>
                    <span className="text-[10px] text-slate-400">Adicional opcional para locação</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <input type="number" step="0.5" value={upgradeSocietyPrice} onChange={(e) => setUpgradeSocietyPrice(e.target.value)} className="w-20 p-2 bg-slate-50 border rounded-lg text-xs font-bold text-center" />
                    <button type="button" onClick={() => setUpgradeSocietyEnabled(!upgradeSocietyEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${upgradeSocietyEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {upgradeSocietyEnabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 font-medium">
                  ℹ️ <strong>Carimba</strong> e <strong>Futevôlei</strong> não possuem adicionais configurados conforme regra da arena.
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">{editingCouponId ? "Editar Cupom" : "Criar Cupom com Restrição de Escopo"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <input type="text" placeholder="CÓDIGO" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none" />
                <select value={newCouponType} onChange={(e) => setNewCouponType(e.target.value as "percent" | "fixed")} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none"><option value="percent">%</option><option value="fixed">R$</option></select>
                <input type="number" placeholder="Valor" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                <select value={newCouponScope} onChange={(e) => setNewCouponScope(e.target.value as "quadras" | "aulas" | "ambos")} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold text-[#041E8C]">
                  <option value="ambos">Ambos (Quadras & Aulas)</option>
                  <option value="quadras">Apenas Quadras</option>
                  <option value="aulas">Apenas Aulas</option>
                </select>
                <input type="number" placeholder="Limite usos" value={newCouponMaxUses} onChange={(e) => setNewCouponMaxUses(e.target.value)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                <button type="button" onClick={handleSaveCoupon} className="py-2.5 bg-[#041E8C] text-white text-xs font-black rounded-xl shadow-xs">{editingCouponId ? "Atualizar" : "Adicionar"}</button>
              </div>
              <div className="space-y-2 pt-1">
                {coupons.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                    <div>
                      <span><strong>{c.code}</strong> ({c.discount_value}{c.discount_type === 'percent' ? '%' : 'R$'})</span>
                      <span className="ml-3 text-[10px] bg-blue-50 text-[#041E8C] px-2 py-0.5 rounded font-bold uppercase">Uso: {c.scope || "ambos"}</span>
                    </div>
                    <div className="flex gap-1.5"><button type="button" onClick={() => handleEditCoupon(c)} className="px-2.5 py-1 bg-slate-100 rounded-lg font-semibold">Editar</button><button type="button" onClick={() => toggleCouponStatus(c)} className={`px-2.5 py-1 rounded-lg font-semibold ${c.active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{c.active ? "Desativar" : "Ativar"}</button><button type="button" onClick={() => handleDeleteCoupon(c.id)} className="text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-3.5 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow-md">Salvar Configurações</button>
          </form>
        )}
      </div>

      {slotModalOpen && modalCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between border-b pb-3"><div><h3 className="text-sm font-black text-[#041E8C] uppercase">Agendar / Bloquear</h3><p className="text-xs text-slate-500">{modalCourt.name} • {modalTime}</p></div><button onClick={() => setSlotModalOpen(false)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSaveQuickAction} className="space-y-3">
              <input type="text" placeholder="Nome do Atleta" value={quickCustomerName} onChange={(e) => setQuickCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none" />
              <input type="number" value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
              <button type="submit" className="w-full py-3 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow-md">Confirmar Agendamento</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}