"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "../arenaConfig";
import { 
  MapPin, Clock, Lock, CheckCircle2, QrCode, Copy, 
  AlertCircle, ShieldCheck, User, Phone, Timer, Settings,
  MessageCircle, Search, XCircle, Tag
} from "lucide-react";
import Link from "next/link";

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
}

interface StoredBooking {
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  courtName: string;
  date: string;
  time: string;
  totalAmount: number;
  status: "confirmed" | "cancelled";
  createdAt: number;
}

const allCourts: Court[] = [
  {
    id: "futebol-1",
    name: "Campo de Futebol Society",
    surface: "Grama Sintética",
    sports: ["Futebol Society"],
    type: "society",
  },
  {
    id: "areia-1",
    name: "Quadra 1 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"],
    type: "areia",
  },
  {
    id: "areia-2",
    name: "Quadra 2 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"],
    type: "areia",
  },
  {
    id: "areia-3",
    name: "Quadra 3 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"],
    type: "areia",
  },
  {
    id: "areia-4",
    name: "Quadra 4 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"],
    type: "areia",
  },
  {
    id: "areia-5",
    name: "Quadra 5 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"],
    type: "areia",
  },
  {
    id: "areia-6",
    name: "Quadra 6 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"],
    type: "areia",
  },
];

const initialEquipments: Equipment[] = [
  { id: "e-raquete", name: "Aluguel de Raquete de Beach Tennis", sports: ["Beach Tennis"], price: 5.0 },
  { id: "e-bola-areia", name: "Aluguel de Bola de Vôlei / Futevôlei", sports: ["Futevôlei", "Vôlei de Praia"], price: 5.0 },
  { id: "e-bola-carimba", name: "Aluguel de Bola de Carimba", sports: ["Carimba"], price: 5.0 },
  { id: "e-bola-society", name: "Aluguel de Bola de Futebol Society", sports: ["Futebol Society"], price: 5.0 },
];

