"app/admin/page.tsx";

"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, Clock, ShieldCheck, DollarSign, Users, Settings, 
  CheckCircle2, XCircle, AlertCircle, Lock, Unlock, RefreshCw 
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  surface: string;
  sports: string[];
  type: "society" | "areia";
}

const allCourts: Court[] = [
  { id: "futebol-1", name: "Campo de Futebol Society", surface: "Grama Sintética", sports: ["Futebol Society"], type: "society" },
  { id: "areia-1", name: "Quadra 1 (Areia)", surface: "Areia", sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia"], type: "areia" },
  { id: "areia-2", name: "Quadra 2 (Areia)", surface: "Areia", sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia"], type: "areia" },
  { id: "areia-3", name: "Quadra 3 (Areia)", surface: "Areia", sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia"], type: "areia" },
  { id: "areia-4", name: "Quadra 4 (Areia)", surface: "Areia", sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia"], type: "areia" },
  { id: "areia-5", name: "Quadra 5 (Areia)", surface: "Areia", sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia"], type: "areia" },
  { id: "areia-6", name: "Quadra 6 (Areia)", surface: "Areia", sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia"], type: "areia" },
];

// Horários expandidos das 06:00 às 22:00
const businessHours = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
  "20:00", "21:00", "22:00"
];

// Feriados Nacionais fixos + Feriados do Ceará (ex: 19/03 São José, 25/03 Data Magna do CE)
const CEARA_AND_NATIONAL_HOLIDAYS = [
  "01-01", "03-19", "03-25", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"
];

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<"grade" | "financial" | "reservations" | "classes" | "locks" | "prices">("grade");
  
  const [selectedDate, setSelectedDate] = useState("");
  const [todayString, setTodayString] = useState("");

  const [bookings, setBookings] = useState<any[]>([]);
  const [courtLocks, setCourtLocks] = useState<any[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: bData } = await supabase.from("bookings").select("*");
      if (bData) setBookings(bData);

      const { data: lData } = await supabase.from("court_locks").select("*");
      if (lData) setCourtLocks(lData);

      const { data: eData } = await supabase.from("class_enrollments").select("*");
      if (eData) setClassEnrollments(eData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const formatted = `${year}-${month}-${day}`;

    setTodayString(formatted);
    setSelectedDate(formatted);
    loadData();
  }, []);

  if (!mounted) return null;

  // Verificação de Feriado ou Fim de semana
  const isWeekendOrHoliday = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    return CEARA_AND_NATIONAL_HOLIDAYS.includes(dateStr.substring(5));
  };

  const isHolidayOrWknd = isWeekendOrHoliday(selectedDate);

  // Toggle para bloquear ou abrir um horário específico de uma quadra pontualmente
  const toggleCourtLockSlot = async (courtId: string, time: string) => {
    const isLocked = courtLocks.some(
      (l) => l.court_id === courtId && l.lock_time === time && l.lock_type === "date" && l.lock_date === selectedDate
    );

    try {
      if (isLocked) {
        // Remove o bloqueio
        await supabase.from("court_locks").delete().match({
          court_id: courtId,
          lock_time: time,
          lock_type: "date",
          lock_date: selectedDate,
        });
      } else {
        // Insere o bloqueio pontual
        await supabase.from("court_locks").insert([{
          id: `lock-${Date.now()}-${Math.random()}`,
          court_id: courtId,
          lock_time: time,
          lock_type: "date",
          lock_date: selectedDate,
        }]);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status do horário.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-24">
      {/* Topo do Gestor */}
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/10 rounded-xl text-white font-black text-xs">GESTOR</span>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wider">{currentArena.name}</h1>
              <p className="text-[10px] text-slate-300">Painel Administrativo Unificado</p>
            </div>
          </div>
          <a href="/" className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
            Ver Site Público
          </a>
        </div>
      </header>

      {/* Abas de Navegação do Gestor */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 gap-1 overflow-x-auto">
          <button onClick={() => setActiveAdminTab("grade")} className={`px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${activeAdminTab === "grade" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>
            📊 Grade Diária (06h - 22h)
          </button>
          <button onClick={() => setActiveAdminTab("financial")} className={`px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${activeAdminTab === "financial" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>
            💰 Resumo Financeiro
          </button>
          <button onClick={() => setActiveAdminTab("reservations")} className={`px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${activeAdminTab === "reservations" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>
            📅 Reservas & Clientes
          </button>
          <button onClick={() => setActiveAdminTab("classes")} className={`px-4 py-2 text-xs font-black rounded-xl transition whitespace-nowrap ${activeAdminTab === "classes" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>
            🎓 Alunos & Aulas
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-4">
        {activeAdminTab === "grade" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wider">Grade Horária Operacional (06:00 às 22:00)</h2>
                <p className="text-xs text-slate-500">Clique em qualquer célula para abrir ou bloquear pontualmente o horário por quadra.</p>
              </div>
              <div className="flex items-center gap-3">
                {isHolidayOrWknd && <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">Feriado / Fim de Semana</span>}
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" 
                />
                <button onClick={loadData} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition" title="Atualizar Dados">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600 bg-slate-50 p-3 rounded-2xl border">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded-md"></span> Livre (Ativo)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-md"></span> Reservado (Cliente)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-200 border border-slate-400 rounded-md"></span> Bloqueado / Fechado</span>
            </div>

            {/* Tabela Invertida: Horários nas Linhas, Quadras nas Colunas */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
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
                    <tr key={time} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50 border-r border-slate-200 sticky left-0 z-10 text-center">
                        {time}
                      </td>
                      {allCourts.map((court) => {
                        // Verifica se há reserva confirmada ou aguardando pagamento
                        const booking = bookings.find(
                          (b) => b.court_id === court.id && b.booking_date === selectedDate && b.booking_time === time && (b.status === "confirmada" || b.status === "aguardando_pagamento")
                        );

                        // Verifica se está bloqueado pontualmente
                        const isLocked = courtLocks.some(
                          (l) => l.court_id === court.id && l.lock_time === time && l.lock_type === "date" && l.lock_date === selectedDate
                        );

                        return (
                          <td key={court.id} className="p-2 border-r border-slate-200 text-center">
                            {booking ? (
                              <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-bold shadow-sm truncate" title={`Reservado por: ${booking.customer_name}`}>
                                🔵 {booking.customer_name}
                              </div>
                            ) : isLocked ? (
                              <button 
                                onClick={() => toggleCourtLockSlot(court.id, time)}
                                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                                title="Clique para abrir este horário"
                              >
                                <Lock className="w-3 h-3" /> Fechado
                              </button>
                            ) : (
                              <button 
                                onClick={() => toggleCourtLockSlot(court.id, time)}
                                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm"
                                title="Clique para bloquear este horário"
                              >
                                <Unlock className="w-3 h-3 text-emerald-600" /> Livre
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

        {activeAdminTab === "financial" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wider">Resumo Financeiro & Caixa</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-xs font-bold text-emerald-700 uppercase">Recebido (Quadras Online)</span>
                <p className="text-2xl font-black text-emerald-900 mt-1">
                  R$ {bookings.filter(b => b.status === "confirmada").reduce((acc, b) => acc + Number(b.price || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <span className="text-xs font-bold text-blue-700 uppercase">Matrículas Ativas</span>
                <p className="text-2xl font-black text-blue-900 mt-1">
                  R$ {classEnrollments.filter(e => e.status === "ativa").reduce((acc, e) => acc + Number(e.total_price || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-xs font-bold text-amber-700 uppercase">Aguardando Pagamento</span>
                <p className="text-2xl font-black text-amber-900 mt-1">
                  R$ {bookings.filter(b => b.status === "aguardando_pagamento").reduce((acc, b) => acc + Number(b.price || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === "reservations" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wider">Histórico de Reservas de Quadras</h2>
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="p-3.5 bg-slate-50 border rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-black text-[#041E8C]">{b.code}</span> — <strong className="text-slate-800">{b.customer_name}</strong> ({b.customer_phone})
                    <p className="text-slate-500 mt-0.5">{b.court_name} | {b.booking_date} às {b.booking_time}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">R$ {Number(b.price).toFixed(2)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === "classes" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wider">Matrículas em Aulas & Treinos</h2>
            <div className="space-y-2">
              {classEnrollments.map((en) => (
                <div key={en.id} className="p-3.5 bg-slate-50 border rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-black text-[#041E8C]">{en.code}</span> — <strong className="text-slate-800">{en.student_name}</strong> ({en.student_phone})
                    <p className="text-slate-500 mt-0.5">{en.sport} ({en.category}) | Plano: {en.plan_type} | {en.days_selected}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">R$ {Number(en.total_price).toFixed(2)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {en.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}