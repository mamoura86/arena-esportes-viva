'use client';

import { useState, useEffect } from 'react';
import { QrCode, CreditCard, CheckCircle2, ShieldCheck, Copy, Timer } from 'lucide-react';

// Taxas aplicadas exatamente conforme a imagem
const CC_RATES = {
  1: 4.98,
  2: 4.52,
  3: 6.61,
  4: 8.68,
  5: 10.65,
  6: 11.95,
};

export default function CheckoutModal(props: any) {
  const { isOpen, onClose, bookingDetails, initialPaymentMethod, onSuccess } = props;
  
  const [step, setStep] = useState<'pix_qr' | 'cc_form' | 'processing' | 'success'>('pix_qr');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos (600s)
  const [installments, setInstallments] = useState<1|2|3|4|5|6>(1);
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });

  // Puxa o valor base, sem a taxa de 1x que o page.tsx adicionou previamente no "amount"
  const baseAmount = Number(bookingDetails?.baseAmount) || 0;

  // Calcula a taxa total conforme a opção (o valor original em Pix é o baseAmount)
  const currentRate = initialPaymentMethod === 'card' ? CC_RATES[installments] : 0;
  const totalWithTax = initialPaymentMethod === 'card' 
    ? baseAmount * (1 + currentRate / 100) 
    : baseAmount;

  // Inicia o timer e define a tela correta ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(initialPaymentMethod === 'pix' ? 'pix_qr' : 'cc_form');
      setTimeLeft(600);
      setInstallments(1);
    }
  }, [isOpen, initialPaymentMethod]);

  // Contagem do relógio
  useEffect(() => {
    if (step === 'pix_qr' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && step === 'pix_qr') {
      alert('Tempo expirado. O QR Code foi cancelado por segurança.');
      onClose();
    }
  }, [step, timeLeft, onClose]);

  if (!isOpen || !bookingDetails) return null;

  const handleSimulatePayment = () => {
    // Simulação do carregamento e chamada ao gravador oficial de reservas
    setStep('processing');
    
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        // Envia de volta para o page.tsx processar e gravar no Supabase
        onSuccess(initialPaymentMethod, installments, totalWithTax);
      }, 1000);
    }, 2000); // Demora 2 segundos para dar realismo
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-[#041E8C] p-4 text-white rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00E599]" />
            <h2 className="font-bold tracking-wide">
              {step === 'processing' ? 'Processando...' : step === 'success' ? 'Pagamento Aprovado' : 'Checkout Seguro'}
            </h2>
          </div>
          {step !== 'processing' && step !== 'success' && (
            <button onClick={onClose} className="text-white/70 hover:text-white transition font-bold text-lg p-1">
              ✕
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Caixa de Valor Fixo (oculta no loading/sucesso) */}
          {step !== 'processing' && step !== 'success' && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Total a Pagar</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {initialPaymentMethod === 'pix' ? 'Pix Sem Juros' : 'Cartão de Crédito'}
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-[#041E8C]">R$ {totalWithTax.toFixed(2)}</span>
              </div>
              {initialPaymentMethod === 'card' && (
                <p className="text-[10px] text-slate-500 mt-2">
                  Valor base: R$ {baseAmount.toFixed(2)} + Taxa operadora ({currentRate}%)
                </p>
              )}
            </div>
          )}

          {/* Abas e Componentes: PIX */}
          {step === 'pix_qr' && (
            <div className="flex flex-col items-center animate-fade-in space-y-4">
              <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Expira em: {formatTime(timeLeft)}
              </div>
              
              <div className="w-48 h-48 bg-white border border-slate-200 shadow-sm p-2 flex flex-col items-center justify-center rounded-xl relative overflow-hidden">
                <QrCode className="w-32 h-32 text-slate-800" strokeWidth={1} />
                <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest absolute bottom-2">Código Simulado</span>
              </div>

              <div className="w-full">
                <p className="text-xs font-bold text-slate-600 mb-1">Pix Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value="00020101021126580014br.gov.bcb.pix..." className="flex-1 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-mono outline-none truncate" />
                  <button className="bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition flex items-center justify-center">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleSimulatePayment}
                className="w-full bg-[#00E599] text-[#041E8C] font-black py-3.5 rounded-xl hover:bg-[#00c985] transition shadow-md mt-2 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> SIMULAR PAGAMENTO CONFIRMADO
              </button>
            </div>
          )}

          {/* Abas e Componentes: CARTÃO DE CRÉDITO */}
          {step === 'cc_form' && (
            <div className="flex flex-col animate-fade-in space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Número do Cartão</label>
                <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-mono outline-none" value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value.replace(/[^0-9 ]/g, '')})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Nome no Cartão</label>
                <input type="text" placeholder="COMO ESTÁ IMPRESSO" className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm uppercase outline-none" value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})} />
              </div>
              <div className="flex gap-3">
                <div className="w-1/2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Validade</label>
                  <input type="text" placeholder="MM/AA" maxLength={5} className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-mono outline-none text-center" value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} />
                </div>
                <div className="w-1/2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">CVV</label>
                  <input type="text" placeholder="123" maxLength={4} className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-mono outline-none text-center" value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
              
              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 flex justify-between">
                  <span>Opções de Parcelamento</span>
                  <span className="text-[#041E8C]">Juros repassados</span>
                </label>
                <select 
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white font-bold text-sm text-[#041E8C] outline-none cursor-pointer"
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value) as any)}
                >
                  {[1, 2, 3, 4, 5, 6].map((inst) => {
                    const rate = CC_RATES[inst as keyof typeof CC_RATES];
                    const totalOption = baseAmount * (1 + rate / 100);
                    const parcelValue = totalOption / inst;
                    return (
                      <option key={inst} value={inst}>
                        {inst}x de R$ {parcelValue.toFixed(2)} {inst === 1 ? '(À vista)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button 
                onClick={handleSimulatePayment}
                className="w-full bg-[#00E599] text-[#041E8C] font-black py-4 rounded-xl hover:bg-[#00c985] transition shadow-md mt-4 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" /> PAGAR R$ {totalWithTax.toFixed(2)}
              </button>
            </div>
          )}

          {/* Telas de Loading e Sucesso */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-[#041E8C]/20 border-t-[#041E8C] rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-slate-600">Aprovando transação com o banco...</p>
            </div>
          )}
          
          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center animate-fade-in">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
              <h3 className="text-xl font-black text-slate-800">Tudo Certo!</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">A gerar a reserva no sistema...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}