"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

type CheckoutDetails = {
  amount: number;
  description: string;
};

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: CheckoutDetails | null;
  onSuccess: (method: string, installments: number, total: number) => Promise<boolean> | boolean;
};

export default function CheckoutModal({ isOpen, onClose, bookingDetails, onSuccess }: CheckoutModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (!isOpen || !bookingDetails) return null;

  const handleConfirmBooking = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSuccess("presencial", 1, Number(Number(bookingDetails.amount).toFixed(2)));
      // A página principal exibe os erros e redireciona somente após salvar.
    } catch (error) {
      console.error("Erro ao confirmar reserva:", error);
      alert("Não foi possível concluir a reserva. Tente novamente.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-label="Confirmar reserva" className="relative w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="bg-[#041E8C] p-4 text-white rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00E599]" />
            <h2 className="font-bold tracking-wide">Confirmar Reserva</h2>
          </div>
          <button type="button" disabled={isSubmitting} onClick={onClose} aria-label="Fechar" className="text-white/70 hover:text-white transition font-bold text-lg p-1 disabled:opacity-50">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Valor no Local</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Pagamento Presencial</span>
            </div>
            <div className="text-3xl font-black text-[#041E8C]">R$ {Number(bookingDetails.amount).toFixed(2).replace(".", ",")}</div>
            <p className="text-xs text-slate-600 font-medium pt-1 border-t border-slate-200 whitespace-pre-line">{bookingDetails.description}</p>
          </div>
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold uppercase flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-600" /> Instrução Importante</p>
            <p className="leading-relaxed">Nenhum pagamento é cobrado pelo site. O valor será acertado diretamente na <strong>recepção da arena</strong>.</p>
          </div>
          <button type="button" disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#00E599] text-[#041E8C] font-black py-4 rounded-xl hover:bg-[#00c985] transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed">
            <CheckCircle2 className="w-5 h-5" /> {isSubmitting ? "SALVANDO RESERVA..." : "CONCLUIR E GUARDAR RESERVA"}
          </button>
        </div>
      </div>
    </div>
  );
}
