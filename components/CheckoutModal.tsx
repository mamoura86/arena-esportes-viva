"use client";

import React, { useState } from "react";
import { X, QrCode, CreditCard, Loader2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: {
    amount: number; // Valor nominal da reserva (ex: R$ 60,00)
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  };
  onSuccess: () => void;
}

export default function CheckoutModal({ isOpen, onClose, bookingDetails, onSuccess }: CheckoutModalProps) {
  const [paymentType, setPaymentType] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCodeText: string } | null>(null);

  // Campos padrão para teste do Cartão e CPF
  const [cardNumber, setCardNumber] = useState("5480 8328 0103 3311");
  const [cardExpiration, setCardExpiration] = useState("11/30");
  const [cardCvv, setCardCvv] = useState("123");
  const [cpf, setCpf] = useState("12345678909");

  if (!isOpen) return null;

  // Se for cartão, repassa a taxa operacional de ~4.99% de forma transparente. Se for Pix, mantém o valor nominal exato.
  const calculatedTotal = paymentType === "card" 
    ? Number((bookingDetails.amount * 1.0499).toFixed(2)) 
    : bookingDetails.amount;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/process_payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionAmount: calculatedTotal,
          description: bookingDetails.description,
          paymentMethodId: paymentType === "pix" ? "pix" : "master",
          email: bookingDetails.customerEmail,
          identificationType: "CPF",
          identificationNumber: cpf.replace(/\D/g, ""),
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (paymentType === "pix") {
          const pointOfInteraction = data.result.point_of_interaction;
          setPixData({
            qrCodeBase64: pointOfInteraction.transaction_data.qr_code_base64,
            qrCodeText: pointOfInteraction.transaction_data.qr_code,
          });
        } else {
          alert("Pagamento com cartão aprovado com sucesso!");
          onSuccess();
          onClose();
        }
      } else {
        alert("Erro ao processar pagamento: " + data.error);
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
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-left relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base font-black text-[#041E8C] uppercase tracking-wider">Finalizar Pagamento</h2>
          <p className="text-xs text-slate-500 mt-0.5">{bookingDetails.description}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-black text-emerald-600">R$ {calculatedTotal.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {paymentType === "card" ? "(Inclui taxa operacional do cartão)" : "(Valor nominal sem taxas)"}
            </span>
          </div>
        </div>

        {pixData ? (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
              PIX gerado com sucesso! Escaneie o QR Code abaixo ou copie a chave.
            </div>
            {pixData.qrCodeBase64 && (
              <img 
                src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} 
                alt="QR Code Pix" 
                className="w-48 h-48 mx-auto rounded-xl border p-2 bg-white" 
              />
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
            <button 
              onClick={() => { onSuccess(); onClose(); }} 
              className="w-full py-3 bg-[#041E8C] text-white font-black text-xs rounded-xl shadow-md"
            >
              Já fiz o pagamento / Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentType("pix")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${paymentType === "pix" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}
              >
                <QrCode className="w-4 h-4 text-[#00E599]" /> PIX (Instantâneo)
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("card")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${paymentType === "card" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}
              >
                <CreditCard className="w-4 h-4 text-[#00E599]" /> Cartão de Crédito
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">CPF do Pagador (Documento)</label>
              <input
                type="text"
                placeholder="12345678909"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#041E8C]"
                required
              />
            </div>

            {paymentType === "card" && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Número do Cartão de Teste</label>
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{paymentType === "pix" ? "GERAR QR CODE PIX" : "PAGAR COM CARTÃO"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}