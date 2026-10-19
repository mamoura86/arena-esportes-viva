"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { 
  Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check, 
  KeyRound, ShieldAlert, Package, Repeat, Sparkles,
  BarChart3, TrendingUp, Monitor, Smartphone,
  Filter, Clock, CheckCircle2, Banknote, FileText, Search,
  CalendarDays, Tag, X, Edit3
} from "lucide-react";
import Link from "next/link";

interface UnifiedBooking {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  courtId: string;
  courtName: string;
  date: string;
  time: string;
  price: number;
  channel: "online" | "manual";
  paymentMethod: string;
  status: "confirmada" | "cancelada";
}

const allCourtsList = [
  { id: "futebol-1", name: "Campo Society" },
  { id: "areia-1", name: "Quadra 1 (Areia)" },
  { id: "areia-2", name: "Quadra 2 (Areia)" },
  { id: "areia-3", name: "Quadra 3 (Areia)" },
  { id: "areia-4", name: "Quadra 4 (Areia)" },
  { id: "areia-5", name: "Quadra 5 (Areia)" },
  { id: "areia-6", name: "Quadra 6 (Areia)" },
];

const daysOfWeek = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

const businessHours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const ADMIN_PIN = "1234";

  const [todayString, setTodayString] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  const [adminTab, setAdminTab] = useState<"agenda" | "dashboard" | "reports" | "settings">("agenda");

  // Filtros
  const [dashboardPeriod, setDashboardPeriod] = useState<"hoje" | "7dias" | "mes">("mes");
  const [channelFilter, setChannelFilter] = useState<"todos" | "online" | "manual">("todos");
  const [reportStartDate, setReportStartDate] = useState("2026-01-01");
  const [reportEndDate, setReportEndDate] = useState("2026-12-31");
  const [reportSearchText, setReportSearchText] = useState("");

  // Preços
  const [courtsPricing, setCourtsPricing] = useState([
    { id: "society-normal", name: "Futebol Society (Normal - após 19h)", price: 80.0 },
    { id: "society-promo", name: "Futebol Society (Promocional - 16h às 19h)", price: 60.0 },
    { id: "areia-normal", name: "Quadras de Areia (Normal - após 19h)", price: 60.0 },
    { id: "areia-promo", name: "Quadras de Areia (Promocional - 16h às 19h)", price: 40.0 },
  ]);

  const [equipmentsPricing, setEquipmentsPricing] = useState([
    { id: "e-raquete", name: "Aluguel de Raquete de Beach Tennis", price: 5.0 },
    { id: "e-bola", name: "Aluguel de Bolas (Vôlei / Society / Carimba)", price: 5.0 },
  ]);

  // Gestão de Travas
  const [selectedAdminCourtId, setSelectedAdminCourtId] = useState("areia-4");
  const [lockMode, setLockMode] = useState<"weekly" | "specific">("weekly");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(2);
  const [specificDate, setSpecificDate] = useState("");

  // Estrutura independente por horário: { "areia-1-2-17:00": "Aula Vôlei Iniciante", "areia-1-2-18:00": "Futevôlei Intermediário" }
  const [slotLocksWeekly, setSlotLocksWeekly] = useState<{ [key: string]: string }>({
    "areia-4-2-18:00": "Futevôlei Iniciante",
    "areia-4-2-19:00": "Vôlei Intermediário",
  });
  const [slotLocksDate, setSlotLocksDate] = useState<{ [key: string]: string }>({});
  const [dateUnlocks, setDateUnlocks] = useState<{ [key: string]: string[] }>({});

  // Modal para definir/editar motivo da trava individual
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [activeSlotTime, setActiveSlotTime] = useState("");
  const [customSlotReason, setCustomSlotReason] = useState("");

  // Base de Reservas
  const [historyBookings, setHistoryBookings] = useState<UnifiedBooking[]>([
    { id: "hb-1", code: "VIVA-9102", customerName: "Carlos Eduardo", customerPhone: "85991234567", courtId: "areia-1", courtName: "Quadra 1 (Areia)", date: "2026-10-20", time: "19:00", price: 63.0, channel: "online", paymentMethod: "Pix Automático", status: "confirmada" },
    { id: "hb-2", code: "BALCAO-101", customerName: "Turma do André (Terça)", customerPhone: "85988112233", courtId: "areia-4", courtName: "Quadra 4 (Areia)", date: "2026-10-20", time: "18:00", price: 40.0, channel: "manual", paymentMethod: "Balcão (Cartão)", status: "confirmada" },
  ]);

  // Modal de Lançamento Rápido na Grade
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickCourt, setQuickCourt] = useState(allCourtsList[0]);
  const [quickTime, setQuickTime] = useState("19:00");
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickPrice, setQuickPrice] = useState("60.00");
  const [quickMethod, setQuickMethod] = useState("WhatsApp (Pix Arena)");

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayFormatted = `${year}-${month}-${day}`;

    setTodayString(todayFormatted);
    setScheduleDate(todayFormatted);
    setSpecificDate(todayFormatted);

    try {
      const savedWeekly = localStorage.getItem("viva_slot_locks_weekly");
      if (savedWeekly) setSlotLocksWeekly(JSON.parse(savedWeekly));

      const savedDates = localStorage.getItem("viva_slot_locks_date");
      if (savedDates) setSlotLocksDate(JSON.parse(savedDates));

      const savedUnlocks = localStorage.getItem("viva_date_unlocks");
      if (savedUnlocks) setDateUnlocks(JSON.parse(savedUnlocks));

      const savedPrices = localStorage.getItem("viva_prices");
      if (savedPrices) setCourtsPricing(JSON.parse(savedPrices));

      const savedHistory = localStorage.getItem("viva_history_bookings");
      if (savedHistory) setHistoryBookings(JSON.parse(savedHistory));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      setErrorMessage("");
    } else {
      setErrorMessage("Senha incorreta. Tente novamente.");
    }
  };

  const getDayOfWeekFromDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.getDay();
  };

  const handleCourtPriceChange = (id: string, newPrice: string) => {
    setCourtsPricing((prev) =>
      prev.map((c) => (c.id === id ? { ...c, price: parseFloat(newPrice) || 0 } : c))
    );
  };

  const handleEquipmentPriceChange = (id: string, newPrice: string) => {
    setEquipmentsPricing((prev) =>
      prev.map((e) => (e.id === id ? { ...e, price: parseFloat(newPrice) || 0 } : e))
    );
  };

  // Clique no horário da aba de travas
  const handleSlotClickInSettings = (time: string) => {
    setActiveSlotTime(time);

    if (lockMode === "weekly") {
      const key = `${selectedAdminCourtId}-${selectedDayOfWeek}-${time}`;
      const existing = slotLocksWeekly[key];
      if (existing) {
        // Se já está travado, destrava
        setSlotLocksWeekly((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      } else {
        // Se está livre, abre modal para definir o motivo específico
        setCustomSlotReason("Aula Vôlei - Iniciante");
        setIsLockModalOpen(true);
      }
    } else {
      const dayOfWeek = getDayOfWeekFromDate(specificDate);
      const weeklyKey = `${selectedAdminCourtId}-${dayOfWeek}-${time}`;
      const dateKey = `${selectedAdminCourtId}-${specificDate}-${time}`;
      const isLockedWeekly = !!slotLocksWeekly[weeklyKey];

      if (isLockedWeekly) {
        const fullDateKey = `${selectedAdminCourtId}-${specificDate}`;
        setDateUnlocks((prev) => {
          const list = Array.isArray(prev[fullDateKey]) ? prev[fullDateKey] : [];
          const isUnlocked = list.includes(time);
          const updated = isUnlocked ? list.filter((t) => t !== time) : [...list, time];
          return { ...prev, [fullDateKey]: updated };
        });
      } else {
        const existing = slotLocksDate[dateKey];
        if (existing) {
          setSlotLocksDate((prev) => {
            const updated = { ...prev };
            delete updated[dateKey];
            return updated;
          });
        } else {
          setCustomSlotReason("Bloqueio Pontual");
          setIsLockModalOpen(true);
        }
      }
    }
  };

  // Confirmação do motivo da trava específica
  const handleConfirmLockSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = customSlotReason.trim() || "Aula / Mensalista";

    if (lockMode === "weekly") {
      const key = `${selectedAdminCourtId}-${selectedDayOfWeek}-${activeSlotTime}`;
      setSlotLocksWeekly((prev) => ({ ...prev, [key]: reason }));
    } else {
      const dateKey = `${selectedAdminCourtId}-${specificDate}-${activeSlotTime}`;
      setSlotLocksDate((prev) => ({ ...prev, [dateKey]: reason }));
    }

    setIsLockModalOpen(false);
  };

  const handleOpenQuickBooking = (court: typeof allCourtsList[0], time: string) => {
    setQuickCourt(court);
    setQuickTime(time);
    setQuickCustomerName("");
    setQuickCustomerPhone("");

    const hour = parseInt(time.split(":")[0], 10);
    const isPromo = hour >= 16 && hour < 19;
    const defaultPrice = court.id === "futebol-1" ? (isPromo ? "60.00" : "80.00") : (isPromo ? "40.00" : "60.00");
    setQuickPrice(defaultPrice);

    setIsQuickBookingOpen(true);
  };

  const handleConfirmQuickBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerName.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    const newEntry: UnifiedBooking = {
      id: `hb-${Date.now()}`,
      code: `BALCAO-${Math.floor(100 + Math.random() * 900)}`,
      customerName: quickCustomerName,
      customerPhone: quickCustomerPhone || "Presencial",
      courtId: quickCourt.id,
      courtName: quickCourt.name,
      date: scheduleDate,
      time: quickTime,
      price: parseFloat(quickPrice) || 0,
      channel: "manual",
      paymentMethod: quickMethod,
      status: "confirmada",
    };

    const updatedHistory = [newEntry, ...historyBookings];
    setHistoryBookings(updatedHistory);

    // Trava pontual na data
    const dateKey = `${quickCourt.id}-${scheduleDate}-${quickTime}`;
    const updatedDateLocks = { ...slotLocksDate, [dateKey]: "Reserva Balcão" };
    setSlotLocksDate(updatedDateLocks);

    localStorage.setItem("viva_history_bookings", JSON.stringify(updatedHistory));
    localStorage.setItem("viva_slot_locks_date", JSON.stringify(updatedDateLocks));

    setIsQuickBookingOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("viva_slot_locks_weekly", JSON.stringify(slotLocksWeekly));
      localStorage.setItem("viva_slot_locks_date", JSON.stringify(slotLocksDate));
      localStorage.setItem("viva_date_unlocks", JSON.stringify(dateUnlocks));
      localStorage.setItem("viva_prices", JSON.stringify(courtsPricing));
      localStorage.setItem("viva_history_bookings", JSON.stringify(historyBookings));

      // Atualiza formato compatível para a página pública
      const compWeekly: { [key: string]: { times: string[]; reason: string } } = {};
      Object.entries(slotLocksWeekly).forEach(([k, r]) => {
        const parts = k.split("-");
        const baseKey = `${parts[0]}-${parts[1]}`;
        const time = parts[2];
        if (!compWeekly[baseKey]) compWeekly[baseKey] = { times: [], reason: r };
        compWeekly[baseKey].times.push(time);
      });
      localStorage.setItem("viva_weekly_locks", JSON.stringify(compWeekly));

      const compDate: { [key: string]: { times: string[]; reason: string } } = {};
      Object.entries(slotLocksDate).forEach(([k, r]) => {
        const parts = k.split("-");
        const baseKey = `${parts[0]}-${parts[1]}`;
        const time = parts[2];
        if (!compDate[baseKey]) compDate[baseKey] = { times: [], reason: r };
        compDate[baseKey].times.push(time);
      });
      localStorage.setItem("viva_date_locks", JSON.stringify(compDate));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Erro ao salvar dados localmente.");
    }
  };

  // Status visual na aba de configurações
  const getLockStatusForSlot = (time: string) => {
    if (lockMode === "weekly") {
      const key = `${selectedAdminCourtId}-${selectedDayOfWeek}-${time}`;
      const reason = slotLocksWeekly[key];
      return { isLocked: !!reason, label: reason || "Fixo", isOverridden: false };
    } else {
      const dayOfWeek = getDayOfWeekFromDate(specificDate);
      const weeklyKey = `${selectedAdminCourtId}-${dayOfWeek}-${time}`;
      const dateKey = `${selectedAdminCourtId}-${specificDate}-${time}`;
      const fullDateKey = `${selectedAdminCourtId}-${specificDate}`;

      const weeklyReason = slotLocksWeekly[weeklyKey];
      const dateReason = slotLocksDate[dateKey];
      const unlocksList = Array.isArray(dateUnlocks[fullDateKey]) ? dateUnlocks[fullDateKey] : [];

      const isLockedWeekly = !!weeklyReason;
      const isUnlockedSpecifically = unlocksList.includes(time);
      const isLockedSpecifically = !!dateReason;

      if (isUnlockedSpecifically) return { isLocked: false, label: "Destravado", isOverridden: true };
      if (isLockedSpecifically) return { isLocked: true, label: dateReason, isOverridden: true };
      if (isLockedWeekly) return { isLocked: true, label: weeklyReason, isOverridden: false };
      return { isLocked: false, label: "Livre", isOverridden: false };
    }
  };

  // Identificador na Agenda Diária com motivo individual
  const getSlotDetailsForSchedule = (courtId: string, time: string, dateStr: string) => {
    const booking = historyBookings.find(
      (b) => b.courtId === courtId && b.date === dateStr && b.time === time && b.status === "confirmada"
    );
    if (booking) {
      return {
        type: booking.channel === "online" ? "online" : "manual",
        title: booking.customerName,
        phone: booking.customerPhone,
        code: booking.code,
        price: booking.price,
      };
    }

    const dayOfWeek = getDayOfWeekFromDate(dateStr);
    const fullDateKey = `${courtId}-${dateStr}`;
    const unlocksList = Array.isArray(dateUnlocks[fullDateKey]) ? dateUnlocks[fullDateKey] : [];
    if (unlocksList.includes(time)) return { type: "livre" };

    const dateKey = `${courtId}-${dateStr}-${time}`;
    const dateReason = slotLocksDate[dateKey];
    if (dateReason) {
      return { type: "bloqueio", title: dateReason };
    }

    const weeklyKey = `${courtId}-${dayOfWeek}-${time}`;
    const weeklyReason = slotLocksWeekly[weeklyKey];
    if (weeklyReason) {
      return { type: "mensalista", title: weeklyReason };
    }

    return { type: "livre" };
  };

  const getDaySummary = (dateStr: string) => {
    let bookedCount = 0;
    let freeCount = 0;
    let blockedCount = 0;

    allCourtsList.forEach((court) => {
      businessHours.forEach((time) => {
        const slot = getSlotDetailsForSchedule(court.id, time, dateStr);
        if (slot.type === "online" || slot.type === "manual") bookedCount++;
        else if (slot.type === "livre") freeCount++;
        else blockedCount++;
      });
    });

    return { bookedCount, freeCount, blockedCount };
  };

  const daySummary = getDaySummary(scheduleDate || todayString);
  const specificDayName = daysOfWeek.find((d) => d.id === getDayOfWeekFromDate(specificDate))?.label;

  const filteredDashboardBookings = historyBookings.filter((b) => {
    if (channelFilter !== "todos" && b.channel !== channelFilter) return false;
    return b.status === "confirmada";
  });

  const totalRevenue = filteredDashboardBookings.reduce((acc, b) => acc + b.price, 0);
  const totalCount = filteredDashboardBookings.length;
  const onlineCount = historyBookings.filter((b) => b.channel === "online" && b.status === "confirmada").length;
  const manualCount = historyBookings.filter((b) => b.channel === "manual" && b.status === "confirmada").length;

  const filteredReportList = historyBookings.filter((b) => {
    if (b.date < reportStartDate || b.date > reportEndDate) return false;
    if (reportSearchText.trim()) {
      const q = reportSearchText.toLowerCase();
      const matchName = b.customerName.toLowerCase().includes(q);
      const matchCode = b.code.toLowerCase().includes(q);
      const matchPhone = b.customerPhone?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone) return false;
    }
    return true;
  });

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-sm w-full p-6 rounded-3xl border border-slate-200 shadow-md space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#041E8C] text-[#00E599] rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900">Acesso Restrito ao Gestor</h1>
            <p className="text-xs text-slate-500">
              Digite a senha do <strong>{currentArena.name}</strong>.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                PIN do Gestor
              </label>
              <input
                type="password"
                placeholder="Padrão: 1234"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest focus:ring-2 focus:ring-[#041E8C] outline-none"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-bold rounded-xl text-xs transition shadow"
            >
              Entrar no Painel
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao site público
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 font-sans p-3 sm:p-6 text-slate-800 pb-24">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* Topo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 border rounded-xl hover:bg-slate-50 text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-slate-900 text-lg">Painel de Gestão Operacional</h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-[#041E8C] px-2 py-0.5 rounded-full border border-blue-200">
                  <Monitor className="w-3 h-3" /> CT Viva Esportes
                </span>
              </div>
              <p className="text-xs text-slate-500">Agendamento direto na grade, travas com motivos independentes</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            {savedSuccess ? "Salvo com Sucesso!" : "Salvar Alterações"}
          </button>
        </div>

        {/* Abas */}
        <div className="flex bg-slate-200 p-1 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setAdminTab("agenda")}
            className={`flex-1 min-w-[140px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "agenda" ? "bg-[#041E8C] text-white shadow-sm font-black" : "text-slate-700"
            }`}
          >
            <CalendarDays className="w-4 h-4 text-[#00E599]" />
            Agenda do Dia (Grade Interativa)
          </button>
          <button
            onClick={() => setAdminTab("dashboard")}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "dashboard" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setAdminTab("reports")}
            className={`flex-1 min-w-[140px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "reports" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <FileText className="w-4 h-4" />
            Relatório Anual
          </button>
          <button
            onClick={() => setAdminTab("settings")}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "settings" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Travas & Preços
          </button>
        </div>

        {/* ABA 1: AGENDA DO DIA */}
        {adminTab === "agenda" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#041E8C]" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Visualizar Grade por Data</h2>
                  <p className="text-[11px] text-slate-400">Clique em qualquer horário livre para lançar uma reserva manual</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setScheduleDate(todayString)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                    scheduleDate === todayString 
                      ? "bg-[#041E8C] text-white border-[#041E8C]" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Hoje
                </button>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Jogos Confirmados</span>
                <strong className="text-xl font-black text-[#041E8C]">{daySummary.bookedCount}</strong>
                <span className="text-[10px] text-slate-500 block">Reservas ativas</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Horários Livres</span>
                <strong className="text-xl font-black text-emerald-600">{daySummary.freeCount}</strong>
                <span className="text-[10px] text-slate-500 block">Disponíveis no site</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Aulas / Mensalistas</span>
                <strong className="text-xl font-black text-amber-600">{daySummary.blockedCount}</strong>
                <span className="text-[10px] text-slate-500 block">Identificados na grade</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">
                    Grade de <strong>{scheduleDate}</strong> ({daysOfWeek.find((d) => d.id === getDayOfWeekFromDate(scheduleDate))?.label})
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Livre (Clique p/ agendar)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#041E8C]"></span> Online
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Balcão
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Aula/Mensalista
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                      <th className="p-2.5 font-bold w-20">Horário</th>
                      {allCourtsList.map((c) => (
                        <th key={c.id} className="p-2.5 font-bold text-center">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {businessHours.map((time) => (
                      <tr key={time} className="hover:bg-slate-50/70 transition">
                        <td className="p-2.5 font-bold text-slate-700 font-mono bg-slate-50/50">
                          {time}
                        </td>
                        {allCourtsList.map((court) => {
                          const slot = getSlotDetailsForSchedule(court.id, time, scheduleDate);

                          if (slot.type === "online") {
                            return (
                              <td key={court.id} className="p-1.5">
                                <div className="p-2 bg-[#041E8C] text-white rounded-xl shadow-xs space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-[11px] truncate block font-bold">{slot.title}</strong>
                                    <span className="text-[9px] text-[#00E599] font-black shrink-0">ONLINE</span>
                                  </div>
                                  <p className="text-[10px] text-slate-200 truncate">{slot.phone}</p>
                                  <div className="flex justify-between items-center text-[9px] text-slate-300 pt-0.5">
                                    <span>{slot.code}</span>
                                    <span className="font-bold text-white">R\$ {slot.price?.toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          if (slot.type === "manual") {
                            return (
                              <td key={court.id} className="p-1.5">
                                <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-[11px] truncate block font-bold">{slot.title}</strong>
                                    <span className="text-[9px] bg-white/20 text-white px-1 rounded shrink-0">BALCÃO</span>
                                  </div>
                                  <p className="text-[10px] text-sky-100 truncate">{slot.phone || "Presencial"}</p>
                                  <div className="flex justify-between items-center text-[9px] text-sky-200 pt-0.5">
                                    <span>{slot.code}</span>
                                    <span className="font-bold text-white">R\$ {slot.price?.toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          if (slot.type === "mensalista" || slot.type === "bloqueio") {
                            return (
                              <td key={court.id} className="p-1.5">
                                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-0.5 text-center">
                                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-900">
                                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span className="truncate">{slot.title}</span>
                                  </div>
                                  <span className="text-[9px] text-amber-600 block font-medium">Bloqueado</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={court.id} className="p-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickBooking(court, time)}
                                className="w-full p-2 bg-emerald-50/70 border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-100 hover:border-emerald-400 transition text-center group cursor-pointer shadow-xs"
                                title="Clique para agendar este horário"
                              >
                                <span className="text-[10px] font-bold flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Livre
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: DASHBOARD */}
        {adminTab === "dashboard" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Calendar className="w-4 h-4 text-[#041E8C]" />
                  <span>Período:</span>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setDashboardPeriod("hoje")}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                      dashboardPeriod === "hoje" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardPeriod("7dias")}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                      dashboardPeriod === "7dias" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    7 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardPeriod("mes")}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                      dashboardPeriod === "mes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    Mês Atual
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Filter className="w-4 h-4 text-[#041E8C]" />
                  <span>Filtrar por Origem:</span>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setChannelFilter("todos")}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                      channelFilter === "todos" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    Todos ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelFilter("online")}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                      channelFilter === "online" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Online ({onlineCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelFilter("manual")}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                      channelFilter === "manual" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Balcão / Zap ({manualCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faturamento Filtrado</span>
                <p className="text-2xl font-black text-[#041E8C]">R$ {totalRevenue.toFixed(2)}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Receita consolidada
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Jogos Realizados</span>
                <p className="text-2xl font-black text-slate-900">{totalCount} partidas</p>
                <span className="text-[10px] text-slate-500 font-medium">Status confirmadas</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Adoção do Site</span>
                <p className="text-2xl font-black text-emerald-600">
                  {Math.round((onlineCount / (onlineCount + manualCount || 1)) * 100)}%
                </p>
                <span className="text-[10px] text-slate-500 font-medium">Pix automatizado</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ocupação Horário Nobre</span>
                <p className="text-2xl font-black text-amber-600">88%</p>
                <span className="text-[10px] text-slate-500 font-medium">19h às 22h</span>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: RELATÓRIO ANALÍTICO */}
        {adminTab === "reports" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#041E8C]" />
                Relatório Analítico de Reservas (Histórico Anual)
              </h2>
              <p className="text-xs text-slate-500">
                Consulte qualquer reserva realizada nos últimos 12 meses por intervalo de datas ou nome/código.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Data Inicial (De)</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Data Final (Até)</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Buscar Atleta ou Código</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Nome, zap ou VIVA-..."
                    value={reportSearchText}
                    onChange={(e) => setReportSearchText(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <th className="p-3 font-bold">Código</th>
                      <th className="p-3 font-bold">Cliente</th>
                      <th className="p-3 font-bold">Espaço</th>
                      <th className="p-3 font-bold">Data & Hora</th>
                      <th className="p-3 font-bold">Origem</th>
                      <th className="p-3 font-bold">Valor</th>
                      <th className="p-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReportList.length > 0 ? (
                      filteredReportList.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-[#041E8C]">{row.code}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">{row.customerName}</span>
                            <span className="text-[10px] text-slate-400">{row.customerPhone}</span>
                          </td>
                          <td className="p-3 text-slate-700">{row.courtName}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{row.date} às {row.time}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              row.channel === "online" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-blue-50 text-[#041E8C] border border-blue-200"
                            }`}>
                              {row.channel === "online" ? "Site (Pix)" : row.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">R$ {row.price.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              row.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}>
                              {row.status === "confirmada" ? "Confirmada" : "Cancelada"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          Nenhuma reserva encontrada para o filtro selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: CONFIGURAÇÕES, PREÇOS E TRAVAS INDEPENDENTES */}
        {adminTab === "settings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  1. Preço por Hora das Quadras
                </h2>
                <div className="space-y-2">
                  {courtsPricing.map((item) => (
                    <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-semibold">R$</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleCourtPriceChange(item.id, e.target.value)}
                          className="w-16 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:ring-1 focus:ring-[#041E8C] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  2. Preço dos Equipamentos
                </h2>
                <div className="space-y-2">
                  {equipmentsPricing.map((equip) => (
                    <div key={equip.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{equip.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-semibold">R$</span>
                        <input
                          type="number"
                          value={equip.price}
                          onChange={(e) => handleEquipmentPriceChange(equip.id, e.target.value)}
                          className="w-16 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:ring-1 focus:ring-[#041E8C] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Travas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  3. Trava de Horários com Motivos Independentes
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Clique no horário desejado para atribuir a turma (ex: Vôlei Iniciante às 17h, Futevôlei às 18h).
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                  Selecione a Quadra:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                  {allCourtsList.map((court) => {
                    const isSelected = selectedAdminCourtId === court.id;
                    return (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => setSelectedAdminCourtId(court.id)}
                        className={`text-xs p-2 rounded-xl border font-bold transition text-center ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {court.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLockMode("weekly")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      lockMode === "weekly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Semanal (Dom a Dom)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLockMode("specific")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      lockMode === "specific" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Data Específica
                  </button>
                </div>

                {lockMode === "weekly" ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 block">
                      Dia da Semana:
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {daysOfWeek.map((day) => {
                        const isSelected = selectedDayOfWeek === day.id;
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => setSelectedDayOfWeek(day.id)}
                            className={`py-2 rounded-xl border text-xs font-bold transition text-center ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase text-slate-500 block">
                        Data Específica:
                      </label>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold">
                        Dia: {daysOfWeek.find((d) => d.id === getDayOfWeekFromDate(specificDate))?.label}
                      </span>
                    </div>
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#041E8C] outline-none"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-slate-600 font-medium">
                      {lockMode === "weekly" ? (
                        <>Travas de <strong>{daysOfWeek.find((d) => d.id === selectedDayOfWeek)?.label}</strong> na <strong>{allCourtsList.find((c) => c.id === selectedAdminCourtId)?.name}</strong>:</>
                      ) : (
                        <>Grade de <strong>{specificDate} ({daysOfWeek.find((d) => d.id === getDayOfWeekFromDate(specificDate))?.label})</strong> na <strong>{allCourtsList.find((c) => c.id === selectedAdminCourtId)?.name}</strong>:</>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">Clique para travar com motivo ou destravar</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {businessHours.map((time) => {
                      const status = getLockStatusForSlot(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => handleSlotClickInSettings(time)}
                          className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                            status.isLocked
                              ? "bg-red-50 border-red-200 text-red-700"
                              : status.isOverridden
                              ? "bg-blue-50 border-blue-300 text-blue-700 font-black shadow-sm"
                              : "bg-emerald-50 border-emerald-200 text-emerald-800"
                          }`}
                        >
                          <span className="text-xs font-bold">{time}</span>
                          <div className="flex items-center gap-1 text-[8px] font-semibold">
                            {status.isLocked ? (
                              <>
                                <Lock className="w-2.5 h-2.5 text-red-600 shrink-0" />
                                <span className="truncate max-w-[65px]">{status.label}</span>
                              </>
                            ) : status.isOverridden ? (
                              <>
                                <Unlock className="w-2.5 h-2.5 text-blue-600" />
                                <span>Aberto</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Livre</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-right">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs font-semibold text-slate-400 hover:text-red-600 transition"
          >
            Sair do modo administrador
          </button>
        </div>
      </div>

      {/* MODAL PARA DEFINIR MOTIVO DA TRAVA INDIVIDUAL */}
      {isLockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800">Bloquear Horário ({activeSlotTime})</h3>
                  <p className="text-[10px] text-slate-400">Informe a turma ou motivo deste horário</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLockSlot} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome da Turma / Motivo:</label>
                <input
                  type="text"
                  placeholder="Ex: Aula Vôlei Iniciante, Futevôlei..."
                  value={customSlotReason}
                  onChange={(e) => setCustomSlotReason(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#041E8C] font-semibold"
                />
              </div>

              {/* Sugestões rápidas */}
              <div className="flex flex-wrap gap-1 pt-1">
                {["Vôlei Iniciante", "Futevôlei Intermediário", "Beach Tennis Avançado", "Mensalista"].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setCustomSlotReason(sug)}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                  >
                    + {sug}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#041E8C] hover:bg-[#031566] text-white font-bold rounded-xl shadow transition text-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#00E599]" />
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO RÁPIDO NA GRADE */}
      {isQuickBookingOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Lançamento Rápido de Reserva</h3>
                  <p className="text-[10px] text-slate-400">
                    {quickCourt.name} às {quickTime} em {scheduleDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickBookingOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickBooking} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome do Cliente / Turma *</label>
                <input
                  type="text"
                  placeholder="Ex: Rafael Beach Tennis, Turma da Terça..."
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#041E8C] font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">WhatsApp (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ex: 85999999999"
                  value={quickCustomerPhone}
                  onChange={(e) => setQuickCustomerPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#041E8C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor Cobrado (R$)</label>
                  <input
                    type="number"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[#041E8C]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Origem do Pagamento</label>
                  <select
                    value={quickMethod}
                    onChange={(e) => setQuickMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="WhatsApp (Pix Arena)">WhatsApp (Pix Arena)</option>
                    <option value="Balcão (Cartão)">Balcão (Cartão)</option>
                    <option value="Balcão (Dinheiro)">Balcão (Dinheiro)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-bold rounded-xl shadow transition text-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#00E599]" />
                  Confirmar e Bloquear Horário no Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}