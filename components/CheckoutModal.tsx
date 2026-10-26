'use client';

import { useState, useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

// Substitua a chave caso não esteja carregando do .env no frontend
const NEXT_PUBLIC_MP_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || '';

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  bookingData // { title, finalAmount, ... } 
}: any) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (NEXT_PUBLIC_MP_KEY) {
      initMercadoPago(NEXT_PUBLIC_MP_KEY, { locale: 'pt-BR' });
    }
  }, []);

  if (!isOpen) return null;

  const initialization = {
    amount: bookingData.finalAmount,
  };

 const customization = {
    paymentMethods: {
      pix: 'all' as const,
      creditCard: 'all' as const,
    },
  };

  const onSubmit = async (formData: any) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Redireciona para a página de sucesso ou mostra o QR Code do Pix
        window.location.href = `/?status=success&code=TESTE`;
      } else {
        alert("Erro no pagamento: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar o pagamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onError = async (error: any) => {
    console.error("Erro no Brick do Mercado Pago:", error);
  };

  const onReady = async () => {
    // Esconder spinners de carregamento se houver
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
          X
        </button>

        <h2 className="mb-4 text-xl font-bold text-blue-900">
          Finalizar Pagamento
        </h2>
        
        <div className="mb-4 rounded bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Valor Total</p>
          <p className="text-2xl font-bold text-blue-900">
            R$ {bookingData.finalAmount?.toFixed(2)}
          </p>
        </div>

        {isProcessing && <p className="mb-4 text-center text-blue-600 font-bold">Processando transação...</p>}

        <div className="mt-4">
          <Payment
            initialization={initialization}
            customization={customization}
            onSubmit={onSubmit}
            onReady={onReady}
            onError={onError}
          />
        </div>

        <button 
          onClick={onClose}
          className="mt-4 w-full rounded bg-gray-200 py-3 font-bold text-gray-700 transition hover:bg-gray-300"
        >
          Cancelar e Voltar
        </button>
      </div>
    </div>
  );
}