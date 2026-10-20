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

  // Filtros dinâmicos por modalidade no painel
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

  // Preços
  const [priceSocietyPromo, setPriceSocietyPromo] = useState("60");
  const [priceSocietyNormal, setPriceSocietyNormal] = useState("80");
  const [priceAreiaPromo, setPriceAreiaPromo] = useState("40");
  const [priceAreiaNormal, setPriceAreiaNormal] = useState("60");
  const [pricesSavedMsg, setPricesSavedMsg] = useState(false);

  // Cupons
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
      if (lData) setCloudLocks(lData);

      const { data: cData } = await supabase.from("coupons").select("*");
      if (cData) setCoupons(cData);

      const { data: classData } = await supabase.from("class_enrollments").select("*").order("created_at", { ascending: false });
      if (classData) setEnrollments(classData);
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

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleToggleEnrollmentStatus = async (enrollment: ClassEnrollment) => {
    const nextStatus = enrollment.status === "ativa" ? "cancelada" : "ativa";
    if (!confirm(`Deseja alterar o status da matrícula ${enrollment.code} para ${nextStatus}?`)) return;

    try {
      await supabase.from("class_enrollments").update({ status: nextStatus }).eq("id", enrollment.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const code = newCouponCode.trim().toUpperCase();
    const id = editingCouponId || `coupon-${Date.now()}`;
    const maxUsesNum = newCouponMaxUses.trim() ? parseInt(newCouponMaxUses, 10) : null;

    try {
      const { error } = await supabase.from("coupons").upsert({
        id,
        code,
        discount_type: newCouponType,
        discount_value: parseFloat(newCouponValue) || 10,
        max_uses: maxUsesNum,
        active: true,
      });

      if (error) throw error;
      setNewCouponCode("");
      setNewCouponValue("10");
      setNewCouponMaxUses("");
      setEditingCouponId(null);
      await loadData();
      alert("Cupom salvo com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cupom.");
    }
  };

  const handleEditCoupon = (coupon: CouponRecord) => {
    setEditingCouponId(coupon.id);
    setNewCouponCode(coupon.code);
    setNewCouponType(coupon.discount_type);
    setNewCouponValue(String(coupon.discount_value));
    setNewCouponMaxUses(coupon.max_uses !== null && coupon.max_uses !== undefined ? String(coupon.max_uses) : "");
  };

  const toggleCouponStatus = async (coupon: CouponRecord) => {
    try {
      await supabase.from("coupons").update({ active: !coupon.active }).eq("id", coupon.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Deseja excluir este cupom?")) return;
    try {
      await supabase.from("coupons").delete().eq("id", id);
      await loadData();
    } catch (err) {
      console.error(err);
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

  // Filtragem de reservas com suporte a busca e modalidade
  const filteredBookings = bookings.filter((b) => {
    const matchesSport = bookingSportFilter === "TODOS" || 
      (bookingSportFilter === "Futebol Society" && b.courtName.toLowerCase().includes("society")) ||
      (bookingSportFilter !== "Futebol Society" && b.courtName.toLowerCase().includes(bookingSportFilter.toLowerCase()));

    if (!matchesSport) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      b.courtName.toLowerCase().includes(q)
    );
  });

  // Filtragem de matrículas de aulas por modalidade
  const filteredEnrollments = enrollments.filter((en) => {
    if (classSportFilter === "TODOS") return true;
    return en.sport.toLowerCase() === classSportFilter.toLowerCase();
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
              <p className="text-lg font-black text-slate-800">{confirmedBookings.length + enrollments.filter(e => e.status === "ativa").length}</p>
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
              <p className="text-lg font-black text-red-600">{cancelledBookingsCount + enrollments.filter(e => e.status === "cancelada").length}</p>
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
            Grade Diária
          </button>
          <button
            onClick={() => setActiveTab("locks")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "locks" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-4 h-4 text-[#00E599]" />
            Bloqueios ({cloudLocks.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "bookings" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-[#00E599]" />
            Reservas ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "classes" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-[#00E599]" />
            Alunos & Aulas ({enrollments.length})
          </button>
          <button
            onClick={() => setActiveTab("prices")}
            className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === "prices" ? "bg-[#041E8C] text-white shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign className="w-4 h-4 text-[#00E599]" />
            Preços & Cupons
          </button>
        </div>

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
                                slot.channel === "online" ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-amber-50 border-amber-200 text-amber-900"
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

        {activeTab === "locks" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#00E599]" />
                Novo Bloqueio
              </h2>

              <form onSubmit={handleAddLock} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Tipo de Bloqueio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLockTargetType("weekly")}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${lockTargetType === "weekly" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                    >
                      Semanal / Fixo
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockTargetType("date")}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${lockTargetType === "date" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                    >
                      Data Específica
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Quadra</label>
                  <select
                    value={selectedCourtId}
                    onChange={(e) => setSelectedCourtId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {allCourts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>

                {lockTargetType === "weekly" ? (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Dia da Semana</label>
                    <select
                      value={selectedDayOfWeek}
                      onChange={(e) => setSelectedDayOfWeek(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    >
                      {daysOfWeek.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Data</label>
                    <input
                      type="date"
                      value={selectedLockDate}
                      onChange={(e) => setSelectedLockDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Horário</label>
                  <select
                    value={selectedLockTime}
                    onChange={(e) => setSelectedLockTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    {businessHours.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Motivo / Descrição</label>
                  <input
                    type="text"
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="Ex: Aula de Futevôlei"
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
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Bloqueios Ativos ({cloudLocks.length})
              </h2>

              {cloudLocks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhum bloqueio cadastrado.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {cloudLocks.map((lock) => {
                    const court = allCourts.find((c) => c.id === lock.court_id);
                    const dayName = lock.day_of_week !== null ? daysOfWeek.find((d) => d.id === lock.day_of_week)?.name : "";

                    return (
                      <div key={lock.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#041E8C]">{court?.name || lock.court_id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              {lock.lock_type === "weekly" ? `Toda ${dayName}` : formatDateToBR(lock.lock_date)}
                            </span>
                            <span className="font-black text-slate-700 bg-white px-2 py-0.5 rounded border">{lock.lock_time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Motivo: <strong>{lock.reason}</strong></p>
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

        {/* ABA DE RESERVAS COM FILTROS DE MODALIDADE */}
        {activeTab === "bookings" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Histórico de Reservas de Quadras ({filteredBookings.length})
              </h2>
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

            {/* Filtros de Modalidade (Pílulas) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {["TODOS", ...currentArena.sports].map((sport) => (
                <button
                  key={sport}
                  onClick={() => setBookingSportFilter(sport)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    bookingSportFilter === sport ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma reserva encontrada.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredBookings.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl border text-xs space-y-2 bg-slate-50 border-slate-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#041E8C] text-sm">{b.code}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {b.status === "confirmada" ? "Confirmada" : "Cancelada"}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 mt-1">{b.customerName} ({b.customerPhone || "Sem tel"})</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#041E8C] text-sm">R\$ {b.price.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400">{formatDateToBR(b.date)} às {b.time}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-600 font-medium">{b.courtName}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleBookingStatus(b)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${b.status === "confirmada" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}
                      >
                        {b.status === "confirmada" ? "Cancelar Reserva" : "Reativar Reserva"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA DE ALUNOS & AULAS COM FILTROS DE MODALIDADE */}
        {activeTab === "classes" && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#041E8C]" />
              Gestão de Alunos & Matrículas em Aulas ({filteredEnrollments.length})
            </h2>

            {/* Filtros de Modalidade para Alunos */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {["TODOS", "Vôlei de Praia", "Futevôlei", "Beach Tennis", "Escolinha de Futebol"].map((sport) => (
                <button
                  key={sport}
                  onClick={() => setClassSportFilter(sport)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    classSportFilter === sport ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>

            {filteredEnrollments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma matrícula registrada para esta modalidade.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredEnrollments.map((en) => (
                  <div key={en.id} className="p-4 rounded-xl border text-xs space-y-2 bg-slate-50 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[#041E8C] text-sm">{en.code}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${en.status === "ativa" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                          {en.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                          {en.sport} ({en.category})
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{en.student_name} <span className="text-slate-500 font-normal">({en.student_phone})</span></p>
                      <p className="text-[11px] text-slate-600">
                        Plano: <strong>{en.plan_type.toUpperCase()}</strong> • Dias: <strong>{en.days_selected}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0 space-y-2">
                      <p className="font-black text-[#041E8C] text-base">R\$ {Number(en.total_price).toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={() => handleToggleEnrollmentStatus(en)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition ${en.status === "ativa" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}
                      >
                        {en.status === "ativa" ? "Cancelar Matrícula" : "Ativar Matrícula"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "prices" && (
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#00E599]" />
                Gestão de Preços & Cupons de Desconto
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure os valores por hora e gerencie os cupons.
              </p>
            </div>

            {pricesSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Alterações salvas com sucesso!
              </div>
            )}

            {/* Gerenciamento de Cupons */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#041E8C]" />
                {editingCouponId ? "Editar Cupom" : "Criar Novo Cupom"}
              </h3>

              <form onSubmit={handleSaveCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  placeholder="CÓDIGO (Ex: VIVA20)"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#041E8C] outline-none uppercase"
                />
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as "percent" | "fixed")}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R\$)</option>
                </select>
                <input
                  type="number"
                  placeholder="Valor (10)"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
                <input
                  type="number"
                  placeholder="Limite usos"
                  value={newCouponMaxUses}
                  onChange={(e) => setNewCouponMaxUses(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
                <button
                  type="submit"
                  className="py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg hover:bg-[#031566] transition shadow-xs flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {editingCouponId ? "Atualizar" : "Adicionar"}
                </button>
              </form>

              {editingCouponId && (
                <button
                  type="button"
                  onClick={() => { setEditingCouponId(null); setNewCouponCode(""); setNewCouponValue("10"); setNewCouponMaxUses(""); }}
                  className="text-[11px] text-slate-500 underline"
                >
                  Cancelar edição
                </button>
              )}

              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Cupons na Nuvem:</span>
                {coupons.map((c) => (
                  <div key={c.id || c.code} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#041E8C]">{c.code}</span>
                      <span className="text-slate-500">
                        {c.discount_type === "percent" ? `${c.discount_value}% OFF` : `R$ ${c.discount_value} OFF`}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Usos: {c.used_count || 0} / {c.max_uses !== null && c.max_uses !== undefined ? c.max_uses : "Ilimitado"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditCoupon(c)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCouponStatus(c)}
                        className={`px-2.5 py-1 rounded font-semibold text-[11px] ${c.active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
              Salvar Configurações
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE AÇÃO RÁPIDA (CLIQUE NA GRADE) */}
      {slotModalOpen && modalCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-[#041E8C] uppercase">Agendar / Bloquear Horário</h3>
                <p className="text-xs text-slate-500 mt-0.5">{modalCourt.name} • <strong>{formatDateToBR(gridDate)}</strong> às <strong>{modalTime}</strong></p>
              </div>
              <button type="button" onClick={() => setSlotModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setModalActionType("booking")} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${modalActionType === "booking" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}>Lançar Reserva</button>
              <button type="button" onClick={() => setModalActionType("lock")} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${modalActionType === "lock" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}>Travar Horário</button>
            </div>

            <form onSubmit={handleSaveQuickAction} className="space-y-3">
              {modalActionType === "booking" ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Nome do Atleta</label>
                    <input type="text" required value={quickCustomerName} onChange={(e) => setQuickCustomerName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">WhatsApp</label>
                    <input type="tel" value={quickCustomerPhone} onChange={(e) => setQuickCustomerPhone(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Valor (R$)</label>
                      <input type="number" value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Pagamento</label>
                      <select value={quickPaymentMethod} onChange={(e) => setQuickPaymentMethod(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none">
                        <option value="Dinheiro / Balcão">Dinheiro</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Pix Balcão">Pix Balcão</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow">Confirmar Reserva</button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Motivo do Bloqueio</label>
                    <input type="text" value={quickLockReason} onChange={(e) => setQuickLockReason(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#041E8C] text-white font-black text-xs rounded-xl transition shadow">Salvar Trava</button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}