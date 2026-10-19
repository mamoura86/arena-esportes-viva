"use client";

import React, { useState, useEffect } from "react";
import { currentArena } from "@/arenaConfig";
import { 
  Lock, Unlock, DollarSign, Calendar, ArrowLeft, Check, 
  KeyRound, ShieldAlert, Package, Repeat
} from "lucide-react";
import Link from "next/link";

const allCourtsList = [
  { id: "futebol-1", name: "Campo Society" },
  { id: "areia-1", name: "Quadra 1 (Areia)" },
  { id: "areia-2", name: "Quadra 2 (Areia)" },
  { id: "areia-3", name: "Quadra 3 (Areia)" },
  { id: "areia-4", name: "Quadra 4 (Areia)" },
  { id: "areia-5", name: "Quadra 5 (Areia)" },
  { id: "areia-6", name: "Quadra 6 (Areia)" },
];

const daysOfWeek = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

const businessHours = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const ADMIN_PIN = "1234";

  // Preços
  const [courtsPricing, setCourtsPricing] = useState([
    { id: "society-normal", name: "Futebol Society (Normal - após 19h)", price: 80.0 },
    { id: "society-promo", name: "Futebol Society (Promocional - 16h às 19h)", price: 60.0 },
    { id: "areia-normal", name: "Quadras de Areia (Normal - após 19h)", price: 60.0 },
    { id: "areia-promo", name: "Quadras de Areia (Promocional - 16h às 19h)", price: 40.0 },
  ]);

  const [equipmentsPricing, setEquipmentsPricing] = useState([
    { id: "e-raquete", name: "Aluguel de Raquete de Beach Tennis", price: 5.0 },
    { id: "e-bola", name: "Aluguel de Bolas (Vôlei / Society / Carimba)", price: 5.0 },
  ]);

  // Gestão de Travas
  const [selectedAdminCourtId, setSelectedAdminCourtId] = useState("areia-1");
  const [lockMode, setLockMode] = useState<"weekly" | "specific">("weekly");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(2);
  const [specificDate, setSpecificDate] = useState("2026-10-20");

  const [weeklyLocks, setWeeklyLocks] = useState<{ [key: string]: string[] }>({});
  const [dateLocks, setDateLocks] = useState<{ [key: string]: string[] }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const savedWeekly = localStorage.getItem("viva_weekly_locks");
      if (savedWeekly) setWeeklyLocks(JSON.parse(savedWeekly));

      const savedDates = localStorage.getItem("viva_date_locks");
      if (savedDates) setDateLocks(JSON.parse(savedDates));

      const savedPrices = localStorage.getItem("viva_prices");
      if (savedPrices) setCourtsPricing(JSON.parse(savedPrices));
    } catch (e) {
      console.error(e);
    }
  }, []);

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
    setCourtsPricing((prev) =>
      prev.map((c) => (c.id === id ? { ...c, price: parseFloat(newPrice) || 0 } : c))
    );
  };

  const handleEquipmentPriceChange = (id: string, newPrice: string) => {
    setEquipmentsPricing((prev) =>
      prev.map((e) => (e.id === id ? { ...e, price: parseFloat(newPrice) || 0 } : e))
    );
  };

  const toggleLock = (time: string) => {
    if (lockMode === "weekly") {
      const key = `${selectedAdminCourtId}-${selectedDayOfWeek}`;
      setWeeklyLocks((prev) => {
        const currentList = prev[key] || [];
        const isLocked = currentList.includes(time);
        const updated = isLocked ? currentList.filter((t) => t !== time) : [...currentList, time];
        return { ...prev, [key]: updated };
      });
    } else {
      const key = `${selectedAdminCourtId}-${specificDate}`;
      setDateLocks((prev) => {
        const currentList = prev[key] || [];
        const isLocked = currentList.includes(time);
        const updated = isLocked ? currentList.filter((t) => t !== time) : [...currentList, time];
        return { ...prev, [key]: updated };
      });
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem("viva_weekly_locks", JSON.stringify(weeklyLocks));
      localStorage.setItem("viva_date_locks", JSON.stringify(dateLocks));
      localStorage.setItem("viva_prices", JSON.stringify(courtsPricing));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Erro ao salvar dados localmente.");
    }
  };

  const currentLockKey = lockMode === "weekly" 
    ? `${selectedAdminCourtId}-${selectedDayOfWeek}` 
    : `${selectedAdminCourtId}-${specificDate}`;

  const activeLocks = lockMode === "weekly" 
    ? weeklyLocks[currentLockKey] || [] 
    : dateLocks[currentLockKey] || [];

  // Se NÃO estiver autenticado, apresenta o ecrã de PIN
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

  // Painel de Gestão
  return (
    <main className="min-h-screen bg-slate-100 font-sans p-4 sm:p-6 text-slate-800 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 border rounded-xl hover:bg-slate-50 text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-slate-900 text-lg">Painel do Gestor</h1>
              <p className="text-xs text-slate-500">{currentArena.name} • Controle operacional</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            {savedSuccess ? "Salvo com Sucesso!" : "Salvar Alterações"}
          </button>
        </div>

        {/* 1. Tabela de Preços */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            1. Tabela de Preços por Hora
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {courtsPricing.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-semibold">R\$</span>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleCourtPriceChange(item.id, e.target.value)}
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
            2. Preço de Aluguel dos Materiais
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {equipmentsPricing.map((equip) => (
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

        {/* 3. Trava de Horários */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              3. Trava de Horários da Arena
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Trave horários para aulas e mensalistas ou bloqueie datas pontuais. Lembre-se de clicar em <strong>Salvar Alterações</strong> no topo.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
              Selecione a Quadra:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {allCourtsList.map((court) => {
                const isSelected = selectedAdminCourtId === court.id;
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => setSelectedAdminCourtId(court.id)}
                    className={`text-xs p-2.5 rounded-xl border font-bold transition text-center ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {court.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLockMode("weekly")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  lockMode === "weekly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Semanal (Dom a Dom)
              </button>
              <button
                type="button"
                onClick={() => setLockMode("specific")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  lockMode === "specific" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Data Específica
              </button>
            </div>

            {lockMode === "weekly" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Dia da Semana (Recorrente):
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {daysOfWeek.map((day) => {
                    const isSelected = selectedDayOfWeek === day.id;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setSelectedDayOfWeek(day.id)}
                        className={`py-2 rounded-xl border text-xs font-bold transition text-center ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Data Específica:
                </label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-slate-600 font-medium">
                  {lockMode === "weekly" ? (
                    <>Travas de <strong>{daysOfWeek.find((d) => d.id === selectedDayOfWeek)?.label}</strong> na <strong>{allCourtsList.find((c) => c.id === selectedAdminCourtId)?.name}</strong>:</>
                  ) : (
                    <>Travas de <strong>{specificDate}</strong> na <strong>{allCourtsList.find((c) => c.id === selectedAdminCourtId)?.name}</strong>:</>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">Clique para alternar</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {businessHours.map((time) => {
                  const isLocked = activeLocks.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleLock(time)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        isLocked
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      }`}
                    >
                      <span className="text-xs font-bold">{time}</span>
                      <div className="flex items-center gap-1 text-[9px] font-semibold">
                        {isLocked ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-red-600" />
                            <span>Travado</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Livre</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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