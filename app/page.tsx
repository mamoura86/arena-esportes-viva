"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import CheckoutModal from "@/components/CheckoutModal";
import { 
  MapPin, CheckCircle2, QrCode, Copy, 
  AlertCircle, User, Phone, Timer, Settings,
  MessageCircle, Search, XCircle, Tag, ShieldCheck, Sparkles,
  Share2, X, GraduationCap, Calendar, DollarSign, CreditCard
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  surface: string;
  sports: string[];
  type: "society" | "areia";
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
  courtId?: string;
  date: string;
  time: string;
  totalAmount: number;
  status: "aguardando_pagamento" | "confirmada" | "cancelada";
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

const businessHours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

const classScheduleMap: Record<string, Record<string, string[]>> = {
  "Vôlei de Praia": {
    "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"],
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"],
    "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"]
  },
  "Beach Tennis": {
    "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"],
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"],
    "Intermediário": ["Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"]
  },
  "Futevôlei": {
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"],
    "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h"],
    "Avançado": ["Terça e Quinta às 21h"]
  },
  "Escolinha de Futebol": {
    "Kids": ["Segunda e Quarta às 17h", "Segunda e Quarta às 18h", "Terça e Quinta às 17h", "Terça e Quinta às 18h"],
    "Iniciante": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"],
    "Adulto": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"]
  }
};

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

