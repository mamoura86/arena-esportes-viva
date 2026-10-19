"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { 
  Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check, 
  KeyRound, ShieldAlert, Package, Repeat, Sparkles,
  BarChart3, PlusCircle, TrendingUp
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

  const [adminTab, setAdminTab] = useState<"dashboard" | "manual" | "settings">("dashboard");

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

  const [selectedAdminCourtId, setSelectedAdminCourtId] = useState("areia-4");
  const [lockMode, setLockMode] = useState<"weekly" | "specific">("weekly");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(2);
  const [specificDate, setSpecificDate] = useState("2026-10-20");

  const [weeklyLocks, setWeeklyLocks] = useState<{ [key: string]: string[] }>({});
  const [dateLocks, setDateLocks] = useState<{ [key: string]: string[] }>({});
  const [dateUnlocks, setDateUnlocks] = useState<{ [key: string]: string[] }>({});

  const [manualBookings, setManualBookings] = useState<ManualBooking[]>([
    { id: "mb-1", customerName: "Rafael Lima (Turma Terça)", courtId: "areia-4", date: "2026-10-20", time: "18:00", price: 40.0, paymentMethod: "Balcão (Cartão)" },
    { id: "mb-2", customerName: "Diego Santos", courtId: "futebol-1", date: "2026-10-20", time: "20:00", price: 80.0, paymentMethod: "WhatsApp (Pix Arena)" },
  ]);

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
  const totalManualIncome = manualBookings.reduce((acc, b) => acc + b.price, 0);
  const estimatedOnlineIncome = 740.0;
  const totalRevenue = totalManualIncome + estimatedOnlineIncome;

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
    <main className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 text-slate-800 pb-20">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 border rounded-xl hover:bg-slate-50 text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-slate-900 text-lg">Painel do Gestor</h1>
              <p className="text-xs text-slate-500">{currentArena.name} • Gestão Inteligente</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="px-3.5 py-2 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl text-xs flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            {savedSuccess ? "Salvo!" : "Salvar Alterações"}
          </button>
        </div>

        {/* Abas */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setAdminTab("dashboard")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "dashboard" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard & Ocupação
          </button>
          <button
            onClick={() => setAdminTab("manual")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "manual" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + Reserva Balcão
          </button>
          <button
            onClick={() => setAdminTab("settings")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              adminTab === "settings" ? "bg-white text-[#041E8C] shadow-sm font-black" : "text-slate-600"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Travas & Preços
          </button>
        </div>

        {/* ABA 1: DASHBOARD */}
        {adminTab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Faturamento Estimado</span>
                <p className="text-xl font-black text-[#041E8C]">R$ {totalRevenue.toFixed(2)}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +18% este mês
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Reservas pelo Site</span>
                <p className="text-xl font-black text-emerald-600">74%</p>
                <span className="text-[10px] text-slate-400">Pix automatizado</span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Ocupação Horário Nobre</span>
                <p className="text-xl font-black text-amber-600">88%</p>
                <span className="text-[10px] text-slate-400">19h às 22h</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#041E8C]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#041E8C]">
                  Oportunidades de Faturamento para o CT Viva Esportes
                </h3>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li>
                  <strong>Horário das 16:00:</strong> Ocupação atual de apenas <strong>32%</strong>. Recomendado manter a tarifa promocional de R$ 40 ou criar pacotes de escolinha infantil.
                </li>
                <li>
                  <strong>Quadra de Society:</strong> Alta procura nas terças e quintas às 20h. Avaliar abertura de horários extras às 22h.
                </li>
                <li>
                  <strong>Aluguel de Raquetes:</strong> R$ 145 faturados no mês com material esportivo sem custo operacional adicional.
                </li>
              </ul>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Taxa de Ocupação por Espaço
              </h3>
              <div className="space-y-2.5">
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
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.rate}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: RESERVA MANUAL */}
        {adminTab === "manual" && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Lançar Reserva Feita por Fora (Balcão ou WhatsApp)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  O horário lançado aqui será travado no site imediatamente para evitar reservas duplicadas de outros clientes.
                </p>
              </div>

              <form onSubmit={handleAddManualBooking} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-600 block mb-1">Nome do Cliente / Turma</label>
                  <input
                    type="text"
                    placeholder="Ex: Turma do André, Rafael Beach..."
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-[#041E8C] outline-none"
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
                  <label className="font-bold text-slate-600 block mb-1">Valor Cobrado (R$)</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-600 block mb-1">Origem / Como Pagou</label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value as PaymentMethodType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="WhatsApp (Pix Arena)">WhatsApp (Pix Direto da Arena)</option>
                    <option value="Balcão (Cartão)">Balcão (Cartão de Débito/Crédito)</option>
                    <option value="Balcão (Dinheiro)">Balcão (Dinheiro em Espécie)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-bold rounded-xl shadow transition"
                  >
                    Salvar Reserva e Bloquear no Site
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Histórico de Reservas Externas ({manualBookings.length})
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
                      <span className="font-bold text-[#041E8C] block">R$ {b.price.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {b.paymentMethod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: TRAVAS & PREÇOS */}
        {adminTab === "settings" && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                1. Tabela de Preços por Hora
              </h2>
              <div className="grid grid-cols-1 gap-2.5">
                {courtsPricing.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-semibold">R$</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleCourtPriceChange(item.id, e.target.value)}
                        className="w-20 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:ring-1 focus:ring-[#041E8C] outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                2. Preço de Aluguel dos Materiais
              </h2>
              <div className="grid grid-cols-1 gap-2.5">
                {equipmentsPricing.map((equip) => (
                  <div key={equip.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{equip.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-semibold">R$</span>
                      <input
                        type="number"
                        value={equip.price}
                        onChange={(e) => handleEquipmentPriceChange(equip.id, e.target.value)}
                        className="w-20 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:ring-1 focus:ring-[#041E8C] outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  3. Trava e Destrava de Horários
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure mensalistas fixos no modo semanal ou destrave pontualmente em datas específicas.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                  Selecione a Quadra:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {allCourtsList.map((court) => {
                    const isSelected = selectedAdminCourtId === court.id;
                    return (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => setSelectedAdminCourtId(court.id)}
                        className={`text-xs p-2.5 rounded-xl border font-bold transition text-center ${
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