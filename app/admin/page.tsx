"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Lock, Unlock, Calendar, Clock, 
  PlusCircle, RefreshCw, CheckCircle2, XCircle, 
  Phone, User, ShieldCheck, Tag, Info, DollarSign,
  TrendingUp, BarChart3, Filter, Search, Edit3, X, Sparkles
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
  date: string;
  time: string;
  price: number;
  channel: "online" | "manual";
  paymentMethod: string;
  status: "confirmada" | "cancelada";
  createdAt?: string;
}

const AREIA_SPORTS = ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"];

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

const daysOfWeek = [
  { id: 1, name: "Segunda" },
  { id: 2, name: "Terça" },
  { id: 3, name: "Quarta" },
  { id: 4, name: "Quinta" },
  { id: 5, name: "Sexta" },
  { id: 6, name: "Sábado" },
  { id: 0, name: "Domingo" },
];

const HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "locks" | "bookings" | "prices">("grid");
  const [loading, setLoading] = useState(true);

  // Estados Nuvem Supabase
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cloudLocks, setCloudLocks] = useState<any[]>([]);

  // Filtros da Visão de Grade
  const [gridDate, setGridDate] = useState("");

  // Modal de Ação Rápida ao Clicar na Célula da Grade
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [modalCourt, setModalCourt] = useState<Court | null>(null);
  const [modalTime, setModalTime] = useState("");
  const [modalActionType, setModalActionType] = useState<"booking" | "lock">("booking");
  
  // Campos do Modal Rápido - Balcão
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickPrice, setQuickPrice] = useState("50");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("Dinheiro / Balcão");

  // Campos do Modal Rápido - Trava
  const [quickLockReason, setQuickLockReason] = useState("Aula / Manutenção");
  const [quickLockType, setQuickLockType] = useState<"date" | "weekly">("date");

  // Formulário Nova Trava (Aba Travas)
  const [lockTargetType, setLockTargetType] = useState<"weekly" | "date">("weekly");
  const [selectedCourtId, setSelectedCourtId] = useState(allCourts[0].id);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [selectedLockDate, setSelectedLockDate] = useState("");
  const [selectedLockTime, setSelectedLockTime] = useState("18:00");
  const [lockReason, setLockReason] = useState("Aula / Treino Fixo");

  // Gestão de Preços
  const [priceSocietyPromo, setPriceSocietyPromo] = useState("60");
  const [priceSocietyNormal, setPriceSocietyNormal] = useState("80");
  const [priceAreiaPromo, setPriceAreiaPromo] = useState("40");
  const [priceAreiaNormal, setPriceAreiaNormal] = useState("60");
  const [priceRaquete, setPriceRaquete] = useState("10");
  const [priceMikasaPro, setPriceMikasaPro] = useState("10");
  const [pricesSavedMsg, setPricesSavedMsg] = useState(false);

  // Busca
  const [searchQuery, setSearchQuery] = useState("");

  const isWeekendOrHoliday = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split("-").map(Number);
    const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    if (day === 0 || day === 6) return true;
    const monthDay = dateStr.substring(5);
    return HOLIDAYS.includes(monthDay);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: bData } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bData) {
        setBookings(
          bData.map((b) => ({
            id: b.id,
            code: b.code,
            customerName: b.customer_name,
            customerPhone: b.customer_phone,
            courtId: b.court_id,
            courtName: b.court_name,
            date: b.booking_date,
            time: b.booking_time,
            price: Number(b.price),
            channel: b.channel as "online" | "manual",
            paymentMethod: b.payment_method,
            status: b.status as "confirmada" | "cancelada",
            createdAt: b.created_at,
          }))
        );
      }

      const { data: lData } = await supabase.from("court_locks").select("*");
      if (lData) {
        setCloudLocks(lData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const today = new Date().toISOString().split("T")[0];
    setGridDate(today);
    setSelectedLockDate(today);
    loadData();
  }, []);

  const confirmedBookings = bookings.filter((b) => b.status === "confirmada");
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.price, 0);
  const onlineBookingsCount = confirmedBookings.filter((b) => b.channel === "online").length;
  const manualBookingsCount = confirmedBookings.filter((b) => b.channel === "manual").length;
  const cancelledBookingsCount = bookings.filter((b) => b.status === "cancelada").length;

  const handleCellClick = (court: Court, hour: string, statusType: string) => {
    if (statusType !== "free") return;
    setModalCourt(court);
    setModalTime(hour);
    
    const h = parseInt(hour.split(":")[0], 10);
    const isPromoSlot = h >= 16 && h < 19;
    const hasDiscount = isPromoSlot && !isWeekendOrHoliday(gridDate);

    if (court.type === "society") {
      setQuickPrice(hasDiscount ? priceSocietyPromo : priceSocietyNormal);
    } else {
      setQuickPrice(hasDiscount ? priceAreiaPromo : priceAreiaNormal);
    }
    
    setQuickCustomerName("");
    setQuickCustomerPhone("");
    setSlotModalOpen(true);
  };

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCourt) return;

    if (modalActionType === "booking") {
      if (!quickCustomerName.trim()) {
        alert("Informe o nome do cliente.");
        return;
      }
      const newCode = `VIVA-M${Math.floor(100 + Math.random() * 900)}`;
      const newId = `manual-${Date.now()}`;

      try {
        const { error } = await supabase.from("bookings").insert({
          id: newId,
          code: newCode,
          customer_name: quickCustomerName.trim(),
          customer_phone: quickCustomerPhone.trim() || null,
          court_id: modalCourt.id,
          court_name: modalCourt.name,
          booking_date: gridDate,
          booking_time: modalTime,
          price: parseFloat(quickPrice) || 0,
          channel: "manual",
          payment_method: quickPaymentMethod,
          status: "confirmada",
        });

        if (error) throw error;
        setSlotModalOpen(false);
        await loadData();
      } catch (err) {
        console.error(err);
        alert("Erro ao lançar reserva.");
      }
    } else {
      const parts = gridDate.split("-").map(Number);
      const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      const lockId = quickLockType === "weekly"
        ? `${modalCourt.id}-weekly-${dayOfWeek}-${modalTime}`
        : `${modalCourt.id}-date-${gridDate}-${modalTime}`;

      try {
        const { error } = await supabase.from("court_locks").upsert({
          id: lockId,
          court_id: modalCourt.id,
          lock_type: quickLockType,
          day_of_week: quickLockType === "weekly" ? dayOfWeek : null,
          lock_date: quickLockType === "date" ? gridDate : null,
          lock_time: modalTime,
          reason: quickLockReason.trim() || "Bloqueio Rápido",
        });

        if (error) throw error;
        setSlotModalOpen(false);
        await loadData();
      } catch (err) {
        console.error(err);
        alert("Erro ao aplicar bloqueio.");
      }
    }
  };

  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockId = lockTargetType === "weekly"
      ? `${selectedCourtId}-weekly-${selectedDayOfWeek}-${selectedLockTime}`
      : `${selectedCourtId}-date-${selectedLockDate}-${selectedLockTime}`;

    try {
      const { error } = await supabase.from("court_locks").upsert({
        id: lockId,
        court_id: selectedCourtId,
        lock_type: lockTargetType,
        day_of_week: lockTargetType === "weekly" ? selectedDayOfWeek : null,
        lock_date: lockTargetType === "date" ? selectedLockDate : null,
        lock_time: selectedLockTime,
        reason: lockReason.trim() || "Bloqueio Gestor",
      });

      if (error) throw error;
      await loadData();
      alert("Bloqueio salvo com sucesso na nuvem!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar bloqueio.");
    }
  };

  const handleRemoveLock = async (id: string) => {
    if (!confirm("Deseja realmente remover este bloqueio?")) return;
    try {
      const { error } = await supabase.from("court_locks").delete().eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover bloqueio.");
    }
  };

  const handleToggleBookingStatus = async (booking: BookingRecord) => {
    const nextStatus = booking.status === "confirmada" ? "cancelada" : "confirmada";
    const msg = nextStatus === "cancelada"
      ? `Deseja CANCELAR a reserva ${booking.code}? O horário será liberado novamente.`
      : `Deseja reativar a reserva ${booking.code}?`;

    if (!confirm(msg)) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: nextStatus })
        .eq("id", booking.id);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status.");
    }
  };

  const getSlotStatus = (courtId: string, time: string, dateStr: string) => {
    const booking = bookings.find(
      (b) => b.courtId === courtId && b.date === dateStr && b.time === time && b.status === "confirmada"
    );
    if (booking) {
      return { type: "booked", label: booking.customerName, sub: booking.code, channel: booking.channel };
    }

    const parts = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();

    const lock = cloudLocks.find((l) => {
      if (l.court_id !== courtId || l.lock_time !== time) return false;
      if (l.lock_type === "weekly" && l.day_of_week === dayOfWeek) return true;
      if (l.lock_type === "date" && l.lock_date === dateStr) return true;
      return false;
    });

    if (lock) {
      return { type: "locked", label: lock.reason || "Bloqueado", sub: "Gestão" };
    }

    return { type: "free", label: "+ Reservar", sub: "" };
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      b.courtName.toLowerCase().includes(q)
    );
  });

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Site</span>
            </Link>
            <h1 className="text-base font-black tracking-wide text-white uppercase italic">
              Painel do Gestor (Nuvem)
            </h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Receita Total</p>
              <p className="text-lg font-black text-[#041E8C]">R$ {totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#041E8C] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Confirmadas</p>
              <p className="text-lg font-black text-slate-800">{confirmedBookings.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Origem</p>
              <p className="text-xs font-bold text-slate-700">
                <span className="text-emerald-600">{onlineBookingsCount} Site</span> / {manualBookingsCount} Balcão
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Canceladas</p>
              <p className="text-lg font-black text-red-600">{cancelledBookingsCount}</p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "grid" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#00E599]" />
            Grade Diária (Clique para Lançar)
          </button>
          <button
            onClick={() => setActiveTab("locks")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "locks" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-4 h-4 text-[#00E599]" />
            Bloqueios e Aulas ({cloudLocks.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "bookings" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-[#00E599]" />
            Histórico de Reservas ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("prices")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "prices" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign className="w-4 h-4 text-[#00E599]" />
            Gestão de Preços & Acessórios
          </button>
        </div>

        {/* 1. ABA: MAPA DE QUADRAS COM CLIQUE RÁPIDO */}
        {activeTab === "grid" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
                  <span>Grade Diária de Quadras</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Clique no horário livre para lançar
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Clique em qualquer horário disponível para lançar balcão ou aplicar uma trava</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={gridDate}
                  onChange={(e) => setGridDate(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                />
              </div>
            </div>

            {/* Legenda */}
            <div className="flex gap-4 text-xs pt-1 pb-2 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Livre (Clique para Agendar)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span className="text-slate-600 font-medium">Reservado Site</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-slate-600 font-medium">Reservado Balcão</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                <span className="text-slate-600 font-medium">Aula / Trava</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-2.5 text-left font-bold text-slate-600 bg-slate-50 sticky left-0 z-10 min-w-[150px]">
                      Quadra / Espaço
                    </th>
                    {businessHours.map((h) => (
                      <th key={h} className="p-2.5 text-center font-bold text-slate-600 min-w-[110px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allCourts.map((court) => (
                    <tr key={court.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800 bg-white sticky left-0 z-10 border-r border-slate-100">
                        {court.name}
                      </td>
                      {businessHours.map((hour) => {
                        const slot = getSlotStatus(court.id, hour, gridDate);
                        const isFree = slot.type === "free";

                        return (
                          <td key={hour} className="p-1.5 text-center">
                            {isFree ? (
                              <button
                                type="button"
                                onClick={() => handleCellClick(court, hour, slot.type)}
                                className="w-full p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px] transition cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 shadow-sm"
                              >
                                <span>+ Livre</span>
                                <span className="text-[9px] text-emerald-600 font-semibold">Agendar</span>
                              </button>
                            ) : slot.type === "booked" ? (
                              <div className={`p-2 rounded-xl border text-[10px] font-bold truncate ${
                                slot.channel === "online"
                                  ? "bg-blue-50 border-blue-200 text-blue-900"
                                  : "bg-amber-50 border-amber-200 text-amber-900"
                              }`} title={`${slot.label} (${slot.sub})`}>
                                <p className="truncate">{slot.label}</p>
                                <span className="text-[9px] font-mono opacity-70">{slot.sub}</span>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-bold truncate" title={slot.label}>
                                <p className="truncate">{slot.label}</p>
                                <span className="text-[9px] opacity-70">Trava</span>
                              </div>
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

        {/* 2. ABA: BLOQUEIOS E AULAS */}
        {activeTab === "locks" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#00E599]" />
                Novo Bloqueio
              </h2>

              <form onSubmit={handleAddLock} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Tipo de Bloqueio
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLockTargetType("weekly")}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        lockTargetType === "weekly"
                          ? "bg-[#041E8C] text-white border-[#041E8C]"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      Semanal / Fixo
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockTargetType("date")}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        lockTargetType === "date"
                          ? "bg-[#041E8C] text-white border-[#041E8C]"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      Data Específica
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Quadra
                  </label>
                  <select
                    value={selectedCourtId}
                    onChange={(e) => setSelectedCourtId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {allCourts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {lockTargetType === "weekly" ? (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Dia da Semana
                    </label>
                    <select
                      value={selectedDayOfWeek}
                      onChange={(e) => setSelectedDayOfWeek(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    >
                      {daysOfWeek.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={selectedLockDate}
                      onChange={(e) => setSelectedLockDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Horário
                  </label>
                  <select
                    value={selectedLockTime}
                    onChange={(e) => setSelectedLockTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {businessHours.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Motivo / Descrição
                  </label>
                  <input
                    type="text"
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="Ex: Aula de Futevôlei / Mensalista"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#041E8C] hover:bg-[#031566] text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#00E599]" />
                  Bloquear na Nuvem
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Bloqueios Ativos ({cloudLocks.length})
                </h2>
                <span className="text-[11px] text-slate-500">Sincronizado via Supabase</span>
              </div>

              {cloudLocks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhum bloqueio cadastrado.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {cloudLocks.map((lock) => {
                    const court = allCourts.find((c) => c.id === lock.court_id);
                    const dayName = lock.day_of_week !== null 
                      ? daysOfWeek.find((d) => d.id === lock.day_of_week)?.name 
                      : "";

                    return (
                      <div
                        key={lock.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#041E8C]">
                              {court?.name || lock.court_id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              lock.lock_type === "weekly" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {lock.lock_type === "weekly" ? `Toda ${dayName}` : lock.lock_date}
                            </span>
                            <span className="font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {lock.lock_time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Motivo: <strong>{lock.reason}</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLock(lock.id)}
                          className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition flex items-center gap-1 shrink-0 text-xs"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Desbloquear
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ABA: HISTÓRICO DE RESERVAS */}
        {activeTab === "bookings" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Histórico Completo ({filteredBookings.length})
                </h2>
                <p className="text-xs text-slate-500">Reservas realizadas pelo site (Pix) e inseridas pelo balcão</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar cliente, código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma reserva encontrada.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                      b.status === "confirmada" ? "bg-slate-50 border-slate-200" : "bg-red-50/50 border-red-200 opacity-70"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#041E8C] text-sm">
                            {b.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {b.status === "confirmada" ? "Confirmada" : "Cancelada"}
                          </span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                            {b.channel === "online" ? "Site (Pix)" : `Balcão (${b.paymentMethod})`}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 mt-1">{b.customerName}</p>
                        {b.customerPhone && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {b.customerPhone}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-black text-[#041E8C] text-sm">
                          R$ {b.price.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {b.date} às {b.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-600 font-medium">
                        {b.courtName}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleBookingStatus(b)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                          b.status === "confirmada"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {b.status === "confirmada" ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar Reserva
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Reativar Reserva
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. ABA: GESTÃO DE PREÇOS & ACESSÓRIOS */}
        {activeTab === "prices" && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#00E599]" />
                Tabela de Preços, Regras e Acessórios
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores de locação e adicionais configurados para a arena.
              </p>
            </div>

            {/* Aviso Regra de Fim de Semana / Feriado */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Regra Automática de Tarifas:</strong> O valor promocional (16h às 19h) aplica-se exclusivamente de <strong>Segunda a Sexta-feira</strong>. Aos Sábados, Domingos e Feriados o sistema cobra automaticamente o valor integral/normal em qualquer horário.
              </div>
            </div>

            {pricesSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Preços e parâmetros atualizados com sucesso!
              </div>
            )}

            <div className="space-y-4">
              {/* Futebol Society */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Campo de Futebol Society (Grama Sintética)
                  </h3>
                  </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Promocional Seg a Sex (16h às 19h)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={priceSocietyPromo}
                        onChange={(e) => setPriceSocietyPromo(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Normal / Noite / Fim de Semana
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={priceSocietyNormal}
                        onChange={(e) => setPriceSocietyNormal(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quadras de Areia com Carimba */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Quadras de Areia (Beach Tennis / Vôlei / Futevôlei / Carimba)
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Promocional Seg a Sex (16h às 19h)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={priceAreiaPromo}
                        onChange={(e) => setPriceAreiaPromo(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Normal / Noite / Fim de Semana
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={priceAreiaNormal}
                        onChange={(e) => setPriceAreiaNormal(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Aluguel de Acessórios & Itens Inclusos */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Preços de Aluguel de Equipamentos Opcionais
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Aluguel Raquete Beach Tennis (un.)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={priceRaquete}
                        onChange={(e) => setPriceRaquete(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">Bolas inclusas grátis</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Upgrade: Aluguel Bola Mikasa Pro
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={priceMikasaPro}
                        onChange={(e) => setPriceMikasaPro(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-1 block">Bola padrão do CT já é grátis</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">Materiais 100% Inclusos sem custo adicional:</p>
                  <p>• <strong>Futevôlei:</strong> Bolas inclusas na locação.</p>
                  <p>• <strong>Carimba:</strong> Bolas inclusas na locação.</p>
                  <p>• <strong>Beach Tennis:</strong> Bolas inclusas (apenas raquete é opcional paga).</p>
                  <p>• <strong>Vôlei de Praia:</strong> Bola comum inclusa (Mikasa Pro opcional paga).</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPricesSavedMsg(true);
                setTimeout(() => setPricesSavedMsg(false), 3000);
              }}
              className="w-full py-3 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Alterações de Preços e Acessórios
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE AÇÃO RÁPIDA (CLIQUE NA GRADE) */}
      {slotModalOpen && modalCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-[#041E8C] uppercase">
                  Agendar / Bloquear Horário
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalCourt.name} • <strong>{gridDate}</strong> às <strong>{modalTime}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setModalActionType("booking")}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${
                  modalActionType === "booking" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
                }`}
              >
                Lançar Reserva (Balcão)
              </button>
              <button
                type="button"
                onClick={() => setModalActionType("lock")}
                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${
                  modalActionType === "lock" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
                }`}
              >
                Travar Horário / Aula
              </button>
            </div>

            <form onSubmit={handleSaveQuickAction} className="space-y-3">
              {modalActionType === "booking" ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Nome do Atleta / Cliente
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Paulo"
                      value={quickCustomerName}
                      onChange={(e) => setQuickCustomerName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      WhatsApp (Opcional)
                    </label>
                    <input
                      type="tel"
                      placeholder="85999999999"
                      value={quickCustomerPhone}
                      onChange={(e) => setQuickCustomerPhone(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                        Valor Cobrado (R$)
                      </label>
                      <input
                        type="number"
                        value={quickPrice}
                        onChange={(e) => setQuickPrice(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                        Pagamento
                      </label>
                      <select
                        value={quickPaymentMethod}
                        onChange={(e) => setQuickPaymentMethod(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                      >
                        <option value="Dinheiro / Balcão">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Pix Balcão">Pix Balcão</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Reserva na Nuvem
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Frequência do Bloqueio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickLockType("date")}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                          quickLockType === "date" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Apenas nesta Data ({gridDate})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickLockType("weekly")}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                          quickLockType === "weekly" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Toda Semana Neste Dia
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Motivo do Bloqueio
                    </label>
                    <input
                      type="text"
                      value={quickLockReason}
                      onChange={(e) => setQuickLockReason(e.target.value)}
                      placeholder="Ex: Aula de Futevôlei / Manutenção"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#041E8C] hover:bg-[#031566] text-white font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#00E599]" />
                    Salvar Trava na Nuvem
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}