// NOVO: Força o calendário a usar o Fuso Horário do Brasil
const getBrazilDateString = () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(date);
  const d = parts.find(p => p.type === 'day')?.value || '01';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const y = parts.find(p => p.type === 'year')?.value || '2026';
  return `${y}-${m}-${d}`;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "classes" | "manage">("book");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [selectedSport, setSelectedSport] = useState(currentArena.sports[0]);
  const [todayString, setTodayString] = useState("");
  const [currentClientTime, setCurrentClientTime] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeHourPick, setActiveHourPick] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
   
  const [upgradesConfig, setUpgradesConfig] = useState<any>({
    volleyEnabled: true, volleyPrice: 10,
    beachTennisEnabled: true, beachTennisPrice: 10,
    societyEnabled: true, societyPrice: 15
  });
  const [selectedUpgradeKey, setSelectedUpgradeKey] = useState<string>("");

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountPercent: number; discountFixed: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
   
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<"pix" | "card">("pix");

  const [classSport, setClassSport] = useState("");
  const [classCategory, setClassCategory] = useState("");
  const [selectedClassOption, setSelectedClassOption] = useState<string>("");
  const [classPlanType, setClassPlanType] = useState<"mensal" | "trimestral" | "semestral">("mensal");
  const [extraDaysCount, setExtraDaysCount] = useState(0);
  const [extraDay1, setExtraDay1] = useState("");
  const [extraDay2, setExtraDay2] = useState("");
  const [acceptedClassTerms, setAcceptedClassTerms] = useState(false);

  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [courtLocks, setCourtLocks] = useState<any[]>([]);
  const [classEnrollmentsList, setClassEnrollmentsList] = useState<any[]>([]);
  const [classCapacityMap, setClassCapacityMap] = useState<any>({});
  const [defaultCapacity, setDefaultCapacity] = useState<number>(12);
  const [classPricesMap, setClassPricesMap] = useState<any>({
    "Vôlei de Praia": { mensal: 200, trimestral: 540, semestral: 960 },
    "Beach Tennis": { mensal: 200, trimestral: 540, semestral: 960 },
    "Futevôlei": { mensal: 200, trimestral: 540, semestral: 960 },
    "Escolinha de Futebol": { mensal: 200, trimestral: 540, semestral: 960 }
  });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutBookingDetails, setCheckoutBookingDetails] = useState({
    amount: 0,
    baseAmount: 0,
    description: "",
    customerName: "",
    customerPhone: "",
    isClass: false,
    slots: [] as SelectedSlot[],
    selectedSport: "",
    selectedDate: "",
    upgradeItemCost: 0,
    upgradeItemName: "",
  });

  const loadCloudData = async () => {
    try {
      const { data: bookingsData } = await supabase.from("bookings").select("*").in("status", ["aguardando_pagamento", "confirmada"]);
      if (bookingsData) setActiveBookings(bookingsData);

      const { data: locksData } = await supabase.from("court_locks").select("*");
      if (locksData) setCourtLocks(locksData);

      const { data: enData } = await supabase.from("class_enrollments").select("*").eq("status", "ativa");
      if (enData) setClassEnrollmentsList(enData);

      const { data: settingsData } = await supabase.from("arena_settings").select("*").single();
      if (settingsData) {
        if (settingsData.upgrades) {
          setUpgradesConfig({
            volleyEnabled: Boolean(settingsData.upgrades.volleyEnabled),
            volleyPrice: Number(settingsData.upgrades.volleyPrice || 10),
            beachTennisEnabled: Boolean(settingsData.upgrades.beachTennisEnabled),
            beachTennisPrice: Number(settingsData.upgrades.beachTennisPrice || 10),
            societyEnabled: Boolean(settingsData.upgrades.societyEnabled),
            societyPrice: Number(settingsData.upgrades.societyPrice || 15),
          });
        }
        if (settingsData.class_capacity) setDefaultCapacity(Number(settingsData.class_capacity));
        if (settingsData.class_capacity_map) setClassCapacityMap(settingsData.class_capacity_map);
        if (settingsData.class_prices) setClassPricesMap(settingsData.class_prices);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setMounted(true);
    const todayFormatted = getBrazilDateString();

    setTodayString(todayFormatted);
    setSelectedDate(todayFormatted);
    setCurrentClientTime(new Date().getTime());

    const queryParams = new URLSearchParams(window.location.search);
    const statusParam = queryParams.get("status");
    const codeParam = queryParams.get("code");
    const phoneParam = queryParams.get("phone");

    if (statusParam === "success" && codeParam) {
      alert(`Pagamento aprovado com sucesso!\nO seu código de reserva é: ${codeParam}`);
      setSearchCodeInput(codeParam);
      if (phoneParam) setSearchPhoneInput(phoneParam);
      setActiveTab("manage");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (statusParam === "failure") {
      alert("O pagamento não foi concluído ou foi recusado. Pode tentar novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadCloudData();

    const channel = supabase
      .channel("public:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "court_locks" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_settings" }, () => loadCloudData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [searchCodeInput, setSearchCodeInput] = useState("");
  const [searchPhoneInput, setSearchPhoneInput] = useState("");
  const [searchedBookings, setSearchedBookings] = useState<StoredBooking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

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
    return ((slotTime.getTime() - now.getTime()) / (1000 * 60)) < 15;
  };

  const isCourtLocked = (courtId: string, time: string) => {
    const hasBooking = activeBookings.some((b) => {
      if (b.court_id !== courtId || b.booking_date !== selectedDate || b.booking_time !== time) return false;
      if (b.status === "confirmada") return true;
      if (b.status === "aguardando_pagamento") {
        if (!b.created_at) return false;
        const diffMinutes = (new Date().getTime() - new Date(b.created_at).getTime()) / (1000 * 60);
        return diffMinutes <= 10;
      }
      return false;
    });

    if (hasBooking) return true;
    const dayOfWeek = getDayOfWeekFromDate(selectedDate);
    return courtLocks.some((lock) => {
      if (lock.court_id !== courtId || lock.lock_time !== time) return false;
      if (lock.lock_type === "weekly" && lock.day_of_week === dayOfWeek) return true;
      if (lock.lock_type === "date" && lock.lock_date === selectedDate) return true;
      return false;
    });
  };

  const isWeekend = isWeekendOrHoliday(selectedDate);

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

  let upgradeItemCost = 0;
  let upgradeItemName = "";
  if (selectedSport === "Vôlei de Praia" && upgradesConfig.volleyEnabled === true && selectedUpgradeKey === "volley") {
    upgradeItemCost = Number(upgradesConfig.volleyPrice || 10);
    upgradeItemName = "Upgrade: Bola Mikasa Pro Oficial";
  } else if (selectedSport === "Beach Tennis" && upgradesConfig.beachTennisEnabled === true && selectedUpgradeKey === "beachtennis") {
    upgradeItemCost = Number(upgradesConfig.beachTennisPrice || 10);
    upgradeItemName = "Aluguel de Raquete de Beach Tennis";
  } else if (selectedSport === "Futebol Society" && upgradesConfig.societyEnabled === true && selectedUpgradeKey === "society") {
    upgradeItemCost = Number(upgradesConfig.societyPrice || 15);
    upgradeItemName = "Aluguel de Coletes";
  }

  const handleApplyCoupon = async (contextType: "quadras" | "aulas") => {
    setCouponError("");
    const codeClean = couponCodeInput.trim().toUpperCase();
    if (!codeClean) return;

    try {
      const { data, error } = await supabase.from("coupons").select("*").eq("code", codeClean).eq("active", true).single();
      if (error || !data) {
        setCouponError("Cupom inválido ou expirado.");
        return;
      }

      const scope = data.scope || "ambos";
      if (scope === "quadras" && contextType === "aulas") {
        setCouponError("Este cupom é válido apenas para reserva de quadras.");
        return;
      }
      if (scope === "aulas" && contextType === "quadras") {
        setCouponError("Este cupom é válido apenas para inscrição em aulas.");
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

  const rawSubtotalForTotal = selectedSlots.length > 0 
    ? Math.max(0, subtotalCourts - discountAmount) + upgradeItemCost 
    : 0;

  const cardFeeAmount = paymentMethodChoice === "card"
    ? Number((rawSubtotalForTotal * 0.0398).toFixed(2))
    : 0;

  const totalAmount = rawSubtotalForTotal + cardFeeAmount;

  const getPackageTotalPrice = () => {
    const sportPrices = classPricesMap[classSport] || { mensal: 200, trimestral: 540, semestral: 960 };
    let monthlyBase = Number(sportPrices.mensal) || 200.0;
    let multiplier = 1;

    if (classPlanType === "trimestral") {
      const quarterlyTotal = Number(sportPrices.trimestral) || 540.0;
      monthlyBase = quarterlyTotal / 3;
      multiplier = 3;
    } else if (classPlanType === "semestral") {
      const semiannualTotal = Number(sportPrices.semestral) || 960.0;
      monthlyBase = semiannualTotal / 6;
      multiplier = 6;
    }

    const basePackagePrice = monthlyBase * multiplier;
    const extraDaysTotal = extraDaysCount * 80.0 * multiplier;
    return basePackagePrice + extraDaysTotal;
  };

  const totalClassPackagePrice = getPackageTotalPrice();

  let classDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent > 0) {
      classDiscountAmount = (totalClassPackagePrice * appliedCoupon.discountPercent) / 100;
    } else {
      classDiscountAmount = appliedCoupon.discountFixed;
    }
  }

  const rawClassAmount = Math.max(0, totalClassPackagePrice - classDiscountAmount);
  
  const classCardFee = paymentMethodChoice === "card"
    ? Number((rawClassAmount * 0.0398).toFixed(2))
    : 0;

  const finalClassAmount = rawClassAmount + classCardFee;

  const getCapacityForTurma = (turmaStr: string) => {
    if (classCapacityMap && classCapacityMap[turmaStr] !== undefined) {
      return Number(classCapacityMap[turmaStr]);
    }
    return defaultCapacity;
  };

  const countEnrollmentsForSpecificClass = (targetTurma: string) => {
    if (!classSport) return 0;
    return classEnrollmentsList.filter((en) => {
      if (en.sport.toLowerCase() !== classSport.toLowerCase()) return false;
      if (!en.days_selected) return false;
      return en.days_selected.toLowerCase().includes(targetTurma.toLowerCase());
    }).length;
  };

  const getRemainingSlotsForOption = (optionStr: string) => {
    const maxCap = getCapacityForTurma(optionStr);
    const used = countEnrollmentsForSpecificClass(optionStr);
    return Math.max(0, maxCap - used);
  };

  const formatSlotsForSummary = (slots: SelectedSlot[]) => {
    const byCourt: { [key: string]: string[] } = {};
    slots.forEach((s) => {
      if (!byCourt[s.courtName]) byCourt[s.courtName] = [];
      byCourt[s.courtName].push(s.time);
    });

    let summary = Object.entries(byCourt)
      .map(([courtName, times]) => {
        const sorted = times.sort();
        return `• ${courtName}: ${sorted.join(", ")} (${sorted.length}h)`;
      }).join("\n");

    if (upgradeItemCost > 0 && upgradeItemName) {
      summary += `\n• Adicional: ${upgradeItemName} (R$ ${upgradeItemCost.toFixed(2)})`;
    }
    return summary;
  };

  const handleSimulatedSuccess = async (method: string, installments: number, totalPaid: number) => {
    const isClass = checkoutBookingDetails.isClass;
    const prefix = isClass ? "AULA" : "VIVA";
    const codeStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingCode = `${prefix}-${codeStr}`;

    try {
      if (isClass) {
        await supabase.from("class_enrollments").insert([{
          code: bookingCode,
          student_name: checkoutBookingDetails.customerName,
          student_phone: checkoutBookingDetails.customerPhone,
          sport: classSport,
          category: classCategory,
          plan_type: classPlanType,
          days_selected: selectedClassOption,
          total_price: totalPaid,
          status: "confirmada",
          payment_method: method === "card" ? "Cartão de Crédito" : "Pix"
        }]);
      } else {
        const recordsToInsert = checkoutBookingDetails.slots.map((slot: any) => ({
          id: crypto.randomUUID(),
          code: bookingCode,
          customer_name: checkoutBookingDetails.customerName,
          customer_phone: checkoutBookingDetails.customerPhone,
          court_id: slot.courtId,
          court_name: slot.courtName,
          sport: selectedSport,
          booking_date: selectedDate,
          booking_time: slot.time,
          price: slot.price,
          channel: "online",
          payment_method: method === "card" ? "Cartão de Crédito" : "Pix",
          status: "confirmada",
          created_at: new Date().toISOString()
        }));
        await supabase.from("bookings").insert(recordsToInsert);

        // --- DISPARO AUTOMÁTICO DO E-MAIL USANDO A API EXISTENTE ---
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #041E8C; text-align: uppercase; border-bottom: 2px solid #00E599; padding-bottom: 10px;">Nova Reserva Efetuada!</h2>
              <p>Olá, Gestor,</p>
              <p>Uma nova reserva foi efetuada e paga com sucesso no site da arena.</p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Código:</strong> ${bookingCode}</p>
                <p style="margin: 5px 0;"><strong>Atleta:</strong> ${checkoutBookingDetails.customerName}</p>
                <p style="margin: 5px 0;"><strong>WhatsApp:</strong> ${checkoutBookingDetails.customerPhone}</p>
                <p style="margin: 5px 0;"><strong>Espaço:</strong> ${checkoutBookingDetails.slots.map(s => s.courtName).join(', ')}</p>
                <p style="margin: 5px 0;"><strong>Data:</strong> ${selectedDate}</p>
                <p style="margin: 5px 0;"><strong>Horário:</strong> ${checkoutBookingDetails.slots.map(s => s.time).join(', ')}</p>
                <p style="margin: 5px 0; color: #041E8C; font-size: 16px;"><strong>Valor Total:</strong> R$ ${Number(totalPaid).toFixed(2)}</p>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">Sistema de Gestão Automatizada - Arena CT Viva Esportes</p>
            </div>
          `;

          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: 'ctvivaesportes@uorak.com',
              subject: `Nova Reserva Confirmada! - ${bookingCode}`,
              html: emailHtml,
            })
          });
        } catch (emailErr) {
          console.error("Falha ao disparar e-mail de notificação:", emailErr);
        }
      }

      setIsCheckoutModalOpen(false);
      window.location.href = `/?status=success&code=${bookingCode}`;
    } catch (err) {
      console.error("Erro ao salvar reserva no banco:", err);
      alert("Falha ao registrar a reserva. Tente novamente.");
    }
  };

  const handleActionClick = () => {
    if (activeTab === "book") {
      if (!customerName.trim() || !customerPhone.trim()) {
        alert("Por favor, preencha o seu Nome e WhatsApp na Identificação do Cliente.");
        return;
      }
      if (selectedSlots.length === 0) {
        alert("Por favor, selecione pelo menos um horário de quadra.");
        return;
      }
      if (!acceptedTerms) {
        alert("É necessário marcar o aceite da política de cancelamento.");
        return;
      }

      setCheckoutBookingDetails({
        amount: totalAmount,
        baseAmount: rawSubtotalForTotal,
        description: `Reserva Arena CT Viva - ${formatSlotsForSummary(selectedSlots)}`,
        customerName,
        customerPhone,
        isClass: false,
        slots: selectedSlots,
        selectedSport,
        selectedDate,
        upgradeItemCost,
        upgradeItemName,
      });
      setIsCheckoutModalOpen(true);

    } else {
      if (!customerName.trim() || !customerPhone.trim()) {
        alert("Por favor, preencha o seu Nome e WhatsApp.");
        return;
      }
      if (!classSport || !classCategory || !selectedClassOption) {
        alert("Por favor, selecione a Modalidade, a Categoria e a Turma/Horário desejados.");
        return;
      }
      if (getRemainingSlotsForOption(selectedClassOption) <= 0) {
        alert("Desculpe, esta turma já atingiu o limite máximo de vagas.");
        return;
      }
      if (!acceptedClassTerms) {
        alert("É necessário aceitar os termos de matrícula e política do CDC.");
        return;
      }

      setCheckoutBookingDetails({
        amount: finalClassAmount,
        baseAmount: rawClassAmount,
        description: `Matrícula Aula - ${classSport} (${classCategory})`,
        customerName,
        customerPhone,
        isClass: true,
        slots: [],
        selectedSport: classSport,
        selectedDate: getBrazilDateString(),
        upgradeItemCost: 0,
        upgradeItemName: "",
      });
      setIsCheckoutModalOpen(true);
    }
  };

  const generateHelpWhatsAppUrl = () => {
    const text = encodeURIComponent(`Olá, CT Viva Esportes! Estou no site de reservas e gostaria de tirar uma dúvida.`);
    return `https://wa.me/55${currentArena.whatsapp}?text=${text}`;
  };

  const generateShareGroupMessage = (b: StoredBooking) => {
    const text = `Fala, galera! Nosso play está garantido!\n\n` +
      `Local: ${currentArena.name}\nEndereço: ${currentArena.address}\nComo chegar: ${currentArena.mapsUrl}\n` +
      `Data: ${formatDateToBR(b.date)}\n\nEspaços & Horários Agendados:\n${b.courtName}\n\n` +
      `Valor Total: R$ ${b.totalAmount.toFixed(2)} (vamos dividir!)\n\nBora pro jogo! Não se atrasem.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelStatusMsg(null);
    setHasSearched(true);
    const rawCode = searchCodeInput.trim().toUpperCase();
    const rawPhoneDigits = searchPhoneInput.replace(/\D/g, "");

    if (!rawCode || rawPhoneDigits.length < 8) {
      alert("Por segurança, informe tanto o Código quanto o WhatsApp cadastrado.");
      return;
    }

    try {
      const { data } = await supabase.from("bookings").select("*").eq("code", rawCode);
      if (data && data.length > 0) {
        const matches = data.filter((b) => {
          const phoneDigits = b.customer_phone ? b.customer_phone.replace(/\D/g, "") : "";
          return phoneDigits.endsWith(rawPhoneDigits.slice(-8));
        });

        if (matches.length > 0) {
          const first = matches[0];
          const courtDetails = matches.map((m) => `• ${m.court_name}: ${m.booking_time}`).join("\n");
          const sumPrice = matches.reduce((acc, m) => acc + Number(m.price), 0);

          setSearchedBookings([{
            id: first.id,
            bookingCode: first.code,
            customerName: first.customer_name,
            customerPhone: first.customer_phone,
            courtName: courtDetails,
            date: first.booking_date,
            time: matches.map((m) => m.booking_time).sort().join(", "),
            totalAmount: sumPrice,
            status: first.status === "cancelada" ? "cancelada" : "confirmada",
          }]);
          return;
        }
      }

      const { data: classData } = await supabase.from("class_enrollments").select("*").eq("code", rawCode);
      if (classData && classData.length > 0) {
        const matchClass = classData[0];
        setSearchedBookings([{
          id: matchClass.id,
          bookingCode: matchClass.code,
          customerName: matchClass.student_name,
          customerPhone: matchClass.student_phone,
          courtName: `Modalidade: ${matchClass.sport} (${matchClass.category})\nPlano: ${matchClass.plan_type.toUpperCase()} - Turma: ${matchClass.days_selected}`,
          date: new Date().toISOString().split("T")[0],
          time: "Matrícula de Aula",
          totalAmount: Number(matchClass.total_price),
          status: matchClass.status === "cancelada" ? "cancelada" : "confirmada",
        }]);
        return;
      }
      setSearchedBookings([]);
    } catch (err) {
      console.error(err);
      setSearchedBookings([]);
    }
  };

  const handleCancelReservation = async (booking: StoredBooking) => {
    if (booking.bookingCode.startsWith("AULA-")) {
      const confirmed = confirm("Deseja cancelar sua matrícula?\n\nPolítica (CDC - Art. 49): Reembolso integral garantido em até 7 dias corridos após a contratação. Após cancelar aqui, entre em contato com a arena via WhatsApp para solicitar seu estorno.");
      if (!confirmed) return;
      await supabase.from("class_enrollments").update({ status: "cancelada" }).eq("code", booking.bookingCode);
      setSearchedBookings((prev) => prev.map((b) => (b.bookingCode === booking.bookingCode ? { ...b, status: "cancelada" } : b)));
      setCancelStatusMsg({ text: `Matrícula cancelada! Entre em contato com a arena pelo WhatsApp informando o código ${booking.bookingCode} para o reembolso conforme a política.`, error: false });
      await loadCloudData();
      return;
    }

    const firstSlotTime = booking.time.split(",")[0].trim() || "16:00";
    const now = new Date();
    const bookingDateTime = new Date(`${booking.date}T${firstSlotTime}:00`);
    const diffMinutes = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);

    let refundRuleText = diffMinutes >= 120 ? "Mais de 2 horas de antecedência: Direito a REEMBOLSO INTEGRAL (100%)." : diffMinutes >= 30 ? "Entre 30 min e 2 horas de antecedência: Retenção de 50% (Direito a 50% de reembolso)." : "Menos de 30 minutos de antecedência (ou horário iniciado): Sem devolução de valores.";

    const confirmed = confirm(`Confirma o cancelamento da reserva ${booking.bookingCode}?\n\nPolítica aplicável no momento:\n• ${refundRuleText}\n\nAo confirmar, o horário será liberado imediatamente e você deverá contatar a arena no WhatsApp para tratativas de reembolso.`);
    if (!confirmed) return;

    try {
      await supabase.from("bookings").update({ status: "cancelada" }).eq("code", booking.bookingCode);
      setSearchedBookings((prev) => prev.map((b) => (b.bookingCode === booking.bookingCode ? { ...b, status: "cancelada" } : b)));
      await loadCloudData();
      setCancelStatusMsg({ text: `Reserva cancelada e horário liberado! (${refundRuleText}) Entre em contato com a arena pelo WhatsApp informando o código ${booking.bookingCode} para solicitar o estorno aplicável.`, error: false });
    } catch (err) {
      console.error(err);
      setCancelStatusMsg({ text: "Erro ao cancelar a reserva. Tente novamente.", error: true });
    }
  };

  if (!mounted) return null;

  const availableExtraDays = selectedClassOption.toLowerCase().includes("segunda") 
    ? ["Terça-feira", "Quinta-feira"] : ["Segunda-feira", "Quarta-feira"];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-28 relative">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CT Viva Esportes" className="h-10 w-auto rounded object-contain bg-[#041E8C]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase italic">{currentArena.name}</h1>
              <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium"><MapPin className="w-3 h-3 text-[#00E599]" /> Fortaleza - CE</p>
            </div>
          </div>
          <a href="/admin" className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition cursor-pointer">
            <Settings className="w-3.5 h-3.5 text-[#00E599]" /> Gestor
          </a>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        <div className="flex bg-[#041E8C]/10 p-1 rounded-xl gap-1">
          <button onClick={() => setActiveTab("book")} className={`flex-1 py-2 text-xs font-black rounded-lg transition cursor-pointer ${activeTab === "book" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}>Reservar Quadras</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}><GraduationCap className="w-3.5 h-3.5" /> Aulas / Treinos</button>
          <button onClick={() => setActiveTab("manage")} className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${activeTab === "manage" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}><Search className="w-3.5 h-3.5" /> Gerenciar Reserva</button>
        </div>

        {activeTab === "manage" ? (
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00E599]" /><h2 className="text-sm font-bold text-slate-800">Gerenciar Minha Reserva ou Matrícula</h2></div>
              <p className="text-xs text-slate-500 mt-0.5">Informe o <strong>Código</strong> e o <strong>WhatsApp</strong> cadastrado.</p>
            </div>
            <form onSubmit={handleSearchBooking} className="space-y-2.5">
              <div className="space-y-2">
                <div className="relative"><Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Ex: VIVA-4K8P ou AULA-7M2X" value={searchCodeInput} onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] tracking-wider outline-none" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Digite apenas números com DDD" value={searchPhoneInput} onChange={(e) => setSearchPhoneInput(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#041E8C] text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5 cursor-pointer"><Search className="w-3.5 h-3.5" /> Localizar Registro</button>
            </form>
            {cancelStatusMsg && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${cancelStatusMsg.error ? "bg-red-50 text-red-800 border-red-200" : "bg-amber-50 text-amber-950 border-amber-300"}`}>
                <p className="font-semibold leading-relaxed">{cancelStatusMsg.text}</p>
                {!cancelStatusMsg.error && (
                  <a href={`https://wa.me/55${currentArena.whatsapp}?text=${encodeURIComponent(`Olá! Realizei o cancelamento do código ${searchCodeInput} no site e gostaria de verificar o reembolso conforme a política de cancelamento.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#00E599] text-[#041E8C] font-black rounded-lg text-xs shadow-sm cursor-pointer"><MessageCircle className="w-3.5 h-3.5 fill-current" /> Falar com a Arena no WhatsApp</a>
                )}
              </div>
            )}
            {hasSearched && searchedBookings.length === 0 && <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">Nenhum registro encontrado.</div>}
            <div className="space-y-3">
              {searchedBookings.map((b) => (
                <div key={b.bookingCode} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div><span className="text-[10px] uppercase font-bold text-slate-400">Código</span><p className="font-mono font-black text-sm text-[#041E8C]">{b.bookingCode}</p></div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "confirmada" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{b.status === "confirmada" ? "Ativo" : "Cancelado"}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div><span className="text-slate-400 block text-[10px]">Cliente</span><span className="font-semibold text-slate-700">{b.customerName}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">Data</span><span className="font-semibold text-slate-700">{formatDateToBR(b.date)}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">Detalhes</span><span className="font-semibold text-slate-700 whitespace-pre-line leading-relaxed">{b.courtName}</span></div>
                  </div>
                  {b.status === "confirmada" && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      {!b.bookingCode.startsWith("AULA-") && (
                        <a href={generateShareGroupMessage(b)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"><Share2 className="w-4 h-4" /> Compartilhar no WhatsApp</a>
                      )}
                      <button type="button" onClick={() => handleCancelReservation(b)} className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"><XCircle className="w-4 h-4" /> Solicitar Cancelamento</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "classes" ? (
          <div className="space-y-4">
            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#041E8C] flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-[#00E599]" /> Inscrição em Aulas & Escolinhas</h2>
              <div className="space-y-2">
                <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Digite Nome e Sobrenome" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Digite apenas números com DDD" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Modalidade</label>
              <select value={classSport} onChange={(e) => { setClassSport(e.target.value); setClassCategory(""); setSelectedClassOption(""); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none cursor-pointer">
                <option value="" disabled>Escolher Modalidade</option>
                <option value="Vôlei de Praia">Vôlei de Praia</option>
                <option value="Futevôlei">Futevôlei</option>
                <option value="Beach Tennis">Beach Tennis</option>
                <option value="Escolinha de Futebol">Escolinha de Futebol</option>
              </select>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block pt-2">Categoria / Nível</label>
              <select value={classCategory} onChange={(e) => { setClassCategory(e.target.value); setSelectedClassOption(""); }} disabled={!classSport} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none disabled:opacity-50 cursor-pointer">
                <option value="" disabled>Selecionar Nível</option>
                {classSport && classScheduleMap[classSport] && Object.keys(classScheduleMap[classSport]).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {classSport && classCategory && classScheduleMap[classSport]?.[classCategory] && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Selecione a Turma / Horário Desejado</label>
                  <div className="space-y-2">
                    {classScheduleMap[classSport][classCategory].map((optionLabel, idx) => {
                      const remaining = getRemainingSlotsForOption(optionLabel);
                      const isSelected = selectedClassOption === optionLabel;
                      const isSoldOut = remaining <= 0;
                      const maxCap = getCapacityForTurma(optionLabel);

                      return (
                        <div key={idx} onClick={() => !isSoldOut && setSelectedClassOption(optionLabel)} className={`p-3 rounded-xl border text-xs flex justify-between items-center transition ${isSoldOut ? "bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed" : isSelected ? "bg-emerald-50 border-[#00E599] ring-2 ring-[#00E599] cursor-pointer" : "bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"}`}>
                          <div>
                            <span className="font-bold text-slate-900 block">📅 {optionLabel}</span>
                            <span className={`text-[10px] font-bold ${isSoldOut ? "text-red-600" : "text-emerald-700"}`}>{isSoldOut ? "Esgotado (0 vagas)" : `${remaining} vagas restantes (Máx: ${maxCap})`}</span>
                          </div>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{isSelected ? "✓" : "+"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedClassOption && (
                <div className="pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicionar Dias Extras (+ R$ 80,00 / mês por dia extra)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button type="button" onClick={() => { setExtraDaysCount(Math.max(0, extraDaysCount - 1)); if(extraDaysCount <= 1) setExtraDay2(""); if(extraDaysCount <= 0) setExtraDay1(""); }} className="w-8 h-8 rounded-lg bg-slate-100 font-bold cursor-pointer">-</button>
                    <span className="text-xs font-bold">{extraDaysCount} dia(s) extra(s) (Máx: 2)</span>
                    <button type="button" onClick={() => { if(extraDaysCount < 2) setExtraDaysCount(extraDaysCount + 1); }} className="w-8 h-8 rounded-lg bg-slate-100 font-bold cursor-pointer">+</button>
                  </div>
                  {extraDaysCount >= 1 && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block">Escolher 1º Dia Extra:</label>
                      <select value={extraDay1} onChange={(e) => setExtraDay1(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium cursor-pointer">
                        <option value="" disabled>Selecione o dia...</option>
                        {availableExtraDays.map((d) => (<option key={d} value={d} disabled={d === extraDay2}>{d}</option>))}
                      </select>
                    </div>
                  )}
                  {extraDaysCount >= 2 && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block">Escolher 2º Dia Extra:</label>
                      <select value={extraDay2} onChange={(e) => setExtraDay2(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-medium cursor-pointer">
                        <option value="" disabled>Selecione o dia...</option>
                        {availableExtraDays.map((d) => (<option key={d} value={d} disabled={d === extraDay1}>{d}</option>))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Plano de Fidelização</label>
                <span className="text-[10px] text-slate-400 block mb-2">Cobrança Integral na Contratação</span>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setClassPlanType("mensal")} className={`p-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${classPlanType === "mensal" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}>Mensal<br/><span className="text-[10px] opacity-80">R$ {classPricesMap[classSport || "Vôlei de Praia"]?.mensal || 200}</span></button>
                  <button type="button" onClick={() => setClassPlanType("trimestral")} className={`p-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${classPlanType === "trimestral" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}>Trimestral<br/><span className="text-[10px] opacity-80">R$ {classPricesMap[classSport || "Vôlei de Praia"]?.trimestral || 540}</span></button>
                  <button type="button" onClick={() => setClassPlanType("semestral")} className={`p-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${classPlanType === "semestral" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}>Semestral<br/><span className="text-[10px] opacity-80">R$ {classPricesMap[classSport || "Vôlei de Praia"]?.semestral || 960}</span></button>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo da Matrícula</h3>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                {appliedCoupon ? (
                  <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs"><span className="font-bold text-emerald-800">Cupom <strong>{appliedCoupon.code}</strong> aplicado</span><button type="button" onClick={removeCoupon} className="text-red-600 font-bold hover:underline text-[11px] cursor-pointer">Remover</button></div>
                ) : (
                  <div className="flex gap-2"><input type="text" placeholder="Digite seu cupom" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider outline-none" /><button type="button" onClick={() => handleApplyCoupon("aulas")} className="px-4 py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg cursor-pointer">Aplicar</button></div>
                )}
                {couponError && <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>}
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPaymentMethodChoice("pix")} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${paymentMethodChoice === "pix" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}><QrCode className="w-4 h-4" /> Pix</button>
                  <button type="button" onClick={() => setPaymentMethodChoice("card")} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${paymentMethodChoice === "card" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}><CreditCard className="w-4 h-4" /> Cartão de Crédito</button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between text-slate-600"><span>Plano {classPlanType.toUpperCase()} (Pacote Integral)</span><span>R$ {totalClassPackagePrice.toFixed(2)}</span></div>
                {classDiscountAmount > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span>Desconto do Cupom</span><span>- R$ {classDiscountAmount.toFixed(2)}</span></div>}
                {paymentMethodChoice === "card" && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Taxa Operadora de Crédito (3,98%)</span>
                    <span>R$ {classCardFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                  <span>{paymentMethodChoice === "card" ? "Total a Pagar (Cartão)" : "Total a Pagar (Pix)"}</span>
                  <span className="text-[#041E8C] text-base font-black">R$ {paymentMethodChoice === "card" ? finalClassAmount.toFixed(2) : rawClassAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-1.5 text-[11px] text-amber-950">
                <p className="font-black uppercase flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Política de Cancelamento (CDC - Art. 49)</p>
                <p>Direito de arrependimento e reembolso integral em até 7 dias corridos após a contratação online.</p>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input type="checkbox" checked={acceptedClassTerms} onChange={(e) => setAcceptedClassTerms(e.target.checked)} className="w-4 h-4 mt-0.5 text-[#041E8C] rounded border-amber-400 cursor-pointer" />
                  <span className="font-bold select-none">Li e estou de acordo com os termos de matrícula.</span>
                </label>
              </div>

              <button type="button" onClick={handleActionClick} className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow flex items-center justify-center gap-2 text-xs cursor-pointer">
                <CheckCircle2 className="w-4 h-4" /> FINALIZAR MATRÍCULA E PAGAR
              </button>
            </section>
          </div>
        ) : (
          <>
            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">1. Identificação do Cliente</label>
              <div className="space-y-2">
                <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Digite Nome e Sobrenome" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Digite apenas números com DDD" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none" /></div>
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">2. Escolha a Modalidade</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {currentArena.sports.map((sport) => (
                  <button key={sport} type="button" onClick={() => { setSelectedSport(sport); setSelectedSlots([]); setSelectedUpgradeKey(""); }} className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition font-bold cursor-pointer ${selectedSport === sport ? "bg-[#041E8C] text-white border-[#041E8C] shadow-sm" : "bg-white text-slate-600 border-slate-200"}`}>{sport}</button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">3. Escolha a Data do Jogo</label>{isWeekend && <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">Final de Semana / Feriado</span>}</div>
              <input type="date" min={todayString || undefined} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlots([]); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none cursor-pointer" />
            </section>

            <section className="space-y-3">
              <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">4. Selecionar Horários & Quadras</label><span className="text-[10px] text-slate-500 font-medium">Marque quantas quadras quiser</span></div>
              <div className="grid grid-cols-4 gap-2">
                {businessHours.map((time) => {
                  const isPicked = activeHourPick === time;
                  const hour = parseInt(time.split(":")[0], 10);
                  const isPromo = hour >= 16 && hour < 19 && !isWeekend;
                  const isTooClose = isTimeTooCloseOrPassed(time);
                  const selectedCountInThisHour = selectedSlots.filter((s) => s.time === time).length;

                  return (
                    <button key={time} type="button" disabled={isTooClose} onClick={() => setActiveHourPick(time)} className={`p-2 rounded-xl border flex flex-col items-center justify-center transition text-center min-h-[54px] relative ${isTooClose ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-60" : isPicked ? "bg-[#041E8C] text-white border-[#041E8C] cursor-pointer" : "bg-white text-slate-700 cursor-pointer"}`}>
                      <span className="text-xs font-bold">{time}</span>
                      <span className={`text-[9px] font-semibold mt-0.5 ${isTooClose ? "text-slate-300" : isPicked ? "text-[#00E599]" : isPromo ? "text-emerald-600" : "text-slate-400"}`}>{isTooClose ? "Encerrado" : isPromo ? "Promo" : "Normal"}</span>
                      {selectedCountInThisHour > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#00E599] text-[#041E8C] font-black rounded-full text-[9px] flex items-center justify-center shadow">{selectedCountInThisHour}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">Quadras Livres:</span>
                  <span className="text-[11px] text-slate-400">{activeHourPick ? availableCourtsAtActiveHour.length : 0} disponíveis</span>
                </div>
                
                {activeHourPick === "" ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
                    Selecione um horário acima para ver as quadras disponíveis.
                  </div>
                ) : availableCourtsAtActiveHour.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {availableCourtsAtActiveHour.map((court) => {
                      const price = getCourtPrice(court, activeHourPick);
                      const isSelected = selectedSlots.some((s) => s.courtId === court.id && s.time === activeHourPick);
                      return (
                        <button key={court.id} type="button" onClick={() => toggleSelectSlot(court, activeHourPick)} className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${isSelected ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200 bg-white"}`}>
                          <div className="flex justify-between items-start">
                            <div><p className="text-xs font-bold text-slate-800">{court.name}</p><p className="text-[10px] text-slate-400">{court.surface}</p></div>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{isSelected ? "✓" : "+"}</span>
                          </div>
                          <div className="pt-2 text-right"><span className="text-xs font-black text-[#041E8C]">R$ {price.toFixed(2)}</span><span className="text-[9px] text-slate-500">/h</span></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 rounded-xl text-center text-xs text-red-700">Todas as quadras ocupadas às {activeHourPick}.</div>
                )}
              </div>

              {selectedSlots.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-600">Horários Selecionados ({selectedSlots.length})</span><button type="button" onClick={() => setSelectedSlots([])} className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer">Limpar todos</button></div>
                  <div className="space-y-1.5">
                    {selectedSlots.map((slot) => (
                      <div key={`${slot.courtId}-${slot.time}`} className="flex justify-between items-center p-2 bg-white rounded-xl border text-xs">
                        <div><strong className="text-slate-800">{slot.courtName}</strong><span className="text-slate-500 text-[11px] ml-2 font-mono">às {slot.time}</span></div>
                        <div className="flex items-center gap-2"><span className="font-bold text-[#041E8C]">R$ {slot.price.toFixed(2)}</span><button type="button" onClick={() => removeSlot(slot.courtId, slot.time)} className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"><X className="w-3.5 h-3.5" /></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {selectedSlots.length > 0 && (
              <>
                {selectedSport === "Vôlei de Praia" && upgradesConfig.volleyEnabled === true && (
                  <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicional Opcional</label>
                    <div onClick={() => setSelectedUpgradeKey(selectedUpgradeKey === "volley" ? "" : "volley")} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedUpgradeKey === "volley" ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200"}`}>
                      <div><p className="text-xs font-bold text-slate-800">Upgrade: Bola Mikasa Pro Oficial</p><p className="text-[10px] text-[#041E8C] font-semibold">+ R$ {Number(upgradesConfig.volleyPrice || 10).toFixed(2)}</p></div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedUpgradeKey === "volley" ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{selectedUpgradeKey === "volley" ? "✓" : "+"}</span>
                    </div>
                  </section>
                )}

                {selectedSport === "Beach Tennis" && upgradesConfig.beachTennisEnabled === true && (
                  <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicional Opcional</label>
                    <div onClick={() => setSelectedUpgradeKey(selectedUpgradeKey === "beachtennis" ? "" : "beachtennis")} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedUpgradeKey === "beachtennis" ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200"}`}>
                      <div><p className="text-xs font-bold text-slate-800">Aluguel de Raquete de Beach Tennis</p><p className="text-[10px] text-[#041E8C] font-semibold">+ R$ {Number(upgradesConfig.beachTennisPrice || 10).toFixed(2)}</p></div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedUpgradeKey === "beachtennis" ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{selectedUpgradeKey === "beachtennis" ? "✓" : "+"}</span>
                    </div>
                  </section>
                )}

                {selectedSport === "Futebol Society" && upgradesConfig.societyEnabled === true && (
                  <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Adicional Opcional</label>
                    <div onClick={() => setSelectedUpgradeKey(selectedUpgradeKey === "society" ? "" : "society")} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedUpgradeKey === "society" ? "border-[#00E599] bg-emerald-50/70 ring-2 ring-[#00E599]" : "border-slate-200"}`}>
                      <div><p className="text-xs font-bold text-slate-800">Aluguel de Coletes</p><p className="text-[10px] text-[#041E8C] font-semibold">+ R$ {Number(upgradesConfig.societyPrice || 15).toFixed(2)}</p></div>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedUpgradeKey === "society" ? "bg-[#041E8C] text-white" : "border text-slate-400"}`}>{selectedUpgradeKey === "society" ? "✓" : "+"}</span>
                    </div>
                  </section>
                )}
              </>
            )}

            {selectedSlots.length > 0 && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo do Pedido</h3>

                <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
                  {appliedCoupon ? (
                    <div className="flex justify-between items-center p-2 bg-emerald-50 border rounded-lg text-xs"><span className="font-bold text-emerald-800">Cupom <strong>{appliedCoupon.code}</strong> aplicado</span><button type="button" onClick={removeCoupon} className="text-red-600 font-bold hover:underline text-[11px] cursor-pointer">Remover</button></div>
                  ) : (
                    <div className="flex gap-2"><input type="text" placeholder="Digite seu cupom" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} className="flex-1 p-2 bg-white border rounded-lg text-xs font-bold uppercase outline-none" /><button type="button" onClick={() => handleApplyCoupon("quadras")} className="px-4 py-2 bg-[#041E8C] text-white text-xs font-bold rounded-lg cursor-pointer">Aplicar</button></div>
                  )}
                  {couponError && <p className="text-[10px] text-red-600 font-semibold">{couponError}</p>}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPaymentMethodChoice("pix")} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${paymentMethodChoice === "pix" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}><QrCode className="w-4 h-4" /> Pix</button>
                    <button type="button" onClick={() => setPaymentMethodChoice("card")} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${paymentMethodChoice === "card" ? "bg-[#041E8C] text-white border-[#041E8C]" : "bg-slate-50 text-slate-700"}`}><CreditCard className="w-4 h-4" /> Cartão de Crédito</button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between text-slate-600"><span>Locação de Quadras</span><span>R$ {subtotalCourts.toFixed(2)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span>Desconto do Cupom</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                  {upgradeItemCost > 0 && <div className="flex justify-between text-slate-600"><span>Adicional ({upgradeItemName})</span><span>R$ {upgradeItemCost.toFixed(2)}</span></div>}
                  {paymentMethodChoice === "card" && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Taxa Operadora de Crédito (3,98%)</span>
                      <span>R$ {cardFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                    <span>{paymentMethodChoice === "card" ? "Total a Pagar (Cartão)" : "Total a Pagar (Pix)"}</span>
                    <span className="text-[#041E8C] text-base font-black">R$ {paymentMethodChoice === "card" ? totalAmount.toFixed(2) : rawSubtotalForTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Política de Cancelamento</p>
                  <ul className="text-[11px] text-amber-950 space-y-1 font-medium list-disc list-inside">
                    <li>Até 2 horas antes: reembolso integral</li>
                    <li>De 30 min a 2 horas antes: retenção de 50%</li>
                    <li>Menos de 30 min: sem devolução</li>
                    <li>Não comparecimento: sem devolução</li>
                  </ul>
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer border-t border-amber-200/60 mt-2">
                    <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="w-4 h-4 mt-0.5 text-[#041E8C] rounded cursor-pointer" />
                    <span className="text-[11px] text-amber-950 font-bold leading-snug select-none">Li e estou de acordo com a política de cancelamento.</span>
                  </label>
                </div>

                <button type="button" onClick={handleActionClick} className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow flex items-center justify-center gap-2 text-sm cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" /> FINALIZAR RESERVA E PAGAR
                </button>
              </section>
            )}
          </>
        )}
      </div>

      <a href={generateHelpWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="fixed bottom-4 right-4 z-40 bg-[#00E599] text-[#041E8C] px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black transition transform hover:scale-105 border-2 border-white cursor-pointer"><MessageCircle className="w-4 h-4 fill-current" /> Dúvidas? Chame no Zap</a>

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        bookingDetails={checkoutBookingDetails}
        initialPaymentMethod={paymentMethodChoice}
        onSuccess={handleSimulatedSuccess}
      />
    </main>
  );
}