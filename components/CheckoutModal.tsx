"use client";

import React, { useState } from "react";
import { X, CreditCard, QrCode, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: {
    amount: number;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    isClass?: boolean;
    slots?: any[];
    selectedSport?: string;
    selectedDate?: string;
    upgradeItemCost?: number;
    upgradeItemName?: string;
  };
  initialPaymentMethod: "pix" | "card";
  onSuccess: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  bookingDetails,
  initialPaymentMethod,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleProceedToMercadoPago = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/create_preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookingDetails.description,
          unit_price: bookingDetails.amount,
          customerName: bookingDetails.customerName,
          customerPhone: bookingDetails.customerPhone,
          slots: bookingDetails.slots || [],
          selectedSport: bookingDetails.selectedSport || "",
          selectedDate: bookingDetails.selectedDate || "",
          upgradeItemCost: bookingDetails.upgradeItemCost || 0,
          upgradeItemName: bookingDetails.upgradeItemName || "",
          isClass: bookingDetails.isClass || false,
          paymentMethod: initialPaymentMethod, // Envia a escolha de pagamento para a API bloquear os outros
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar link de pagamento.");
      }

      // Redireciona o utilizador para o Checkout Pro na mesma aba
      window.location.href = data.init_point;

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocorreu um erro ao conectar com o Mercado Pago.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-[#041E8C] px-5 py-4 text-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">Finalizar Pagamento</h3>
            <p className="text-[11px] text-slate-200 mt-0.5">{bookingDetails.description}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Total</span>
              <span className="text-xl font-black text-[#041E8C]">R$ {bookingDetails.amount.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Prazo de Pagamento</span>
              <span className="text-xs font-bold text-slate-700">10 minutos</span>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
            <p className="font-black flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#041E8C]" /> Ambiente Seguro Mercado Pago
            </p>
            <p className="text-[11px] leading-relaxed text-blue-900">
              Ao clicar no botão abaixo, será redirecionado para a página oficial e segura do Mercado Pago para concluir com Pix ou Cartão. O seu horário ficará reservado por 10 minutos.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-semibold border border-red-200">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleProceedToMercadoPago}
            className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando link seguro...
              </>
            ) : (
              <>
                IR PARA O PAGAMENTO SEGURO <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Cancelar e Voltar
          </button>
        </div>
      </div>
    </div>
  );
}