const businessHours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"book" | "manage">("book");
  
  // 1. Identificação do Cliente (Primeiro elemento)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // 2. Modalidade
  const [selectedSport, setSelectedSport] = useState(currentArena.sports[0]);
  // 3. Data
  const [selectedDate, setSelectedDate] = useState("2026-10-20");
  // 4. Horário
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // 5. Quadra
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  // 6. Materiais
  const [rentals, setRentals] = useState<{ [key: string]: number }>({});
  // 7. Termo de aceite
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Estados Pix
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<StoredBooking | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  // Consulta e cancelamento
  const [searchCode, setSearchCode] = useState("");
  const [searchedBooking, setSearchedBooking] = useState<StoredBooking | null>(null);
  const [cancelStatusMsg, setCancelStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const serviceFee = 3.0;

  // Regra de precificação diferenciada por tipo de quadra
  const getCourtPrice = (court: Court, time: string | null) => {
    if (!time) return 0;
    const hour = parseInt(time.split(":")[0], 10);
    const isPromoTime = hour >= 16 && hour < 19;

    if (court.type === "society") {
      // Futebol Society: Tarifa padrão R$ 80 (ou R$ 60 no promocional se configurado)
      return isPromoTime ? 60.0 : 80.0;
    } else {
      // Quadras de Areia: Tarifa padrão R$ 60 | Tarifa promocional diurna R$ 40
      return isPromoTime ? 40.0 : 60.0;
    }
  };

  const isSocietySelected = selectedSport === "Futebol Society";
  const availableCourts = allCourts.filter((c) => c.sports.includes(selectedSport));
  const selectedCourt = allCourts.find((c) => c.id === selectedCourtId);
  const compatibleEquipments = initialEquipments.filter((e) => e.sports.includes(selectedSport));
  const currentCourtPrice = selectedCourt ? getCourtPrice(selectedCourt, selectedTime) : 0;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isModalOpen && !isPaymentConfirmed && timeLeft > 0 && !isExpired) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isModalOpen && !isPaymentConfirmed) {
      setIsExpired(true);
    }
    return () => clearInterval(timer);
  }, [isModalOpen, isPaymentConfirmed, timeLeft, isExpired]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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

  const totalAmount = selectedCourt && selectedTime ? currentCourtPrice + totalEquipmentCost + serviceFee : 0;

  const handleStartBooking = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Por favor, preencha o seu Nome e WhatsApp na Identificação do Cliente.");
      return;
    }
    if (!acceptedTerms) {
      alert("É necessário marcar o termo de aceite da política de cancelamento.");
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = `VIVA-${randomNum}`;

    const newBooking: StoredBooking = {
      bookingCode: generatedCode,
      customerName,
      customerPhone,
      courtName: selectedCourt!.name,
      date: selectedDate,
      time: selectedTime!,
      totalAmount,
      status: "confirmed",
      createdAt: Date.now(),
    };

    setCurrentBooking(newBooking);
    setIsPaymentConfirmed(false);
    setTimeLeft(600);
    setIsExpired(false);
    setIsModalOpen(true);
  };

  const generateWhatsAppUrl = () => {
    if (!currentBooking) return "#";
    const text = encodeURIComponent(
      `Olá, Viva Esportes! Acabei de fazer uma reserva pelo site.\n\n` +
      `*Código:* ${currentBooking.bookingCode}\n` +
      `*Cliente:* ${currentBooking.customerName}\n` +
      `*Espaço:* ${currentBooking.courtName}\n` +
      `*Data:* ${currentBooking.date} às ${currentBooking.time}\n` +
      `*Valor:* R$ ${currentBooking.totalAmount.toFixed(2)}\n\n` +
      `Podem confirmar a recepção? Obrigado!`
    );
    return `https://wa.me/55${currentArena.whatsapp}?text=${text}`;
  };

  const generateHelpWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `Olá, Viva Esportes! Estou no site de reservas e gostaria de tirar uma dúvida sobre quadras e horários.`
    );
    return `https://wa.me/55${currentArena.whatsapp}?text=${text}`;
  };

  const handleSearchBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelStatusMsg(null);
    if (currentBooking && currentBooking.bookingCode.toUpperCase() === searchCode.trim().toUpperCase()) {
      setSearchedBooking(currentBooking);
    } else {
      setSearchedBooking({
        bookingCode: searchCode.trim().toUpperCase() || "VIVA-1234",
        customerName: "Cliente Teste",
        customerPhone: "85999999999",
        courtName: "Quadra 1 (Areia)",
        date: "2026-10-20",
        time: "20:00",
        totalAmount: 63.0,
        status: "confirmed",
        createdAt: Date.now(),
      });
    }
  };

  const handleCancelReservation = (booking: StoredBooking) => {
    const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
    const now = new Date();
    const diffHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 3) {
      setCancelStatusMsg({
        text: `Cancelamento não elegível para reembolso. Faltam menos de 3 horas para o início (${diffHours.toFixed(1)}h restantes). O valor não tem devolução.`,
        error: true,
      });
      return;
    }

    setSearchedBooking({ ...booking, status: "cancelled" });
    if (currentBooking?.bookingCode === booking.bookingCode) {
      setCurrentBooking({ ...currentBooking, status: "cancelled" });
    }
    setCancelStatusMsg({
      text: `Reserva cancelada com sucesso! Como a solicitação ocorreu com mais de 3h de antecedência, o valor de R$ ${(booking.totalAmount - serviceFee).toFixed(2)} será estornado via Pix.`,
      error: false,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-28 relative">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">{currentArena.name}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              {currentArena.address}
            </p>
          </div>
          <Link 
            href="/admin" 
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Gestor
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        {/* Abas */}
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("book")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "book" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Fazer Nova Reserva
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === "manage" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Consultar / Cancelar
          </button>
        </div>

        {activeTab === "manage" ? (
          /* ABA DE CONSULTA E CANCELAMENTO */
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Gerenciar Reserva</h2>
              <p className="text-xs text-slate-500">Digite o código da sua reserva para consultar ou cancelar.</p>
            </div>

            <form onSubmit={handleSearchBooking} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: VIVA-8429"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Buscar
              </button>
            </form>

            {cancelStatusMsg && (
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                cancelStatusMsg.error ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                {cancelStatusMsg.text}
              </div>
            )}

            {searchedBooking && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Código</span>
                    <p className="font-mono font-black text-sm text-slate-800">{searchedBooking.bookingCode}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    searchedBooking.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {searchedBooking.status === "confirmed" ? "Confirmada" : "Cancelada"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cliente</span>
                    <span className="font-semibold text-slate-700">{searchedBooking.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Espaço / Horário</span>
                    <span className="font-semibold text-slate-700">{searchedBooking.courtName} - {searchedBooking.time}</span>
                  </div>
                </div>

                {searchedBooking.status === "confirmed" && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      ⚠️ <strong>Regra de Reembolso:</strong> Devoluções permitidas apenas com mais de 3 horas de antecedência.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelReservation(searchedBooking)}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Solicitar Cancelamento e Devolução
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ETAPA 1: Identificação do Cliente (Primeiro Bloco) */}
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="WhatsApp (DDD + Número)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* ETAPA 2: Escolha a Modalidade */}
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
                        setSelectedCourtId(null);
                        setRentals({});
                      }}
                      className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition font-semibold ${
                        isActive
                          ? currentArena.theme.primaryButton + " shadow-sm border-transparent"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {sport}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ETAPA 3: Escolha a Data */}
            <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                3. Escolha a Data do Jogo
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedCourtId(null);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </section>

            {/* ETAPA 4: Escolha o Horário (Gestão de tarifas por modalidade) */}
            <section className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  4. Escolha o Horário (16h às 22h)
                </label>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-600" />
                  {isSocietySelected ? "16h às 19h: R\$ 60/h" : "16h às 19h: R\$ 40/h"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {businessHours.map((time) => {
                  const isSelected = selectedTime === time;
                  const hour = parseInt(time.split(":")[0], 10);
                  const isPromo = hour >= 16 && hour < 19;
                  const promoLabel = isSocietySelected ? "R\$ 60" : "R\$ 40";
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setSelectedTime(time);
                        setSelectedCourtId(null);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition text-center min-h-[58px] ${
                        isSelected
                          ? currentArena.theme.primaryButton + " border-transparent shadow-sm"
                          : "bg-white border-slate-200 hover:border-emerald-500 text-slate-700"
                      }`}
                    >
                      <span className="text-xs font-bold">{time}</span>
                      <span className={`text-[9px] font-semibold mt-0.5 ${
                        isSelected ? "text-emerald-100" : isPromo ? "text-amber-600" : "text-slate-400"
                      }`}>
                        {isPromo ? promoLabel : "Normal"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ETAPA 5: Quadras Disponíveis */}
            {selectedTime && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    5. Quadras Disponíveis às {selectedTime}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {availableCourts.length} opções
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {availableCourts.map((court) => {
                    const isSelected = selectedCourtId === court.id;
                    const price = getCourtPrice(court, selectedTime);
                    return (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => setSelectedCourtId(court.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{court.name}</p>
                          <p className="text-[10px] text-slate-400">{court.surface}</p>
                        </div>
                        <div className="pt-2 text-right">
                          <span className="text-xs font-black text-slate-900">
                            R\$ {price.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-500">/h</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ETAPA 6: Equipamentos / Materiais */}
            {selectedCourt && compatibleEquipments.length > 0 && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2 animate-in fade-in duration-200">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  6. Equipamentos e Materiais
                </label>
                <div className="space-y-2">
                  {compatibleEquipments.map((item) => {
                    const count = rentals[item.id] || 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-500">+ R\$ {item.price.toFixed(2)} / unidade</p>
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
                    );
                  })}
                </div>
              </section>
            )}

            {/* ETAPA 7: Termo de Aceite Explícito e Fechamento */}
            {selectedCourt && selectedTime && (
              <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 animate-in fade-in duration-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Resumo da Reserva
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{selectedCourt.name} às {selectedTime} (1h)</span>
                    <span>R\$ {currentCourtPrice.toFixed(2)}</span>
                  </div>
                  {totalEquipmentCost > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Equipamentos adicionais</span>
                      <span>R\$ {totalEquipmentCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Taxa de serviço e gestão online</span>
                    <span>R\$ {serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                    <span>Total a Pagar</span>
                    <span className="text-emerald-600">R\$ {totalAmount.toFixed(2)}</span>
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
                      className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-amber-400 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-amber-950 font-medium leading-snug select-none">
                      Declaro que li e concordo: <strong>Cancelamento com reembolso total é permitido apenas com mais de 3 horas de antecedência do jogo</strong>. Cancelamentos feitos com menos de 3h não têm devolução de valores.
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleStartBooking}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Finalizar Reserva e Pagar com Pix
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {/* Botão Flutuante de WhatsApp */}
      <a
        href={generateHelpWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition transform hover:scale-105"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Dúvidas? Chame no Zap</span>
      </a>

      {/* Modal Pix */}
      {isModalOpen && currentBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
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
                  <p className="text-xs text-slate-500 mt-1">
                    A sua quadra foi bloqueada com sucesso na arena.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Código da Reserva:</span>
                    <strong className="font-mono text-emerald-700 font-bold">{currentBooking.bookingCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="font-medium text-slate-700">{currentBooking.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Espaço:</span>
                    <span className="font-medium text-slate-700">{currentBooking.courtName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data e Hora:</span>
                    <span className="font-medium text-slate-700">{currentBooking.date} às {currentBooking.time}</span>
                  </div>
                </div>

                <a
                  href={generateWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar Comprovativo p/ WhatsApp da Arena
                </a>
              </div>
            ) : !isExpired ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 text-xs font-bold">
                  <Timer className="w-3.5 h-3.5 animate-pulse" />
                  <span>Horário bloqueado por: {formatTimer(timeLeft)}</span>
                </div>

                <p className="text-xs text-slate-500">
                  Código provisório: <strong className="font-mono text-slate-800">{currentBooking.bookingCode}</strong>. Efetue o pagamento de <strong>R\$ {totalAmount.toFixed(2)}</strong>.
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
                      className="w-full text-xs bg-transparent border-none text-slate-600 font-mono outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("00020126360014BR.GOV.BCB.PIX0114+558599999999520400005303986540583.00...");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 shrink-0"
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
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-base">Tempo Esgotado!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Os 10 minutos para pagamento terminaram e o horário foi liberado de volta na grade.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}