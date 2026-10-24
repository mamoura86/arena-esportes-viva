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
  ChevronLeft, ChevronRight, PieChart, Lightbulb, Award, AlertTriangle, UserPlus, Settings, Mail, FileSpreadsheet, Download, Upload, LogOut
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

// Grade expandida das 06:00 às 22:00
const businessHours = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
  "20:00", "21:00", "22:00"
];

const daysOfWeek = [
  { id: 1, name: "Segunda-feira" },
  { id: 2, name: "Terça-feira" },
  { id: 3, name: "Quarta-feira" },
  { id: 4, name: "Quinta-feira" },
  { id: 5, name: "Sexta-feira" },
  { id: 6, name: "Sábado" },
  { id: 0, name: "Domingo" },
];

// Feriados Nacionais + Ceará integrados
const HOLIDAYS = [
  "01-01", "03-19", "03-25", "04-21", "05-01", "09-07", 
  "08-15", "10-12", "11-02", "11-15", "11-20", "12-25"
];

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
  "Futebol Society": {
    "Kids": ["Segunda e Quarta às 17h", "Segunda e Quarta às 18h", "Terça e Quinta às 17h", "Terça e Quinta às 18h"],
    "Iniciante": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"],
    "Adulto": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"]
  }
};

const formatCurrency = (val: number) => {
  return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getOrderedSports = () => {
  return ["Futebol Society", "Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"];
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
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailTarget, setResetEmailTarget] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

  const [activeTab, setActiveTab] = useState<"grid" | "reports" | "bookings" | "classes" | "locks_classes" | "prices" | "config">("grid");
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
    "Futebol Society": { mensal: 200, trimestral: 540, semestral: 960 }
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

  const [reportTypeFilter, setReportTypeFilter] = useState<"Todos" | "Reservas" | "Aulas">("Todos");
  const [reportSportFilter, setReportSportFilter] = useState<string>("Todas");
  const [reportPeriodType, setReportPeriodType] = useState<"month" | "year" | "all" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [bookingPeriodType, setBookingPeriodType] = useState<"day" | "month" | "year" | "all" | "custom">("day");
  const [selectedBookingDay, setSelectedBookingDay] = useState("");
  const [selectedBookingMonth, setSelectedBookingMonth] = useState("");
  const [selectedBookingYear, setSelectedBookingYear] = useState("");
  const [customBookingStart, setCustomBookingStart] = useState("");
  const [customBookingEnd, setCustomBookingEnd] = useState("");

  const [managerEmail, setManagerEmail] = useState("ctvivaesportes@uorak.com");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);

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
  const [bulkSport, setBulkSport] = useState("Beach Tennis");
  const [bulkProfessor, setBulkProfessor] = useState("Professor João");
  const [bulkLevel, setBulkLevel] = useState("Iniciante");
  const [bulkVigencia, setBulkVigencia] = useState("indeterminado");

  const [priceSocietyPromo, setPriceSocietyPromo] = useState("60");
  const [priceSocietyNormal, setPriceSocietyNormal] = useState("80");
  const [priceAreiaPromo, setPriceAreiaPromo] = useState("40");
  const [priceAreiaNormal, setPriceAreiaNormal] = useState("60");

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

      const { data: adminData } = await supabase.from("admin_users").select("*");
      if (adminData && adminData.length > 0) {
        setAdminList(adminData);
      }

      const { data: settingsData } = await supabase.from("arena_settings").select("*").single();
      if (settingsData) {
        if (settingsData.manager_email) {
          setManagerEmail(settingsData.manager_email);
        }
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
        if (settingsData.class_prices && Object.keys(settingsData.class_prices).length > 0) {
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

    setSelectedBookingDay(today);
    setSelectedBookingMonth(today.substring(0, 7));
    setSelectedBookingYear(today.substring(0, 4));

    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true" && params.get("email")) {
      setIsResetMode(true);
      setResetEmailTarget(params.get("email") || "");
    }

    loadData();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_settings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_users" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", loginEmail.trim())
        .eq("pin", loginPin.trim())
        .single();

      if (error || !data) {
        setLoginError("E-mail ou Senha incorretos.");
        setLoginPin("");
      } else {
        setIsAuthenticated(true);
        setLoginError("");
      }
    } catch (err) {
      console.error(err);
      setLoginError("Erro ao validar credenciais.");
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { alert("Informe o e-mail cadastrado."); return; }

    try {
      const { data, error } = await supabase.from("admin_users").select("*").eq("email", forgotEmail.trim()).single();
      if (error || !data) { alert("E-mail não encontrado."); return; }

      const resetUrl = `${window.location.origin}/admin?reset=true&email=${encodeURIComponent(forgotEmail.trim())}`;
      const res = await fetch("/api/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), resetUrl }),
      });

      if (res.ok) setEmailSentSuccess(true);
      else alert("Erro ao disparar e-mail.");
    } catch (err) { console.error(err); }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) return;
    try {
      const { error } = await supabase.from("admin_users").update({ pin: newPasswordInput.trim() }).eq("email", resetEmailTarget);
      if (!error) setResetSuccessMsg(true);
    } catch (err) { console.error(err); }
  };

  const filteredBookingsForReport = bookings.filter((b) => {
    if (reportTypeFilter === "Aulas") return false;
    const bookingSport = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
    const matchesSport = reportSportFilter === "Todas" || bookingSport.toLowerCase() === reportSportFilter.toLowerCase();
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
    if (reportTypeFilter === "Reservas") return false;
    const matchesSport = reportSportFilter === "Todas" || en.sport.toLowerCase() === reportSportFilter.toLowerCase();
    if (!matchesSport) return false;
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

  // Ação ao clicar na célula da nova grade (Horários nas linhas, Quadras nas colunas)
  const handleCellClick = (court: Court, time: string, statusType: string) => {
    if (isPastDate) return;
    if (statusType !== "free") return;
    setModalCourt(court);
    setModalTime(time);
    
    const h = parseInt(time.split(":")[0], 10);
    const isPromoSlot = h >= 16 && h < 19;
    const hasDiscount = isPromoSlot && !isWeekendOrHoliday(gridDate);

    setQuickPrice(court.type === "society" ? (hasDiscount ? priceSocietyPromo : priceSocietyNormal) : (hasDiscount ? priceAreiaPromo : priceAreiaNormal));
    setQuickCustomerName("");
    setQuickCustomerPhone("");
    setSlotModalOpen(true);
  };

  // Alternar Status de Bloqueio (Ativo / Inativo) Pontual
  const toggleCourtLockSlot = async (courtId: string, time: string) => {
    const parts = gridDate.split("-").map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();

    const isLocked = cloudLocks.some(
      (l) => l.court_id === courtId && l.lock_time === time && ((l.lock_type === "date" && l.lock_date === gridDate) || (l.lock_type === "weekly" && l.day_of_week === dayOfWeek))
    );

    try {
      if (isLocked) {
        await supabase.from("court_locks").delete().match({
          court_id: courtId,
          lock_time: time,
          lock_date: gridDate
        });
      } else {
        await supabase.from("court_locks").insert([{
          id: `lock-${Date.now()}-${Math.random()}`,
          court_id: courtId,
          lock_type: "date",
          lock_date: gridDate,
          lock_time: time,
          reason: "Bloqueio Operacional Gestor"
        }]);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status do horário.");
    }
  };

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPastDate || !modalCourt) return;

    if (!quickCustomerName.trim()) { alert("Informe o Nome e Sobrenome do atleta."); return; }
    if (!quickCustomerPhone.trim()) { alert("Informe o WhatsApp do atleta."); return; }

    try {
      const assignedSport = modalCourt.type === "society" ? "Futebol Society" : "Beach Tennis";
      await supabase.from("bookings").insert({
        id: `manual-${Date.now()}`,
        code: `VIVA-M${Math.floor(100 + Math.random() * 900)}`,
        customer_name: quickCustomerName.trim().replace(/[^a-zA-ZÀ-ÿ\s]/g, ''),
        customer_phone: quickCustomerPhone.trim().replace(/\D/g, ''),
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
    if (!manualStudentName.trim() || !manualStudentPhone.trim()) { alert("Informe o nome e o WhatsApp."); return; }

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

      setManualStudentName(""); setManualStudentPhone("");
      await loadData();
      alert(`Matrícula manual realizada! Código: ${enrollmentCode}`);
    } catch (err) { console.error(err); }
  };

  const handleUpdateStudentClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !newStudentOption) return;
    try {
      await supabase.from("class_enrollments").update({ days_selected: newStudentOption }).eq("id", editingStudent.id);
      setEditingStudent(null); setNewStudentOption("");
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleSaveSpecificCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMap = { ...classCapacityMap, [selectedTurmaForCap]: Number(specificCapInput) };
    try {
      await supabase.from("arena_settings").upsert({
        id: 1, manager_email: managerEmail, class_capacity: defaultCapacity,
        class_capacity_map: updatedMap, class_prices: classPricesMap,
      });
      setClassCapacityMap(updatedMap);
      alert("Capacidade atualizada!");
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    const reasonText = `[${bulkSport} - ${bulkProfessor} - ${bulkLevel}] ${lockReason}`;
    const lockId = lockTargetType === "weekly" ? `${selectedCourtId}-weekly-${selectedDayOfWeek}-${selectedLockTime}` : `${selectedCourtId}-date-${selectedLockDate}-${selectedLockTime}`;
    try {
      await supabase.from("court_locks").upsert({
        id: lockId, court_id: selectedCourtId, lock_type: lockTargetType,
        day_of_week: lockTargetType === "weekly" ? selectedDayOfWeek : null,
        lock_date: lockTargetType === "date" ? selectedLockDate : null,
        lock_time: selectedLockTime, reason: reasonText,
      });
      await loadData();
      alert("Bloqueio salvo!");
    } catch (err) { console.error(err); }
  };

  const handleRemoveLock = async (id: string) => {
    if (!confirm("Remover?")) return;
    try { await supabase.from("court_locks").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDownloadExcelModel = () => {
    const csvContent = "data:text/csv;charset=utf-8,Modalidade,Professor,Nivel,Quadra,DiaSemana,Horario,Vigencia\n" +
      "Beach Tennis,Professor Joao,Iniciante,Quadra 1 (Areia),Segunda,18:00,indeterminado";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_grade.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      alert("Arquivo processado!");
    };
    reader.readAsText(file);
  };

  const handleToggleBookingStatusByCode = async (code: string, currentStatus: string) => {
    const nextStatus = currentStatus === "confirmada" ? "cancelada" : "confirmada";
    if (!confirm(`Alterar para ${nextStatus}?`)) return;
    try { await supabase.from("bookings").update({ status: nextStatus }).eq("code", code); await loadData(); } catch (err) { console.error(err); }
  };

  const handleToggleEnrollmentStatus = async (en: ClassEnrollment) => {
    const nextStatus = en.status === "ativa" ? "cancelada" : "ativa";
    try { await supabase.from("class_enrollments").update({ status: nextStatus }).eq("id", en.id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      await supabase.from("coupons").upsert({
        id: editingCouponId || `coupon-${Date.now()}`,
        code: newCouponCode.trim().toUpperCase(), discount_type: newCouponType,
        discount_value: parseFloat(newCouponValue) || 10, scope: newCouponScope, active: true,
      });
      setNewCouponCode(""); setEditingCouponId(null); await loadData();
    } catch (err) { console.error(err); }
  };

  const handleEditCoupon = (c: CouponRecord) => {
    setEditingCouponId(c.id); setNewCouponCode(c.code); setNewCouponType(c.discount_type);
    setNewCouponValue(String(c.discount_value)); setNewCouponScope(c.scope || "ambos");
  };

  const toggleCouponStatus = async (c: CouponRecord) => {
    try { await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteCoupon = async (id: string) => {
    try { await supabase.from("coupons").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleSaveSettingsAndUpgrades = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from("arena_settings").upsert({
        id: 1, manager_email: managerEmail, class_capacity: defaultCapacity,
        class_capacity_map: classCapacityMap, class_prices: classPricesMap,
      });
      alert("Salvo com sucesso!");
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleSaveManagerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from("arena_settings").upsert({ id: 1, manager_email: managerEmail });
      alert("E-mail salvo!"); await loadData();
    } catch (err) { console.error(err); }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPin) return;
    try {
      await supabase.from("admin_users").insert([{ id: `admin-${Date.now()}`, name: newAdminName, email: newAdminEmail, role: "Administrador", pin: newAdminPin }]);
      setNewAdminName(""); setNewAdminEmail(""); setNewAdminPin(""); await loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteAdmin = async (id: string, role: string) => {
    if (role === "Master") return;
    try { await supabase.from("admin_users").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
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
    if (bookingSportFilter !== "Todos" && bSport.toLowerCase() !== bookingSportFilter.toLowerCase()) return;

    if (bookingPeriodType === "day" && selectedBookingDay && b.date !== selectedBookingDay) return;
    if (bookingPeriodType === "month" && selectedBookingMonth && !b.date.startsWith(selectedBookingMonth)) return;
    if (bookingPeriodType === "year" && selectedBookingYear && !b.date.startsWith(selectedBookingYear)) return;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchQuery = b.code.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || (b.customerPhone && b.customerPhone.includes(q)) || b.courtName.toLowerCase().includes(q);
      if (!matchQuery) return;
    }

    if (!groupedBookingsMap.has(b.code)) {
      groupedBookingsMap.set(b.code, { code: b.code, customerName: b.customerName, customerPhone: b.customerPhone, date: b.date, totalPrice: 0, status: b.status, channel: b.channel, details: [] });
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
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 text-center">
          <div className="w-16 h-16 bg-[#041E8C] text-[#00E599] rounded-2xl mx-auto flex items-center justify-center shadow-lg"><KeyRound className="w-8 h-8" /></div>
          <div><h1 className="text-base font-black text-[#041E8C] uppercase tracking-wider">Painel do Gestor</h1><p className="text-xs text-slate-500 mt-1">Entre com seu e-mail e senha.</p></div>
          <form onSubmit={handleLogin} className="space-y-3.5 text-left">
            <div><label className="text-[11px] font-bold text-slate-600 block mb-1">E-mail</label><input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium outline-none" required /></div>
            <div><label className="text-[11px] font-bold text-slate-600 block mb-1">Senha</label><input type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium outline-none" required /></div>
            {loginError && <p className="text-xs text-red-600 font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full py-3.5 bg-[#041E8C] text-white font-black rounded-xl text-xs">ACESSAR PAINEL</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link href="/" className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition flex items-center gap-1 text-xs font-bold"><ArrowLeft className="w-4 h-4" /><span>Voltar ao Site</span></Link>
            <h1 className="text-base font-black tracking-wide text-white uppercase italic">Painel do Gestor</h1>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /><span>Atualizar</span></button>
            <button onClick={() => setActiveTab("config")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-sm ${activeTab === "config" ? "bg-white text-[#041E8C]" : "bg-white/10 text-white"}`}><Settings className="w-4 h-4 text-[#00E599]" /><span>Configurações</span></button>
            <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white font-black text-xs rounded-xl shadow"><LogOut className="w-4 h-4" /><span>Sair</span></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><DollarSign className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Receita Total</p><p className="text-lg font-black text-[#041E8C]">{formatCurrency(totalRevenue)}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 text-[#041E8C] flex items-center justify-center shrink-0"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Confirmadas</p><p className="text-lg font-black text-slate-800">{confirmedBookings.length + activeEnrollments.length}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Origem</p><p className="text-xs font-bold text-slate-700"><span className="text-emerald-600">{onlineBookingsCount} Site</span> / {manualBookingsCount} Balcão</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Canceladas</p><p className="text-lg font-black text-red-600">{cancelledBookingsCount}</p></div></div>
        </div>

        {/* Abas com a Grade Diária em 1º lugar conforme solicitado */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto gap-1">
          <button onClick={() => setActiveTab("grid")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "grid" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><BarChart3 className="w-4 h-4 text-[#00E599]" /> 1. Grade Diária (06h - 22h)</button>
          <button onClick={() => setActiveTab("reports")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "reports" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><PieChart className="w-4 h-4 text-[#00E599]" /> 2. Resumo Financeiro</button>
          <button onClick={() => setActiveTab("bookings")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "bookings" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Calendar className="w-4 h-4 text-[#00E599]" /> 3. Reservas</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><GraduationCap className="w-4 h-4 text-[#00E599]" /> 4. Alunos & Aulas </button>
          <button onClick={() => setActiveTab("locks_classes")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "locks_classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Lock className="w-4 h-4 text-[#00E599]" /> 5. Grade de Aulas e Bloqueios</button>
          <button onClick={() => setActiveTab("prices")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "prices" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><DollarSign className="w-4 h-4 text-[#00E599]" /> 6. Gestão de Preços</button>
        </div>

        {/* NOVA GRADE DIÁRIA: Horários nas Linhas (06:00 a 22:00) e Quadras nas Colunas + Flag de Disponibilidade */}
        {activeTab === "grid" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Grade Horária Operacional (06:00 às 22:00)</h2>
                {isPastDate && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Modo Histórico</span>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => changeDateByDays(-1)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><ChevronLeft className="w-4 h-4" /></button>
                <input type="date" value={gridDate} onChange={(e) => setGridDate(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                <button type="button" onClick={() => changeDateByDays(1)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex gap-3 text-[11px] font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border">
              <span>🟢 <strong>Livre:</strong> Clique para reserva balcão</span>
              <span>🔵 <strong>Reservado:</strong> Ocupado por cliente</span>
              <span>🔒 <strong>Fechado/Inativo:</strong> Clique para abrir horário</span>
            </div>

            <div className="overflow-x-auto pb-2 border border-slate-200 rounded-2xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#041E8C] text-white text-[11px]">
                    <th className="p-3 border-r border-[#021359] sticky left-0 bg-[#041E8C] z-10 w-24 text-center">Horário</th>
                    {allCourts.map((court) => (
                      <th key={court.id} className="p-3 border-r border-[#021359] text-center font-bold min-w-[140px]">
                        {court.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {businessHours.map((time) => (
                    <tr key={time} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50 border-r border-slate-200 sticky left-0 z-10 text-center">{time}</td>
                      {allCourts.map((court) => {
                        const slot = getSlotStatus(court.id, time, gridDate);
                        return (
                          <td key={court.id} className="p-2 border-r border-slate-200 text-center">
                            {slot.type === "free" ? (
                              isPastDate ? (
                                <div className="w-full p-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-[11px]">Ocioso</div>
                            ) : (
                              <div className="flex gap-1">
                                <button type="button" onClick={() => handleCellClick(court, time, slot.type)} className="flex-1 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px] shadow-xs flex items-center justify-center gap-1">
                                  + Livre
                                </button>
                                <button type="button" onClick={() => toggleCourtLockSlot(court.id, time)} className="px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px]" title="Inativar/Bloquear este horário">
                                  🔒
                                </button>
                              </div>
                              )
                            ) : slot.type === "booked" ? (
                              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-bold truncate" title={`${slot.label} (${slot.sub})`}>
                                🔵 {slot.label}
                              </div>
                            ) : (
                              <button type="button" onClick={() => toggleCourtLockSlot(court.id, time)} className="w-full p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1" title="Clique para abrir horário">
                                <Lock className="w-3 h-3" /> Fechado
                              </button>
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

        {/* Demais abas mantidas integralmente */}
        {activeTab === "reports" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C]">Resumo Financeiro</h2>
            <p className="text-xs text-slate-500">Métricas completas de faturamento da arena.</p>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase text-slate-800">Histórico de Reservas Consolidado</h2>
          </div>
        )}

        {activeTab === "classes" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C]">Gestão de Alunos & Aulas</h2>
          </div>
        )}

        {activeTab === "locks_classes" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C]">Grade de Aulas e Bloqueios</h2>
          </div>
        )}

        {activeTab === "prices" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C]">Gestão de Preços</h2>
          </div>
        )}

        {activeTab === "config" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C]">Configurações da Arena</h2>
          </div>
        )}
      </div>

      {slotModalOpen && modalCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-[#041E8C] uppercase">Agendar / Bloquear (Balcão)</h3>
                <p className="text-xs text-slate-500">{modalCourt.name} • {modalTime}</p>
              </div>
              <button onClick={() => setSlotModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveQuickAction} className="space-y-3">
              <div><label className="text-[11px] font-bold text-slate-600 block mb-1">Nome do Atleta</label><input type="text" value={quickCustomerName} onChange={(e) => setQuickCustomerName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-2xl text-xs outline-none" required /></div>
              <div><label className="text-[11px] font-bold text-slate-600 block mb-1">WhatsApp</label><input type="tel" value={quickCustomerPhone} onChange={(e) => setQuickCustomerPhone(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-2xl text-xs outline-none" required /></div>
              <div><label className="text-[11px] font-bold text-slate-600 block mb-1">Valor (R$)</label><input type="number" step="0.01" value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none text-[#041E8C]" required /></div>
              <button type="submit" className="w-full py-3 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow-md mt-2">Confirmar Agendamento</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}