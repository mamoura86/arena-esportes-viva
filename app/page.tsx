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

interface Court { id: string; name: string; surface: string; sports: string[]; type: "society" | "areia"; }
interface SelectedSlot { courtId: string; courtName: string; time: string; price: number; }
interface StoredBooking {
  id?: string; bookingCode: string; customerName: string; customerPhone: string;
  courtName: string; courtId?: string; date: string; time: string;
  totalAmount: number; status: "aguardando_pagamento" | "confirmada" | "cancelada";
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
  "Vôlei de Praia": { "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"], "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"], "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"] },
  "Beach Tennis": { "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"], "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"], "Intermediário": ["Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"] },
  "Futevôlei": { "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"], "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h"], "Avançado": ["Terça e Quinta às 21h"] },
  "Escolinha de Futebol": { "Kids": ["Segunda e Quarta às 17h", "Segunda e Quarta às 18h", "Terça e Quinta às 17h", "Terça e Quinta às 18h"], "Iniciante": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"], "Adulto": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"] }
};

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return parts.length !== 3 ? dateStr : `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "classes" | "manage">("book");

  // IDENTIFICAÇÃO DO CLIENTE (COM CPF)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [selectedSport, setSelectedSport] = useState(currentArena.sports[0]);
  const [todayString, setTodayString] = useState("");
  const [currentClientTime, setCurrentClientTime] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeHourPick, setActiveHourPick] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
   
  const [upgradesConfig, setUpgradesConfig] = useState<any>({ volleyEnabled: true, volleyPrice: 10, beachTennisEnabled: true, beachTennisPrice: 10, societyEnabled: true, societyPrice: 15 });
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
    amount: 0, description: "", customerName: "", customerEmail: "test_user_123456@testuser.com", 
    customerPhone: "", isClass: false, slots: [] as SelectedSlot[], selectedSport: "", 
    selectedDate: "", upgradeItemCost: 0, upgradeItemName: "",
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
            volleyEnabled: Boolean(settingsData.upgrades.volleyEnabled), volleyPrice: Number(settingsData.upgrades.volleyPrice || 10),
            beachTennisEnabled: Boolean(settingsData.upgrades.beachTennisEnabled), beachTennisPrice: Number(settingsData.upgrades.beachTennisPrice || 10),
            societyEnabled: Boolean(settingsData.upgrades.societyEnabled), societyPrice: Number(settingsData.upgrades.societyPrice || 15),
          });
        }
        if (settingsData.class_capacity) setDefaultCapacity(Number(settingsData.class_capacity));
        if (settingsData.class_capacity_map) setClassCapacityMap(settingsData.class_capacity_map);
        if (settingsData.class_prices) setClassPricesMap(settingsData.class_prices);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setTodayString(todayFormatted); setSelectedDate(todayFormatted); setCurrentClientTime(now.getTime());

    const queryParams = new URLSearchParams(window.location.search);
    const statusParam = queryParams.get("status"); const codeParam = queryParams.get("code"); const phoneParam = queryParams.get("phone");

    if (statusParam === "success" && codeParam) {
      const confirmBookingInSupabase = async () => {
        try {
          await supabase.from("bookings").update({ status: "confirmada" }).eq("code", codeParam);
          alert(`Pagamento aprovado com sucesso!\nO seu código de reserva é: ${codeParam}`);
          setSearchCodeInput(codeParam); if (phoneParam) setSearchPhoneInput(phoneParam);
          setActiveTab("manage"); window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) { console.error("Erro ao confirmar reserva após retorno:", err); }
      };
      confirmBookingInSupabase();
    } else if (statusParam === "failure") {
      alert("O pagamento não foi concluído ou foi recusado. Pode tentar novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadCloudData();
    const channel = supabase.channel("public:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "court_locks" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_settings" }, () => loadCloudData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [searchCodeInput, setSearchCodeInput] = useState("");
  const [searchPhoneInput, setSearchPhoneInput] = useState("");
  const [searchedBookings, setSearchedBookings] = useState<StoredBooking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const getDayOfWeekFromDate = (dateStr: string) => { if (!dateStr) return 0; const parts = dateStr.split("-").map(Number); return new Date(parts[0], parts[1] - 1, parts[2]).getDay(); };
  const isWeekendOrHoliday = (dateStr: string) => { if (!dateStr) return false; const day = getDayOfWeekFromDate(dateStr); return (day === 0 || day === 6 || HOLIDAYS.includes(dateStr.substring(5))); };

  const getCourtPrice = (court: Court, time: string) => {
    const hour = parseInt(time.split(":")[0], 10);
    const hasDiscount = (hour >= 16 && hour < 19) && !isWeekendOrHoliday(selectedDate);
    return court.type === "society" ? (hasDiscount ? 60.0 : 80.0) : (hasDiscount ? 40.0 : 60.0);
  };

  const isTimeTooCloseOrPassed = (timeStr: string) => {
    if (!todayString || selectedDate !== todayString || !currentClientTime) return false;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const slotTime = new Date(currentClientTime); slotTime.setHours(hours, minutes, 0, 0);
    return ((slotTime.getTime() - currentClientTime) / (1000 * 60)) < 15;
  };

  const isCourtLocked = (courtId: string, time: string) => {
    const hasBooking = activeBookings.some((b) => {
      if (b.court_id !== courtId || b.booking_date !== selectedDate || b.booking_time !== time) return false;
      if (b.status === "confirmada") return true;
      if (b.status === "aguardando_pagamento") {
        if (!b.created_at) return false; // CORREÇÃO AQUI: Libera registros corrompidos antigos
        const diffMinutes = (new Date().getTime() - new Date(b.created_at).getTime()) / (1000 * 60);
        return diffMinutes <= 10; // CORREÇÃO AQUI: 10 minutos exatos
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
  const availableCourtsAtActiveHour = allCourts.filter((c) => c.sports.some((s) => normalize(s) === normalize(selectedSport)) && !isCourtLocked(c.id, activeHourPick));

  const toggleSelectSlot = (court: Court, time: string) => {
    const price = getCourtPrice(court, time);
    setSelectedSlots((prev) => prev.some((s) => s.courtId === court.id && s.time === time) 
      ? prev.filter((s) => !(s.courtId === court.id && s.time === time)) 
      : [...prev, { courtId: court.id, courtName: court.name, time, price }]
    );
  };
  const removeSlot = (courtId: string, time: string) => setSelectedSlots((prev) => prev.filter((s) => !(s.courtId === courtId && s.time === time)));

  const subtotalCourts = selectedSlots.reduce((acc, s) => acc + s.price, 0);
  let upgradeItemCost = 0; let upgradeItemName = "";
  if (selectedSport === "Vôlei de Praia" && upgradesConfig.volleyEnabled && selectedUpgradeKey === "volley") { upgradeItemCost = Number(upgradesConfig.volleyPrice || 10); upgradeItemName = "Upgrade: Bola Mikasa Pro Oficial"; }
  else if (selectedSport === "Beach Tennis" && upgradesConfig.beachTennisEnabled && selectedUpgradeKey === "beachtennis") { upgradeItemCost = Number(upgradesConfig.beachTennisPrice || 10); upgradeItemName = "Aluguel de Raquete de Beach Tennis"; }
  else if (selectedSport === "Futebol Society" && upgradesConfig.societyEnabled && selectedUpgradeKey === "society") { upgradeItemCost = Number(upgradesConfig.societyPrice || 15); upgradeItemName = "Aluguel de Coletes"; }

  const handleApplyCoupon = async (contextType: "quadras" | "aulas") => {
    setCouponError(""); const codeClean = couponCodeInput.trim().toUpperCase(); if (!codeClean) return;
    try {
      const { data, error } = await supabase.from("coupons").select("*").eq("code", codeClean).eq("active", true).single();
      if (error || !data) { setCouponError("Cupom inválido ou expirado."); return; }
      const scope = data.scope || "ambos";
      if (scope === "quadras" && contextType === "aulas") { setCouponError("Válido apenas para quadras."); return; }
      if (scope === "aulas" && contextType === "quadras") { setCouponError("Válido apenas para aulas."); return; }
      if (data.max_uses !== null && data.used_count >= data.max_uses) { setCouponError("Limite atingido."); return; }
      setAppliedCoupon({ id: data.id, code: data.code, discountPercent: data.discount_type === "percent" ? Number(data.discount_value) : 0, discountFixed: data.discount_type === "fixed" ? Number(data.discount_value) : 0 });
    } catch (err) { setCouponError("Erro ao validar cupom."); }
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponCodeInput(""); setCouponError(""); };

  let discountAmount = appliedCoupon ? (appliedCoupon.discountPercent > 0 ? (subtotalCourts * appliedCoupon.discountPercent) / 100 : appliedCoupon.discountFixed) : 0;
  const rawSubtotalForTotal = selectedSlots.length > 0 ? Math.max(0, subtotalCourts - discountAmount) + upgradeItemCost : 0;
  const cardFeeAmount = paymentMethodChoice === "card" ? Number((rawSubtotalForTotal * 0.0399).toFixed(2)) : 0;
  const totalAmount = rawSubtotalForTotal + cardFeeAmount;

  const getPackageTotalPrice = () => {
    const sportPrices = classPricesMap[classSport] || { mensal: 200, trimestral: 540, semestral: 960 };
    let monthlyBase = Number(sportPrices.mensal) || 200.0; let multiplier = 1;
    if (classPlanType === "trimestral") { monthlyBase = (Number(sportPrices.trimestral) || 540.0) / 3; multiplier = 3; }
    else if (classPlanType === "semestral") { monthlyBase = (Number(sportPrices.semestral) || 960.0) / 6; multiplier = 6; }
    return (monthlyBase * multiplier) + (extraDaysCount * 80.0 * multiplier);
  };
  const totalClassPackagePrice = getPackageTotalPrice();
  let classDiscountAmount = appliedCoupon ? (appliedCoupon.discountPercent > 0 ? (totalClassPackagePrice * appliedCoupon.discountPercent) / 100 : appliedCoupon.discountFixed) : 0;
  const rawClassAmount = Math.max(0, totalClassPackagePrice - classDiscountAmount);
  const classCardFee = paymentMethodChoice === "card" ? Number((rawClassAmount * 0.0399).toFixed(2)) : 0;
  const finalClassAmount = rawClassAmount + classCardFee;

  const getCapacityForTurma = (turmaStr: string) => classCapacityMap[turmaStr] !== undefined ? Number(classCapacityMap[turmaStr]) : defaultCapacity;
  const countEnrollmentsForSpecificClass = (targetTurma: string) => {
    if (!classSport) return 0;
    return classEnrollmentsList.filter((en) => en.sport.toLowerCase() === classSport.toLowerCase() && en.days_selected?.toLowerCase().includes(targetTurma.toLowerCase())).length;
  };
  const getRemainingSlotsForOption = (optionStr: string) => Math.max(0, getCapacityForTurma(optionStr) - countEnrollmentsForSpecificClass(optionStr));

  const formatSlotsForSummary = (slots: SelectedSlot[]) => {
    const byCourt: { [key: string]: string[] } = {};
    slots.forEach((s) => { if (!byCourt[s.courtName]) byCourt[s.courtName] = []; byCourt[s.courtName].push(s.time); });
    let summary = Object.entries(byCourt).map(([cName, times]) => `• ${cName}: ${times.sort().join(", ")} (${times.length}h)`).join("\n");
    if (upgradeItemCost > 0 && upgradeItemName) summary += `\n• Adicional: ${upgradeItemName} (R$ ${upgradeItemCost.toFixed(2)})`;
    return summary;
  };

  const handleActionClick = () => {
    if (activeTab === "book") {
      if (!customerName.trim() || !customerPhone.trim()) { alert("Preencha Nome e WhatsApp."); return; }
      if (selectedSlots.length === 0) { alert("Selecione um horário."); return; }
      if (!acceptedTerms) { alert("Marque o aceite da política."); return; }
      setCheckoutBookingDetails({
        amount: totalAmount, description: `Reserva Arena CT Viva - ${formatSlotsForSummary(selectedSlots)}`,
        customerName, customerEmail: "test_user_123456@testuser.com", customerPhone, 
        isClass: false, slots: selectedSlots, selectedSport, selectedDate, upgradeItemCost, upgradeItemName,
      });
      setIsCheckoutModalOpen(true);
    } else {
      if (!customerName.trim() || !customerPhone.trim()) { alert("Preencha Nome e WhatsApp."); return; }
      if (!classSport || !classCategory || !selectedClassOption) { alert("Selecione Modalidade, Categoria e Turma."); return; }
      if (getRemainingSlotsForOption(selectedClassOption) <= 0) { alert("Turma lotada."); return; }
      if (!acceptedClassTerms) { alert("Aceite os termos."); return; }
      setCheckoutBookingDetails({
        amount: finalClassAmount, description: `Matrícula Aula - ${classSport} (${classCategory})`,
        customerName, customerEmail: "test_user_123456@testuser.com", customerPhone, 
        isClass: true, slots: [], selectedSport: classSport, selectedDate: new Date().toISOString().split("T")[0], upgradeItemCost: 0, upgradeItemName: "",
      });
      setIsCheckoutModalOpen(true);
    }
  };

  const generateHelpWhatsAppUrl = () => `https://wa.me/55${currentArena.whatsapp}?text=${encodeURIComponent(`Olá, CT Viva Esportes! Estou no site de reservas e gostaria de tirar uma dúvida.`)}`;
  const generateShareGroupMessage = (b: StoredBooking) => `https://wa.me/?text=${encodeURIComponent(`Fala, galera! Nosso play está garantido!\n\nLocal: ${currentArena.name}\nEndereço: ${currentArena.address}\nData: ${formatDateToBR(b.date)}\n\nEspaços & Horários:\n${b.courtName}\n\nValor Total: R$ ${b.totalAmount.toFixed(2)}\n\nBora pro jogo!`)}`;

  const handleSearchBooking = async (e: React.FormEvent) => {
    e.preventDefault(); setCancelStatusMsg(null); setHasSearched(true);
    const rawCode = searchCodeInput.trim().toUpperCase(); const rawPhoneDigits = searchPhoneInput.replace(/\D/g, "");
    if (!rawCode || rawPhoneDigits.length < 8) { alert("Informe Código e WhatsApp."); return; }
    try {
      const { data } = await supabase.from("bookings").select("*").eq("code", rawCode);
      if (data && data.length > 0) {
        const matches = data.filter((b) => (b.customer_phone ? b.customer_phone.replace(/\D/g, "") : "").endsWith(rawPhoneDigits.slice(-8)));
        if (matches.length > 0) {
          setSearchedBookings([{
            id: matches[0].id, bookingCode: matches[0].code, customerName: matches[0].customer_name, customerPhone: matches[0].customer_phone,
            courtName: matches.map((m) => `• ${m.court_name}: ${m.booking_time}`).join("\n"), date: matches[0].booking_date,
            time: matches.map((m) => m.booking_time).sort().join(", "), totalAmount: matches.reduce((acc, m) => acc + Number(m.price), 0),
            status: matches[0].status === "cancelada" ? "cancelada" : "confirmada",
          }]); return;
        }
      }
      const { data: classData } = await supabase.from("class_enrollments").select("*").eq("code", rawCode);
      if (classData && classData.length > 0) {
        setSearchedBookings([{
          id: classData[0].id, bookingCode: classData[0].code, customerName: classData[0].student_name, customerPhone: classData[0].student_phone,
          courtName: `Modalidade: ${classData[0].sport} (${classData[0].category})\nPlano: ${classData[0].plan_type.toUpperCase()} - Turma: ${classData[0].days_selected}`,
          date: new Date().toISOString().split("T")[0], time: "Matrícula de Aula", totalAmount: Number(classData[0].total_price),
          status: classData[0].status === "cancelada" ? "cancelada" : "confirmada",
        }]); return;
      }
      setSearchedBookings([]);
    } catch (err) { console.error(err); setSearchedBookings([]); }
  };

  const handleCancelReservation = async (booking: StoredBooking) => {
    if (booking.bookingCode.startsWith("AULA-")) {
      if (!confirm("Deseja cancelar sua matrícula?")) return;
      await supabase.from("class_enrollments").update({ status: "cancelada" }).eq("code", booking.bookingCode);
      setSearchedBookings((prev) => prev.map((b) => (b.bookingCode === booking.bookingCode ? { ...b, status: "cancelada" } : b)));
      setCancelStatusMsg({ text: `Matrícula cancelada! Fale no WhatsApp informando o código ${booking.bookingCode}.`, error: false });
      await loadCloudData(); return;
    }
    const diffMinutes = (new Date(`${booking.date}T${booking.time.split(",")[0].trim() || "16:00"}:00`).getTime() - new Date().getTime()) / (1000 * 60);
    let refundRuleText = diffMinutes >= 120 ? "REEMBOLSO INTEGRAL (100%)." : diffMinutes >= 30 ? "Retenção de 50%." : "Sem devolução.";
    if (!confirm(`Confirma cancelamento da reserva ${booking.bookingCode}?\n\n• ${refundRuleText}`)) return;
    try {
      await supabase.from("bookings").update({ status: "cancelada" }).eq("code", booking.bookingCode);
      setSearchedBookings((prev) => prev.map((b) => (b.bookingCode === booking.bookingCode ? { ...b, status: "cancelada" } : b)));
      await loadCloudData(); setCancelStatusMsg({ text: `Reserva cancelada! (${refundRuleText}) Fale no WhatsApp para estorno.`, error: false });
    } catch (err) { console.error(err); setCancelStatusMsg({ text: "Erro ao cancelar.", error: true }); }
  };

  if (!mounted) return null;
  const availableExtraDays = selectedClassOption.toLowerCase().includes("segunda") ? ["Terça-feira", "Quinta-feira"] : ["Segunda-feira", "Quarta-feira"];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-28 relative">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CT Viva" className="h-10 w-auto rounded object-contain bg-[#041E8C]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase italic">{currentArena.name}</h1>
              <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium"><MapPin className="w-3 h-3 text-[#00E599]" /> Fortaleza - CE</p>
            </div>
          </div>
          <a href="/admin" className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 text-white border border-white/20 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-[#00E599]" /> Gestor</a>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        <div className="flex bg-[#041E8C]/10 p-1 rounded-xl gap-1">
          <button onClick={() => setActiveTab("book")} className={`flex-1 py-2 text-xs font-black rounded-lg transition ${activeTab === "book" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}>Quadras</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}><GraduationCap className="w-3.5 h-3.5" /> Aulas</button>
          <button onClick={() => setActiveTab("manage")} className={`flex-1 py-2 text-xs font-black rounded-lg transition flex items-center justify-center gap-1 ${activeTab === "manage" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600"}`}><Search className="w-3.5 h-3.5" /> Reservas</button>
        </div>

        {activeTab === "manage" ? (
          <div className="bg-white p-5 border rounded-2xl shadow-sm space-y-4">
            <div><div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00E599]" /><h2 className="text-sm font-bold text-slate-800">Gerenciar Minha Reserva</h2></div><p className="text-xs text-slate-500 mt-0.5">Informe o Código e WhatsApp.</p></div>
            <form onSubmit={handleSearchBooking} className="space-y-2.5">
              <div className="space-y-2">
                <div className="relative"><Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Ex: VIVA-4K8P" value={searchCodeInput} onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C]" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Números com DDD" value={searchPhoneInput} onChange={(e) => setSearchPhoneInput(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800" /></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#041E8C] text-white rounded-xl text-xs font-bold flex justify-center gap-1.5"><Search className="w-3.5 h-3.5" /> Localizar Registro</button>
            </form>
            {cancelStatusMsg && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${cancelStatusMsg.error ? "bg-red-50 text-red-800 border-red-200" : "bg-amber-50 text-amber-950 border-amber-300"}`}>
                <p className="font-semibold">{cancelStatusMsg.text}</p>
                {!cancelStatusMsg.error && <a href={`https://wa.me/55${currentArena.whatsapp}?text=${encodeURIComponent(`Olá! Realizei o cancelamento do código ${searchCodeInput} no site.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#00E599] text-[#041E8C] font-black rounded-lg text-xs shadow-sm"><MessageCircle className="w-3.5 h-3.5 fill-current" /> Falar no WhatsApp</a>}
              </div>
            )}
            {hasSearched && searchedBookings.length === 0 && <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">Nenhum registro encontrado.</div>}
            <div className="space-y-3">
              {searchedBookings.map((b) => (
                <div key={b.bookingCode} className="p-4 bg-slate-50 rounded-xl border space-y-3">
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
                      {!b.bookingCode.startsWith("AULA-") && <a href={generateShareGroupMessage(b)} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs flex justify-center gap-1.5 shadow"><Share2 className="w-4 h-4" /> Compartilhar</a>}
                      <button type="button" onClick={() => handleCancelReservation(b)} className="w-full py-2 bg-red-100 text-red-700 font-bold rounded-xl text-xs flex justify-center gap-1.5"><XCircle className="w-4 h-4" /> Cancelar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "classes" ? (
          <div className="space-y-4">
            <section className="bg-white border p-4 rounded-2xl shadow-sm space-y-3">
              <h2 className="text-sm font-black uppercase text-[#041E8C] flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-[#00E599]" /> Inscrição em Aulas</h2>
              <div className="space-y-2">
                <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Nome e Sobrenome" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="Telefone (WhatsApp)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs" /></div>
              </div>
            </section>
            <section className="bg-white border p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase text-slate-500 block">Modalidade</label>
              <select value={classSport} onChange={(e) => { setClassSport(e.target.value); setClassCategory(""); setSelectedClassOption(""); }} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C]">
                <option value="" disabled>Escolher Modalidade</option><option value="Vôlei de Praia">Vôlei de Praia</option><option value="Futevôlei">Futevôlei</option><option value="Beach Tennis">Beach Tennis</option><option value="Escolinha de Futebol">Escolinha de Futebol</option>
              </select>
              <label className="text-xs font-bold uppercase text-slate-500 block pt-2">Categoria</label>
              <select value={classCategory} onChange={(e) => { setClassCategory(e.target.value); setSelectedClassOption(""); }} disabled={!classSport} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C] disabled:opacity-50">
                <option value="" disabled>Selecionar Nível</option>{classSport && classScheduleMap[classSport] && Object.keys(classScheduleMap[classSport]).map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              {classSport && classCategory && classScheduleMap[classSport]?.[classCategory] && (
                <div className="space-y-2 pt-1"><label className="text-xs font-bold uppercase text-slate-700 block">Turma</label>
                  <div className="space-y-2">
                    {classScheduleMap[classSport][classCategory].map((opt, idx) => {
                      const remaining = getRemainingSlotsForOption(opt); const isSelected = selectedClassOption === opt; const isSoldOut = remaining <= 0;
                      return (
                        <div key={idx} onClick={() => !isSoldOut && setSelectedClassOption(opt)} className={`p-3 rounded-xl border text-xs flex justify-between items-center ${isSoldOut ? "bg-slate-100 text-slate-400 opacity-60" : isSelected ? "bg-emerald-50 border-[#00E599] ring-2 ring-[#00E599] cursor-pointer" : "bg-slate-50 hover:bg-slate-100 cursor-pointer"}`}>
                          <div><span className="font-bold block">📅 {opt}</span><span className={`text-[10px] font-bold ${isSoldOut ? "text-red-600" : "text-emerald-700"}`}>{isSoldOut ? "Esgotado" : `${remaining} vagas (Máx: ${getCapacityForTurma(opt)})`}</span></div>
                          <span className={`w-5 h-5 rounded-full flex justify-center items-center text-[10px] font-bold ${isSelected ? "bg-[#041E8C] text-white" : "border"}`}>{isSelected ? "✓" : "+"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedClassOption && (
                <div className="pt-2"><label className="text-xs font-bold uppercase text-slate-500 block">Dias Extras (+ R$ 80,00/mês)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button type="button" onClick={() => { setExtraDaysCount(Math.max(0, extraDaysCount - 1)); if(extraDaysCount<=1) setExtraDay2(""); if(extraDaysCount<=0) setExtraDay1(""); }} className="w-8 h-8 bg-slate-100 font-bold rounded-lg">-</button>
                    <span className="text-xs font-bold">{extraDaysCount} dia(s) (Máx: 2)</span>
                    <button type="button" onClick={() => { if(extraDaysCount<2) setExtraDaysCount(extraDaysCount + 1); }} className="w-8 h-8 bg-slate-100 font-bold rounded-lg">+</button>
                  </div>
                  {extraDaysCount >= 1 && <select value={extraDay1} onChange={(e)=>setExtraDay1(e.target.value)} className="w-full mt-2 p-2 border rounded-xl text-xs"><option value="" disabled>Dia 1</option>{availableExtraDays.map(d => <option key={d} value={d} disabled={d===extraDay2}>{d}</option>)}</select>}
                  {extraDaysCount >= 2 && <select value={extraDay2} onChange={(e)=>setExtraDay2(e.target.value)} className="w-full mt-2 p-2 border rounded-xl text-xs"><option value="" disabled>Dia 2</option>{availableExtraDays.map(d => <option key={d} value={d} disabled={d===extraDay1}>{d}</option>)}</select>}
                </div>
              )}
              <div className="pt-2"><label className="text-xs font-bold uppercase text-slate-700 block">Plano</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button type="button" onClick={()=>setClassPlanType("mensal")} className={`p-2.5 text-xs font-bold rounded-xl border ${classPlanType==="mensal" ? "bg-[#041E8C] text-white" : "bg-slate-50"}`}>Mensal<br/><span className="text-[10px]">R$ {classPricesMap[classSport || "Vôlei de Praia"]?.mensal || 200}</span></button>
                  <button type="button" onClick={()=>setClassPlanType("trimestral")} className={`p-2.5 text-xs font-bold rounded-xl border ${classPlanType==="trimestral" ? "bg-[#041E8C] text-white" : "bg-slate-50"}`}>Trimestral<br/><span className="text-[10px]">R$ {classPricesMap[classSport || "Vôlei de Praia"]?.trimestral || 540}</span></button>
                  <button type="button" onClick={()=>setClassPlanType("semestral")} className={`p-2.5 text-xs font-bold rounded-xl border ${classPlanType==="semestral" ? "bg-[#041E8C] text-white" : "bg-slate-50"}`}>Semestral<br/><span className="text-[10px]">R$ {classPricesMap[classSport || "Vôlei de Praia"]?.semestral || 960}</span></button>
                </div>
              </div>
            </section>
            <section className="bg-white border p-4 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-500">Resumo</h3>
              <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
                {appliedCoupon ? (
                  <div className="flex justify-between p-2 bg-emerald-50 border rounded-lg text-xs"><span className="font-bold text-emerald-800">{appliedCoupon.code} aplicado</span><button type="button" onClick={removeCoupon} className="text-red-600 font-bold hover:underline">Remover</button></div>
                ) : (
                  <div className="flex gap-2"><input type="text" placeholder="Cupom" value={couponCodeInput} onChange={(e)=>setCouponCodeInput(e.target.value.toUpperCase())} className="flex-1 p-2 border rounded-lg text-xs font-bold" /><button type="button" onClick={()=>handleApplyCoupon("aulas")} className="px-4 bg-[#041E8C] text-white text-xs font-bold rounded-lg">Aplicar</button></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={()=>setPaymentMethodChoice("pix")} className={`p-2.5 rounded-xl border text-xs font-bold flex justify-center gap-1.5 ${paymentMethodChoice==="pix"?"bg-[#041E8C] text-white":"bg-slate-50"}`}><QrCode className="w-4 h-4" /> Pix</button>
                <button type="button" onClick={()=>setPaymentMethodChoice("card")} className={`p-2.5 rounded-xl border text-xs font-bold flex justify-center gap-1.5 ${paymentMethodChoice==="card"?"bg-[#041E8C] text-white":"bg-slate-50"}`}><CreditCard className="w-4 h-4" /> Cartão</button>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-sm">
                <span>{paymentMethodChoice==="card"?"Total (Cartão)":"Total (Pix)"}</span><span className="text-[#041E8C]">R$ {paymentMethodChoice==="card"?finalClassAmount.toFixed(2):rawClassAmount.toFixed(2)}</span>
              </div>
              <label className="flex items-start gap-2 pt-2 cursor-pointer"><input type="checkbox" checked={acceptedClassTerms} onChange={(e)=>setAcceptedClassTerms(e.target.checked)} className="mt-0.5 text-[#041E8C] rounded" /><span className="text-[11px] font-bold">Aceito termos CDC.</span></label>
              <button type="button" onClick={handleActionClick} className="w-full py-3.5 bg-[#00E599] text-[#041E8C] font-black rounded-xl shadow flex justify-center gap-2 text-xs"><CheckCircle2 className="w-4 h-4" /> FINALIZAR E PAGAR</button>
            </section>
          </div>
        ) : (
          <>
            <section className="bg-white border p-4 rounded-2xl shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase text-slate-600 block">1. Identificação</label>
              <div className="space-y-2">
                <div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Nome e Sobrenome" value={customerName} onChange={(e)=>setCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs" /></div>
                <div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="tel" placeholder="WhatsApp (DDD + Número)" value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs" /></div>
              </div>
            </section>
            <section className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500 block">2. Modalidade</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {currentArena.sports.map(s => <button key={s} type="button" onClick={()=>{setSelectedSport(s); setSelectedSlots([]);}} className={`text-xs px-3.5 py-2 rounded-xl border font-bold whitespace-nowrap ${selectedSport===s?"bg-[#041E8C] text-white":"bg-white text-slate-600"}`}>{s}</button>)}
              </div>
            </section>
            <section className="bg-white border p-4 rounded-2xl shadow-sm space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 block">3. Data</label>
              <input type="date" min={todayString||undefined} value={selectedDate} onChange={(e)=>{setSelectedDate(e.target.value); setSelectedSlots([]);}} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm" />
            </section>
            <section className="space-y-3"><label className="text-xs font-bold uppercase text-slate-500 block">4. Horários & Quadras</label>
              <div className="grid grid-cols-4 gap-2">
                {businessHours.map(time => {
                  const isPicked = activeHourPick === time; const isTooClose = isTimeTooCloseOrPassed(time);
                  return (
                    <button key={time} type="button" disabled={isTooClose} onClick={()=>setActiveHourPick(time)} className={`p-2 rounded-xl border relative text-center min-h-[54px] ${isTooClose?"bg-slate-100 text-slate-300":isPicked?"bg-[#041E8C] text-white":"bg-white"}`}>
                      <span className="text-xs font-bold">{time}</span>{selectedSlots.filter(s=>s.time===time).length>0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#00E599] text-[#041E8C] font-black rounded-full text-[9px] flex items-center justify-center">{selectedSlots.filter(s=>s.time===time).length}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="bg-white border p-4 rounded-2xl shadow-sm">
                <span className="text-xs font-bold block mb-2">Quadras Livres ({availableCourtsAtActiveHour.length})</span>
                {availableCourtsAtActiveHour.length>0 ? (
                  <div className="grid grid-cols-2 gap-2">{availableCourtsAtActiveHour.map(c => {
                    const price = getCourtPrice(c, activeHourPick); const isSelected = selectedSlots.some(s=>s.courtId===c.id && s.time===activeHourPick);
                    return (<button key={c.id} type="button" onClick={()=>toggleSelectSlot(c, activeHourPick)} className={`p-3 rounded-xl border text-left ${isSelected?"border-[#00E599] bg-emerald-50 ring-2":"bg-white"}`}>
                      <div className="flex justify-between items-start"><div><p className="text-xs font-bold">{c.name}</p><p className="text-[10px] text-slate-400">{c.surface}</p></div><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isSelected?"bg-[#041E8C] text-white":"border"}`}>{isSelected?"✓":"+"}</span></div>
                      <div className="pt-2 text-right"><span className="text-xs font-black text-[#041E8C]">R$ {price.toFixed(2)}</span></div>
                    </button>);
                  })}</div>
                ) : <div className="p-4 bg-red-50 text-red-700 text-xs text-center rounded-xl">Lotação Esgotada</div>}
              </div>
              {selectedSlots.length>0 && (
                <div className="bg-slate-50 border p-3.5 rounded-2xl space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-600 block">Selecionados ({selectedSlots.length})</span>
                  {selectedSlots.map(s => (
                    <div key={`${s.courtId}-${s.time}`} className="flex justify-between p-2 bg-white rounded-xl border text-xs">
                      <div><strong>{s.courtName}</strong> às {s.time}</div>
                      <div className="flex items-center gap-2 font-bold text-[#041E8C]">R$ {s.price.toFixed(2)} <button type="button" onClick={()=>removeSlot(s.courtId, s.time)}><X className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" /></button></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {selectedSlots.length>0 && (
              <section className="bg-white border p-4 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500">Resumo</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" onClick={()=>setPaymentMethodChoice("pix")} className={`p-2.5 rounded-xl border text-xs font-bold flex justify-center gap-1.5 ${paymentMethodChoice==="pix"?"bg-[#041E8C] text-white":"bg-slate-50"}`}><QrCode className="w-4 h-4" /> Pix</button>
                  <button type="button" onClick={()=>setPaymentMethodChoice("card")} className={`p-2.5 rounded-xl border text-xs font-bold flex justify-center gap-1.5 ${paymentMethodChoice==="card"?"bg-[#041E8C] text-white":"bg-slate-50"}`}><CreditCard className="w-4 h-4" /> Cartão</button>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-sm">
                  <span>{paymentMethodChoice==="card"?"Total (Cartão)":"Total (Pix)"}</span><span className="text-[#041E8C]">R$ {paymentMethodChoice==="card"?totalAmount.toFixed(2):rawSubtotalForTotal.toFixed(2)}</span>
                </div>
                <label className="flex items-start gap-2 pt-2 cursor-pointer"><input type="checkbox" checked={acceptedTerms} onChange={(e)=>setAcceptedTerms(e.target.checked)} className="mt-0.5 text-[#041E8C] rounded" /><span className="text-[11px] font-bold">Aceito política de cancelamento.</span></label>
                <button type="button" onClick={handleActionClick} className="w-full py-3.5 bg-[#00E599] text-[#041E8C] font-black rounded-xl shadow flex justify-center gap-2 text-xs"><CheckCircle2 className="w-4 h-4" /> FINALIZAR E PAGAR</button>
              </section>
            )}
          </>
        )}
      </div>
      <CheckoutModal isOpen={isCheckoutModalOpen} onClose={()=>setIsCheckoutModalOpen(false)} bookingDetails={checkoutBookingDetails} initialPaymentMethod={paymentMethodChoice} onSuccess={()=>{}} />
    </main>
  );
}