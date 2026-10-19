"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Lock, Unlock, Calendar, Clock, 
  PlusCircle, RefreshCw, CheckCircle2, XCircle, 
  Phone, User, ShieldCheck, Tag, Info
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
  const [activeTab, setActiveTab] = useState<"locks" | "bookings">("locks");
  const [loading, setLoading] = useState(true);

  // Estados carregados do Supabase
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cloudLocks, setCloudLocks] = useState<any[]>([]);

  // Formulário para Nova Trava
  const [lockTargetType, setLockTargetType] = useState<"weekly" | "date">("weekly");
  const [selectedCourtId, setSelectedCourtId] = useState(allCourts[0].id);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [selectedLockDate, setSelectedLockDate] = useState("");
  const [selectedLockTime, setSelectedLockTime] = useState("18:00");
  const [lockReason, setLockReason] = useState("Aula / Treino Fixo");

  // Formulário para Reserva Balcão / Manual
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualCourtId, setManualCourtId] = useState(allCourts[0].id);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("18:00");
  const [manualPrice, setManualPrice] = useState("50");
  const [manualPayment, setManualPayment] = useState("Dinheiro / Balcão");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega todas as reservas
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

      // 2. Carrega todas as travas
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
    setSelectedLockDate(today);
    setManualDate(today);
    loadData();
  }, []);

  // Adicionar trava ao Supabase
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
      alert("Trava aplicada com sucesso na nuvem!");
    } catch (err) {
      console.error("Erro ao salvar trava:", err);
      alert("Erro ao aplicar trava.");
    }
  };

  // Remover trava do Supabase
  const handleRemoveLock = async (id: string) => {
    if (!confirm("Tem a certeza que deseja desbloquear este horário?")) return;
    try {
      const { error } = await supabase.from("court_locks").delete().eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Erro ao remover trava:", err);
      alert("Erro ao remover trava.");
    }
  };

  // Criar reserva manual (Balcão)
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
      alert("Reserva inserida e horário bloqueado com sucesso!");
    } catch (err) {
      console.error("Erro ao lançar reserva:", err);
      alert("Erro ao lançar reserva manual.");
    }
  };

  // Cancelar reserva pelo Gestor
  const handleToggleBookingStatus = async (booking: BookingRecord) => {
    const nextStatus = booking.status === "confirmada" ? "cancelada" : "confirmada";
    const msg = nextStatus === "cancelada"
      ? `Deseja realmente CANCELAR a reserva ${booking.code}? O horário será liberado novamente.`
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
      console.error("Erro ao atualizar status:", err);
      alert("Erro ao atualizar reserva.");
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Navegação entre Abas */}
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("locks")}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === "locks"
                ? "bg-[#041E8C] text-white shadow"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-4 h-4 text-[#00E599]" />
            Bloqueios de Horários e Aulas
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === "bookings"
                ? "bg-[#041E8C] text-white shadow"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-[#00E599]" />
            Gestão de Reservas ({bookings.length})
          </button>
        </div>

        {activeTab === "locks" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulário de Adicionar Bloqueio */}
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
                      Semanal / Recorrente
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
                    Espaço / Quadra
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
                    placeholder="Ex: Aula de Futevôlei / Manutenção"
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

            {/* Lista de Horários Bloqueados */}
            <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Bloqueios Ativos ({cloudLocks.length})
                </h2>
                <span className="text-[11px] text-slate-500">Sincronizado via Supabase</span>
              </div>

              {cloudLocks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhum bloqueio cadastrado. Todas as quadras estão livres nos horários comerciais normais.
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
                              lock.lock_type === "weekly" 
                                ? "bg-purple-100 text-purple-800" 
                                : "bg-blue-100 text-blue-800"
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lançamento Manual / Balcão */}
            <div className="md:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-[#00E599]" />
                Lançar Reserva (Balcão)
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
                    placeholder="Ex: João Silva"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Espaço / Quadra
                  </label>
                  <select
                    value={manualCourtId}
                    onChange={(e) => setManualCourtId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
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
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Horário
                    </label>
                    <select
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
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
                      Valor (R\$)
                    </label>
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Pagamento
                    </label>
                    <select
                      value={manualPayment}
                      onChange={(e) => setManualPayment(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
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
                  <PlusCircle className="w-4 h-4" />
                  Salvar Reserva na Nuvem
                </button>
              </form>
            </div>

            {/* Listagem Geral de Reservas */}
            <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Histórico de Reservas ({bookings.length})
                </h2>
                <span className="text-[11px] text-slate-500">Gravadas no Supabase</span>
              </div>

              {bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhuma reserva registada na base de dados.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                        b.status === "confirmada"
                          ? "bg-slate-50 border-slate-200"
                          : "bg-red-50/50 border-red-200 opacity-70"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#041E8C]">
                              {b.code}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.status === "confirmada"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {b.status === "confirmada" ? "Confirmada" : "Cancelada"}
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                              {b.channel === "online" ? "Site (Pix)" : "Balcão"}
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
                          <p className="font-black text-[#041E8C]">
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
          </div>
        )}
      </div>
    </main>
  );
}