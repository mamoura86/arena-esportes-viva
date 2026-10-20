"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, CheckCircle2, QrCode, Copy, 
  AlertCircle, User, Phone, Timer, Settings,
  MessageCircle, Search, XCircle, Tag, ShieldCheck, Sparkles,
  Share2, X
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  surface: string;
  sports: string[];
  type: "society" | "areia";
}

interface Equipment {
  id: string;
  name: string;
  sports: string[];
  price: number;
  highlight?: string;
}

interface SelectedSlot {
  courtId: string;
  courtName: string;
  time: string;
  price: number;
}

interface StoredBooking {
  id?: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  courtName: string;
  date: string;
  time: string;
  totalAmount: number;
  status: "confirmed" | "cancelled";
}

const AREIA_SPORTS = ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"];

const allCourts: Court[] = [
  { id: "futebol-1", name: "Campo de Futebol Society", surface: "Grama Sintética", sports: ["Futebol Society"], type: "society" },
  { id: "areia-1", name: "Quadra 1 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-2", name: "Quadra 2 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-3", name: "Quadra 3 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-4", name: "Quadra 4 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-5", name: "Quadra 5 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
  { id: "areia-6", name: "Quadra 6 (Areia)", surface: "Areia", sports: AREIA_SPORTS, type: "areia" },
];

const initialEquipments: Equipment[] = [
  { 
    id: "e-raquete", 
    name: "Aluguel de Raquete de Beach Tennis", 
    sports: ["Beach Tennis"], 
    price: 10.0,
    highlight: "Bolas de Beach Tennis inclusas gratuitamente na locação da quadra!"
  },
  { 
    id: "e-mikasa-pro", 
    name: "Upgrade: Bola Mikasa Pro Oficial", 
    sports: ["Vôlei de Praia"], 
    price: 10.0,
    highlight: "Bola padrão do CT Viva inclusa gratuitamente."
  },
];

const businessHours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

const generateSecureBookingCode = () => {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VIVA-${code}`;
};

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "manage">("book");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [selectedSport, setSelectedSport] = useState(currentArena.sports[0]);
  const [todayString, setTodayString] = useState("");
  const [currentClientTime, setCurrentClientTime] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState("");

  const [activeHourPick, setActiveHourPick] = useState<string>("18:00");
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  const [rentals, setRentals] = useState<{ [key: string]: number }>({});
  
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountPercent: number; discountFixed: number } | null>(null);
  const [couponError, setCouponError] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [courtLocks, setCourtLocks] = useState<any[]>([]);

  const loadCloudData = async () => {
    try {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "confirmada");

      if (bookingsData) setActiveBookings(bookingsData);

      const { data: locksData } = await supabase.from("court_locks").select("*");
      if (locksData) setCourtLocks(locksData);
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayFormatted = `${year}-${month}-${day}`;

    setTodayString(todayFormatted);
    setSelectedDate(todayFormatted);
    setCurrentClientTime(now.getTime());

    loadCloudData();

    const channel = supabase
      .channel("public:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        loadCloudData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "court_locks" }, () => {
        loadCloudData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<StoredBooking | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  const [searchCodeInput, setSearchCodeInput] = useState("");
  const [searchPhoneInput, setSearchPhoneInput] = useState("");
  const [searchedBookings, setSearchedBookings] = useState<StoredBooking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const serviceFee = 2.0;

  const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const getDayOfWeekFromDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.getDay();
  };

  const isWeekendOrHoliday = (dateStr: string) => {
    if (!dateStr) return false;
    const day = getDayOfWeekFromDate(dateStr);
    if (day === 0 || day === 6) return true;
    const monthDay = dateStr.substring(5);
    return HOLIDAYS.includes(monthDay);
  };

  const getCourtPrice = (court: Court, time: string) => {
    const hour = parseInt(time.split(":")[0], 10);
    const isPromoSlot = hour >= 16 && hour < 19;
    const hasDiscount = isPromoSlot && !isWeekendOrHoliday(selectedDate);

    if (court.type === "society") {
      return hasDiscount ? 60.0 : 80.0;
    } else {
      return hasDiscount ? 40.0 : 60.0;
    }
  };

  const isTimeTooCloseOrPassed = (timeStr: string) => {
    if (!todayString || selectedDate !== todayString || !currentClientTime) return false;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date(currentClientTime);
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);

    const diffMinutes = (slotTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes < 15;
  };

  const isCourtLocked = (courtId: string, time: string) => {
    const hasBooking = activeBookings.some(
      (b) => b.court_id === courtId && b.booking_date === selectedDate && b.booking_time === time && b.status === "confirmada"
    );
    if (hasBooking) return true;

    const dayOfWeek = getDayOfWeekFromDate(selectedDate);
    const hasLock = courtLocks.some((lock) => {
      if (lock.court_id !== courtId || lock.lock_time !== time) return false;
      if (lock.lock_type === "weekly" && lock.day_of_week === dayOfWeek) return true;
      if (lock.lock_type === "date" && lock.lock_date === selectedDate) return true;
      return false;
    });

    return hasLock;
  };

  const isWeekend = isWeekendOrHoliday(selectedDate);
  const isSocietySelected = normalize(selectedSport) === normalize("Futebol Society");

  const availableCourtsAtActiveHour = allCourts.filter((c) => {
    const matchesSport = c.sports.some((s) => normalize(s) === normalize(selectedSport));
    if (!matchesSport) return false;
    return !isCourtLocked(c.id, activeHourPick);
  });

  const toggleSelectSlot = (court: Court, time: string) => {
    const price = getCourtPrice(court, time);
    const exists = selectedSlots.some((s) => s.courtId === court.id && s.time === time);

    if (exists) {
      setSelectedSlots((prev) => prev.filter((s) => !(s.courtId === court.id && s.time === time)));
    } else {
      setSelectedSlots((prev) => [...prev, { courtId: court.id, courtName: court.name, time, price }]);
    }
  };

  const removeSlot = (courtId: string, time: string) => {
    setSelectedSlots((prev) => prev.filter((s) => !(s.courtId === courtId && s.time === time)));
  };

  const subtotalCourts = selectedSlots.reduce((acc, s) => acc + s.price, 0);

  const handleEquipmentChange = (id: string, delta: number) => {
    setRentals((prev) => {
      const currentVal = prev[id] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return { ...prev, [id]: nextVal };
    });
  };

  const totalEquipmentCost = Object.entries(rentals).reduce((acc, [id, qty]) => {
    const item = initialEquipments.find((e) => e.id === id);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  const handleApplyCoupon = async () => {
    setCouponError("");
    const codeClean = couponCodeInput.trim().toUpperCase();
    if (!codeClean) return;

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", codeClean)
        .eq("active", true)
        .single();

      if (error || !data) {
        setCouponError("Cupom inválido ou expirado.");
        return;
      }

      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setCouponError("Este cupom já atingiu o limite máximo de utilizações.");
        return;
      }

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discountPercent: data.discount_type === "percent" ? Number(data.discount_value) : 0,
        discountFixed: data.discount_type === "fixed" ? Number(data.discount_value) : 0,
      });
    } catch (err) {
      console.error(err);
      setCouponError("Erro ao validar cupom.");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponError("");
  };

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent > 0) {
      discountAmount = (subtotalCourts * appliedCoupon.discountPercent) / 100;
    } else {
      discountAmount = appliedCoupon.discountFixed;
    }
  }

  const totalAmount = selectedSlots.length > 0 
    ? Math.max(0, subtotalCourts - discountAmount) + totalEquipmentCost + serviceFee 
    : 0;

  const formatSlotsForSummary = (slots: SelectedSlot[]) => {
    const byCourt: { [key: string]: string[] } = {};
    slots.forEach((s) => {
      if (!byCourt[s.courtName]) byCourt[s.courtName] = [];
      byCourt[s.courtName].push(s.time);
    });

    return Object.entries(byCourt)
      .map(([courtName, times]) => {
        const sorted = times.sort();
        return `• ${courtName}: ${sorted.join(", ")} (${sorted.length}h)`;
      })
      .join("\n");
  };

  const handleStartBooking = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Por favor, preencha o seu Nome e WhatsApp na Identificação do Cliente.");
      return;
    }
    if (selectedSlots.length === 0) {
      alert("Por favor, selecione pelo menos um horário de quadra.");
      return;
    }
    if (!acceptedTerms) {
      alert("É necessário marcar o termo de aceite da política de cancelamento.");
      return;
    }

    const generatedCode = generateSecureBookingCode();
    const formattedCourtDetails = formatSlotsForSummary(selectedSlots);
    const mainTimeSummary = selectedSlots.map((s) => s.time).join(", ");

    const newBooking: StoredBooking = {
      bookingCode: generatedCode,
      customerName,
      customerPhone,
      courtName: formattedCourtDetails,
      date: selectedDate,
      time: mainTimeSummary,
      totalAmount,
      status: "confirmed",
    };

    setCurrentBooking(newBooking);

    try {
      // Inserimos todos os slots com o MESMO código principal unificado
      const recordsToInsert = selectedSlots.map((slot, index) => ({
        id: `online-${Date.now()}-${index}`,
        code: generatedCode, // Código único unificado para todos os horários da compra
        customer_name: customerName,
        customer_phone: customerPhone,
        court_id: slot.courtId,
        court_name: slot.courtName,
        booking_date: selectedDate,
        booking_time: slot.time,
        price: slot.price,
        channel: "online",
        payment_method: "Pix Automático",
        status: "confirmada"
      }));

      const { error } = await supabase.from("bookings").insert(recordsToInsert);
      if (error) {
        console.error("Erro ao salvar reservas:", error);
      } else {
        if (appliedCoupon) {
          try {
            await supabase.rpc("increment_coupon_usage", { coupon_id: appliedCoupon.id });
          } catch (err) {
            console.error("Erro ao incrementar cupom:", err);
          }
        }
        await loadCloudData();
      }
    } catch (e) {
      console.error(e);
    }

    setIsPaymentConfirmed(false);
    setTimeLeft(600);
    setIsExpired(false);
    setIsModalOpen(true);
  };

  const generateWhatsAppUrl = () => {
    if (!currentBooking) return "#";
    const text = encodeURIComponent(
      `Olá, CT Viva Esportes! Acabei de fazer uma reserva pelo site.\n\n` +
      `*Código:* ${currentBooking.bookingCode}\n` +
      `*Cliente:* ${currentBooking.customerName}\n` +
      `*Data:* ${formatDateToBR(currentBooking.date)}\n\n` +
      `*Espaços & Horários:*\n${currentBooking.courtName}\n\n` +
      `*Valor Total Pago:* R$ ${currentBooking.totalAmount.toFixed(2)}\n\n` +
      `Podem confirmar? Obrigado!`
    );
    return `https://wa.me/55${currentArena.whatsapp}?text=${text}`;
  };

  const generateHelpWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `Olá, CT Viva Esportes! Estou no site de reservas e gostaria de tirar uma dúvida.`
    );
    return `https://wa.me/55${currentArena.whatsapp}?text=${text}`;
  };

