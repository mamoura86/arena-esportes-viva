"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Lock, Unlock, Calendar, Clock, 
  PlusCircle, RefreshCw, CheckCircle2, XCircle, 
  Phone, User, ShieldCheck, Tag, Info, DollarSign,
  TrendingUp, BarChart3, Filter, Search
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

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "locks" | "bookings" | "manual">("grid");
  const [loading, setLoading] = useState(true);

  // Estados Nuvem Supabase
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cloudLocks, setCloudLocks] = useState<any[]>([]);

  // Filtros da Visão de Grade
  const [gridDate, setGridDate] = useState("");

  // Formulário Nova Trava
  const [lockTargetType, setLockTargetType] = useState<"weekly" | "date">("weekly");
  const [selectedCourtId, setSelectedCourtId] = useState(allCourts[0].id);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [selectedLockDate, setSelectedLockDate] = useState("");
  const [selectedLockTime, setSelectedLockTime] = useState("18:00");
  const [lockReason, setLockReason] = useState("Aula / Treino Fixo");

  // Formulário Reserva Manual (Balcão)
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualCourtId, setManualCourtId] = useState(allCourts[0].id);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("18:00");
  const [manualPrice, setManualPrice] = useState("50");
  const [manualPayment, setManualPayment] = useState("Dinheiro / Balcão");

  // Filtro de Busca nas Reservas
  const [searchQuery, setSearchQuery] = useState("");

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
    setManualDate(today);
    loadData();
  }, []);

  // Métricas
  const confirmedBookings = bookings.filter((b) => b.status === "confirmada");
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.price, 0);
  const onlineBookingsCount = confirmedBookings.filter((b) => b.channel === "online").length;
  const manualBookingsCount = confirmedBookings.filter((b) => b.channel === "manual").length;
  const cancelledBookingsCount = bookings.filter((b) => b.status === "cancelada").length;

  // Trava / Desbloqueio
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

  // Reserva Balcão
  const handleAddManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    const courtObj = allCourts.find((c) => c.id === manualCourtId);
    const newCode = `VIVA-M${Math.floor(100 + Math.random() * 900)}`;
    const newId = `manual-${Date.now()}`;

    try {
      const { error } = await supabase.from("bookings").insert({
        id: newId,
        code: newCode,
        customer_name: manualName.trim(),
        customer_phone: manualPhone.trim() || null,
        court_id: manualCourtId,
        court_name: courtObj?.name || "Quadra",
        booking_date: manualDate,
        booking_time: manualTime,
        price: parseFloat(manualPrice) || 0,
        channel: "manual",
        payment_method: manualPayment,
        status: "confirmada",
      });

      if (error) throw error;
      setManualName("");
      setManualPhone("");
      await loadData();
      alert("Reserva lançada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao lançar reserva.");
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

  // Verificar estado da quadra para a grade visual
  const getSlotStatus = (courtId: string, time: string, dateStr: string) => {
    // 1. Reserva confirmada
    const booking = bookings.find(
      (b) => b.courtId === courtId && b.date === dateStr && b.time === time && b.status === "confirmada"
    );
    if (booking) {
      return { type: "booked", label: booking.customerName, sub: booking.code, channel: booking.channel };
    }

    // 2. Trava semanal ou pontual
    const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();
    const lock = cloudLocks.find((l) => {
      if (l.court_id !== courtId || l.lock_time !== time) return false;
      if (l.lock_type === "weekly" && l.day_of_week === dayOfWeek) return true;
      if (l.lock_type === "date" && l.lock_date === dateStr) return true;
      return false;
    });

    if (lock) {
      return { type: "locked", label: lock.reason || "Bloqueado", sub: "Gestão" };
    }

    return { type: "free", label: "Livre", sub: "" };
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
      {/* Topo */}
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
              <p className="text-lg font-black text-[#041E8C]">R\$ {totalRevenue.toFixed(2)}</p>
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
            Mapa de Quadras (Grade Diária)
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
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "manual" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#00E599]" />
            Lançar Balcão
          </button>
        </div>

        {/* 1. ABA: MAPA DE QUADRAS (GRADE VISUAL) */}
        {activeTab === "grid" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C]">
                  Ocupação em Tempo Real
                </h2>
                <p className="text-xs text-slate-500">Selecione a data para visualizar os horários ocupados e livres</p>
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
                <span className="text-slate-600 font-medium">Livre</span>
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
                <span className="text-slate-600 font-medium">Aula / Trava Fixa</span>
              </div>
            </div>

            {/* Grade Horizontal com Scroll */}
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
                        return (
                          <td key={hour} className="p-1.5 text-center">
                            {slot.type === "free" ? (
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                                Livre
                              </div>
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
                <p className="text-xs text-slate-500">Reservas realizadas pelo site (Pix) e inseridas manualmente no balcão</p>
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
                          R\$ {b.price.toFixed(2)}
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

        {/* 4. ABA: LANÇAR BALCÃO */}
        {activeTab === "manual" && (
          <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-[#00E599]" />
              Lançar Reserva de Balcão
            </h2>

            <form onSubmit={handleAddManualBooking} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: Carlos Santana"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="85999999999"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Espaço / Quadra
                </label>
                <select
                  value={manualCourtId}
                  onChange={(e) => setManualCourtId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                >
                  {allCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Horário
                  </label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {businessHours.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Valor Cobrado (R\$)
                  </label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={manualPayment}
                    onChange={(e) => setManualPayment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
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
                className="w-full py-3 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Confirmar e Gravar na Nuvem
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}