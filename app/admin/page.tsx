"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { 
  Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check, 
  KeyRound, ShieldAlert, Package, Repeat, Sparkles,
  BarChart3, PlusCircle, TrendingUp, Monitor, Smartphone,
  Filter, Clock, CheckCircle2, CreditCard, Banknote
} from "lucide-react";
import Link from "next/link";

type PaymentMethodType = "Balcão (Cartão)" | "Balcão (Dinheiro)" | "WhatsApp (Pix Arena)";

interface ManualBooking {
  id: string;
  customerName: string;
  courtId: string;
  date: string;
  time: string;
  price: number;
  paymentMethod: PaymentMethodType;
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

  // Abas do Painel
  const [adminTab, setAdminTab] = useState<"dashboard" | "manual" | "settings">("dashboard");

  // Filtro Interativo do Dashboard: 'hoje' | '7dias' | 'mes'
  const [dashboardPeriod, setDashboardPeriod] = useState<"hoje" | "7dias" | "mes">("mes");

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
  const [specificDate, setSpecificDate] = useState("2026-10-20");

  const [weeklyLocks, setWeeklyLocks] = useState<{ [key: string]: string[] }>({});
  const [dateLocks, setDateLocks] = useState<{ [key: string]: string[] }>({});
  const [dateUnlocks, setDateUnlocks] = useState<{ [key: string]: string[] }>({});

  // Base de Reservas Manuais
  const [manualBookings, setManualBookings] = useState<ManualBooking[]>([
    { id: "mb-1", customerName: "Rafael Lima (Turma Terça)", courtId: "areia-4", date: "2026-10-20", time: "18:00", price: 40.0, paymentMethod: "Balcão (Cartão)" },
    { id: "mb-2", customerName: "Diego Santos", courtId: "futebol-1", date: "2026-10-20", time: "20:00", price: 80.0, paymentMethod: "WhatsApp (Pix Arena)" },
    { id: "mb-3", customerName: "Lucas Vôlei", courtId: "areia-2", date: "2026-10-19", time: "17:00", price: 40.0, paymentMethod: "Balcão (Dinheiro)" },
    { id: "mb-4", customerName: "Clube BT Fortaleza", courtId: "areia-1", date: "2026-10-18", time: "19:00", price: 60.0, paymentMethod: "WhatsApp (Pix Arena)" },
  ]);

  // Form de Lançamento Manual
  const [manualName, setManualName] = useState("");
  const [manualCourt, setManualCourt] = useState("areia-1");
  const [manualDate, setManualDate] = useState("2026-10-20");
  const [manualTime, setManualTime] = useState("19:00");
  const [manualPrice, setManualPrice] = useState("60.00");
  const [manualMethod, setManualMethod] = useState<PaymentMethodType>("WhatsApp (Pix Arena)");

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const savedWeekly = localStorage.getItem("viva_weekly_locks");
      if (savedWeekly) setWeeklyLocks(JSON.parse(savedWeekly));

      const savedDates = localStorage.getItem("viva_date_locks");
      if (savedDates) setDateLocks(JSON.parse(savedDates));

      const savedUnlocks = localStorage.getItem("viva_date_unlocks");
      if (savedUnlocks) setDateUnlocks(JSON.parse(savedUnlocks));

      const savedPrices = localStorage.getItem("viva_prices");
      if (savedPrices) setCourtsPricing(JSON.parse(savedPrices));

      const savedManual = localStorage.getItem("viva_manual_bookings");
      if (savedManual) setManualBookings(JSON.parse(savedManual));
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

    const newMB: ManualBooking = {
      id: `mb-${Date.now()}`,
      customerName: manualName,
      courtId: manualCourt,
      date: manualDate,
      time: manualTime,
      price: parseFloat(manualPrice) || 0,
      paymentMethod: manualMethod,
    };

    const updatedMB = [newMB, ...manualBookings];
    setManualBookings(updatedMB);

    const dateKey = `${manualCourt}-${manualDate}`;
    const updatedDateLocks = {
      ...dateLocks,
      [dateKey]: [...(dateLocks[dateKey] || []), manualTime],
    };
    setDateLocks(updatedDateLocks);

    localStorage.setItem("viva_manual_bookings", JSON.stringify(updatedMB));
    localStorage.setItem("viva_date_locks", JSON.stringify(updatedDateLocks));

