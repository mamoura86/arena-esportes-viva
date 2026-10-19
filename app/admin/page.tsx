"use client";

import React, { useState } from "react";
import { currentArena } from "../../arenaConfig";
import { Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check, KeyRound, ShieldAlert, Package } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const ADMIN_PIN = "1234";

  // Preços das Quadras
  const [courts, setCourts] = useState([
    { id: "futebol-1", name: "Campo Society", price: 80.0 },
    { id: "areia-1", name: "Quadras de Areia (Normal)", price: 60.0 },
    { id: "areia-promo", name: "Horário Promocional (16h às 19h)", price: 40.0 },
  ]);

  // Preços dos Materiais
  const [equipments, setEquipments] = useState([
    { id: "e-raquete", name: "Aluguer de Raquete de Beach Tennis", price: 5.0 },
    { id: "e-bola", name: "Aluguer de Bolas (Vólei / Society / Carimba)", price: 5.0 },
  ]);

  const [timeSlots, setTimeSlots] = useState([
    { time: "16:00", blocked: false, reason: "" },
    { time: "17:00", blocked: false, reason: "" },
    { time: "18:00", blocked: true, reason: "Mensalista" },
    { time: "19:00", blocked: true, reason: "Mensalista" },
    { time: "20:00", blocked: false, reason: "" },
    { time: "21:00", blocked: false, reason: "" },
    { time: "22:00", blocked: false, reason: "" },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      setErrorMessage("");
    } else {
      setErrorMessage("Senha incorreta. Tente novamente.");
    }
  };

  const handleCourtPriceChange = (id: string, newPrice: string) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, price: parseFloat(newPrice) || 0 } : c))
    );
  };

  const handleEquipmentPriceChange = (id: string, newPrice: string) => {
    setEquipments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, price: parseFloat(newPrice) || 0 } : e))
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

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-sm w-full p-6 rounded-3xl border border-slate-200 shadow-md space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900">Acesso Restrito</h1>
            <p className="text-xs text-slate-500">
              Digite a senha do gestor do <strong>{currentArena.name}</strong>.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Senha / PIN
              </label>
              <input
                type="password"
                placeholder="Padrão: 1234"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow"
            >
              Entrar no Painel
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao site público
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 text-slate-800">
      <div className="max-w-2xl mx-auto space-y-6">
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

        {/* 1. Preços das Quadras */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            1. Tabela de Preços por Hora
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {courts.map((court) => (
              <div key={court.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{court.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-semibold">R\$</span>
                  <input
                    type="number"
                    value={court.price}
                    onChange={(e) => handleCourtPriceChange(court.id, e.target.value)}
                    className="w-20 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Preços dos Materiais */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            2. Preço de Aluguer dos Materiais
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {equipments.map((equip) => (
              <div key={equip.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{equip.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-semibold">R\$</span>
                  <input
                    type="number"
                    value={equip.price}
                    onChange={(e) => handleEquipmentPriceChange(equip.id, e.target.value)}
                    className="w-20 p-1 text-xs font-bold bg-white border border-slate-300 rounded text-right focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Bloqueio de Horários */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              3. Trava de Horários (16h às 22h)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clique para travar (aulas/mensalistas) ou libertar para reservas online.
            </p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                onClick={() => toggleSlotBlock(slot.time)}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  slot.blocked
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <span className="text-xs font-bold">{slot.time}</span>
                <div className="flex items-center gap-1 text-[9px] font-semibold">
                  {slot.blocked ? (
                    <>
                      <Lock className="w-2.5 h-2.5 text-red-600" />
                      <span>{slot.reason || "Travado"}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Livre</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-right">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs font-semibold text-slate-400 hover:text-red-600 transition"
          >
            Sair do modo administrador
          </button>
        </div>
      </div>
    </main>
  );
}