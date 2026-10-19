"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { 
  Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check, 
  KeyRound, ShieldAlert, Package, Repeat, Sparkles,
  BarChart3, PlusCircle, TrendingUp, Monitor, Smartphone,
  Filter, Clock, CheckCircle2, CreditCard, Banknote, FileText, Search,
  CalendarDays, UserCheck
} from "lucide-react";
import Link from "next/link";

type PaymentMethodType = "Balcão (Cartão)" | "Balcão (Dinheiro)" | "WhatsApp (Pix Arena)";

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

  // Data atual segura
  const [todayString, setTodayString] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  // Abas do Painel: 'agenda' é a aba principal padrão
  const [adminTab, setAdminTab] = useState<"agenda" | "dashboard" | "manual" | "reports" | "settings">("agenda");

  // Filtros de Relatórios e Dashboard
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

  const [weeklyLocks, setWeeklyLocks] = useState<{ [key: string]: string[] }>({});
  const [dateLocks, setDateLocks] = useState<{ [key: string]: string[] }>({});
  const [dateUnlocks, setDateUnlocks] = useState<{ [key: string]: string[] }>({});

  // Base Unificada de Reservas com Dados Iniciais Demonstrativos
  const [historyBookings, setHistoryBookings] = useState<UnifiedBooking[]>([
    { id: "hb-1", code: "VIVA-9102", customerName: "Carlos Eduardo", customerPhone: "85991234567", courtId: "areia-1", courtName: "Quadra 1 (Areia)", date: "2026-10-20", time: "19:00", price: 63.0, channel: "online", paymentMethod: "Pix Automático", status: "confirmada" },
    { id: "hb-2", code: "BALCAO-101", customerName: "Turma do André (Terça)", customerPhone: "85988112233", courtId: "areia-4", courtName: "Quadra 4 (Areia)", date: "2026-10-20", time: "18:00", price: 40.0, channel: "manual", paymentMethod: "Balcão (Cartão)", status: "confirmada" },
    { id: "hb-3", code: "BALCAO-102", customerName: "Diego Santos", customerPhone: "85999778899", courtId: "futebol-1", courtName: "Campo Society", date: "2026-10-20", time: "20:00", price: 80.0, channel: "manual", paymentMethod: "WhatsApp (Pix Arena)", status: "confirmada" },
    { id: "hb-4", code: "VIVA-7841", customerName: "Juliana Mendes", customerPhone: "85994455667", courtId: "areia-2", courtName: "Quadra 2 (Areia)", date: "2026-10-20", time: "17:00", price: 43.0, channel: "online", paymentMethod: "Pix Automático", status: "confirmada" },
    { id: "hb-5", code: "VIVA-6523", customerName: "Marcos Vinicius", customerPhone: "85996611223", courtId: "areia-3", courtName: "Quadra 3 (Areia)", date: "2026-10-18", time: "21:00", price: 63.0, channel: "online", paymentMethod: "Pix Automático", status: "cancelada" },
    { id: "hb-6", code: "BALCAO-098", customerName: "Lucas Vôlei Fim de Tarde", customerPhone: "85987654321", courtId: "areia-2", courtName: "Quadra 2 (Areia)", date: "2026-10-15", time: "16:00", price: 40.0, channel: "manual", paymentMethod: "Balcão (Dinheiro)", status: "confirmada" },
    { id: "hb-7", code: "VIVA-4412", customerName: "Beatriz Nogueira", customerPhone: "85981122334", courtId: "areia-5", courtName: "Quadra 5 (Areia)", date: "2026-10-20", time: "21:00", price: 63.0, channel: "online", paymentMethod: "Pix Automático", status: "confirmada" },
  ]);

  // Form de Lançamento Manual
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualCourt, setManualCourt] = useState("areia-1");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("19:00");
  const [manualPrice, setManualPrice] = useState("60.00");
  const [manualMethod, setManualMethod] = useState<PaymentMethodType>("WhatsApp (Pix Arena)");

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
    setManualDate(todayFormatted);

    try {
      const savedWeekly = localStorage.getItem("viva_weekly_locks");
      if (savedWeekly) setWeeklyLocks(JSON.parse(savedWeekly));

      const savedDates = localStorage.getItem("viva_date_locks");
      if (savedDates) setDateLocks(JSON.parse(savedDates));

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

  const toggleLock = (time: string) => {
    if (lockMode === "weekly") {
      const key = `${selectedAdminCourtId}-${selectedDayOfWeek}`;
      setWeeklyLocks((prev) => {
        const currentList = prev[key] || [];
        const isLocked = currentList.includes(time);
        const updated = isLocked ? currentList.filter((t) => t !== time) : [...currentList, time];
        return { ...prev, [key]: updated };
      });
    } else {
      const dayOfWeek = getDayOfWeekFromDate(specificDate);
      const weeklyKey = `${selectedAdminCourtId}-${dayOfWeek}`;
      const isLockedWeekly = weeklyLocks[weeklyKey]?.includes(time);
      const dateKey = `${selectedAdminCourtId}-${specificDate}`;

      if (isLockedWeekly) {
        setDateUnlocks((prev) => {
          const currentList = prev[dateKey] || [];
          const isUnlocked = currentList.includes(time);
          const updated = isUnlocked ? currentList.filter((t) => t !== time) : [...currentList, time];
          return { ...prev, [dateKey]: updated };
        });
      } else {
        setDateLocks((prev) => {
          const currentList = prev[dateKey] || [];
          const isLocked = currentList.includes(time);
          const updated = isLocked ? currentList.filter((t) => t !== time) : [...currentList, time];
          return { ...prev, [dateKey]: updated };
        });
      }
    }
  };

  const handleAddManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    const courtObj = allCourtsList.find((c) => c.id === manualCourt);
    const newEntry: UnifiedBooking = {
      id: `hb-${Date.now()}`,
      code: `BALCAO-${Math.floor(100 + Math.random() * 900)}`,
      customerName: manualName,
      customerPhone: manualPhone || "Não informado",
      courtId: manualCourt,
      courtName: courtObj?.name || "Quadra",
      date: manualDate,
      time: manualTime,
      price: parseFloat(manualPrice) || 0,
      channel: "manual",
      paymentMethod: manualMethod,
      status: "confirmada",
    };

    const updatedHistory = [newEntry, ...historyBookings];
    setHistoryBookings(updatedHistory);

    const dateKey = `${manualCourt}-${manualDate}`;
    const updatedDateLocks = {
      ...dateLocks,
      [dateKey]: [...(dateLocks[dateKey] || []), manualTime],
    };
    setDateLocks(updatedDateLocks);

    localStorage.setItem("viva_history_bookings", JSON.stringify(updatedHistory));
    localStorage.setItem("viva_date_locks", JSON.stringify(updatedDateLocks));

    setManualName("");
    setManualPhone("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("viva_weekly_locks", JSON.stringify(weeklyLocks));
      localStorage.setItem("viva_date_locks", JSON.stringify(dateLocks));
      localStorage.setItem("viva_date_unlocks", JSON.stringify(dateUnlocks));
      localStorage.setItem("viva_prices", JSON.stringify(courtsPricing));
      localStorage.setItem("viva_history_bookings", JSON.stringify(historyBookings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Erro ao salvar dados localmente.");
    }
  };

  // Função para retornar o status de cada slot nas travas de horário
  const getLockStatusForSlot = (time: string) => {
    if (lockMode === "weekly") {
      const key = `${selectedAdminCourtId}-${selectedDayOfWeek}`;
      const isLocked = weeklyLocks[key]?.includes(time);
      return { isLocked: !!isLocked, label: isLocked ? "Fixo" : "Livre", isOverridden: false };
    } else {
      const dayOfWeek = getDayOfWeekFromDate(specificDate);
      const weeklyKey = `${selectedAdminCourtId}-${dayOfWeek}`;
      const dateKey = `${selectedAdminCourtId}-${specificDate}`;

      const isLockedWeekly = weeklyLocks[weeklyKey]?.includes(time);
      const isUnlockedSpecifically = dateUnlocks[dateKey]?.includes(time);
      const isLockedSpecifically = dateLocks[dateKey]?.includes(time);

      if (isUnlockedSpecifically) return { isLocked: false, label: "Destravado", isOverridden: true };
      if (isLockedSpecifically) return { isLocked: true, label: "Travado Pontual", isOverridden: true };
      if (isLockedWeekly) return { isLocked: true, label: "Fixo Semanal", isOverridden: false };
      return { isLocked: false, label: "Livre", isOverridden: false };
    }
  };

  // Identificador do que está acontecendo em cada horário/quadra para a Agenda Diária
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
    const weeklyKey = `${courtId}-${dayOfWeek}`;
    const dateKey = `${courtId}-${dateStr}`;

    const isUnlockedSpecifically = dateUnlocks[dateKey]?.includes(time);
    if (isUnlockedSpecifically) return { type: "livre" };

    const isLockedDate = dateLocks[dateKey]?.includes(time);
    const isLockedWeekly = weeklyLocks[weeklyKey]?.includes(time);

    if (isLockedDate) return { type: "bloqueio", title: "Bloqueio Pontual" };
    if (isLockedWeekly) return { type: "mensalista", title: "Aula / Mensalista" };

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

  // Filtragem Dinâmica do Dashboard
  const filteredDashboardBookings = historyBookings.filter((b) => {
    if (channelFilter !== "todos" && b.channel !== channelFilter) return false;
    return b.status === "confirmada";
  });

  const totalRevenue = filteredDashboardBookings.reduce((acc, b) => acc + b.price, 0);
  const totalCount = filteredDashboardBookings.length;
  const onlineCount = historyBookings.filter((b) => b.channel === "online" && b.status === "confirmada").length;
  const manualCount = historyBookings.filter((b) => b.channel === "manual" && b.status === "confirmada").length;

  // Filtragem Relatório Analítico
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
        
        {/* Topo do Gestor */}
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
              <p className="text-xs text-slate-500">Controle de reservas em tempo real, agenda do dia e relatórios</p>
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

        {/* Abas Principais */}
        <div className="flex bg-slate-200 p-1 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setAdminTab("agenda")}
            className={`flex-1 min-w-[140px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "agenda" ? "bg-[#041E8C] text-white shadow-sm font-black" : "text-slate-700"
            }`}
          >
            <CalendarDays className="w-4 h-4 text-[#00E599]" />
            Agenda do Dia
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
            onClick={() => setAdminTab("manual")}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "manual" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            + Reserva Balcão
          </button>
          <button
            onClick={() => setAdminTab("settings")}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "settings" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Travas & Preços
          </button>
        </div>

        {/* ========================================================= */}
        {/* ABA 1: AGENDA DO DIA                                      */}
        {/* ========================================================= */}
        {adminTab === "agenda" && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#041E8C]" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Visualizar Grade por Data</h2>
                  <p className="text-[11px] text-slate-400">Veja exatamente quem joga em cada quadra e horário</p>
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
                <span className="text-[10px] text-slate-500 block">Fixos ou bloqueados</span>
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
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Livre
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#041E8C]"></span> Reserva Online
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Balcão/Zap
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Mensalista/Aula
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
                                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-center space-y-0.5">
                                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                                    <Lock className="w-3 h-3 text-amber-600" />
                                    <span className="truncate">{slot.title}</span>
                                  </div>
                                  <span className="text-[9px] text-amber-600 block">Fixo semanal</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={court.id} className="p-1.5">
                              <div className="p-2 bg-emerald-50/60 border border-emerald-200 text-emerald-800 rounded-xl text-center">
                                <span className="text-[10px] font-bold flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Livre
                                </span>
                              </div>
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

        {/* ========================================================= */}
        {/* ABA 2: DASHBOARD                                          */}
        {/* ========================================================= */}
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
                  <span>Filtrar por Canal de Venda:</span>
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

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#041E8C]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#041E8C]">
                  Diagnóstico Estratégico do CT Viva Esportes
                </h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <strong>Canais de Venda:</strong> {onlineCount} reservas entraram com Pix automatizado pelo site e {manualCount} foram registradas via balcão/WhatsApp.
                </li>
                <li>
                  <strong>Alavanca de Caixa:</strong> As reservas online reduziram a inadimplência por no-show, pois o valor fica garantido na reserva.
                </li>
                <li>
                  <strong>Recomendação de Preço:</strong> Manter a tarifa de R\$ 40 das 16h às 19h continua sendo o maior atrativo para preencher as quadras de areia no período da tarde.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 3: RELATÓRIO ANALÍTICO DE 1 ANO                       */}
        {/* ========================================================= */}
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

            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <span>Mostrando {filteredReportList.length} registros</span>
              <span className="font-bold text-slate-800">
                Total do Período: R$ {filteredReportList.reduce((acc, r) => acc + (r.status === "confirmada" ? r.price : 0), 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 4: RESERVA BALCÃO                                     */}
        {/* ========================================================= */}
        {adminTab === "manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  + Nova Reserva Balcão
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Trava a quadra no site imediatamente e adiciona à agenda do dia.
                </p>
              </div>

              <form onSubmit={handleAddManualBooking} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Nome / Turma</label>
                  <input
                    type="text"
                    placeholder="Ex: Turma do André..."
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#041E8C]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">WhatsApp do Cliente (Opcional)</label>
                  <input
                    type="tel"
                    placeholder="Ex: 85999999999"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#041E8C]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Quadra</label>
                  <select
                    value={manualCourt}
                    onChange={(e) => setManualCourt(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {allCourtsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Data</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Horário</label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {businessHours.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Forma de Pagamento</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value as PaymentMethodType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="WhatsApp (Pix Arena)">WhatsApp (Pix Direto)</option>
                    <option value="Balcão (Cartão)">Balcão (Cartão)</option>
                    <option value="Balcão (Dinheiro)">Balcão (Dinheiro)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-bold rounded-xl shadow transition mt-2"
                >
                  Salvar e Bloquear no Site
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Últimos Lançamentos de Balcão ({historyBookings.filter((b) => b.channel === "manual").length})
              </h3>
              <div className="space-y-2">
                {historyBookings.filter((b) => b.channel === "manual").slice(0, 8).map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-800 block text-xs">{b.customerName}</strong>
                      <span className="text-[10px] text-slate-500">
                        {b.courtName} • {b.date} às {b.time}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#041E8C] block text-sm">R$ {b.price.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {b.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 5: CONFIGURAÇÕES, PREÇOS E TRAVAS                      */}
        {/* ========================================================= */}
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
                  3. Trava de Horários da Grade
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure bloqueios semanais ou destrave pontualmente em datas específicas.
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
                    <span className="text-[10px] text-slate-400">Clique para alternar</span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {businessHours.map((time) => {
                      const status = getLockStatusForSlot(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleLock(time)}
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
                                <Lock className="w-2.5 h-2.5 text-red-600" />
                                <span>{status.label}</span>
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
    </main>
  );
}