"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Lock, Unlock, Calendar, Clock, 
  PlusCircle, RefreshCw, CheckCircle2, XCircle, 
  Phone, User, ShieldCheck, Tag, Info, DollarSign,
  TrendingUp, BarChart3, Filter, Search, Edit3, X, Sparkles, Trash2, GraduationCap
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

interface CouponRecord {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
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

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "locks" | "bookings" | "classes" | "prices">("grid");
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cloudLocks, setCloudLocks] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);

  const [bookingSportFilter, setBookingSportFilter] = useState<string>("TODOS");
  const [classSportFilter, setClassSportFilter] = useState<string>("TODOS");

  const [gridDate, setGridDate] = useState("");
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [modalCourt, setModalCourt] = useState<Court | null>(null);
  const [modalTime, setModalTime] = useState("");
  const [modalActionType, setModalActionType] = useState<"booking" | "lock">("booking");
  
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickPrice, setQuickPrice] = useState("50");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("Dinheiro / Balcão");

  const [quickLockReason, setQuickLockReason] = useState("Aula / Manutenção");
  const [quickLockType, setQuickLockType] = useState<"date" | "weekly">("date");

  const [lockTargetType, setLockTargetType] = useState<"weekly" | "date">("weekly");
  const [selectedCourtId, setSelectedCourtId] = useState(allCourts[0].id);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [selectedLockDate, setSelectedLockDate] = useState("");
  const [selectedLockTime, setSelectedLockTime] = useState("18:00");
  const [lockReason, setLockReason] = useState("Aula / Treino Fixo");

  // Preços restaurados completos
  const [priceSocietyPromo, setPriceSocietyPromo] = useState("60");
  const [priceSocietyNormal, setPriceSocietyNormal] = useState("80");
  const [priceAreiaPromo, setPriceAreiaPromo] = useState("40");
  const [priceAreiaNormal, setPriceAreiaNormal] = useState("60");
  const [priceRaquete, setPriceRaquete] = useState("10");
  const [pricesSavedMsg, setPricesSavedMsg] = useState(false);

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percent" | "fixed">("percent");
  const [newCouponValue, setNewCouponValue] = useState("10");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

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
      const { data: bData } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (bData) {
        setBookings(bData.map((b) => ({
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
        })));
      }

      const { data: lData } = await supabase.from("court_locks").select("*");
      if (lData) setCloudLocks(lData);

      const { data: cData } = await supabase.from("coupons").select("*");
      if (cData) setCoupons(cData);

      const { data: classData } = await supabase.from("class_enrollments").select("*").order("created_at", { ascending: false });
      if (classData) setEnrollments(classData);
    } catch (err) {
      console.error(err);
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

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const confirmedBookings = bookings.filter((b) => b.status === "confirmada");
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.price, 0) + enrollments.filter(e => e.status === "ativa").reduce((acc, e) => acc + Number(e.total_price), 0);
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

    setQuickPrice(court.type === "society" ? (hasDiscount ? priceSocietyPromo : priceSocietyNormal) : (hasDiscount ? priceAreiaPromo : priceAreiaNormal));
    setQuickCustomerName("");
    setQuickCustomerPhone("");
    setSlotModalOpen(true);
  };

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCourt) return;

    if (modalActionType === "booking") {
      if (!quickCustomerName.trim()) { alert("Informe o nome do cliente."); return; }
      try {
        await supabase.from("bookings").insert({
          id: `manual-${Date.now()}`,
          code: `VIVA-M${Math.floor(100 + Math.random() * 900)}`,
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
        setSlotModalOpen(false);
        await loadData();
      } catch (err) { console.error(err); }
    } else {
      const parts = gridDate.split("-").map(Number);
      const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      const lockId = quickLockType === "weekly" ? `${modalCourt.id}-weekly-${dayOfWeek}-${modalTime}` : `${modalCourt.id}-date-${gridDate}-${modalTime}`;

      try {
        await supabase.from("court_locks").upsert({
          id: lockId,
          court_id: modalCourt.id,
          lock_type: quickLockType,
          day_of_week: quickLockType === "weekly" ? dayOfWeek : null,
          lock_date: quickLockType === "date" ? gridDate : null,
          lock_time: modalTime,
          reason: quickLockReason.trim() || "Bloqueio Rápido",
        });
        setSlotModalOpen(false);
        await loadData();
      } catch (err) { console.error(err); }
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
        reason: lockReason.trim() || "Bloqueio Gestor",
      });
      await loadData();
      alert("Bloqueio salvo com sucesso!");
    } catch (err) { console.error(err); }
  };

  const handleRemoveLock = async (id: string) => {
    if (!confirm("Remover este bloqueio?")) return;
    try { await supabase.from("court_locks").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleToggleBookingStatus = async (booking: BookingRecord) => {
    const nextStatus = booking.status === "confirmada" ? "cancelada" : "confirmada";
    if (!confirm(`Alterar status da reserva ${booking.code}?`)) return;
    try { await supabase.from("bookings").update({ status: nextStatus }).eq("id", booking.id); await loadData(); } catch (err) { console.error(err); }
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
        max_uses: newCouponMaxUses.trim() ? parseInt(newCouponMaxUses, 10) : null,
        active: true,
      });
      setNewCouponCode(""); setNewCouponValue("10"); setNewCouponMaxUses(""); setEditingCouponId(null);
      await loadData();
      alert("Cupom salvo!");
    } catch (err) { console.error(err); }
  };

  const handleEditCoupon = (coupon: CouponRecord) => {
    setEditingCouponId(coupon.id);
    setNewCouponCode(coupon.code);
    setNewCouponType(coupon.discount_type);
    setNewCouponValue(String(coupon.discount_value));
    setNewCouponMaxUses(coupon.max_uses !== null && coupon.max_uses !== undefined ? String(coupon.max_uses) : "");
  };

  const toggleCouponStatus = async (coupon: CouponRecord) => {
    try { await supabase.from("coupons").update({ active: !coupon.active }).eq("id", coupon.id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    try { await supabase.from("coupons").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const getSlotStatus = (courtId: string, time: string, dateStr: string) => {
    const booking = bookings.find((b) => b.courtId === courtId && b.date === dateStr && b.time === time && b.status === "confirmada");
    if (booking) return { type: "booked", label: booking.customerName, sub: booking.code, channel: booking.channel };

    const parts = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    const lock = cloudLocks.find((l) => l.court_id === courtId && l.lock_time === time && ((l.lock_type === "weekly" && l.day_of_week === dayOfWeek) || (l.lock_type === "date" && l.lock_date === dateStr)));
    if (lock) return { type: "locked", label: lock.reason || "Bloqueado", sub: "Gestão" };

    return { type: "free", label: "+ Reservar", sub: "" };
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSport = bookingSportFilter === "TODOS" || (bookingSportFilter === "Futebol Society" ? b.courtName.toLowerCase().includes("society") : b.courtName.toLowerCase().includes(bookingSportFilter.toLowerCase()));
    if (!matchesSport) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.code.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || (b.customerPhone && b.customerPhone.includes(q)) || b.courtName.toLowerCase().includes(q);
  });

  const filteredEnrollments = enrollments.filter((en) => classSportFilter === "TODOS" || en.sport.toLowerCase() === classSportFilter.toLowerCase());

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 text-xs font-bold"><ArrowLeft className="w-4 h-4" /><span>Voltar ao Site</span></Link>
            <h1 className="text-base font-black tracking-wide text-white uppercase italic">Painel do Gestor (Nuvem)</h1>
          </div>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /><span>Atualizar</span></button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><DollarSign className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Receita Total</p><p className="text-lg font-black text-[#041E8C]">R$ {totalRevenue.toFixed(2)}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 text-[#041E8C] flex items-center justify-center shrink-0"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Confirmadas</p><p className="text-lg font-black text-slate-800">{confirmedBookings.length + enrollments.filter(e => e.status === "ativa").length}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Origem</p><p className="text-xs font-bold text-slate-700"><span className="text-emerald-600">{onlineBookingsCount} Site</span> / {manualBookingsCount} Balcão</p></div></div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Canceladas</p><p className="text-lg font-black text-red-600">{cancelledBookingsCount + enrollments.filter(e => e.status === "cancelada").length}</p></div></div>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border overflow-x-auto">
          <button onClick={() => setActiveTab("grid")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap ${activeTab === "grid" ? "bg-[#041E8C] text-white shadow" : "text-slate-600"}`}>Grade Diária</button>
          <button onClick={() => setActiveTab("locks")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap ${activeTab === "locks" ? "bg-[#041E8C] text-white shadow" : "text-slate-600"}`}>Bloqueios ({cloudLocks.length})</button>
          <button onClick={() => setActiveTab("bookings")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap ${activeTab === "bookings" ? "bg-[#041E8C] text-white shadow" : "text-slate-600"}`}>Reservas ({bookings.length})</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow" : "text-slate-600"}`}>Alunos & Aulas ({enrollments.length})</button>
          <button onClick={() => setActiveTab("prices")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap ${activeTab === "prices" ? "bg-[#041E8C] text-white shadow" : "text-slate-600"}`}>Preços & Cupons</button>
        </div>

        {activeTab === "grid" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-sm font-black uppercase text-[#041E8C]">Grade Diária de Quadras</h2><input type="date" value={gridDate} onChange={(e) => setGridDate(e.target.value)} className="p-2 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C]" /></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="p-2.5 text-left font-bold bg-slate-50">Quadra</th>{businessHours.map((h) => (<th key={h} className="p-2.5 text-center font-bold">{h}</th>))}</tr></thead>
                <tbody className="divide-y">
                  {allCourts.map((court) => (
                    <tr key={court.id}>
                      <td className="p-2.5 font-bold bg-white">{court.name}</td>
                      {businessHours.map((hour) => {
                        const slot = getSlotStatus(court.id, hour, gridDate);
                        return (
                          <td key={hour} className="p-1.5 text-center">
                            {slot.type === "free" ? (
                              <button type="button" onClick={() => handleCellClick(court, hour, slot.type)} className="w-full p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px]">+ Livre</button>
                            ) : slot.type === "booked" ? (
                              <div className="p-2 rounded-xl bg-blue-50 border text-[10px] font-bold truncate"><p className="truncate">{slot.label}</p></div>
                            ) : (
                              <div className="p-2 rounded-xl bg-purple-50 border text-[10px] font-bold truncate"><p className="truncate">{slot.label}</p></div>
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
            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C]">Novo Bloqueio</h2>
              <form onSubmit={handleAddLock} className="space-y-3">
                <select value={selectedCourtId} onChange={(e) => setSelectedCourtId(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium">{allCourts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
                <input type="date" value={selectedLockDate} onChange={(e) => setSelectedLockDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium" />
                <select value={selectedLockTime} onChange={(e) => setSelectedLockTime(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium">{businessHours.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
                <input type="text" value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder="Motivo" className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium" />
                <button type="submit" className="w-full py-2.5 bg-[#041E8C] text-white font-bold text-xs rounded-xl">Bloquear</button>
              </form>
            </div>
            <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border space-y-4">
              <h2 className="text-sm font-black uppercase">Bloqueios Ativos ({cloudLocks.length})</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">{cloudLocks.map((l) => (<div key={l.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center text-xs"><span>{l.lock_time} - {l.reason}</span><button onClick={() => handleRemoveLock(l.id)} className="text-red-600 font-bold">Desbloquear</button></div>))}</div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-sm font-black uppercase">Histórico de Reservas ({filteredBookings.length})</h2><input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-2 bg-slate-50 border rounded-xl text-xs" /></div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">{["TODOS", ...currentArena.sports].map((s) => (<button key={s} onClick={() => setBookingSportFilter(s)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap ${bookingSportFilter === s ? "bg-[#041E8C] text-white" : "bg-slate-100 text-slate-600"}`}>{s}</button>))}</div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredBookings.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl border text-xs space-y-2 bg-slate-50 flex justify-between items-center">
                  <div><span className="font-mono font-black text-[#041E8C]">{b.code}</span><p className="font-bold text-slate-800">{b.customerName} - {b.courtName} ({formatDateToBR(b.date)} às {b.time})</p></div>
                  <button onClick={() => handleToggleBookingStatus(b)} className={`px-2.5 py-1 rounded text-white font-bold ${b.status === "confirmada" ? "bg-red-600" : "bg-emerald-600"}`}>{b.status === "confirmada" ? "Cancelar" : "Reativar"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
            <h2 className="text-sm font-black uppercase">Alunos & Aulas ({filteredEnrollments.length})</h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1">{["TODOS", "Vôlei de Praia", "Futevôlei", "Beach Tennis", "Escolinha de Futebol"].map((s) => (<button key={s} onClick={() => setClassSportFilter(s)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap ${classSportFilter === s ? "bg-[#041E8C] text-white" : "bg-slate-100 text-slate-600"}`}>{s}</button>))}</div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredEnrollments.map((en) => (
                <div key={en.id} className="p-4 rounded-xl border text-xs bg-slate-50 flex justify-between items-center">
                  <div><span className="font-mono font-black text-[#041E8C]">{en.code}</span><p className="font-bold text-slate-900">{en.student_name} ({en.sport} - {en.category})</p><p className="text-[11px] text-slate-500">Plano: {en.plan_type.toUpperCase()} • R$ {Number(en.total_price).toFixed(2)}</p></div>
                  <button onClick={() => handleToggleEnrollmentStatus(en)} className={`px-3 py-1 rounded text-white font-bold ${en.status === "ativa" ? "bg-red-600" : "bg-emerald-600"}`}>{en.status === "ativa" ? "Cancelar" : "Ativar"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "prices" && (
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border space-y-6">
            <h2 className="text-sm font-black uppercase text-[#041E8C]">Gestão de Preços & Cupons</h2>

            {/* Gestão de Cupons */}
            <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-700">{editingCouponId ? "Editar Cupom" : "Criar Cupom"}</h3>
              <form onSubmit={handleSaveCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input type="text" placeholder="CÓDIGO" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} className="p-2 bg-white border rounded-lg text-xs font-bold uppercase" />
                <select value={newCouponType} onChange={(e) => setNewCouponType(e.target.value as "percent" | "fixed")} className="p-2 bg-white border rounded-lg text-xs"><option value="percent">%</option><option value="fixed">R$</option></select>
                <input type="number" placeholder="Valor" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="p-2 bg-white border rounded-lg text-xs font-bold" />
                <input type="number" placeholder="Limite usos" value={newCouponMaxUses} onChange={(e) => setNewCouponMaxUses(e.target.value)} className="p-2 bg-white border rounded-lg text-xs font-bold" />
                <button type="submit" className="py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg">{editingCouponId ? "Atualizar" : "Adicionar"}</button>
              </form>
              <div className="space-y-1 pt-2">{coupons.map((c) => (<div key={c.id} className="flex justify-between items-center p-2 bg-white rounded border text-xs"><span>{c.code} ({c.discount_value}{c.discount_type === 'percent' ? '%' : 'R$'})</span><div className="flex gap-1"><button onClick={() => handleEditCoupon(c)} className="px-2 py-0.5 bg-slate-100 rounded">Editar</button><button onClick={() => toggleCouponStatus(c)} className="px-2 py-0.5 bg-amber-100 rounded">{c.active ? "Desativar" : "Ativar"}</button><button onClick={() => handleDeleteCoupon(c.id)} className="text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
            </div>

            {/* Tabela de Preços Restaurada */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700">Futebol Society</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Promo (16h às 19h)</label><input type="number" value={priceSocietyPromo} onChange={(e) => setPriceSocietyPromo(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs font-bold" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Normal / Noite</label><input type="number" value={priceSocietyNormal} onChange={(e) => setPriceSocietyNormal(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs font-bold" /></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700">Quadras de Areia</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Promo (16h às 19h)</label><input type="number" value={priceAreiaPromo} onChange={(e) => setPriceAreiaPromo(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs font-bold" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Normal / Noite</label><input type="number" value={priceAreiaNormal} onChange={(e) => setPriceAreiaNormal(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs font-bold" /></div>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => { setPricesSavedMsg(true); setTimeout(() => setPricesSavedMsg(false), 3000); }} className="w-full py-3 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow">Salvar Configurações</button>
          </div>
        )}
      </div>

      {slotModalOpen && modalCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 shadow-xl border">
            <div className="flex justify-between border-b pb-3"><div><h3 className="text-sm font-black text-[#041E8C] uppercase">Agendar / Bloquear</h3><p className="text-xs text-slate-500">{modalCourt.name} • {modalTime}</p></div><button onClick={() => setSlotModalOpen(false)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSaveQuickAction} className="space-y-3">
              <input type="text" placeholder="Nome" value={quickCustomerName} onChange={(e) => setQuickCustomerName(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium" />
              <input type="number" value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold" />
              <button type="submit" className="w-full py-2.5 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow">Confirmar</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}