    setManualName("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("viva_weekly_locks", JSON.stringify(weeklyLocks));
      localStorage.setItem("viva_date_locks", JSON.stringify(dateLocks));
      localStorage.setItem("viva_date_unlocks", JSON.stringify(dateUnlocks));
      localStorage.setItem("viva_prices", JSON.stringify(courtsPricing));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Erro ao salvar dados localmente.");
    }
  };

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

  const specificDayName = daysOfWeek.find((d) => d.id === getDayOfWeekFromDate(specificDate))?.label;

  // Métricas do Dashboard calculadas conforme o período
  const getMetricsByPeriod = () => {
    if (dashboardPeriod === "hoje") {
      return {
        onlineCount: 4,
        onlineRevenue: 252.0,
        manualCount: 2,
        manualRevenue: 120.0,
        primeOccupancy: 85,
        afternoonOccupancy: 42,
      };
    }
    if (dashboardPeriod === "7dias") {
      return {
        onlineCount: 26,
        onlineRevenue: 1680.0,
        manualCount: 9,
        manualRevenue: 540.0,
        primeOccupancy: 91,
        afternoonOccupancy: 38,
      };
    }
    // 'mes'
    const manualRev = manualBookings.reduce((acc, b) => acc + b.price, 0);
    return {
      onlineCount: 98,
      onlineRevenue: 6240.0,
      manualCount: manualBookings.length,
      manualRevenue: manualRev > 0 ? manualRev : 1100.0,
      primeOccupancy: 88,
      afternoonOccupancy: 35,
    };
  };

  const metrics = getMetricsByPeriod();
  const totalCount = metrics.onlineCount + metrics.manualCount;
  const totalRevenue = metrics.onlineRevenue + metrics.manualRevenue;
  const onlinePercent = Math.round((metrics.onlineCount / (totalCount || 1)) * 100);
  const manualPercent = 100 - onlinePercent;

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
      {/* Contêiner amplo que se adapta perfeitamente ao Desktop (max-w-5xl) e ao Celular */}
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* Topo do Gestor */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 border rounded-xl hover:bg-slate-50 text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-slate-900 text-lg">Painel de Gestão & Métricas</h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-[#041E8C] px-2 py-0.5 rounded-full border border-blue-200">
                  <Monitor className="w-3 h-3" /> Modo Desktop & Mobile
                </span>
              </div>
              <p className="text-xs text-slate-500">{currentArena.name} • Visão Operacional e Estratégica</p>
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
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setAdminTab("dashboard")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "dashboard" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard & Indicadores
          </button>
          <button
            onClick={() => setAdminTab("manual")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "manual" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            + Reserva Balcão
          </button>
          <button
            onClick={() => setAdminTab("settings")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "settings" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Travas & Preços
          </button>
        </div>

        {/* ========================================================= */}
        {/* ABA 1: DASHBOARD INTERATIVO (DESKTOP + MOBILE)            */}
        {/* ========================================================= */}
        {adminTab === "dashboard" && (
          <div className="space-y-4">
            
            {/* Barra de Filtro Interativo por Período */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-4 h-4 text-[#041E8C]" />
                <span>Filtrar período do relatório:</span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setDashboardPeriod("hoje")}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                    dashboardPeriod === "hoje" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardPeriod("7dias")}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                    dashboardPeriod === "7dias" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardPeriod("mes")}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                    dashboardPeriod === "mes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mês Completo
                </button>
              </div>
            </div>

            {/* Grade de Indicadores Principais (4 Colunas no Desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faturamento Total</span>
                <p className="text-2xl font-black text-[#041E8C]">R\$ {totalRevenue.toFixed(2)}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Receita bruta
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total de Reservas</span>
                <p className="text-2xl font-black text-slate-900">{totalCount} jogos</p>
                <span className="text-[10px] text-slate-500 font-medium">Online + Balcão</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ocupação Horário Nobre</span>
                <p className="text-2xl font-black text-emerald-600">{metrics.primeOccupancy}%</p>
                <span className="text-[10px] text-slate-500 font-medium">19h às 22h</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ocupação Tarde (Promo)</span>
                <p className="text-2xl font-black text-amber-600">{metrics.afternoonOccupancy}%</p>
                <span className="text-[10px] text-slate-500 font-medium">16h às 19h</span>
              </div>
            </div>

            {/* Comparativo Detalhado: Online vs Balcão/WhatsApp (Lado a Lado no Desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card Online */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Reservas Online (Site)</h3>
                      <p className="text-[10px] text-slate-400">Pix automatizado com taxa de serviço</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                    {onlinePercent}% do total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Volume</span>
                    <strong className="text-base text-slate-800">{metrics.onlineCount} agendamentos</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Faturamento Líquido</span>
                    <strong className="text-base text-emerald-700">R\$ {metrics.onlineRevenue.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${onlinePercent}%` }}></div>
                </div>
              </div>

              {/* Card Balcão / WhatsApp */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#041E8C] flex items-center justify-center">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Reservas Balcão / WhatsApp</h3>
                      <p className="text-[10px] text-slate-400">Lançadas manualmente pela recepção</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-blue-50 text-[#041E8C] px-2.5 py-1 rounded-full border border-blue-200">
                    {manualPercent}% do total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Volume</span>
                    <strong className="text-base text-slate-800">{metrics.manualCount} agendamentos</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Faturamento Recebido</span>
                    <strong className="text-base text-[#041E8C]">R\$ {metrics.manualRevenue.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-[#041E8C] rounded-full" style={{ width: `${manualPercent}%` }}></div>
                </div>
              </div>
            </div>

            {/* Oportunidades & Distribuição de Quadras (Grade 2 Colunas no Desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Diagnóstico Inteligente */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#041E8C]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#041E8C]">
                    Oportunidades de Faturamento para o CT Viva Esportes
                  </h3>
                </div>
                <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong>Horário das 16:00:</strong> Ocupação em {metrics.afternoonOccupancy}%. A tarifa promocional de R\$ 40 estimula reservas, mas criar parcerias com colégios ou personal trainers pode dobrar o preenchimento.
                  </li>
                  <li>
                    <strong>Futebol Society:</strong> Alta demanda nos horários das 19h e 20h. O campo apresenta receita média por hora 33% superior às quadras de areia.
                  </li>
                  <li>
                    <strong>Adoção Digital:</strong> Com {onlinePercent}% das reservas vindo pelo site, a recepção eliminou a conferência manual de comprovantes de Pix para a maioria dos clientes.
                  </li>
                </ul>
              </div>

              {/* Ocupação por Espaço */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Desempenho por Espaço da Arena
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "Campo Society", rate: 85, color: "bg-[#041E8C]" },
                    { name: "Quadra 1 e 2 (Areia Principal)", rate: 78, color: "bg-emerald-500" },
                    { name: "Quadra 3 e 4 (Areia)", rate: 65, color: "bg-teal-500" },
                    { name: "Quadra 5 e 6 (Areia)", rate: 52, color: "bg-amber-500" },
                  ].map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{item.name}</span>
                        <span>{item.rate}% ocupado</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.rate}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: RESERVA MANUAL                                     */}
        {/* ========================================================= */}
        {adminTab === "manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Formulário de Lançamento */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  + Nova Reserva Balcão
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Trava a quadra no site imediatamente.
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
                  <label className="font-bold text-slate-600 block mb-1">Valor (R\$)</label>
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

            {/* Tabela de Histórico (Mais Ampla no Desktop) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Histórico de Lançamentos Manuais ({manualBookings.length})
              </h3>
              <div className="space-y-2">
                {manualBookings.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-800 block text-xs">{b.customerName}</strong>
                      <span className="text-[10px] text-slate-500">
                        {allCourtsList.find((c) => c.id === b.courtId)?.name} • {b.date} às {b.time}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#041E8C] block text-sm">R\$ {b.price.toFixed(2)}</span>
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
        {/* ABA 3: CONFIGURAÇÕES, PREÇOS E TRAVAS                      */}
        {/* ========================================================= */}
        {adminTab === "settings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Tabela de Preços */}
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
                        <span className="text-xs text-slate-400 font-semibold">R\$</span>
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

              {/* Materiais */}
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
                        <span className="text-xs text-slate-400 font-semibold">R\$</span>
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
                        Dia: {specificDayName}
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
                        <>Grade de <strong>{specificDate} ({specificDayName})</strong> na <strong>{allCourtsList.find((c) => c.id === selectedAdminCourtId)?.name}</strong>:</>
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