const generateShareGroupMessage = (b: StoredBooking) => {
    // Usando caracteres seguros de texto/símbolos que não quebram a codificação
    const text = 
      `Fala, galera! Nosso jogo está garantido!\n\n` +
      `Local: ${currentArena.name}\n` +
      `Endereço: ${currentArena.address}\n` +
      `Como chegar: ${currentArena.mapsUrl}\n` +
      `Data: ${formatDateToBR(b.date)}\n\n` +
      `Espaços & Horários Agendados:\n${b.courtName}\n\n` +
      `Valor Total: R$ ${b.totalAmount.toFixed(2)} (vamos dividir!)\n\n` +
      `Bora pro jogo! Não se atrasem.`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Ao buscar, unifica todas as linhas que partilham o mesmo código na mesma reserva consolidada
  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelStatusMsg(null);
    setHasSearched(true);

    const rawCode = searchCodeInput.trim().toUpperCase();
    const rawPhoneDigits = searchPhoneInput.replace(/\D/g, "");

    if (!rawCode || rawPhoneDigits.length < 8) {
      alert("Por segurança, informe tanto o Código da Reserva quanto o WhatsApp cadastrado.");
      return;
    }

    try {
      const { data, error } = await supabase.from("bookings").select("*").eq("code", rawCode);
      if (error || !data || data.length === 0) {
        setSearchedBookings([]);
        return;
      }

      const matches = data.filter((b) => {
        const phoneDigits = b.customer_phone ? b.customer_phone.replace(/\D/g, "") : "";
        return phoneDigits.endsWith(rawPhoneDigits.slice(-8));
      });

      if (matches.length === 0) {
        setSearchedBookings([]);
        return;
      }

      // Agrupa todos os horários e soma o valor total da reserva consolidada
      const first = matches[0];
      const courtDetails = matches
        .map((m) => `• ${m.court_name}: ${m.booking_time}`)
        .join("\n");
      const sumPrice = matches.reduce((acc, m) => acc + Number(m.price), 0);

      const consolidatedBooking: StoredBooking = {
        id: first.id,
        bookingCode: first.code,
        customerName: first.customer_name,
        customerPhone: first.customer_phone,
        courtName: courtDetails,
        date: first.booking_date,
        time: matches.map((m) => m.booking_time).join(", "),
        totalAmount: sumPrice + serviceFee,
        status: first.status === "cancelada" ? "cancelled" : "confirmed",
      };

      setSearchedBookings([consolidatedBooking]);
    } catch (err) {
      console.error(err);
      setSearchedBookings([]);
    }
  };

  const handleCancelReservation = async (booking: StoredBooking) => {
    const now = new Date();
    const bookingDateTime = new Date(`${booking.date}T16:00:00`);
    const diffHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 3) {
      setCancelStatusMsg({
        text: `Cancelamento não elegível para reembolso. Faltam menos de 3 horas para o início (${diffHours.toFixed(1)}h restantes). O valor não tem devolução.`,
        error: true,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelada" })
        .eq("code", booking.bookingCode);

      if (error) {
        alert("Erro ao processar cancelamento.");
        return;
      }

      setSearchedBookings((prev) =>
        prev.map((b) => b.bookingCode === booking.bookingCode ? { ...b, status: "cancelled" } : b)
      );

      await loadCloudData();
      setCancelStatusMsg({
        text: `Reserva cancelada com sucesso! Estorno de R$ ${(booking.totalAmount - serviceFee).toFixed(2)} liberado via Pix.`,
        error: false,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-28 relative">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="CT Viva Esportes" 
              className="h-10 w-auto rounded object-contain bg-[#041E8C]"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase italic">
                {currentArena.name}
              </h1>
              <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-[#00E599]" />
                Fortaleza - CE
              </p>
            </div>
          </div>
          <a 
            href="/admin" 
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition"
          >
            <Settings className="w-3.5 h-3.5 text-[#00E599]" />
            Gestor
          </a>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        <div className="flex bg-[#041E8C]/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("book")}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
              activeTab === "book" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
            }`}
          >
            Fazer Nova Reserva
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === "manage" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Gerenciar Reserva
          </button>
        </div>

        {activeTab === "manage" ? (
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00E599]" />
                <h2 className="text-sm font-bold text-slate-800">Gerenciar Minha Reserva</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Informe o <strong>Código da Reserva</strong> e o <strong>WhatsApp</strong> cadastrado.
              </p>
            </div>

            <form onSubmit={handleSearchBooking} className="space-y-2.5">
              <div className="space-y-2">
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Código (Ex: VIVA-9B4X)"
                    value={searchCodeInput}
                    onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] tracking-wider outline-none focus:ring-2 focus:ring-[#041E8C]"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="WhatsApp do Titular (DDD + Número)"
                    value={searchPhoneInput}
                    onChange={(e) => setSearchPhoneInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#041E8C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#041E8C] hover:bg-[#031566] text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Localizar Reserva
              </button>
            </form>

            {cancelStatusMsg && (
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                cancelStatusMsg.error ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                {cancelStatusMsg.text}
              </div>
            )}

            {hasSearched && searchedBookings.length === 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                Nenhuma reserva encontrada para os dados informados.
              </div>
            )}

            <div className="space-y-3">
              {searchedBookings.map((b) => (
                <div key={b.bookingCode} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Código Titular</span>
                      <p className="font-mono font-black text-sm text-[#041E8C]">{b.bookingCode}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}>
                      {b.status === "confirmed" ? "Confirmada" : "Cancelada"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cliente</span>
                      <span className="font-semibold text-slate-700">{b.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Espaços & Horários Consolidados</span>
                      <span className="font-semibold text-slate-700 whitespace-pre-line leading-relaxed">{b.courtName}</span>
                    </div>
                  </div>

                  {b.status === "confirmed" && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <a
                        href={generateShareGroupMessage(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                      >
                        <Share2 className="w-4 h-4" />
                        Compartilhar no WhatsApp
                      </a>

                      <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        ⚠️ <strong>Regra de Reembolso:</strong> Devoluções permitidas apenas com mais de 3 horas de antecedência.
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelReservation(b)}
                        className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar Reserva e Pedir Estorno
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                1. Identificação do Cliente
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#041E8C] outline-none"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="WhatsApp (DDD + Número)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#041E8C] outline-none"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                2. Escolha a Modalidade
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {currentArena.sports.map((sport) => {
                  const isActive = selectedSport === sport;
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => {
                        setSelectedSport(sport);
                        setSelectedSlots([]);
                        setRentals({});
                      }}
                      className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition font-bold ${
                        isActive
                          ? "bg-[#041E8C] text-white border-[#041E8C] shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {sport}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  3. Escolha a Data do Jogo
                </label>
                {isWeekend && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    Final de Semana / Feriado
                  </span>
                )}
              </div>
              <input
                type="date"
                min={todayString || undefined}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlots([]);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#041E8C] outline-none"
              />
            </section>

            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  4. Selecionar Horários & Quadras
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  Marque quantas quadras e horas quiser
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {businessHours.map((time) => {
                  const isPicked = activeHourPick === time;
                  const hour = parseInt(time.split(":")[0], 10);
                  const isPromo = hour >= 16 && hour < 19 && !isWeekend;
                  const isTooClose = isTimeTooCloseOrPassed(time);
                  const selectedCountInThisHour = selectedSlots.filter((s) => s.time === time).length;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isTooClose}
                      onClick={() => setActiveHourPick(time)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center transition text-center min-h-[54px] relative ${
                        isTooClose
                          ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-60"
                          : isPicked
                          ? "bg-[#041E8C] text-white border-[#041E8C] shadow-sm"
                          : "bg-white border-slate-200 hover:border-[#041E8C] text-slate-700"
                      }`}
                    >
                      <span className="text-xs font-bold">{time}</span>
                      <span className={`text-[9px] font-semibold mt-0.5 ${
                        isTooClose ? "text-slate-300" : isPicked ? "text-[#00E599]" : isPromo ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {isTooClose ? "Encerrado" : isPromo ? "Promo" : "Normal"}
                      </span>

                      {selectedCountInThisHour > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#00E599] text-[#041E8C] font-black rounded-full text-[9px] flex items-center justify-center shadow">
                          {selectedCountInThisHour}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">
                    Quadras Livres:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {availableCourtsAtActiveHour.length} disponíveis
                  </span>
                </div>

                {availableCourtsAtActiveHour.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {availableCourtsAtActiveHour.map((court) => {
                      const price = getCourtPrice(court, activeHourPick);
                      const isSelected = selectedSlots.some(
                        (s) => s.courtId === court.id && s.time === activeHourPick
                      );

                      return (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => toggleSelectSlot(court, activeHourPick)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? "border-[#00E599] bg-emerald-50/70 shadow-sm ring-2 ring-[#00E599]"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{court.name}</p>
                              <p className="text-[10px] text-slate-400">{court.surface}</p>
                            </div>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected ? "bg-[#041E8C] text-white" : "border border-slate-300 text-slate-400"
                            }`}>
                              {isSelected ? "✓" : "+"}
                            </span>
                          </div>

                          <div className="pt-2 text-right">
                            <span className="text-xs font-black text-[#041E8C]">
                              R\$ {price.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-500">/h</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700">
                    Todas as quadras ocupadas às {activeHourPick}. Escolha outro horário acima.
                  </div>
                )}
              </div>

              {selectedSlots.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase text-slate-600">
                      Horários Selecionados ({selectedSlots.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSlots([])}
                      className="text-[10px] text-red-600 font-bold hover:underline"
                    >
                      Limpar todos
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {selectedSlots.map((slot) => (
                      <div
                        key={`${slot.courtId}-${slot.time}`}
                        className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-200 text-xs"
                      >
                        <div>
                          <strong className="text-slate-800">{slot.courtName}</strong>
                          <span className="text-slate-500 text-[11px] ml-2 font-mono">às {slot.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#041E8C]">R\$ {slot.price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeSlot(slot.courtId, slot.time)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 5. Acessórios */}
            {selectedSlots.length > 0 && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    5. Materiais e Equipamentos
                  </label>
                  <div className="mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {selectedSport === "Beach Tennis" && "🎾 Bolas de Beach Tennis inclusas gratuitamente!"}
                      {selectedSport === "Vôlei de Praia" && "🏐 Bola Padrão do CT inclusa gratuitamente!"}
                      {selectedSport === "Futevôlei" && "⚽ Bolas de Futevôlei inclusas gratuitamente na locação!"}
                      {selectedSport === "Carimba" && "🔴 Bolas de Carimba inclusas gratuitamente na locação!"}
                      {selectedSport === "Futebol Society" && "⚽ Bola de Futebol Society oficial inclusa gratuitamente!"}
                    </span>
                  </div>
                </div>

                {initialEquipments.filter((e: Equipment) => e.sports.some((s) => normalize(s) === normalize(selectedSport))).length > 0 && (
                  <div className="space-y-2 pt-1">
                    {initialEquipments.filter((e: Equipment) => e.sports.some((s) => normalize(s) === normalize(selectedSport))).map((item: Equipment) => {
                      const count = rentals[item.id] || 0;
                      return (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{item.name}</p>
                              <p className="text-[10px] text-[#041E8C] font-semibold">+ R\$ {item.price.toFixed(2)} / unidade</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEquipmentChange(item.id, -1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <span className="w-5 text-center text-xs font-bold">{count}</span>
                              <button
                                type="button"
                                onClick={() => handleEquipmentChange(item.id, 1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {item.highlight && (
                            <p className="text-[10px] text-slate-500 italic">{item.highlight}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* 6. Cupom & Resumo */}
            {selectedSlots.length > 0 && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Resumo do Pedido
                </h3>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  {appliedCoupon ? (
                    <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                      <span className="font-bold text-emerald-800">
                        Cupom <strong>{appliedCoupon.code}</strong> aplicado ({appliedCoupon.discountPercent > 0 ? `-${appliedCoupon.discountPercent}%` : `-R$ ${appliedCoupon.discountFixed}`})
                      </span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-red-600 font-bold hover:underline text-[11px]"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite seu cupom"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg hover:bg-[#031566] transition shadow-xs"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Locação de Quadras ({selectedSlots.length}h selecionadas)</span>
                    <span>R$ {subtotalCourts.toFixed(2)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Desconto do Cupom ({appliedCoupon?.code})</span>
                      <span>- R$ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {totalEquipmentCost > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Materiais e Acessórios</span>
                      <span>R$ {totalEquipmentCost.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Taxa de Serviço</span>
                    <span>R$ {serviceFee.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                    <span>Total a Pagar</span>
                    <span className="text-[#041E8C] text-base font-black">R$ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-1.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Termo Obrigatório de Cancelamento
                  </p>
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-[#041E8C] rounded border-amber-400 focus:ring-[#041E8C]"
                    />
                    <span className="text-[11px] text-amber-950 font-medium leading-snug select-none">
                      Declaro que li e concordo: <strong>Cancelamento com reembolso total é permitido apenas com mais de 3 horas de antecedência do jogo</strong>.
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleStartBooking}
                  className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm tracking-wide"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  FINALIZAR RESERVA E PAGAR COM PIX
                </button>
              </section>
            )}
          </>
        )}
      </div>

      <a
        href={generateHelpWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 z-40 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black transition transform hover:scale-105 border-2 border-white"
      >
        <MessageCircle className="w-4 h-4 fill-current" />
        <span>Dúvidas? Chame no Zap</span>
      </a>

      {isModalOpen && currentBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#041E8C]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {isPaymentConfirmed ? "Reserva Confirmada!" : "Pagamento Pix"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Fechar
              </button>
            </div>

            {isPaymentConfirmed ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-800">Pagamento Confirmado!</h4>
                  <p className="text-xs text-slate-500 mt-1">A sua quadra foi bloqueada com sucesso.</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Código da Reserva:</span>
                    <strong className="font-mono text-[#041E8C] font-bold">{currentBooking.bookingCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="font-medium text-slate-700">{currentBooking.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data:</span>
                    <span className="font-medium text-slate-700">{formatDateToBR(currentBooking.date)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 space-y-1">
                    <span className="text-slate-500 font-bold block text-[11px]">Quadras & Horários:</span>
                    <p className="font-medium text-slate-800 whitespace-pre-line text-[11px] leading-relaxed">
                      {currentBooking.courtName}
                    </p>
                  </div>
                </div>

                <a
                  href={generateWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Enviar Comprovante p/ WhatsApp do CT
                </a>
              </div>
            ) : !isExpired ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 text-xs font-bold">
                  <Timer className="w-3.5 h-3.5 animate-pulse" />
                  <span>Horário bloqueado por: {formatTimer(timeLeft)}</span>
                </div>

                <p className="text-xs text-slate-500">
                  Código provisório: <strong className="font-mono text-[#041E8C]">{currentBooking.bookingCode}</strong>. Total de <strong>R$ {totalAmount.toFixed(2)}</strong>.
                </p>

                <div className="w-36 h-36 mx-auto bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center p-2">
                  <QrCode className="w-28 h-28 text-slate-800" />
                </div>

                <div className="text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">
                    Pix Copia e Cola
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value="00020126360014BR.GOV.BCB.PIX0114+558599999999520400005303986540583.00..."
                      className="w-full text-xs bg-transparent border-none text-slate-600 font-mono outline-none traceback"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("00020126360014BR.GOV.BCB.PIX0114+558599999999520400005303986540583.00...");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#041E8C] text-white hover:bg-[#031566] transition flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaymentConfirmed(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  Simular Pagamento Confirmado (Demo)
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="w-12 h-12 text-red-500 npm mx-auto" />
                <h4 className="font-bold text-slate-800 text-base">Tempo Esgotado!</h4>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}