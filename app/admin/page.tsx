"use client";

import React, { useState } from "react";
import { currentArena } from "../../arenaConfig";
import { Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [courts, setCourts] = useState([
    { id: "futebol-1", name: "Campo de Futebol Society", price: 80.0 },
    { id: "areia-1", name: "Quadra 1 (Areia)", price: 60.0 },
    { id: "areia-2", name: "Quadra 2 (Areia)", price: 60.0 },
    { id: "areia-3", name: "Quadra 3 (Areia)", price: 60.0 },
    { id: "areia-4", name: "Quadra 4 (Areia)", price: 60.0 },
    { id: "areia-5", name: "Quadra 5 (Areia)", price: 60.0 },
    { id: "areia-6", name: "Quadra 6 (Areia)", price: 60.0 },
  ]);

  const [timeSlots, setTimeSlots] = useState([
    { time: "06:00", blocked: false, reason: "" },
    { time: "07:00", blocked: true, reason: "Aula Treino" },
    { time: "08:00", blocked: false, reason: "" },
    { time: "09:00", blocked: false, reason: "" },
    { time: "16:00", blocked: false, reason: "" },
    { time: "17:00", blocked: false, reason: "" },
    { time: "18:00", blocked: true, reason: "Mensalista" },
    { time: "19:00", blocked: true, reason: "Mensalista" },
    { time: "20:00", blocked: false, reason: "" },
    { time: "21:00", blocked: false, reason: "" },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePriceChange = (id: string, newPrice: string) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, price: parseFloat(newPrice) || 0 } : c))
    );
  };

  const toggleSlotBlock = (time: string) => {
    setTimeSlots((prev) =>
      prev.map((s) => {
        if (s.time === time) {
          return {
            ...s,
            blocked: !s.blocked,
            reason: !s.blocked ? "Bloqueio Gestor" : "",
          };
        }
        return s;
      })
    );
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <main className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 text-slate-800">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cabeçalho do Gestor */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 border rounded-xl hover:bg-slate-50 text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-slate-900 text-lg">Painel do Gestor</h1>
              <p className="text-xs text-slate-500">{currentArena.name} • Controlo operacional</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            {savedSuccess ? "Guardado!" : "Guardar Alterações"}
          </button>
        </div>

        {/* 1. Ajuste de Preços */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            1. Ajuste de Preço por Hora das Quadras
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courts.map((court) => (
              <div key={court.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{court.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-semibold">R\$</span>
                  <input
                    type="number"
                    value={court.price}
                    onChange={(e) => handlePriceChange(court.id, e.target.value)}
                    className="w-16 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Trava de Horários */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              2. Trava de Horários da Grade
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clique para bloquear horários (aulas/mensalistas) ou libertar para reservas online.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                onClick={() => toggleSlotBlock(slot.time)}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  slot.blocked
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <span className="text-xs font-bold">{slot.time}</span>
                <div className="flex items-center gap-1 text-[10px] font-semibold">
                  {slot.blocked ? (
                    <>
                      <Lock className="w-3 h-3 text-red-600" />
                      <span>{slot.reason || "Travado"}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-emerald-600" />
                      <span>Livre</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}