"use client";

import React, { useState } from "react";
import { currentArena } from "../arenaConfig";
import { MapPin, Calendar, Clock, Lock, CheckCircle2, QrCode, Copy, ArrowLeft } from "lucide-react";

interface Court {
  id: string;
  name: string;
  surface: string;
  sports: string[];
  pricePerHour: number;
}

interface Equipment {
  id: string;
  name: string;
  sports: string[];
  price: number;
}

const mockCourts: Court[] = [
  {
    id: "c1",
    name: "Campo 1 (Areia Principal)",
    surface: "Areia",
    sports: ["Beach Tennis", "Futevólei", "Vólei de Praia", "Carimba / Queimada"],
    pricePerHour: 80.0,
  },
  {
    id: "c2",
    name: "Campo 2 (Areia)",
    surface: "Areia",
    sports: ["Beach Tennis", "Vólei de Praia", "Carimba / Queimada"],
    pricePerHour: 70.0,
  },
  {
    id: "c3",
    name: "Campo 3 (Polidesportivo Coberto)",
    surface: "Piso Rígido",
    sports: ["Futebol Society", "Basquetebol", "Carimba / Queimada"],
    pricePerHour: 90.0,
  },
];

const mockEquipments: Equipment[] = [
  { id: "e1", name: "Raquete de Beach Tennis", sports: ["Beach Tennis"], price: 15.0 },
  { id: "e2", name: "Bola de Vólei / Futevólei (Mikasa)", sports: ["Futevólei", "Vólei de Praia"], price: 10.0 },
  { id: "e3", name: "Bola de Basquetebol", sports: ["Basquetebol"], price: 10.0 },
  { id: "e4", name: "Bola de Futsal / Society", sports: ["Futebol Society"], price: 10.0 },
];

const mockTimeSlots = [
  { time: "06:00", available: true, label: "" },
  { time: "07:00", available: false, label: "Aula Treino" },
  { time: "08:00", available: true, label: "" },
  { time: "09:00", available: true, label: "" },
  { time: "17:00", available: true, label: "" },
  { time: "18:00", available: false, label: "Mensalista" },
  { time: "19:00", available: false, label: "Mensalista" },
  { time: "20:00", available: true, label: "" },
  { time: "21:00", available: true, label: "" },
];

export default function Home() {
  const [selectedSport, setSelectedSport] = useState(currentArena.sports[0]);
  const [selectedDate, setSelectedDate] = useState("2026-10-20");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("c1");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [rentals, setRentals] = useState<{ [key: string]: number }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableCourts = mockCourts.filter((c) => c.sports.includes(selectedSport));
  const currentCourt = mockCourts.find((c) => c.id === selectedCourtId) || availableCourts[0];
  const compatibleEquipments = mockEquipments.filter((e) => e.sports.includes(selectedSport));

  const serviceFee = 3.0; // Taxa fixa da plataforma por reserva
  const courtPrice = currentCourt ? currentCourt.pricePerHour : 0;

  const handleEquipmentChange = (id: string, delta: number) => {
    setRentals((prev) => {
      const currentVal = prev[id] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return { ...prev, [id]: nextVal };
    });
  };

  const totalEquipmentCost = Object.entries(rentals).reduce((acc, [id, qty]) => {
    const item = mockEquipments.find((e) => e.id === id);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  const totalAmount = selectedTime ? courtPrice + totalEquipmentCost + serviceFee : 0;

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    setSelectedTime(null);
    setRentals({});
    const compatible = mockCourts.filter((c) => c.sports.includes(sport));
    if (compatible.length > 0 && !compatible.some((c) => c.id === selectedCourtId)) {
      setSelectedCourtId(compatible[0].id);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText("00020126360014BR.GOV.BCB.PIX0114+558599999999520400005303986540583.005802BR5913Viva Esportes6009Fortaleza62070503***6304ABCD");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Aberto para Reservas
          </span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-5 space-y-6">
        {/* 1. Modalidade */}
        <section className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            1. Escolha a Modalidade
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {currentArena.sports.map((sport) => {
              const isActive = selectedSport === sport;
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => handleSportChange(sport)}
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

        {/* 2. Campo e Data */}
        <section className="space-y-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              2. Escolha o Campo / Espaço
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableCourts.map((court) => {
                const isSelected = (currentCourt?.id || "") === court.id;
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourtId(court.id);
                      setSelectedTime(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex justify-between items-center ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{court.name}</p>
                      <p className="text-xs text-slate-500">Piso: {court.surface}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">
                        R\$ {court.pricePerHour.toFixed(2)}
                      </span>
                      <span className="text-[10px] block text-slate-500">/ hora</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Data do Jogo
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </section>

        {/* 3. Horários */}
        <section className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            3. Horários Disponíveis
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {mockTimeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition text-center min-h-[64px] ${
                    !slot.available
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                      : isSelected
                      ? currentArena.theme.primaryButton + " border-transparent shadow-sm"
                      : "bg-white border-slate-200 hover:border-emerald-500 text-slate-700"
                  }`}
                >
                  <span className="text-sm font-bold">{slot.time}</span>
                  {!slot.available ? (
                    <span className="text-[10px] flex items-center gap-0.5 mt-0.5 text-slate-400 font-medium">
                      <Lock className="w-2.5 h-2.5" />
                      {slot.label}
                    </span>
                  ) : (
                    <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? "text-emerald-100" : "text-emerald-600"}`}>
                      Livre
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Aluguer de Equipamentos */}
        {compatibleEquipments.length > 0 && (
          <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              4. Precisa de Equipamento? (Opcional)
            </label>
            <div className="space-y-2">
              {compatibleEquipments.map((item) => {
                const count = rentals[item.id] || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">+ R\$ {item.price.toFixed(2)} cada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEquipmentChange(item.id, -1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{count}</span>
                      <button
                        type="button"
                        onClick={() => handleEquipmentChange(item.id, 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center"
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

        {/* 5. Resumo e Botão de Reserva */}
        {selectedTime && currentCourt && (
          <section className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resumo da Reserva
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{currentCourt.name} (1h)</span>
                <span>R\$ {courtPrice.toFixed(2)}</span>
              </div>
              {totalEquipmentCost > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Equipamento extra</span>
                  <span>R\$ {totalEquipmentCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-400">
                <span>Taxa de serviço e gestão online</span>
                <span>R\$ {serviceFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-base">
                <span>Total a Pagar</span>
                <span className="text-emerald-600">R\$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalizar Reserva via Pix
            </button>
          </section>
        )}
      </div>

      {/* Janela Modal do Pix */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-base">Pagamento via Pix</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Fechar
              </button>
            </div>

            <div className="text-center space-y-3">
              <p className="text-xs text-slate-500">
                Efetue o pagamento de <strong>R\$ {totalAmount.toFixed(2)}</strong> para confirmar automaticamente a sua reserva no <strong>{currentArena.name}</strong>.
              </p>

              {/* Simulação visual do QR Code */}
              <div className="w-48 h-48 mx-auto bg-slate-100 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4">
                <QrCode className="w-36 h-36 text-slate-800 stroke-[1.5]" />
              </div>

              <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                  Código Pix Copia e Cola
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value="00020126360014BR.GOV.BCB.PIX0114+558599999999520400005303986540583.00..."
                    className="w-full text-xs bg-transparent border-none text-slate-600 font-mono focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={copyPixCode}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-400">
                Assim que o pagamento for concluído, o horário é reservado na hora.
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}