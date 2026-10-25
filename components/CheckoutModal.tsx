"use client";

import React, { useState, useEffect } from "react";
import { X, QrCode, CreditCard, Loader2, Timer, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: {
    amount: number;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    date?: string;
    time?: string;
    courtId?: string;
    isClass?: boolean;
  };
  initialPaymentMethod: "pix" | "card";
  onSuccess: () => void;
}

export default function CheckoutModal({ isOpen, onClose, bookingDetails, initialPaymentMethod, onSuccess }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCodeText: string } | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(600);
  const [isExpired, setIsExpired] = useState(false);

  const [installments, setInstallments] = useState(1);
  const [cardNumber, setCardNumber] = useState("5480 8328 0103 3311");
  const [cardExpiration, setCardExpiration] = useState("11/30");
  const [cardCvv, setCardCvv] = useState("123");
  const [cpf, setCpf] = useState("12345678909");

  useEffect(() => {
    if (isOpen) {
      setPixData(null);
      setCurrentBookingId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (isOpen && pixData && !isExpired && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsExpired(true);
            handleExpirePix();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, pixData, isExpired, timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  const getInstallmentInterestFactor = (inst: number) => {
    if (inst === 1) return 1; 
    if (inst === 2) return 1.0543;
    if (inst === 3) return 1.0701;
    if (inst === 4) return 1.0713;
    if (inst === 5) return 1.0991;
    if (inst === 6) return 1.0992;
    return 1;
  };

  const finalCardAmount = bookingDetails.isClass && installments > 1 
    ? Number((bookingDetails.amount * getInstallmentInterestFactor(installments)).toFixed(2))
    : bookingDetails.amount;

  const installmentValue = Number((finalCardAmount / installments).toFixed(2));

  const createPendingBookingInSupabase = async (statusOverride = 'pending_payment') => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            code: `VIVA-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            customer_name: bookingDetails.customerName,
            customer_phone: bookingDetails.customerPhone,
            customer_email: bookingDetails.customerEmail,
            date: bookingDetails.date || new Date().toISOString().split('T')[0],
            time: bookingDetails.time || '00:00',
            amount: bookingDetails.amount,
            status: statusOverride,
            payment_method: initialPaymentMethod,
            description: bookingDetails.description
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentBookingId(data.id);
        return data.id;
      }
    } catch (err) {
      console.error("Erro ao salvar reserva pendente:", err);
    }
    return null;
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPendingBookingInSupabase('pending_payment');

      const response = await fetch("/api/process_payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionAmount: bookingDetails.amount,
          description: bookingDetails.description,
          paymentMethodId: "pix",
          email: "test_user_123456@testuser.com",
          identificationType: "CPF",
          identificationNumber: cpf.replace(/\D/g, ""),
        }),
      });

      const data = await response.json();
      if (data.success) {
        const pointOfInteraction = data.result.point_of_interaction;
        setPixData({
          qrCodeBase64: pointOfInteraction?.transaction_data?.qr_code_base64 || "",
          qrCodeText: pointOfInteraction?.transaction_data?.qr_code || "Código Pix indisponível",
        });
        setTimeLeft(600);
        setIsExpired(false);
      } else {
        alert("Erro ao gerar Pix: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao gerar Pix.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPix = async () => {
    if (currentBookingId) {
      try {
        await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', currentBookingId);
      } catch (err) {
        console.error("Erro ao cancelar reserva no banco:", err);
      }
    }
    setPixData(null);
    onClose();
  };

  const handleExpirePix = async () => {
    if (currentBookingId) {
      await supabase
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', currentBookingId);
    }
  };

  const handleSimulateApproval = async () => {
    if (currentBookingId) {
      await supabase
        .from('bookings')
        .update({ status: 'paid' })
        .eq('id', currentBookingId);
    } else {
      await createPendingBookingInSupabase('paid');
    }
    onSuccess();
    onClose();
  };

  const handleProcessCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/process_payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionAmount: finalCardAmount,
          description: bookingDetails.description,
          paymentMethodId: "master",
          installments: bookingDetails.isClass ? installments : 1,
          email: "test_user_123456@testuser.com",
          identificationType: "CPF",
          identificationNumber: cpf.replace(/\D/g, ""),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await createPendingBookingInSupabase('paid');
        alert("Pagamento com cartão aprovado com sucesso!");
        onSuccess();
        onClose();
      } else {
        alert("Erro ao processar cartão: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-left relative max-h-[90vh] overflow-y-auto">
        <button onClick={initialPaymentMethod === 'pix' && pixData ? handleCancelPix : onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base font-black text-[#041E8C] uppercase tracking-wider">
            {initialPaymentMethod === "pix" ? "Finalizar Pagamento (PIX)" : "Finalizar Pagamento (Cartão)"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{bookingDetails.description}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-black text-emerald-600">
              R$ {initialPaymentMethod === "pix" ? bookingDetails.amount.toFixed(2) : finalCardAmount.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {initialPaymentMethod === "card" && bookingDetails.isClass && installments > 1 ? `(${installments}x de R$ ${installmentValue.toFixed(2)} com taxas)` : "(Valor total)"}
            </span>
          </div>
        </div>

        {initialPaymentMethod === "pix" ? (
          <div>
            {!pixData ? (
              <form onSubmit={handleGeneratePix} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">CPF do Pagador (Obrigatório para Pix)</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#041E8C]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>GERAR QR CODE PIX</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 text-xs font-bold mx-auto">
                  <Timer className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                  <span>{isExpired ? "QR Code Expirado" : `Expira em: ${formatTimer(timeLeft)}`}</span>
                </div>

                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
                  PIX gerado com sucesso! Escaneie o QR Code abaixo ou copie a chave.
                </div>

                {pixData.qrCodeBase64 && pixData.qrCodeBase64.length > 50 ? (
                  <img 
                    src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} 
                    alt="QR Code Pix" 
                    className="w-48 h-48 mx-auto rounded-xl border p-2 bg-white" 
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto rounded-xl border p-4 bg-red-100 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mb-1" />
                    <span className="text-[10px] font-bold text-red-700">QR Code de Teste (Sandbox instável)</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pix Copia e Cola</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={pixData.qrCodeText} 
                    className="w-full p-2 bg-slate-50 border rounded-xl text-[11px] text-slate-600 font-mono select-all" 
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button 
                    onClick={handleSimulateApproval} 
                    className="w-full py-3 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow-md hover:bg-[#00c985] transition"
                  >
                    Simular Pagamento Aprovado / Concluir
                  </button>
                  <button 
                    onClick={handleCancelPix} 
                    className="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancelar Pagamento e Libertar Horário
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleProcessCardPayment} className="space-y-4">
            {bookingDetails.isClass && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Número de Parcelas (Aulas e Treinos)</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                >
                  <option value={1}>1x de R$ {bookingDetails.amount.toFixed(2)} (À vista)</option>
                  <option value={2}>2x de R$ {((bookingDetails.amount * 1.0543) / 2).toFixed(2)}</option>
                  <option value={3}>3x de R$ {((bookingDetails.amount * 1.0701) / 3).toFixed(2)}</option>
                  <option value={4}>4x de R$ {((bookingDetails.amount * 1.0713) / 4).toFixed(2)}</option>
                  <option value={5}>5x de R$ {((bookingDetails.amount * 1.0991) / 5).toFixed(2)}</option>
                  <option value={6}>6x de R$ {((bookingDetails.amount * 1.0992) / 6).toFixed(2)}</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">CPF do Titular do Cartão</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#041E8C]"
                required
              />
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Número do Cartão</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border rounded-lg text-xs outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Validade (MM/AA)</label>
                  <input
                    type="text"
                    value={cardExpiration}
                    onChange={(e) => setCardExpiration(e.target.value)}
                    className="w-full p-2.5 bg-white border rounded-lg text-xs outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full p-2.5 bg-white border rounded-lg text-xs outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>PAGAR R$ {finalCardAmount.toFixed(2)}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}