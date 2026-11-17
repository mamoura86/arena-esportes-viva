"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { currentArena } from "@/arenaConfig";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Lock, Unlock, Calendar, Clock, 
  PlusCircle, RefreshCw, CheckCircle2, XCircle, 
  Phone, User, ShieldCheck, Tag, Info, DollarSign,
  TrendingUp, BarChart3, Filter, Search, Edit3, X, Sparkles, Trash2, GraduationCap, KeyRound,
  ChevronLeft, ChevronRight, PieChart, Lightbulb, Award, AlertTriangle, UserPlus, Settings, Mail, FileSpreadsheet, Download, Upload, LogOut
} from "lucide-react";

const getBrazilDateString = () => {
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value || '2026';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
};

interface ClassScheduleRecord {
  id: string; sport: string; category: string; class_name: string; professor: string;
  court_id: string; day_of_week: number; class_time: string; active: boolean;
}

interface ClassExceptionRecord { schedule_id: string; class_date: string; reason: string | null; }

interface Court {
  id: string;
  name: string;
  type: "society" | "areia";
}

interface BookingRecord {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  courtId: string;
  courtName: string;
  sport?: string;
  date: string;
  time: string;
  price: number;
  channel: "online" | "manual";
  paymentMethod: string;
  status: "confirmada" | "cancelada" | "finalizada";
  createdAt?: string;
}

interface ConsolidatedBooking {
  code: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  date: string;
  totalPrice: number;
  status: string;
  channel: string;
  details: string[];
  slots: { date: string; time: string; courtId: string }[];
}

interface BookingAddon {
  booking_code: string;
  sport: string;
  addon_key: string;
  addon_name: string;
  addon_price: number;
}

interface BookingPayment {
  id: string;
  booking_code: string;
  amount: number;
  payment_method: string;
  settlement_status: "recebido" | "repasse_previsto";
  notes: string | null;
  created_at: string;
}

interface BookingAdjustment {
  id: string;
  booking_code: string;
  amount: number;
  adjustment_type: "perda" | "desconto" | "cancelamento_contrato";
  reason: string;
  created_at: string;
}

interface ClassChargeRecord {
  id: string;
  student_name: string;
  student_phone: string;
  sport: string;
  class_name: string;
  class_date: string | null;
  amount: number;
  charge_type: string;
  status: string;
}

interface CouponRecord {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  scope: "quadras" | "aulas" | "ambos";
  active: boolean;
  max_uses?: number | null;
  used_count?: number;
}

interface ClassEnrollment {
  id: string;
  code: string;
  student_name: string;
  student_phone: string;
  sport: string;
  category: string;
  plan_type: string;
  days_selected: string;
  extra_days_count: number;
  total_price: number;
  status: string;
  created_at: string;
}

const allCourts: Court[] = [
  { id: "futebol-1", name: "Campo de Futebol Society", type: "society" },
  { id: "areia-1", name: "Quadra 1 (Areia)", type: "areia" },
  { id: "areia-2", name: "Quadra 2 (Areia)", type: "areia" },
  { id: "areia-3", name: "Quadra 3 (Areia)", type: "areia" },
  { id: "areia-4", name: "Quadra 4 (Areia)", type: "areia" },
  { id: "areia-5", name: "Quadra 5 (Areia)", type: "areia" },
  { id: "areia-6", name: "Quadra 6 (Areia)", type: "areia" },
];

const businessHours = [
  "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
  "20:00", "21:00", "22:00"
];

const daysOfWeek = [
  { id: 1, name: "Segunda-feira" },
  { id: 2, name: "Terça-feira" },
  { id: 3, name: "Quarta-feira" },
  { id: 4, name: "Quinta-feira" },
  { id: 5, name: "Sexta-feira" },
  { id: 6, name: "Sábado" },
  { id: 0, name: "Domingo" },
];

const HOLIDAYS = [
  "01-01", "03-19", "03-25", "04-21", "05-01", "09-07", 
  "08-15", "10-12", "11-02", "11-15", "11-20", "12-25"
];

const classScheduleMap: Record<string, Record<string, string[]>> = {
  "Vôlei de Praia": {
    "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"],
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"],
    "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"]
  },
  "Beach Tennis": {
    "Kids": ["Segunda e Quarta às 17h", "Terça e Quinta às 17h"],
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Terça e Quinta às 20h", "Terça e Quinta às 21h"],
    "Intermediário": ["Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"]
  },
  "Futevôlei": {
    "Iniciante": ["Segunda e Quarta às 18h", "Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 18h", "Terça e Quinta às 19h"],
    "Intermediário": ["Segunda e Quarta às 21h", "Terça e Quinta às 20h"],
    "Avançado": ["Terça e Quinta às 21h"]
  },
  "Futebol Society": {
    "Kids": ["Segunda e Quarta às 17h", "Segunda e Quarta às 18h", "Terça e Quinta às 17h", "Terça e Quinta às 18h"],
    "Iniciante": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"],
    "Adulto": ["Segunda e Quarta às 19h", "Segunda e Quarta às 20h", "Terça e Quinta às 19h", "Terça e Quinta às 20h"]
  }
};

const parseClassScheduleLabel = (label: string) => {
  const normalized = label.toLocaleLowerCase("pt-BR");
  const dayMap: Array<[string, number]> = [
    ["segunda", 1], ["terça", 2], ["terca", 2], ["quarta", 3],
    ["quinta", 4], ["sexta", 5], ["sábado", 6], ["sabado", 6], ["domingo", 0],
  ];
  const days = dayMap.filter(([name]) => normalized.includes(name)).map(([, day]) => day);
  const hourMatch = normalized.match(/(?:às|as)\s*(\d{1,2})h/);
  if (!days.length || !hourMatch) return { days: [] as number[], time: "" };
  return { days: Array.from(new Set(days)), time: `${String(Number(hourMatch[1])).padStart(2, "0")}:00` };
};


const formatCurrency = (val: number) => {
  return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isActiveEnrollment = (status: string) => status === "ativa" || status === "confirmada";

const getOrderedSports = () => {
  return ["Futebol Society", "Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"];
};

const generateSecureBookingCode = (prefix = "VIVA") => {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
};

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const isWeekendOrHoliday = (dateStr: string) => {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  if (day === 0 || day === 6) return true;
  const monthDay = dateStr.substring(5);
  return HOLIDAYS.includes(monthDay);
};

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [, setClockTick] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [resetMode, setResetMode] = useState(false);
   
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailTarget, setResetEmailTarget] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

  const [activeTab, setActiveTab] = useState<"grid" | "reports" | "bookings" | "classes" | "locks_classes" | "prices" | "config">("grid");
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([]);
  const [bookingAddons, setBookingAddons] = useState<BookingAddon[]>([]);
  const [bookingAddonsError, setBookingAddonsError] = useState("");

  const addonTotal = (code: string) => bookingAddons
    .filter(a => a.booking_code === code)
    .reduce((sum, a) => sum + Number(a.addon_price || 0), 0);

  const [bookingAdjustments, setBookingAdjustments] = useState<BookingAdjustment[]>([]);
  const [paymentModalCode, setPaymentModalCode] = useState<string | null>(null);
  const [bookingClosureModalCode, setBookingClosureModalCode] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethodInput, setPaymentMethodInput] = useState("pix");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [creditFee, setCreditFee] = useState("0");
  const [creditInstallments, setCreditInstallments] = useState("1");
  const [cardDetails, setCardDetails] = useState<Array<{source_type:string;payment_id:string;gross_amount:number;fee_amount:number;fee_percent:number;installments:number}>>([]);
  const [discountDetails, setDiscountDetails] = useState<Array<{source_type:string;source_id:string;discount_amount:number;applied_at:string;discount_origin:string;coupon_code:string|null}>>([]);
  // Taxas do modal: carregadas independentemente do filtro do Resumo Financeiro.
  const [bookingModalFees, setBookingModalFees] = useState<Array<{payment_id:string;fee_amount:number;fee_percent:number;installments:number}>>([]);
  const [bookingModalFeesLoading, setBookingModalFeesLoading] = useState(false);
  const [bookingModalFeesError, setBookingModalFeesError] = useState("");
  useEffect(() => {
    if (!paymentModalCode) {
      setBookingModalFees([]);
      setBookingModalFeesError("");
      setBookingModalFeesLoading(false);
      return;
    }
    let active = true;
    setBookingModalFees([]);
    setBookingModalFeesError("");
    setBookingModalFeesLoading(true);
    const fetchFees = async () => {
      try {
        const {data: payments, error: paymentsError} = await supabase.from("booking_payments")
          .select("id").eq("booking_code", paymentModalCode);
        if (paymentsError) throw paymentsError;
        const ids = (payments || []).map(p => String(p.id));
        if (!ids.length) { if (active) setBookingModalFees([]); return; }
        const {data: fees, error: feesError} = await supabase.from("financial_card_details")
          .select("payment_id,fee_amount,fee_percent,installments")
          .eq("source_type", "reserva").in("payment_id", ids);
        if (feesError) throw feesError;
        if (active) setBookingModalFees((fees || []).map(f => ({
          payment_id: String(f.payment_id), fee_amount: Number(f.fee_amount),
          fee_percent: Number(f.fee_percent), installments: Number(f.installments)
        })));
      } catch (err:any) {
        if (active) setBookingModalFeesError(`Não foi possível carregar as taxas financeiras: ${err?.message || "erro desconhecido"}`);
      } finally { if (active) setBookingModalFeesLoading(false); }
    };
    void fetchFees();
    return () => { active = false; };
  }, [paymentModalCode, bookingPayments]);

  const creditValid = (fee:string, installments:string) => {
    const pct=Number(fee.replace(",",".")), count=Number(installments);
    return Number.isFinite(pct) && pct>=0 && pct<=100 && Number.isInteger(count) && count>=1 && count<=12;
  };
  const saveCardDetail = async (source_type:"reserva"|"aula", payment_id:string, gross_amount:number, fee:string, installments:string) => {
    const {error}=await supabase.from("financial_card_details").insert({source_type,payment_id:String(payment_id),gross_amount,fee_percent:Number(fee.replace(",",".")),installments:Number(installments)});
    if(error) throw error;
  };
  const [lossReason, setLossReason] = useState("");
  const [closureMode, setClosureMode] = useState<"zerar_saldo" | "manter_saldo">("zerar_saldo");
  const [closureLoss, setClosureLoss] = useState("0");
  const [bookingClosures, setBookingClosures] = useState<Array<{booking_code:string;termination_mode:string;termination_reason:string;loss_amount:number;closed_at:string}>>([]);
  const [bookingClosuresError, setBookingClosuresError] = useState("");
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [financialError, setFinancialError] = useState("");
  const [cloudLocks, setCloudLocks] = useState<any[]>([]);
  const [registeredClasses, setRegisteredClasses] = useState<ClassScheduleRecord[]>([]);
  const [classExceptions, setClassExceptions] = useState<ClassExceptionRecord[]>([]);
  const [classExceptionDate, setClassExceptionDate] = useState("");
  const [classExceptionBusy, setClassExceptionBusy] = useState<string | null>(null);
  const [classExceptionError, setClassExceptionError] = useState("");
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [classCharges, setClassCharges] = useState<ClassChargeRecord[]>([]);
  const [monthlyEnrollment, setMonthlyEnrollment] = useState<ClassEnrollment | null>(null);
  const [monthlyReference, setMonthlyReference] = useState("");
  const [monthlyChargeAmount, setMonthlyChargeAmount] = useState("");
  const [monthlyPaidAmount, setMonthlyPaidAmount] = useState("");
  const [monthlyMethod, setMonthlyMethod] = useState("pix");
  const [monthlyCreditFee,setMonthlyCreditFee]=useState("0");
  const [monthlyCreditInstallments,setMonthlyCreditInstallments]=useState("1");
  // Etapa 18: cronogramas não alteram o caixa existente.
  type PaymentMode = "integral" | "parcelado_arena" | "cartao_maquininha";
  type ScheduleItem = {date:string; amount:string};
  type PaymentTerms = {id:string;charge_id:string;payment_mode:PaymentMode;installments_count:number;card_brand:string|null;card_transaction_reference:string|null;card_fee_amount:number|null};
  type DueItem = {payment_terms_id:string;installment_number:number;due_date:string;amount:number};
  type CardItem = {id:string;payment_terms_id:string;installment_number:number;expected_date:string;gross_amount:number;fee_amount:number;received_at:string|null;received_amount:number|null};
  const [termsByCharge, setTermsByCharge] = useState<Record<string,PaymentTerms>>({});
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [cardItems, setCardItems] = useState<CardItem[]>([]);
  const [scheduleChargeId, setScheduleChargeId] = useState<string|null>(null);
  const [scheduleMode, setScheduleMode] = useState<PaymentMode>("integral");
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [scheduleCardBrand, setScheduleCardBrand] = useState("");
  const [scheduleCardRef, setScheduleCardRef] = useState("");
  const [scheduleFee, setScheduleFee] = useState("0");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [remittanceSaving, setRemittanceSaving] = useState<string|null>(null);
  const receiveRemittance = async (item:CardItem) => {
    if(remittanceSaving||item.received_at)return;
    const suggested=(Number(item.gross_amount)-Number(item.fee_amount)).toFixed(2);
    const input=window.prompt(`Valor líquido recebido da operadora para o repasse ${item.installment_number} (R$):`,suggested);
    if(input===null)return;
    const amount=moneyNum(input);
    if(!Number.isFinite(amount)||amount<0||Math.abs(amount*100-Math.round(amount*100))>0.00001){setMonthlyError("Valor de repasse inválido.");return;}
    setRemittanceSaving(item.id);
    try {
      const {error}=await supabase.rpc("receive_class_card_remittance",{p_receivable_id:item.id,p_received_amount:amount});
      if(error)throw error;
      await loadSchedules();setMonthlyError("Repasse da operadora registrado, sem alterar a dívida do aluno.");
    }catch(err:any){setMonthlyError(`Erro ao registrar repasse: ${err?.message||"tente novamente"}`);}
    finally{setRemittanceSaving(null);}
  };
  const [scheduleError, setScheduleError] = useState("");
  const [pendingAttention, setPendingAttention] = useState<"attention"|"all">("attention");
  const moneyNum = (v:string) => Number(v.replace(",","."));
  const addMonthsToDate = (iso:string,months:number) => {
    const [y,m,d]=iso.split("-").map(Number);
    const target=new Date(Date.UTC(y,m-1+months,1));
    const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
    return `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,"0")}-${String(Math.min(d,last)).padStart(2,"0")}`;
  };
  const defaultSchedule = (amount:number,count:number,start:string):ScheduleItem[] => {
    const cents=Math.round(amount*100),base=Math.floor(cents/count);
    return Array.from({length:count},(_,i)=>({date:addMonthsToDate(start,i),amount:((i===count-1?cents-base*(count-1):base)/100).toFixed(2)}));
  };
  const loadSchedules = async () => {
    const {data:terms,error}=await supabase.from("class_payment_terms").select("id,charge_id,payment_mode,installments_count,card_brand,card_transaction_reference,card_fee_amount");
    if(error) throw error;
    const [dues,cards]=await Promise.all([
      supabase.from("class_due_installments").select("payment_terms_id,installment_number,due_date,amount"),
      supabase.from("class_card_receivables").select("id,payment_terms_id,installment_number,expected_date,gross_amount,fee_amount,received_at,received_amount")
    ]);
    if(dues.error||cards.error) throw dues.error||cards.error;
    setTermsByCharge(Object.fromEntries((terms||[]).map(t=>[t.charge_id,t as PaymentTerms])));
    setDueItems((dues.data||[]) as DueItem[]);
    setCardItems((cards.data||[]) as CardItem[]);
  };
  const openSchedule = (c:{id:string;amount:number;plan_start_date:string|null}) => {
    const term=termsByCharge[c.id];
    const mode:PaymentMode=term?.payment_mode === "cartao_maquininha" ? "integral" : (term?.payment_mode || "integral");
    const items=term && mode!=="integral" ? dueItems.filter(i=>i.payment_terms_id===term.id).sort((a,b)=>a.installment_number-b.installment_number).map(i=>({date:i.due_date,amount:Number(i.amount).toFixed(2)})) : [];
    setScheduleChargeId(c.id);setScheduleMode(mode);
    setScheduleItems(items.length?items:defaultSchedule(c.amount,1,c.plan_start_date||getBrazilDateString()));
    setScheduleCardBrand(term?.card_brand||"");setScheduleCardRef(term?.card_transaction_reference||"");
    setScheduleFee(String(term?.card_fee_amount||0));setScheduleError("");
  };
  const handleSaveSchedule = async () => {
    if(!scheduleChargeId||scheduleSaving) return;
    if (!monthlyEnrollment || !isActiveEnrollment(monthlyEnrollment.status)) {setScheduleError("Somente matrículas ativas permitem editar vencimentos.");return;}
    const charge=monthlyHistory.find(c=>c.id===scheduleChargeId);
    if(!charge) return;
    const values=scheduleItems.map(i=>({date:i.date,amount:moneyNum(i.amount)}));
    const valid=values.length>0 && values.every(i=>/^\d{4}-\d{2}-\d{2}$/.test(i.date) && Number.isFinite(i.amount) && i.amount>0 && Math.abs(i.amount*100-Math.round(i.amount*100))<0.00001);
    if(!valid || Math.abs(values.reduce((n,i)=>n+i.amount,0)-charge.amount)>0.009) {
      setScheduleError("Preencha datas e valores positivos. A soma deve corresponder exatamente ao contratado.");return;
    }
    setScheduleSaving(true);setScheduleError("");
    try {
      const {error}=await supabase.rpc("configure_class_payment_schedule",{
        p_charge_id:scheduleChargeId,p_mode:scheduleMode,p_installments:values,
        p_card_brand:null,
        p_card_reference:null,
        p_card_fee:0,p_notes:null
      });
      if(error) throw error;
      await loadSchedules();setScheduleChargeId(null);
      setMonthlyError("Cronograma salvo. Os vencimentos foram atualizados sem criar novos recebimentos.");
    }catch(err:any){setScheduleError(`Não foi possível salvar: ${err?.message||"tente novamente"}`);}
    finally{setScheduleSaving(false);}
  };
  const [monthlySaving, setMonthlySaving] = useState(false);
  const [monthlyError, setMonthlyError] = useState("");
  const [classModalFees, setClassModalFees] = useState<Array<{payment_id:string;fee_amount:number;fee_percent:number;installments:number}>>([]);
  const [classModalFeesLoading, setClassModalFeesLoading] = useState(false);
  const [classModalFeesError, setClassModalFeesError] = useState("");
  const loadClassModalFees = async (paymentIds:string[]) => {
    setClassModalFeesLoading(true);
    setClassModalFeesError("");
    try {
      if (!paymentIds.length) { setClassModalFees([]); return; }
      const {data,error} = await supabase.from("financial_card_details")
        .select("payment_id,fee_amount,fee_percent,installments")
        .eq("source_type","aula").in("payment_id",paymentIds);
      if(error) throw error;
      setClassModalFees((data||[]).map(f=>({payment_id:String(f.payment_id),fee_amount:Number(f.fee_amount),fee_percent:Number(f.fee_percent),installments:Number(f.installments)})));
    } catch(err:any) {
      setClassModalFeesError(`Não foi possível carregar taxas financeiras: ${err?.message||"erro desconhecido"}`);
      setClassModalFees([]);
    } finally { setClassModalFeesLoading(false); }
  };
  const [monthlyHistoryLoading, setMonthlyHistoryLoading] = useState(false);
  const [monthlyHistory, setMonthlyHistory] = useState<Array<{
    id:string; reference_month:string; plan_start_date:string|null; plan_end_date:string|null; amount:number; received:number; cancelled:number;
    payments:Array<{id:string;amount:number;payment_method:string;created_at:string}>;
  }>>([]);
  const [terminationEnrollment, setTerminationEnrollment] = useState<ClassEnrollment | null>(null);
  const [terminationMode, setTerminationMode] = useState<"zerar_saldo" | "manter_saldo">("zerar_saldo");
  const [terminationReason, setTerminationReason] = useState("");
  const [terminationLossAmount, setTerminationLossAmount] = useState("0");
  const [terminationSaving, setTerminationSaving] = useState(false);
  const [terminationError, setTerminationError] = useState("");

  const readPlanHistory = async (en: ClassEnrollment) => {
    setMonthlyHistoryLoading(true);
    try {
      const { data: charges, error } = await supabase.from("class_charges")
        .select("id,reference_month,plan_start_date,plan_end_date,amount").eq("enrollment_id", en.id)
        .eq("charge_type", "mensalidade").order("reference_month", { ascending: false });
      if (error) throw error;
      const ids = (charges || []).map(c => c.id);
      const [paymentsResult, adjustmentsResult] = await Promise.all([
        ids.length ? supabase.from("class_payments").select("id,charge_id,amount,payment_method,created_at").in("charge_id", ids).order("created_at", {ascending: true}) : Promise.resolve({data:[],error:null}),
        ids.length ? supabase.from("class_balance_adjustments").select("charge_id,amount,adjustment_type").in("charge_id", ids) : Promise.resolve({data:[],error:null}),
      ]);
      if (paymentsResult.error || adjustmentsResult.error) throw (paymentsResult.error || adjustmentsResult.error);
       await loadClassModalFees((paymentsResult.data||[]).map(p=>String(p.id)));
      setMonthlyHistory((charges || []).map(c => ({
        id: c.id, reference_month: c.reference_month, plan_start_date: c.plan_start_date, plan_end_date: c.plan_end_date, amount: Number(c.amount),
        received: (paymentsResult.data || []).filter(p => p.charge_id === c.id).reduce((n,p) => n + Number(p.amount),0),
        cancelled: (adjustmentsResult.data || []).filter(a => a.charge_id === c.id).reduce((n,a) => n + Number(a.amount),0),
        payments: (paymentsResult.data || []).filter(p => p.charge_id === c.id).map(p => ({id:p.id,amount:Number(p.amount),payment_method:p.payment_method,created_at:p.created_at})),
      })));
    } catch (err:any) {
      setMonthlyError(`Erro ao carregar histórico: ${err?.message || "tente novamente"}`);
    } finally { setMonthlyHistoryLoading(false); }
  };

  const openMonthlyModal = async (en: ClassEnrollment) => {
    setMonthlyEnrollment(en);
    setMonthlyReference(getBrazilDateString());
    setMonthlyChargeAmount(String(en.total_price));
    setMonthlyPaidAmount("");
    setMonthlyMethod("pix");setMonthlyCreditFee("0");setMonthlyCreditInstallments("1");
    setMonthlyError("");
    setMonthlyHistory([]);
    setClassModalFees([]);
    await Promise.all([readPlanHistory(en),loadSchedules().catch(err=>setMonthlyError(`Não foi possível carregar vencimentos: ${err?.message||"erro"}`))]);
  };

  const handleCreateMonthlyCharge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!monthlyEnrollment || monthlySaving) return;
    const charge = Number(monthlyChargeAmount.replace(",", "."));
    const paid = monthlyPaidAmount.trim() === "" ? 0 : Number(monthlyPaidAmount.replace(",", "."));
    const existing = monthlyHistory[0];
    if (!isActiveEnrollment(monthlyEnrollment.status) && monthlyEnrollment.status!=="encerrada") {setMonthlyError("Matrícula não ativa: pagamento bloqueado.");return;}
    if (monthlyEnrollment.status==="encerrada" && !existing) {setMonthlyError("Contrato encerrado sem cobrança a receber.");return;}
    const remaining = existing ? Math.max(0, Math.round((existing.amount - existing.received - existing.cancelled)*100)/100) : charge;
    if (existing && remaining<=0.009) {setMonthlyError("Saldo quitado ou encerrado. Não é possível registrar novo pagamento.");return;}
    const validMoney = (n:number) => Number.isFinite(n) && Math.abs(Math.round(n*100)-n*100) < 0.000001;
    if ((!existing && (!/^\d{4}-\d{2}-\d{2}$/.test(monthlyReference) || !validMoney(charge) || charge <= 0)) ||
        !validMoney(paid) || paid < 0 || paid > remaining || (existing && paid <= 0)) {
      setMonthlyError("Confira o valor informado. O pagamento não pode superar o saldo pendente."); return;
    }
    if(paid>0&&["credito","debito"].includes(monthlyMethod)&&!creditValid(monthlyCreditFee,monthlyCreditInstallments)){setMonthlyError("Taxa ou parcelas do cartão inválidas.");return;}
    setMonthlySaving(true); setMonthlyError("");
    try {
      const {error} = existing
        ? await supabase.rpc("register_class_plan_payment", {p_charge_id:existing.id,p_amount:paid,p_payment_method:monthlyMethod})
        : await supabase.rpc("create_class_plan_charge_dated", {
            p_enrollment_id:monthlyEnrollment.id,p_start_date:monthlyReference,
            p_charge_amount:charge,p_paid_amount:paid,p_payment_method:paid>0?monthlyMethod:null,
          });
      if (error) throw error;
      if(paid>0&&["credito","debito"].includes(monthlyMethod)) {
        const {data:chargeRows,error:chargeError}=await supabase.from("class_charges").select("id").eq("enrollment_id",monthlyEnrollment.id).eq("charge_type","mensalidade").order("created_at",{ascending:false}).limit(1);
        if(chargeError||!chargeRows?.length)throw new Error("Cobrança salva, mas não foi possível identificar a transação. Confira antes de repetir.");
        const chargeId=existing?.id||chargeRows[0].id;
        const {data:payRows,error:payError}=await supabase.from("class_payments").select("id,amount").eq("charge_id",chargeId).eq("payment_method",monthlyMethod).order("created_at",{ascending:false}).limit(1);
        if(payError||!payRows?.length||Math.abs(Number(payRows[0].amount)-paid)>0.009)throw new Error("Pagamento salvo, mas taxa não vinculada. Confira o histórico antes de repetir.");
        await saveCardDetail("aula",String(payRows[0].id),paid,monthlyCreditFee,monthlyMethod==="debito"?"1":monthlyCreditInstallments);
      }
      setMonthlyPaidAmount("");
      await readPlanHistory(monthlyEnrollment);
      await loadClassFinancialSummary();
      setMonthlyError(existing ? "Pagamento registrado com sucesso." : "Cobrança do plano registrada com sucesso.");
    } catch(err:any) { setMonthlyError(`Não foi possível registrar: ${err?.message || "tente novamente"}`); }
    finally { setMonthlySaving(false); }
  };

  const handleTerminateEnrollment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!terminationEnrollment || terminationSaving) return;
    if (!terminationReason.trim()) {setTerminationError("Informe o motivo do encerramento."); return;}
    const financial = classFinancialSummary[terminationEnrollment.id];
    if (!financial || classFinancialLoading || classFinancialLoadError) {setTerminationError("Saldo indisponível. Atualize os dados antes de encerrar.");return;}
    const pending = Math.max(0, Math.round((financial.contracted-financial.received-financial.cancelled)*100)/100);
    const loss = terminationMode === "zerar_saldo" ? Number(terminationLossAmount.replace(",",".")) : 0;
    if (terminationMode === "zerar_saldo" && (!terminationLossAmount.trim() || !Number.isFinite(loss) || loss < 0 || loss > pending || Math.abs(loss*100-Math.round(loss*100))>0.00001)) {
      setTerminationError(`Informe uma perda entre R$ 0,00 e ${formatCurrency(pending)}.`);return;
    }
    if (!window.confirm(`Encerrar a matrícula de ${terminationEnrollment.student_name}? A vaga será liberada.`)) return;
    setTerminationSaving(true); setTerminationError("");
    try {
      const {error} = await supabase.rpc("terminate_class_enrollment_with_loss", {
        p_enrollment_id:terminationEnrollment.id,p_mode:terminationMode,p_reason:terminationReason.trim(),p_loss_amount:loss,
      });
      if (error) throw error;
      setTerminationEnrollment(null);
      await loadData();
      alert("Matrícula encerrada e vaga liberada com sucesso.");
    } catch(err:any) {setTerminationError(`Não foi possível encerrar: ${err?.message || "tente novamente"}`);}
    finally {setTerminationSaving(false);}
  };

  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInSport, setWalkInSport] = useState("Vôlei de Praia");
  const [walkInCategory, setWalkInCategory] = useState("Iniciante");
  const [walkInClass, setWalkInClass] = useState("");
  const [walkInDate, setWalkInDate] = useState("");
  useEffect(() => { setWalkInDate(getBrazilDateString()); }, []);
  const [walkInAmount, setWalkInAmount] = useState("");
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState("pix");
  const [walkInCreditFee,setWalkInCreditFee]=useState("0");
  const [walkInCreditInstallments,setWalkInCreditInstallments]=useState("1");
  const [walkInSaving, setWalkInSaving] = useState(false);
  const [walkInMessage, setWalkInMessage] = useState("");
  const [walkInSearch, setWalkInSearch] = useState("");
  const [walkInSportFilter, setWalkInSportFilter] = useState("Todas");
  const [walkInStartDate, setWalkInStartDate] = useState("");
  const [walkInEndDate, setWalkInEndDate] = useState("");
  const [walkInSort, setWalkInSort] = useState("recentes");
  const [walkInPageSize, setWalkInPageSize] = useState(5);
  const [walkInPage, setWalkInPage] = useState(1);
  const [selectedWalkIn, setSelectedWalkIn] = useState<ClassChargeRecord | null>(null);
  const [selectedWalkInPayments, setSelectedWalkInPayments] = useState<Array<{id:string; amount:number; payment_method:string; settlement_status:string; created_at:string}>>([]);
  const [walkInDetailError, setWalkInDetailError] = useState("");
  const [walkInDetailLoading, setWalkInDetailLoading] = useState(false);
  const [walkInFees, setWalkInFees] = useState<Array<{payment_id:string;fee_amount:number;fee_percent:number;installments:number}>>([]);
  const [walkInFeesError, setWalkInFeesError] = useState("");
  const walkInReceived = selectedWalkInPayments.reduce((sum, payment) => sum + (payment.settlement_status === "recebido" ? Number(payment.amount || 0) : 0), 0);
  const walkInFeeTotal = selectedWalkInPayments.reduce((sum, payment) => sum + (payment.settlement_status === "recebido" ? Number(walkInFees.find(fee => fee.payment_id === String(payment.id))?.fee_amount || 0) : 0), 0);


  const openWalkInDetail = async (charge: ClassChargeRecord) => {
    setSelectedWalkIn(charge);
    setSelectedWalkInPayments([]);
    setWalkInDetailError("");
    setWalkInFeesError("");
    setWalkInFees([]);
    setWalkInDetailLoading(true);
    const { data, error } = await supabase.from("class_payments")
      .select("id,amount,payment_method,settlement_status,created_at")
      .eq("charge_id", charge.id).order("created_at", { ascending: false });
    if (error) setWalkInDetailError(`Não foi possível consultar o pagamento: ${error.message}`);
    else {
      setSelectedWalkInPayments(data || []);
      const paymentIds = (data || []).map(payment => String(payment.id));
      if (paymentIds.length > 0) {
        const {data: fees, error: feeError} = await supabase.from("financial_card_details")
          .select("payment_id,fee_amount,fee_percent,installments")
          .eq("source_type", "aula").in("payment_id", paymentIds);
        if (feeError) setWalkInFeesError(`Não foi possível consultar as taxas: ${feeError.message}`);
        else setWalkInFees(fees || []);
      }
    }
    setWalkInDetailLoading(false);
  };


   
  const [defaultCapacity, setDefaultCapacity] = useState<number>(12);
  const [classCapacityMap, setClassCapacityMap] = useState<any>({});
  const [selectedSportForCap, setSelectedSportForCap] = useState("Vôlei de Praia");
  const [selectedCategoryForCap, setSelectedCategoryForCap] = useState("Iniciante");
  const [selectedTurmaForCap, setSelectedTurmaForCap] = useState("Segunda e Quarta às 18h");
  const [classLocationCourt, setClassLocationCourt] = useState(allCourts[0].id);
  const [classLocationProfessor, setClassLocationProfessor] = useState("A definir");
  const [classLocationSaving, setClassLocationSaving] = useState(false);
  const [classLocationMessage, setClassLocationMessage] = useState("");
  const [specificCapInput, setSpecificCapInput] = useState("12");
  // Painel somente de consulta: não modifica regras de matrícula ou bloqueios.
  const [occupancyDate, setOccupancyDate] = useState("");
  const [occupancySport, setOccupancySport] = useState("Todas");
  const [occupancyLevel, setOccupancyLevel] = useState("Todos");
  const [occupancyClass, setOccupancyClass] = useState("Todas");
  const [agendaDay, setAgendaDay] = useState<number | null>(null);
  const [occupancyDetails, setOccupancyDetails] = useState<string | null>(null);
  const [occupancyExpanded, setOccupancyExpanded] = useState(true);
  const [occupancyPageSize, setOccupancyPageSize] = useState(5);
  const [occupancyPage, setOccupancyPage] = useState(1);
  const [weeklyAgendaExpanded, setWeeklyAgendaExpanded] = useState(true);
  useEffect(() => { setOccupancyDate(getBrazilDateString()); }, []);


  const [classPricesMap, setClassPricesMap] = useState<any>({
    "Vôlei de Praia": { mensal: 200, trimestral: 540, semestral: 960 },
    "Beach Tennis": { mensal: 200, trimestral: 540, semestral: 960 },
    "Futevôlei": { mensal: 200, trimestral: 540, semestral: 960 },
    "Futebol Society": { mensal: 200, trimestral: 540, semestral: 960 }
  });

  const [manualStudentName, setManualStudentName] = useState("");
  const [manualStudentPhone, setManualStudentPhone] = useState("");
  const [manualStudentSport, setManualStudentSport] = useState("Vôlei de Praia");
  const [manualStudentCategory, setManualStudentCategory] = useState("Iniciante");
  const [manualStudentPlan, setManualStudentPlan] = useState<"mensal" | "trimestral" | "semestral">("mensal");
  const [manualStudentOption, setManualStudentOption] = useState("Segunda e Quarta às 18h");
  const [manualStudentSaving, setManualStudentSaving] = useState(false);
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualPaymentMode, setManualPaymentMode] = useState<"integral" | "parcelado_arena">("integral");
  const [manualInstallmentCount, setManualInstallmentCount] = useState(1);
  const [manualInstallments, setManualInstallments] = useState<{date: string; amount: string}[]>([]);
  const [manualInitialPayments, setManualInitialPayments] = useState<{amount: string; method: string; notes: string; feePercent: string; installments: number}[]>([]);
  const [manualCardFeePercent, setManualCardFeePercent] = useState("0");
  const [manualCardBrand, setManualCardBrand] = useState("");
  const [manualCardReference, setManualCardReference] = useState("");
  const [manualFinanceNotes, setManualFinanceNotes] = useState("");
  const [manualFinanceModalOpen, setManualFinanceModalOpen] = useState(false);
  const manualPlanAmount = Number(classPricesMap[manualStudentSport]?.[manualStudentPlan] ?? ({mensal:200,trimestral:540,semestral:960}[manualStudentPlan]));
  const manualMoney = (v: string) => Number(v.replace(",", "."));
  const manualAddMonths = (iso: string, months: number) => {
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return getBrazilDateString();
    const first = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return `${first.getUTCFullYear()}-${String(first.getUTCMonth()+1).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
  };
  const manualReceivedCents = manualInitialPayments.reduce((sum,p)=>sum+(Math.round((Number(p.amount.replace(",","."))||0)*100)),0);
  // Resumo visual dos recebimentos iniciais, sem alterar valores enviados à API.
  const manualInitialFeeCents = manualInitialPayments.reduce((sum, payment) => {
    if (payment.method !== "credito" && payment.method !== "debito") return sum;
    const gross = manualMoney(payment.amount);
    const percent = manualMoney(payment.feePercent);
    if (!Number.isFinite(gross) || !Number.isFinite(percent)) return sum;
    return sum + Math.round(gross * percent);
  }, 0);
  const manualInitialNetCents = manualReceivedCents - manualInitialFeeCents;

  useEffect(() => {
    const n = manualPaymentMode === "integral" ? 1 : manualInstallmentCount;
    const paid = manualInitialPayments.reduce((sum,p)=>sum+(Number(p.amount.replace(",","."))||0),0);
    const cents = Math.max(0, Math.round((manualPlanAmount - paid) * 100));
    if (!Number.isFinite(cents) || cents <= 0) { setManualInstallments([]); return; }
    const each = Math.floor(cents / n);
    setManualInstallments(Array.from({length:n}, (_,i) => ({
      date: manualAddMonths(manualStartDate, i),
      amount: ((i === n-1 ? cents - each*(n-1) : each)/100).toFixed(2)
    })));
  }, [manualPlanAmount, manualPaymentMode, manualInstallmentCount, manualStartDate, manualReceivedCents]);


  const [editingStudent, setEditingStudent] = useState<ClassEnrollment | null>(null);
  const [newStudentOption, setNewStudentOption] = useState("");

  const [bookingSportFilter, setBookingSportFilter] = useState<string>("Todos");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"Todos" | "Confirmada" | "Cancelada" | "Finalizada">("Todos");
  const [classSportFilter, setClassSportFilter] = useState<string>("Todos");
  const [enrollmentsExpanded, setEnrollmentsExpanded] = useState(true);
  const [enrollmentPageSize, setEnrollmentPageSize] = useState(5);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [expandedEnrollmentId, setExpandedEnrollmentId] = useState<string | null>(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<ConsolidatedBooking | null>(null);
  const [bookingPageSize, setBookingPageSize] = useState(10);
  const [bookingPage, setBookingPage] = useState(1);
  const [classFinancialFilter, setClassFinancialFilter] = useState("todos");
  const [classEnrollmentStatusFilter, setClassEnrollmentStatusFilter] = useState("todos");
  // Filtro por data de cadastro da matrícula (fuso da arena).
  const [enrollmentPeriodType, setEnrollmentPeriodType] = useState<"day" | "month" | "year" | "all" | "custom">("all");
  const [enrollmentPeriodDay, setEnrollmentPeriodDay] = useState("");
  const [enrollmentPeriodMonth, setEnrollmentPeriodMonth] = useState("");
  const [enrollmentPeriodYear, setEnrollmentPeriodYear] = useState("");
  const [enrollmentPeriodStart, setEnrollmentPeriodStart] = useState("");
  const [enrollmentPeriodEnd, setEnrollmentPeriodEnd] = useState("");
  // Etapa 17 — filtros independentes para o estoque de pendências.
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingOrigin, setPendingOrigin] = useState<"Todos" | "Reservas" | "Aulas">("Todos");
  const [pendingSport, setPendingSport] = useState("Todas");
  const [pendingPeriod, setPendingPeriod] = useState<"all" | "month" | "custom">("all");
  const [pendingMonth, setPendingMonth] = useState("");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const [pendingSort, setPendingSort] = useState("maior");
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [reportLedger, setReportLedger] = useState<{charges:Array<{id:string;enrollment_id:string|null;amount:number;created_at:string;charge_type:string;sport:string;student_name:string;student_phone:string;class_name:string;class_date:string|null}>;payments:Array<{id:string;charge_id:string;amount:number;created_at:string}>;adjustments:Array<{charge_id:string;amount:number;created_at:string;adjustment_type:string}>}>({charges:[],payments:[],adjustments:[]});
  const [reportLedgerError, setReportLedgerError] = useState("");
  const [reportLedgerLoading, setReportLedgerLoading] = useState(false);
  const [classFinancialSummary, setClassFinancialSummary] = useState<Record<string, { contracted: number; received: number; cancelled: number; chargeCount: number }>>({});
  const [classFinancialLoading, setClassFinancialLoading] = useState(false);
  const [classFinancialLoadError, setClassFinancialLoadError] = useState("");

  const [reportTypeFilter, setReportTypeFilter] = useState<"Todos" | "Reservas" | "Aulas">("Todos");
  const [reportSportFilter, setReportSportFilter] = useState<string>("Todas");
  const [reportPeriodType, setReportPeriodType] = useState<"month" | "year" | "all" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [bookingPeriodType, setBookingPeriodType] = useState<"day" | "month" | "year" | "all" | "custom">("day");
  const [selectedBookingDay, setSelectedBookingDay] = useState("");
  const [selectedBookingMonth, setSelectedBookingMonth] = useState("");
  const [selectedBookingYear, setSelectedBookingYear] = useState("");
  const [customBookingStart, setCustomBookingStart] = useState("");
  const [customBookingEnd, setCustomBookingEnd] = useState("");

  const shiftBookingPeriod = (direction: -1 | 1) => {
    if (bookingPeriodType === "day" && selectedBookingDay) {
      const [y, m, d] = selectedBookingDay.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + direction));
      setSelectedBookingDay(next.toISOString().slice(0, 10));
    } else if (bookingPeriodType === "month" && selectedBookingMonth) {
      const [y, m] = selectedBookingMonth.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1 + direction, 1));
      setSelectedBookingMonth(next.toISOString().slice(0, 7));
    } else if (bookingPeriodType === "year" && selectedBookingYear) {
      setSelectedBookingYear(String(Number(selectedBookingYear) + direction));
    }
  };

  const [managerEmail, setManagerEmail] = useState("ctvivaesportes@uorak.com");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [adminList, setAdminList] = useState<any[]>([]);

  const [gridDate, setGridDate] = useState("");
  const [todayString, setTodayString] = useState("");
  const [retroactiveAuthorizedDate, setRetroactiveAuthorizedDate] = useState<string | null>(null);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [selectedClassDetail, setSelectedClassDetail] = useState<{
    sport: string; category: string; schedule: string; dayName: string; time: string;
    professor: string; court: string; status: string;
  } | null>(null);
  const [modalCourt, setModalCourt] = useState<Court | null>(null);
  const [modalTime, setModalTime] = useState("");
   
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickCustomerEmail, setQuickCustomerEmail] = useState("");
  const [quickPrice, setQuickPrice] = useState("50");
  const [quickSport, setQuickSport] = useState("Beach Tennis");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [quickPaymentMode, setQuickPaymentMode] = useState<"later" | "now">("later");
  const [quickPaymentAmount, setQuickPaymentAmount] = useState("");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("pix");
  const [quickPaymentNotes, setQuickPaymentNotes] = useState("");
  const [quickCardFee, setQuickCardFee] = useState("0");
  const [quickCardInstallments, setQuickCardInstallments] = useState("1");
  const [quickCreatedCode, setQuickCreatedCode] = useState<string | null>(null);

  const [lockTargetType, setLockTargetType] = useState<"weekly" | "date">("weekly");
  const [selectedCourtId, setSelectedCourtId] = useState(allCourts[0].id);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [selectedLockDate, setSelectedLockDate] = useState("");
  const [selectedLockTime, setSelectedLockTime] = useState("18:00");
  const [lockReason, setLockReason] = useState("Treino Fixo / Turma");
  const [bulkSport, setBulkSport] = useState("Beach Tennis");
  const [bulkProfessor, setBulkProfessor] = useState("Professor João");
  const [bulkLevel, setBulkLevel] = useState("Iniciante");
  const [bulkVigencia, setBulkVigencia] = useState("indeterminado");

  const [priceSocietyPromo, setPriceSocietyPromo] = useState("60");
  const [priceSocietyNormal, setPriceSocietyNormal] = useState("80");
  const [priceAreiaPromo, setPriceAreiaPromo] = useState("40");
  const [priceAreiaNormal, setPriceAreiaNormal] = useState("60");

  // Estados dinâmicos de Promoção / Happy Hour
  const [promoEnabled, setPromoEnabled] = useState(true);
  const [promoStartHour, setPromoStartHour] = useState("16:00");
  const [promoEndHour, setPromoEndHour] = useState("19:00");

  const [upgradeVolleyEnabled, setUpgradeVolleyEnabled] = useState(true);
  const [upgradeVolleyPrice, setUpgradeVolleyPrice] = useState("10.00");
  const [upgradeBeachTennisEnabled, setUpgradeBeachTennisEnabled] = useState(true);
  const [upgradeBeachTennisPrice, setUpgradeBeachTennisPrice] = useState("10.00");
  const [upgradeSocietyEnabled, setUpgradeSocietyEnabled] = useState(true);
  const [upgradeSocietyPrice, setUpgradeSocietyPrice] = useState("15.00");

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percent" | "fixed">("percent");
  const [newCouponValue, setNewCouponValue] = useState("10");
  const [newCouponScope, setNewCouponScope] = useState<"quadras" | "aulas" | "ambos">("ambos");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const shiftOccupancyDate = (direction: -1 | 1) => {
    if (!occupancyDate) return;
    const [year, month, day] = occupancyDate.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + direction));
    setOccupancyDate(next.toISOString().slice(0, 10));
    setOccupancyPage(1);
    setOccupancyDetails(null);
  };

  const changeDateByDays = (days: number) => {
    if (!gridDate) return;
    const parts = gridDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setGridDate(`${year}-${month}-${day}`);
  };

  // Cada horário representa uma sessão de 60 minutos, no fuso da arena.
  const arenaNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const part = (key: string) => parts.find(p => p.type === key)?.value || "00";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  };
  const slotHasEnded = (date: string, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const endHour = hour + 1;
    const endDate = endHour >= 24 ? (() => {
      const [y, m, d] = date.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + 1));
      return next.toISOString().slice(0, 10);
    })() : date;
    const endTime = `${String(endHour % 24).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}`;
    return `${endDate}T${endTime}` <= arenaNow();
  };
  const isPastDate = !!gridDate && !!todayString && gridDate < todayString;
  const retroactiveEnabled = isPastDate && retroactiveAuthorizedDate === gridDate;
  const canCreateOnGridDate = !isPastDate || retroactiveEnabled;

  const handleWalkInCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (walkInSaving) return;
    setWalkInMessage("");
    const amount = Number(walkInAmount.replace(",", "."));
    const acceptedWalkInMethods = ["pix", "dinheiro", "debito", "credito", "wellhub", "totalpass"];
    if (!acceptedWalkInMethods.includes(walkInPaymentMethod)) {
      setWalkInMessage("A participação avulsa exige uma forma de pagamento já recebida.");
      return;
    }
    if (!walkInName.trim() || !walkInPhone.trim() || !walkInClass.trim() || !walkInDate ||
        !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100 && Math.abs(Math.round(amount * 100) - amount * 100) > 0.00001) {
      setWalkInMessage("Preencha nome, telefone, turma, data e valor válido.");
      return;
    }
    if(["credito","debito"].includes(walkInPaymentMethod)&&!creditValid(walkInCreditFee,walkInCreditInstallments)){setWalkInMessage("Taxa ou parcelas do cartão inválidas.");return;}
    setWalkInSaving(true);
    try {
      const { data: chargeId, error } = await supabase.rpc("create_class_walkin_with_payment", {
        p_student_name: walkInName.trim(),
        p_student_phone: walkInPhone.trim(),
        p_sport: walkInSport,
        p_class_name: walkInClass.trim(),
        p_class_date: walkInDate,
        p_amount: amount,
        p_payment_method: walkInPaymentMethod,
      });
      if (error) throw error;
      if(["credito","debito"].includes(walkInPaymentMethod)) {
        const {data:pay,error:payError}=await supabase.from("class_payments").select("id").eq("charge_id",String(chargeId)).eq("payment_method",walkInPaymentMethod).order("created_at",{ascending:false}).limit(1).maybeSingle();
        if(payError||!pay) throw new Error("Avulso registrado, mas não foi possível identificar pagamento para registrar a taxa. Verifique antes de repetir.");
        await saveCardDetail("aula",String(pay.id),amount,walkInCreditFee,walkInPaymentMethod==="debito"?"1":walkInCreditInstallments);
      }
      setClassCharges(prev => [{
        id: chargeId as string, student_name: walkInName.trim(),
        student_phone: walkInPhone.trim(), sport: walkInSport,
        class_name: walkInClass.trim(), class_date: walkInDate,
        amount, charge_type: "avulsa", status: "ativa",
      }, ...prev]);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInAmount("");
      setWalkInMessage("Participação avulsa cadastrada com pagamento integral recebido.");
    } catch (err: any) {
      setWalkInMessage(`Erro ao cadastrar avulso: ${err?.message || "tente novamente"}`);
    } finally {
      setWalkInSaving(false);
    }
  };

  const filteredWalkIns = classCharges.filter(charge => {
    const q = walkInSearch.trim().toLocaleLowerCase("pt-BR");
    return (!q || [charge.student_name, charge.student_phone, charge.sport, charge.class_name].some(v => (v || "").toLocaleLowerCase("pt-BR").includes(q)))
      && (walkInSportFilter === "Todas" || charge.sport === walkInSportFilter)
      && (!walkInStartDate || (charge.class_date || "") >= walkInStartDate)
      && (!walkInEndDate || (charge.class_date || "") <= walkInEndDate);
  }).sort((a,b) => {
    if (walkInSort === "nome") return a.student_name.localeCompare(b.student_name, "pt-BR");
    const cmp = (a.class_date || "").localeCompare(b.class_date || "");
    return walkInSort === "antigos" ? cmp : -cmp;
  });
  const walkInTotalPages = Math.max(1, Math.ceil(filteredWalkIns.length / walkInPageSize));
  const currentWalkInPage = Math.min(walkInPage, walkInTotalPages);
  const visibleWalkIns = filteredWalkIns.slice((currentWalkInPage - 1) * walkInPageSize, currentWalkInPage * walkInPageSize);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: bData } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (bData) {
        setBookings(bData.map((b) => ({
          id: b.id,
          code: b.code,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
          customerEmail: b.customer_email || undefined,
          courtId: b.court_id,
          courtName: b.court_name,
          sport: b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis"),
          date: b.booking_date,
          time: b.booking_time,
          price: Number(b.price),
          channel: b.channel as "online" | "manual",
          paymentMethod: b.payment_method,
          status: b.status as BookingRecord["status"],
          createdAt: b.created_at,
        })));
      }

       const [{ data: payData, error: payError }, { data: adjustmentData, error: adjustmentError }] = await Promise.all([
         supabase.from("booking_payments").select("*").order("created_at", { ascending: true }),
         supabase.from("booking_balance_adjustments").select("*").order("created_at", { ascending: true }),
       ]);
       if (payError || adjustmentError) {
         console.error("Falha ao consultar lançamentos financeiros", payError, adjustmentError);
         setFinancialError("Não foi possível consultar os lançamentos financeiros. Verifique as permissões RLS.");
       } else {
         setFinancialError("");
         setBookingPayments((payData || []) as BookingPayment[]);
         setBookingAdjustments((adjustmentData || []) as BookingAdjustment[]);
       }

       const { data: lData } = await supabase.from("court_locks").select("*");
      if (lData) setCloudLocks(lData);
      const [scheduleResult, exceptionResult] = await Promise.all([
        supabase.from("class_schedules").select("id,sport,category,class_name,professor,court_id,day_of_week,class_time,active"),
        supabase.from("class_schedule_exceptions").select("schedule_id,class_date,reason"),
      ]);
      if (scheduleResult.error || exceptionResult.error) {
        console.error("Erro ao carregar turmas cadastradas", scheduleResult.error, exceptionResult.error);
        setClassExceptionError("Não foi possível carregar as turmas ou seus cancelamentos.");
      } else {
        setRegisteredClasses((scheduleResult.data || []) as ClassScheduleRecord[]);
        setClassExceptions((exceptionResult.data || []) as ClassExceptionRecord[]);
      }

      const { data: cData } = await supabase.from("coupons").select("*");
      if (cData) {
        setCoupons(cData.map(c => ({
          ...c,
          scope: c.scope || "ambos"
        })));
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setBookingAddons([]);
        setBookingAddonsError("Sessão administrativa indisponível para consultar adicionais.");
        console.error("Sessão administrativa indisponível para consultar matrículas.", sessionError);
        setEnrollments([]);
      } else {
        try {
          const response = await fetch("/api/admin/bookings", {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok || !result.success || !Array.isArray(result.addons)) {
            throw new Error(result.error || "Resposta inválida da API de adicionais.");
          }
          setBookingAddons(result.addons.map((addon: BookingAddon) => ({
            ...addon, addon_price: Number(addon.addon_price),
          })));
          setBookingAddonsError("");
          setBookingClosures((result.closures || []).map((c: any) => ({...c, loss_amount: Number(c.loss_amount)})));
          setBookingClosuresError("");
        } catch (addonError) {
          console.error("Falha ao carregar adicionais:", addonError);
          setBookingClosuresError("Não foi possível consultar os encerramentos financeiros.");
          setBookingAddons([]);
          setBookingAddonsError("Não foi possível carregar os adicionais. Operações financeiras de reservas temporariamente bloqueadas.");
        }
        try {
          const response = await fetch("/api/admin/enrollments", {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok || !result.success || !Array.isArray(result.enrollments)) {
            throw new Error(result.error || "Resposta inválida da API de matrículas.");
          }
          setEnrollments(result.enrollments as ClassEnrollment[]);
        } catch (enrollmentError) {
          console.error("Não foi possível carregar matrículas:", enrollmentError);
          setEnrollments([]);
        }
      }
      const { data: chargesData, error: chargesError } = await supabase
        .from("class_charges").select("*").eq("charge_type", "avulsa")
        .order("class_date", { ascending: false });
      if (chargesError) console.error("Falha ao carregar avulsos", chargesError);
      else setClassCharges((chargesData || []) as ClassChargeRecord[]);


      const { data: adminData } = await supabase.from("admin_users").select("id,name,email,role,auth_user_id");
      if (adminData && adminData.length > 0) {
        setAdminList(adminData);
      }

      const { data: settingsData } = await supabase.from("arena_settings").select("*").single();
      if (settingsData) {
        if (settingsData.manager_email) {
          setManagerEmail(settingsData.manager_email);
        }
        if (settingsData.upgrades) {
          const up = settingsData.upgrades;
          setUpgradeVolleyEnabled(Boolean(up.volleyEnabled)); setUpgradeVolleyPrice(String(up.volleyPrice));
          setUpgradeBeachTennisEnabled(Boolean(up.beachTennisEnabled)); setUpgradeBeachTennisPrice(String(up.beachTennisPrice));
          setUpgradeSocietyEnabled(Boolean(up.societyEnabled)); setUpgradeSocietyPrice(String(up.societyPrice));
          
          if (up.promo) {
            setPromoEnabled(Boolean(up.promo.enabled));
            if (up.promo.startHour) setPromoStartHour(up.promo.startHour);
            if (up.promo.endHour) setPromoEndHour(up.promo.endHour);
          }
        }
        if (settingsData.class_capacity) {
          setDefaultCapacity(Number(settingsData.class_capacity));
        }
        if (settingsData.class_capacity_map) {
          setClassCapacityMap(settingsData.class_capacity_map);
        }
        if (settingsData.class_prices && Object.keys(settingsData.class_prices).length > 0) {
          setClassPricesMap(settingsData.class_prices);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const today = getBrazilDateString();
    setTodayString(today);
    setManualStartDate(today);
    setGridDate(today);
    setSelectedLockDate(today);

    setPendingMonth(today.substring(0, 7));
    setSelectedMonth(today.substring(0, 7));
    setSelectedYear(today.substring(0, 4));

    setSelectedBookingDay(today);
    setSelectedBookingMonth(today.substring(0, 7));
    setSelectedBookingYear(today.substring(0, 4));
    setEnrollmentPeriodDay(today);
    setEnrollmentPeriodMonth(today.substring(0, 7));
    setEnrollmentPeriodYear(today.substring(0, 4));

    // A sessão é restaurada somente se a identidade estiver vinculada a um gestor.
    let alive = true;
    const validateSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { setIsAuthenticated(false); setCheckingSession(false); return; }
      const { data: admin, error } = await supabase.from("admin_users")
        .select("id,role").eq("auth_user_id", user.id).maybeSingle();
      if (!alive) return;
      if (error || !admin) {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        await loadData();
      }
      setCheckingSession(false);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetMode(true);
        setCheckingSession(false);
      } else if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setCheckingSession(false);
      }
    });
    void validateSession();
    const clockInterval = window.setInterval(() => {
      setClockTick(t => t + 1);
      setTodayString(getBrazilDateString());
    }, 60000);

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_settings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_users" }, () => loadData())
      .subscribe();

    return () => { alive = false; subscription.unsubscribe(); window.clearInterval(clockInterval); supabase.removeChannel(channel); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(), password: loginPin,
    });
    setLoginPin("");
    if (error || !data.user) {
      setLoginError("E-mail ou senha incorretos.");
      return;
    }
    const { data: admin, error: adminError } = await supabase.from("admin_users")
      .select("id,role").eq("auth_user_id", data.user.id).maybeSingle();
    if (adminError || !admin) {
      await supabase.auth.signOut();
      setLoginError("Esta conta não está autorizada como gestor.");
      return;
    }
    setIsAuthenticated(true);
    await loadData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setBookings([]);
    setAdminList([]);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/admin`,
    });
    if (error) { alert("Não foi possível enviar o e-mail de recuperação."); return; }
    setEmailSentSuccess(true);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput.length < 8) { alert("Use uma senha de pelo menos 8 caracteres."); return; }
    const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
    if (error) { alert("Não foi possível atualizar a senha. Solicite outro link."); return; }
    setResetSuccessMsg(true);
    setNewPasswordInput("");
    setResetMode(false);
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    alert("Senha atualizada. Entre novamente com sua nova senha.");
  };

  const filteredBookingsForReport = bookings.filter((b) => {
    if (reportTypeFilter === "Aulas") return false;
    const bookingSport = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
    const matchesSport = reportSportFilter === "Todas" || bookingSport.toLowerCase() === reportSportFilter.toLowerCase();
    if (!matchesSport) return false;

    if (reportPeriodType === "month") {
      if (selectedMonth && !b.date.startsWith(selectedMonth)) return false;
    } else if (reportPeriodType === "year") {
      if (selectedYear && !b.date.startsWith(selectedYear)) return false;
    } else if (reportPeriodType === "custom") {
      if (customStartDate && b.date < customStartDate) return false;
      if (customEndDate && b.date > customEndDate) return false;
    }
    return true;
  });

  const filteredEnrollmentsForReport = enrollments.filter((en) => {
    if (reportTypeFilter === "Reservas") return false;
    const matchesSport = reportSportFilter === "Todas" || en.sport.toLowerCase() === reportSportFilter.toLowerCase();
    if (!matchesSport) return false;
    return true;
  });

  const confirmedBookings = filteredBookingsForReport.filter((b) => b.status === "confirmada");
  const activeEnrollments = filteredEnrollmentsForReport.filter(e => isActiveEnrollment(e.status));
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.price, 0)
    + [...new Set(confirmedBookings.map(b => b.code))].reduce((sum, code) => sum + addonTotal(code), 0)
    + activeEnrollments.reduce((acc, e) => acc + Number(e.total_price), 0);
  const onlineBookingsCount = confirmedBookings.filter((b) => b.channel === "online").length;
  const manualBookingsCount = confirmedBookings.filter((b) => b.channel === "manual").length;
  const cancelledBookingsCount = filteredBookingsForReport.filter((b) => b.status === "cancelada").length;

  const orderedSportsList = getOrderedSports();

  const revenueBySportBookings = orderedSportsList.reduce((acc: { [key: string]: number }, sport) => {
    const sportBookings = confirmedBookings.filter(b => {
      const s = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
      return s.toLowerCase() === sport.toLowerCase();
    });
    acc[sport] = sportBookings.reduce((sum, b) => sum + b.price, 0)
      + [...new Set(sportBookings.map(b => b.code))].reduce((sum, code) => sum + addonTotal(code), 0);
    return acc;
  }, {});

  const revenueBySportEnrollments = orderedSportsList.reduce((acc: { [key: string]: number }, sport) => {
    const sportEnrollments = activeEnrollments.filter(e => e.sport.toLowerCase() === sport.toLowerCase());
    acc[sport] = sportEnrollments.reduce((sum, e) => sum + Number(e.total_price), 0);
    return acc;
  }, {});

  const classCancelledOnDate = (scheduleId: string, date: string) =>
    classExceptions.some(e => e.schedule_id === scheduleId && e.class_date === date);

  const activeClassAt = (courtId: string, time: string, date: string) => {
    const parts = date.split("-").map(Number);
    const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    return registeredClasses.find(c => c.active && c.court_id === courtId &&
      c.class_time === time && c.day_of_week === day && !classCancelledOnDate(c.id, date));
  };

  const changeClassException = async (schedule: ClassScheduleRecord, cancel: boolean) => {
    if (!classExceptionDate || classExceptionBusy) return;
    const parts = classExceptionDate.split("-").map(Number);
    const weekday = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    if (weekday !== schedule.day_of_week) { setClassExceptionError("Escolha uma data correspondente ao dia da turma."); return; }
    if (!window.confirm(cancel ? "Cancelar somente esta aula e liberar a quadra nesta data?" : "Restabelecer esta aula nesta data?")) return;
    setClassExceptionBusy(schedule.id);
    setClassExceptionError("");
    try {
      const { error } = await supabase.rpc("manage_class_schedule_exception", {
        p_schedule_id: schedule.id,
        p_class_date: classExceptionDate,
        p_cancel: cancel,
      });
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      setClassExceptionError(error?.message || "Não foi possível alterar a aula.");
    } finally { setClassExceptionBusy(null); }
  };

  const getSlotStatus = (courtId: string, time: string, dateStr: string) => {
    const booking = bookings.find((b) => b.courtId === courtId && b.date === dateStr && b.time === time && b.status === "confirmada");
    if (booking) {
      const label = booking.customerName;
      return { type: "booked", label, sub: booking.code, channel: booking.channel };
    }

    const parts = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    const lock = cloudLocks.find((l) => l.court_id === courtId && l.lock_time === time &&
      ((l.lock_type === "weekly" && l.day_of_week === dayOfWeek &&
        (!l.class_schedule_id || (registeredClasses.some(c => c.id === l.class_schedule_id && c.active) && !classCancelledOnDate(l.class_schedule_id, dateStr)))) ||
       (l.lock_type === "date" && l.lock_date === dateStr)));
    if (lock) {
      // Prioriza a turma realmente vinculada ao bloqueio; não altera disponibilidade.
      const linkedClass = lock.class_schedule_id
        ? registeredClasses.find(c => c.id === lock.class_schedule_id && c.active)
        : undefined;
      // Para bloqueios antigos sem vínculo, só identifica a aula quando há
      // correspondência única de quadra, dia e horário no cadastro ativo.
      const matchingClasses = !linkedClass && !lock.class_schedule_id
        ? registeredClasses.filter(c => c.active && c.court_id === courtId && c.day_of_week === dayOfWeek && c.class_time.slice(0, 5) === time)
        : [];
      const classInfo = linkedClass || (matchingClasses.length === 1 ? matchingClasses[0] : undefined);
      return {
        type: "locked", label: lock.reason || "Bloqueado",
        sub: lock.class_schedule_id ? "Aula vinculada" : "Bloqueio físico",
        classInfo,
      };
    }

    // A grade de aulas é informativa; somente um bloqueio físico em court_locks impede reserva.
    return { type: "free", label: "+ Livre", sub: "" };
  };

  const handleCellClick = (court: Court, hour: string, statusType: string) => {
    if (!canCreateOnGridDate) return;
    if (statusType !== "free") return;
    setModalCourt(court);
    setModalTime(hour);
     
    const h = parseInt(hour.split(":")[0], 10);
    const startP = parseInt(promoStartHour.split(":")[0], 10);
    const endP = parseInt(promoEndHour.split(":")[0], 10);
    const isPromoSlot = promoEnabled && (h >= startP && h < endP);
    const hasDiscount = isPromoSlot && !isWeekendOrHoliday(gridDate);

    setQuickPrice(court.type === "society" ? (hasDiscount ? priceSocietyPromo : priceSocietyNormal) : (hasDiscount ? priceAreiaPromo : priceAreiaNormal));
    setQuickCustomerName("");
    setQuickCustomerPhone("");
    setQuickSport(court.type === "society" ? "Futebol Society" : "Beach Tennis");
    setQuickError("");
    setQuickPaymentMode("later");
    setQuickPaymentAmount("");
    setQuickPaymentMethod("pix");
    setQuickPaymentNotes("");
    setQuickCardFee("0");
    setQuickCardInstallments("1");
    setQuickCreatedCode(null);
    setSlotModalOpen(true);
  };

  const toggleEntireHourRow = async (time: string) => {
    const parts = gridDate.split("-").map(Number);
    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();

    const allLocked = allCourts.every(c => cloudLocks.some(l => l.court_id === c.id && l.lock_time === time && (l.lock_date === gridDate || l.day_of_week === dayOfWeek)));

    try {
      if (allLocked) {
        for (const c of allCourts) {
          await supabase.from("court_locks").delete().match({ court_id: c.id, lock_time: time, lock_date: gridDate });
        }
      } else {
        for (const c of allCourts) {
          const already = cloudLocks.some(l => l.court_id === c.id && l.lock_time === time && (l.lock_date === gridDate || l.day_of_week === dayOfWeek));
          if (!already) {
            await supabase.from("court_locks").insert([{
              id: `lock-row-${Date.now()}-${c.id}`,
              court_id: c.id,
              lock_type: "date",
              lock_date: gridDate,
              lock_time: time,
              reason: "Horário Fechado / Inativo pelo Gestor"
            }]);
          }
        }
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status do horário.");
    }
  };

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSaving || !modalCourt || !canCreateOnGridDate) return;
    const name = quickCustomerName.trim();
    const phone = quickCustomerPhone.replace(/\D/g, "");
    const email = quickCustomerEmail.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setQuickError("Informe um e-mail válido ou deixe o campo vazio."); return;
    }
    const amount = Number(quickPrice.replace(",", "."));
    const paymentAmount = Number(quickPaymentAmount.replace(",", "."));
    const cardPayment = ["credito", "debito"].includes(quickPaymentMethod);
    if (!quickCreatedCode) {
      if (name.length < 3 || !/^[\p{L}\s'-]+$/u.test(name) || !/^\d{10,11}$/.test(phone)) {
        setQuickError("Informe nome completo e WhatsApp válido com 10 ou 11 dígitos."); return;
      }
      if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
        setQuickError("Informe um valor válido para a reserva."); return;
      }
      if (modalCourt.type === "society" ? quickSport !== "Futebol Society" : !["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"].includes(quickSport)) {
        setQuickError("Modalidade incompatível com a quadra selecionada."); return;
      }
      if (getSlotStatus(modalCourt.id, modalTime, gridDate).type !== "free") {
        setQuickError("Este horário não está mais disponível. Atualize a grade."); return;
      }
    }
    if (quickPaymentMode === "now") {
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > amount || Math.abs(paymentAmount * 100 - Math.round(paymentAmount * 100)) > 0.00001) {
        setQuickError("O pagamento deve ser maior que zero e não pode superar o valor da reserva."); return;
      }
      if (cardPayment && !creditValid(quickCardFee, quickPaymentMethod === "debito" ? "1" : quickCardInstallments)) {
        setQuickError("Informe taxa e parcelamento válidos para o cartão."); return;
      }
    }
    setQuickSaving(true);
    setQuickError("");
    let code = quickCreatedCode;
    try {
      if (!code) {
        code = generateSecureBookingCode();
        const { error } = await supabase.from("bookings").insert({
          id: `manual-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          code,
          customer_name: name,
          customer_phone: phone,
          customer_email: email || null,
          court_id: modalCourt.id,
          court_name: modalCourt.name,
          sport: quickSport,
          booking_date: gridDate,
          booking_time: modalTime,
          price: amount,
          channel: "manual",
          payment_method: "presencial",
          status: "confirmada",
        });
        if (error) throw error;
        setQuickCreatedCode(code);
        // Envio apenas na criação, sem repetir ao concluir pagamentos.
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const response = await fetch("/api/admin/bookings/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ code }),
            });
            if (!response.ok) console.warn("Reserva criada; notificação não enviada:", response.status);
          } else {
            console.warn("Reserva criada; sessão indisponível para notificação.");
          }
        } catch (notificationError) {
          console.warn("Reserva criada; falha na notificação:", notificationError);
        }
      }
      if (quickPaymentMode === "now") {
        // If payment was inserted but the card-fee insert failed, never insert the payment twice.
        const {data: existing, error: lookupError} = await supabase.from("booking_payments")
          .select("id").eq("booking_code", code).eq("notes", `Cadastro grade: ${quickPaymentNotes.trim() || "pagamento presencial"}`).limit(1);
        if (lookupError) throw lookupError;
        if (existing?.length) {
          throw new Error(`Reserva ${code} criada e pagamento já registrado. Confira as taxas na aba 3 antes de tentar novamente.`);
        }
        const {data: insertedPayment, error: paymentError} = await supabase.from("booking_payments").insert({
          booking_code: code, amount: paymentAmount, payment_method: quickPaymentMethod,
          settlement_status: "recebido", notes: `Cadastro grade: ${quickPaymentNotes.trim() || "pagamento presencial"}`,
        }).select("id").single();
        if (paymentError) throw paymentError;
        if (cardPayment && insertedPayment?.id) {
          try {
            await saveCardDetail("reserva", String(insertedPayment.id), paymentAmount, quickCardFee, quickPaymentMethod === "debito" ? "1" : quickCardInstallments);
          } catch (feeError: any) {
            setQuickError(`Reserva ${code} e pagamento registrados, mas a taxa do cartão não foi salva: ${feeError?.message || "erro"}. Confira na aba 3; não repita o pagamento.`);
            await loadData();
            return;
          }
        }
      }
      setSlotModalOpen(false);
      await loadData();
      alert(quickPaymentMode === "now" ? `Reserva ${code} e pagamento registrados com sucesso.` : `Reserva ${code} confirmada com saldo pendente.`);
    } catch (err: any) {
      setQuickError(`Não foi possível concluir: ${err?.message || "tente novamente"}${code && quickCreatedCode ? ` (reserva ${code} já criada; não cadastre novamente)` : ""}`);
    } finally { setQuickSaving(false); }
  };

  const handleManualStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualStudentSaving) return;
    const studentName = manualStudentName.trim();
    const studentPhone = manualStudentPhone.replace(/\D/g, "");
    const availableClasses = classScheduleMap[manualStudentSport]?.[manualStudentCategory] || [];
    if (studentName.length < 3 || !/^\d{10,11}$/.test(studentPhone)) {
      alert("Informe nome com pelo menos 3 caracteres e WhatsApp com 10 ou 11 dígitos."); return;
    }
    if (!availableClasses.includes(manualStudentOption)) {
      alert("Selecione uma turma válida para a modalidade e categoria."); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(manualStartDate)) {
      alert("Informe uma data de início válida."); return;
    }
    if (manualStudentPlan === "mensal" && manualPaymentMode === "parcelado_arena") {
      alert("O plano mensal não permite parcelamento pela arena."); return;
    }
    const initialPayments = manualInitialPayments.map(p => ({
      amount: manualMoney(p.amount), method: p.method, notes: p.notes,
      ...(p.method === "credito" || p.method === "debito" ? {
        feePercent: manualMoney(p.feePercent),
        ...(p.method === "credito" ? { installments: p.installments } : {}),
      } : {}),
    }));
    if (initialPayments.some(p => !Number.isFinite(p.amount) || p.amount <= 0 ||
      Math.abs(Math.round(p.amount * 100) - p.amount * 100) > 0.00001)) {
      alert("Revise os valores dos recebimentos iniciais."); return;
    }
    if (initialPayments.some(p => (p.method === "credito" || p.method === "debito") &&
      (!Number.isFinite(p.feePercent) || p.feePercent! < 0 || p.feePercent! > 100 ||
       Math.abs(Math.round(p.feePercent! * 10000) - p.feePercent! * 10000) > 0.00001))) {
      alert("Informe taxas de cartão válidas entre 0% e 100%."); return;
    }
    if (initialPayments.some(p => p.method === "credito" &&
      (!Number.isInteger(p.installments) || p.installments! < 1 || p.installments! > 12))) {
      alert("O cartão de crédito permite de 1 a 12 parcelas."); return;
    }
    const paidCents = initialPayments.reduce((sum,p)=>sum+Math.round(p.amount*100),0);
    const remainingCents = Math.round(manualPlanAmount*100) - paidCents;
    if (remainingCents < 0) {
      alert("Os recebimentos não podem superar o valor do plano."); return;
    }
    const installments = manualPaymentMode === "parcelado_arena" ?
      manualInstallments.map(i => ({date:i.date,amount:manualMoney(i.amount)})) : [];
    if (manualPaymentMode === "parcelado_arena") {
      if (remainingCents <= 0) {
        alert("Não há saldo pendente para parcelar na arena. Selecione Integral."); return;
      }
      if (!installments.length || installments.some(i => !/^\d{4}-\d{2}-\d{2}$/.test(i.date) ||
        !Number.isFinite(i.amount) || i.amount <= 0 ||
        Math.abs(Math.round(i.amount*100) - i.amount*100) > 0.00001) ||
        installments.reduce((sum,i)=>sum+Math.round(i.amount*100),0) !== remainingCents) {
        alert("A soma dos vencimentos deve corresponder ao saldo pendente após os recebimentos."); return;
      }
    }
    const cardFeePercent = 0; // Compatibilidade com a assinatura anterior da RPC.
    setManualStudentSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error("Sessão expirada. Faça login novamente.");
      const response = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
        body: JSON.stringify({
          studentName, studentPhone, sport: manualStudentSport,
          category: manualStudentCategory, mainClass: manualStudentOption,
          planType: manualStudentPlan, startDate: manualStartDate,
          paymentMode: manualPaymentMode, installments, initialPayments,
          cardFeePercent, cardBrand: manualCardBrand, cardReference: manualCardReference,
          notes: manualFinanceNotes,
        }),
      });
      const result: {success?:boolean;code?:string;status?:string;error?:string;total_price?:number;paid_amount?:number} = await response.json();
      if (!response.ok || !result.success || !result.code || result.status !== "ativa") {
        throw new Error(result.error || "Não foi possível confirmar a matrícula financeira.");
      }
      setManualStudentName(""); setManualStudentPhone(""); setManualFinanceModalOpen(false);
      setManualInitialPayments([]); setManualPaymentMode("integral");
      setManualInstallmentCount(1); setManualCardFeePercent("0");
      setManualCardBrand(""); setManualCardReference(""); setManualFinanceNotes("");
      await loadData();
      alert(`Matrícula e financeiro cadastrados! Código: ${result.code}. Valor: ${formatCurrency(Number(result.total_price || 0))}. Recebido: ${formatCurrency(Number(result.paid_amount || 0))}.`);
    } catch (err: unknown) {
      console.error("Falha no cadastro financeiro:", err);
      alert(`Erro ao cadastrar aluno: ${err instanceof Error ? err.message : "tente novamente"}`);
    } finally { setManualStudentSaving(false); }
  };

  const handleUpdateStudentClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !newStudentOption) return;

    try {
      await supabase.from("class_enrollments").update({ days_selected: newStudentOption }).eq("id", editingStudent.id);
      setEditingStudent(null);
      setNewStudentOption("");
      await loadData();
      alert("Turma alterada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar turma.");
    }
  };

  const handleSaveSpecificCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMap = { ...classCapacityMap, [selectedTurmaForCap]: Number(specificCapInput) };
    try {
      await supabase.from("arena_settings").upsert({
        id: 1,
        manager_email: managerEmail,
        class_capacity: defaultCapacity,
        class_capacity_map: updatedMap,
        class_prices: classPricesMap,
        upgrades: {
          volleyEnabled: Boolean(upgradeVolleyEnabled), volleyPrice: Number(upgradeVolleyPrice),
          beachTennisEnabled: Boolean(upgradeBeachTennisEnabled), beachTennisPrice: Number(upgradeBeachTennisPrice),
          societyEnabled: Boolean(upgradeSocietyEnabled), societyPrice: Number(upgradeSocietyPrice),
          promo: { enabled: Boolean(promoEnabled), startHour: promoStartHour, endHour: promoEndHour }
        }
      });
      setClassCapacityMap(updatedMap);
      alert(`Capacidade da turma "${selectedTurmaForCap}" atualizada para ${specificCapInput} vagas!`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar capacidade da turma.");
    }
  };

  const handleAssignClassLocation = async () => {
    if (classLocationSaving) return;
    const parsed = parseClassScheduleLabel(selectedTurmaForCap);
    if (!parsed.days.length || !parsed.time) {
      setClassLocationMessage("Não foi possível identificar os dias e o horário desta turma.");
      return;
    }
    setClassLocationSaving(true);
    setClassLocationMessage("");
    try {
      const { error } = await supabase.rpc("assign_class_schedule_location", {
        p_sport: selectedSportForCap,
        p_category: selectedCategoryForCap,
        p_class_name: selectedTurmaForCap,
        p_professor: classLocationProfessor.trim() || "A definir",
        p_court_id: classLocationCourt,
        p_days: parsed.days,
        p_class_time: parsed.time,
      });
      if (error) throw error;
      await loadData();
      setClassLocationMessage("Quadra associada à grade da turma. Nenhum bloqueio físico foi criado.");
    } catch (err: any) {
      setClassLocationMessage(`Não foi possível associar a quadra: ${err?.message || "erro desconhecido"}`);
    } finally {
      setClassLocationSaving(false);
    }
  };

  // Bloqueios físicos são independentes da grade de turmas e das matrículas.
  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockTargetType !== "weekly") {
      alert("Este formulário registra bloqueios físicos semanais.");
      return;
    }
    const lockId = `${selectedCourtId}-weekly-${selectedDayOfWeek}-${selectedLockTime}`;
    try {
      const { data: existing, error: lookupError } = await supabase.from("court_locks")
        .select("id").eq("court_id", selectedCourtId).eq("lock_type", "weekly")
        .eq("day_of_week", selectedDayOfWeek).eq("lock_time", selectedLockTime).limit(1);
      if (lookupError) throw lookupError;
      if (existing?.length) throw new Error("Este horário já possui um bloqueio físico. Nenhum registro foi alterado.");
      const { data: linkedClass, error: classError } = await supabase.from("class_schedules")
        .select("id").eq("court_id", selectedCourtId).eq("day_of_week", selectedDayOfWeek)
        .eq("class_time", selectedLockTime).eq("sport", bulkSport).eq("category", bulkLevel)
        .eq("professor", bulkProfessor.trim()).eq("active", true).limit(1).maybeSingle();
      if (classError) throw classError;
      const reason = `[${bulkSport} - ${bulkProfessor.trim()} - ${bulkLevel}] ${lockReason.trim() || "Bloqueio físico"}`;
      const { error } = await supabase.from("court_locks").insert({
        id: lockId, court_id: selectedCourtId, lock_type: "weekly",
        day_of_week: selectedDayOfWeek, lock_date: null, lock_time: selectedLockTime,
        reason, class_schedule_id: linkedClass?.id || null,
      });
      if (error) throw error;
      await loadData();
      alert("Bloqueio físico semanal registrado. A grade de matrículas não foi alterada.");
    } catch (err: any) {
      alert(`Não foi possível registrar o bloqueio: ${err?.message || "erro desconhecido"}`);
    }
  };

  const handleRemoveLock = async (id: string) => {
    const lock = cloudLocks.find(l => l.id === id);
    if (lock?.class_schedule_id) {
      alert("Este bloqueio pertence a uma turma real. Para liberar uma data, use Cancelar aula por data. A exclusão permanente da turma requer um procedimento próprio.");
      return;
    }
    if (!confirm("Remover este bloqueio administrativo?")) return;
    try {
      const { error } = await supabase.from("court_locks").delete().eq("id", id).is("class_schedule_id", null);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(`Não foi possível remover o bloqueio: ${err?.message || "erro desconhecido"}`);
    }
  };

  const handleDownloadExcelModel = () => {
    const csvContent = "data:text/csv;charset=utf-8,Modalidade,Professor,Nivel,Quadra,DiaSemana,Horario,Vigencia\n" +
      "Beach Tennis,Professor Joao,Iniciante,Quadra 1 (Areia),Segunda,18:00,indeterminado\n" +
      "Volei de Praia,Professora Maria,Intermediario,Quadra 2 (Areia),Quarta,19:00,indeterminado\n" +
      "Futebol Society,Professor Carlos,Adulto,Campo de Futebol Society,Terca,20:00,indeterminado\n" +
      "Futevolei,Professor Pedro,Iniciante,Quadra 3 (Areia),Quinta,17:00,indeterminado";
     
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_grade_horarios_arena.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length >= 6) {
          const [sport, prof, level, courtName, dayOrDate, time, vigencia] = parts;
          const matchedCourt = allCourts.find(c => c.name.toLowerCase().includes(courtName.toLowerCase().trim())) || allCourts[0];
           
          let dayNum = 1;
          const dLower = dayOrDate.toLowerCase().trim();
          if (dLower.includes("seg")) dayNum = 1;
          else if (dLower.includes("ter")) dayNum = 2;
          else if (dLower.includes("qua")) dayNum = 3;
          else if (dLower.includes("qui")) dayNum = 4;
          else if (dLower.includes("sex")) dayNum = 5;
          else if (dLower.includes("sab")) dayNum = 6;
          else if (dLower.includes("dom")) dayNum = 0;

          const lockId = `${matchedCourt.id}-weekly-${dayNum}-${time.trim()}`;
          const reasonText = `[${sport.trim()} - ${prof.trim()} - ${level.trim()}] Turma Importada (Vigência: ${vigencia?.trim() || 'indeterminado'})`;

          try {
            await supabase.from("court_locks").upsert({
              id: lockId,
              court_id: matchedCourt.id,
              lock_type: "weekly",
              day_of_week: dayNum,
              lock_date: null,
              lock_time: time.trim(),
              reason: reasonText,
            });
            importedCount++;
          } catch (err) {
            console.error(err);
          }
        }
      }

      await loadData();
      alert(`Importação concluída! ${importedCount} horários fixos/turmas carregados e bloqueados com sucesso.`);
    };
    reader.readAsText(file);
  };

  const handleToggleBookingStatusByCode = async (code: string, currentStatus: string) => {
    const rows = bookings.filter(b => b.code === code);
    if (!rows.length) return;
    // Nunca permitir alterações de reservas já encerradas.
    if (rows.some(b => slotHasEnded(b.date, b.time))) {
      alert("Esta reserva já terminou e não pode ser alterada.");
      return;
    }
    const nextStatus = currentStatus === "confirmada" ? "cancelada" : "confirmada";
    if (nextStatus === "confirmada") {
      // Atualiza antes de reativar para não ocupar horários que foram reservados depois.
      const { data: latest, error: readError } = await supabase.from("bookings")
        .select("code,court_id,booking_date,booking_time,status").eq("status", "confirmada");
      if (readError) { alert("Não foi possível verificar a disponibilidade."); return; }
      const conflict = rows.some(row => (latest || []).some(other =>
        other.code !== code && other.court_id === row.courtId &&
        other.booking_date === row.date && other.booking_time === row.time
      ));
      if (conflict) { alert("Não é possível reativar: um ou mais horários já estão ocupados."); return; }
    }
    if (!confirm(`Alterar status da reserva ${code} para ${nextStatus}?`)) return;
    const { data: updatedRows, error } = await supabase.from("bookings")
      .update({ status: nextStatus }).eq("code", code)
      .select("code,channel,status");
    if (error || !updatedRows?.length) {
      console.error("Erro ao atualizar reserva:", error);
      alert("Não foi possível confirmar a alteração da reserva.");
      return;
    }
    // A decisão de notificar usa o registro atualizado, não o estado antigo da tela.
    if (nextStatus === "cancelada" && updatedRows.some(row => row.channel === "manual")) {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (sessionError || !token) throw new Error("Sessão administrativa indisponível.");
        const response = await fetch("/api/admin/bookings/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code, event: "cancelada" }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || `Erro HTTP ${response.status}`);
        }
      } catch (notificationError) {
        console.error("Reserva cancelada, mas a notificação falhou:", notificationError);
        alert(`Reserva ${code} cancelada, mas o e-mail não foi enviado. Verifique os logs antes de tentar qualquer reenvio.`);
      }
    }
    await loadData();
  };

  const bookingFinancials = (code: string, total: number) => {
    const payments = bookingPayments.filter(p => p.booking_code === code);
    const adjustments = bookingAdjustments.filter(a => a.booking_code === code);
    const received = payments.filter(p => p.settlement_status === "recebido").reduce((sum, p) => sum + Number(p.amount), 0);
    const expected = payments.filter(p => p.settlement_status === "repasse_previsto").reduce((sum, p) => sum + Number(p.amount), 0);
    const losses = adjustments.filter(a => a.adjustment_type === "perda").reduce((sum, a) => sum + Number(a.amount), 0);
    const discounts = adjustments.filter(a => a.adjustment_type === "desconto").reduce((sum, a) => sum + Number(a.amount), 0);
    const contractCancellations = adjustments.filter(a => a.adjustment_type === "cancelamento_contrato").reduce((sum,a) => sum + Number(a.amount),0);
    const remaining = Math.max(0, Math.round((total - received - expected - losses - discounts - contractCancellations) * 100) / 100);
    return { payments, adjustments, received, expected, losses, discounts, contractCancellations, remaining };
  };

  const isCancelledPaymentBooking = (code: string) => {
    const rows = bookings.filter(b => b.code === code);
    return rows.length === 0 || rows.some(b => b.status === "cancelada");
  };

  const assertBookingAcceptsPayments = async (code: string) => {
    const { data, error } = await supabase.from("bookings").select("status").eq("code", code);
    if (error) throw error;
    if (!data?.length || data.some(row => row.status === "cancelada")) {
      throw new Error("Reserva cancelada ou inexistente: novos lançamentos financeiros estão bloqueados.");
    }
  };

  const openPaymentModal = (code: string) => {
    setPaymentModalCode(code);
    setPaymentAmount("");
    setPaymentMethodInput("pix");
    setPaymentNotes("");
    setLossReason("");
    setClosureMode("zerar_saldo");
    setClosureLoss("0");
  };

  const refreshFinancials = async (code: string, total: number) => {
    const [payResult, adjResult] = await Promise.all([
      supabase.from("booking_payments").select("*").eq("booking_code", code),
      supabase.from("booking_balance_adjustments").select("*").eq("booking_code", code),
    ]);
    if (payResult.error || adjResult.error) throw new Error(payResult.error?.message || adjResult.error?.message);
    const payments = (payResult.data || []) as BookingPayment[];
    const adjustments = (adjResult.data || []) as BookingAdjustment[];
    const allocated = payments.reduce((sum, p) => sum + Number(p.amount), 0) + adjustments.reduce((sum, a) => sum + Number(a.amount), 0);
    return { remaining: Math.max(0, Math.round((total - allocated) * 100) / 100) };
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCode || savingFinancial) return;
    if (bookingAddonsError) { alert(bookingAddonsError); return; }
    if (isCancelledPaymentBooking(paymentModalCode)) { alert("Reserva cancelada: somente consulta do histórico financeiro."); return; }
    const total = bookings.filter(b => b.code === paymentModalCode).reduce((sum, b) => sum + b.price, 0) + addonTotal(paymentModalCode);
    const amount = Number(paymentAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
      alert("Informe um valor positivo com até duas casas decimais."); return;
    }
    if(["credito","debito"].includes(paymentMethodInput)&&!creditValid(creditFee,creditInstallments)){alert("Taxa ou parcelas do cartão inválidas.");return;}
    setSavingFinancial(true);
    try {
      await assertBookingAcceptsPayments(paymentModalCode);
      const { remaining } = await refreshFinancials(paymentModalCode, total);
      if (Math.round(amount * 100) > Math.round(remaining * 100)) { alert("Valor superior ao saldo pendente. Atualize a reserva."); return; }
      const { data: insertedPayment, error } = await supabase.from("booking_payments").insert({
        booking_code: paymentModalCode, amount,
        payment_method: paymentMethodInput,
        settlement_status: "recebido",
        notes: paymentNotes.trim() || null,
      }).select("id").single();
      if (error) throw error;
      if(["credito","debito"].includes(paymentMethodInput)&&insertedPayment?.id)await saveCardDetail("reserva",String(insertedPayment.id),amount,creditFee,paymentMethodInput==="debito"?"1":creditInstallments);
      await loadData();
      setPaymentAmount(""); setPaymentNotes("");
      alert("Pagamento registrado com sucesso.");
    } catch (err) { console.error(err); alert("Não foi possível registrar o pagamento. Verifique as permissões e tente novamente."); }
    finally { setSavingFinancial(false); }
  };

  const handleCloseBookingFinancial = async () => {
    if (!bookingClosureModalCode || savingFinancial || bookingClosuresError || bookingAddonsError || financialError) return;
    const rows = bookings.filter(b => b.code === bookingClosureModalCode);
    if (!rows.length || rows.some(b => b.status !== "finalizada")) { alert("Finalize todos os horários da reserva antes do encerramento financeiro."); return; }
    if (bookingClosures.some(c => c.booking_code === bookingClosureModalCode)) { alert("Esta reserva já foi encerrada financeiramente."); return; }
    if (!lossReason.trim()) { alert("Informe o motivo do encerramento."); return; }
    const loss = closureMode === "zerar_saldo" ? Number(closureLoss.replace(",", ".")) : 0;
    const total = rows.reduce((sum,b) => sum + b.price,0) + addonTotal(bookingClosureModalCode);
    if (!Number.isFinite(loss) || loss < 0 || Math.abs(loss*100-Math.round(loss*100)) > 0.00001 || loss > bookingFinancials(bookingClosureModalCode,total).remaining + 0.001) {
      alert("Informe uma perda válida, até o saldo pendente."); return;
    }
    const message = closureMode === "zerar_saldo" ? `Zerar o saldo da reserva ${bookingClosureModalCode}, registrando ${formatCurrency(loss)} como perda e cancelando o restante?` : `Encerrar financeiramente a reserva ${bookingClosureModalCode} mantendo a dívida em aberto para cobrança?`;
    if (!window.confirm(message)) return;
    setSavingFinancial(true);
    try {
      const {error} = await supabase.rpc("terminate_booking_financial", {
        p_booking_code: bookingClosureModalCode, p_mode: closureMode,
        p_reason: lossReason.trim(), p_loss_amount: loss
      });
      if (error) throw error;
      await loadData();
      setBookingClosureModalCode(null);
      setLossReason(""); setClosureLoss("0");
      alert("Encerramento financeiro registrado com sucesso.");
    } catch(err:any) { alert(`Não foi possível encerrar: ${err?.message || "tente novamente"}`); }
    finally { setSavingFinancial(false); }
  };

  const handleUpdateEnrollmentStatus = async (
  enrollment: ClassEnrollment,
  nextStatus: "confirmada" | "reprovada" | "cancelada"
) => {
  if (!confirm(`Alterar matrícula ${enrollment.code} para ${nextStatus}?`)) return;

  const { data, error } = await supabase
    .from("class_enrollments")
    .update({ status: nextStatus })
    .eq("id", enrollment.id)
    .eq("status", enrollment.status)
    .select("id");

  if (error || !data?.length) {
    console.error(error);
    alert("Não foi possível atualizar a matrícula. Atualize o painel e tente novamente.");
    return;
  }

  await loadData();
};

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      await supabase.from("coupons").upsert({
        id: editingCouponId || `coupon-${Date.now()}`,
        code: newCouponCode.trim().toUpperCase(),
        discount_type: newCouponType,
        discount_value: parseFloat(newCouponValue) || 10,
        scope: newCouponScope,
        max_uses: newCouponMaxUses.trim() ? parseInt(newCouponMaxUses, 10) : null,
        active: true,
      });
      setNewCouponCode(""); setNewCouponValue("10"); setNewCouponMaxUses(""); setEditingCouponId(null);
      await loadData();
      alert("Cupom salvo com sucesso!");
    } catch (err) { console.error(err); }
  };

  const handleEditCoupon = (coupon: CouponRecord) => {
    setEditingCouponId(coupon.id);
    setNewCouponCode(coupon.code);
    setNewCouponType(coupon.discount_type);
    setNewCouponValue(String(coupon.discount_value));
    setNewCouponScope(coupon.scope || "ambos");
    setNewCouponMaxUses(coupon.max_uses !== null && coupon.max_uses !== undefined ? String(coupon.max_uses) : "");
  };

  const toggleCouponStatus = async (coupon: CouponRecord) => {
    try { await supabase.from("coupons").update({ active: !coupon.active }).eq("id", coupon.id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    try { await supabase.from("coupons").delete().eq("id", id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleSaveSettingsAndUpgrades = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from("arena_settings").upsert({
        id: 1,
        manager_email: managerEmail,
        class_capacity: defaultCapacity,
        class_capacity_map: classCapacityMap,
        class_prices: classPricesMap,
        upgrades: {
          volleyEnabled: Boolean(upgradeVolleyEnabled), 
          volleyPrice: Number(upgradeVolleyPrice),
          beachTennisEnabled: Boolean(upgradeBeachTennisEnabled), 
          beachTennisPrice: Number(upgradeBeachTennisPrice),
          societyEnabled: Boolean(upgradeSocietyEnabled), 
          societyPrice: Number(upgradeSocietyPrice),
          promo: {
            enabled: Boolean(promoEnabled),
            startHour: promoStartHour,
            endHour: promoEndHour
          }
        }
      });
      await loadData();
      alert("Configurações e preços salvos com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações.");
    }
  };

  const handleSaveManagerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from("arena_settings").upsert({
        id: 1,
        manager_email: managerEmail,
        class_capacity: defaultCapacity,
        class_capacity_map: classCapacityMap,
        class_prices: classPricesMap,
      });
      alert("E-mail de notificações atualizado com sucesso no banco de dados!");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar o e-mail do gestor.");
    }
  };

  // Cadastro e exclusão de gestores exigem uma rota segura no servidor.
  // A interface legada fica desativada para não criar contas sem Supabase Auth.
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Cadastro de gestores temporariamente indisponível durante a migração para Supabase Auth.");
  };
  const handleDeleteAdmin = async (_id: string, _role: string) => {
    alert("Exclusão de gestores temporariamente indisponível durante a migração para Supabase Auth.");
  };

  const groupedBookingsMap = new Map<string, ConsolidatedBooking>();

  bookings.forEach((b) => {
    const bSport = b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis");
    const matchesSport = bookingSportFilter === "Todos" || bSport.toLowerCase() === bookingSportFilter.toLowerCase();
    if (!matchesSport) return;

    if (bookingPeriodType === "day") {
      if (selectedBookingDay && b.date !== selectedBookingDay) return;
    } else if (bookingPeriodType === "month") {
      if (selectedBookingMonth && !b.date.startsWith(selectedBookingMonth)) return;
    } else if (bookingPeriodType === "year") {
      if (selectedBookingYear && !b.date.startsWith(selectedBookingYear)) return;
    } else if (bookingPeriodType === "custom") {
      if (customBookingStart && b.date < customBookingStart) return;
      if (customBookingEnd && b.date > customBookingEnd) return;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchQuery = b.code.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || (b.customerPhone && b.customerPhone.includes(q)) || b.courtName.toLowerCase().includes(q);
      if (!matchQuery) return;
    }

    if (!groupedBookingsMap.has(b.code)) {
      groupedBookingsMap.set(b.code, {
        code: b.code,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerEmail: b.customerEmail,
        date: b.date,
        totalPrice: 0,
        status: b.status,
        channel: b.channel,
        details: [],
        slots: []
      });
    }

    const item = groupedBookingsMap.get(b.code)!;
    item.totalPrice += b.price;
    item.details.push(`${b.courtName} às ${b.time} (${bSport})`);
    item.slots.push({ date: b.date, time: b.time, courtId: b.courtId });
    if (b.status === "confirmada") item.status = "confirmada";
  });

  groupedBookingsMap.forEach(item => {
    item.totalPrice += addonTotal(item.code);
    bookingAddons.filter(a => a.booking_code === item.code).forEach(a => {
      item.details.push(`${a.addon_name.replace(/^Upgrade:\s*/i, "")} — ${formatCurrency(Number(a.addon_price))} (adicional)`);
    });
  });

  const consolidatedBookingsList = Array.from(groupedBookingsMap.values()).filter((cb) => {
    if (bookingStatusFilter === "Todos") return true;
    const ended = cb.slots.length > 0 && cb.slots.every(slot => slotHasEnded(slot.date, slot.time));
    const displayStatus = cb.status === "cancelada" ? "Cancelada" : ended ? "Finalizada" : "Confirmada";
    return displayStatus === bookingStatusFilter;
  });
   
  const bookingTotalPages = Math.max(1, Math.ceil(consolidatedBookingsList.length / bookingPageSize));
  const currentBookingPage = Math.min(bookingPage, bookingTotalPages);
  const visibleConsolidatedBookings = consolidatedBookingsList.slice((currentBookingPage - 1) * bookingPageSize, currentBookingPage * bookingPageSize);

  const loadReportLedger = async () => {
    setReportLedgerLoading(true);
    setReportLedgerError("");
    try {
      // Paginação evita truncar silenciosamente o relatório no limite padrão do Supabase.
      const fetchAll = async (table:string, fields:string) => {
        const rows:any[] = [];
        for (let offset=0; ; offset+=500) {
          const {data,error} = await supabase.from(table).select(fields).range(offset,offset+499);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < 500) break;
        }
        return rows;
      };
      const [charges,payments,adjustments,cards,discounts] = await Promise.all([
        fetchAll("class_charges","id,enrollment_id,amount,created_at,charge_type,sport,student_name,student_phone,class_name,class_date"),
        fetchAll("class_payments","id,charge_id,amount,created_at"),
        fetchAll("class_balance_adjustments","charge_id,amount,created_at,adjustment_type"),
        fetchAll("financial_card_details","source_type,payment_id,gross_amount,fee_amount,fee_percent,installments"),
        fetchAll("financial_discount_details","source_type,source_id,discount_amount,applied_at,discount_origin,coupon_code")
      ]);
      setReportLedger({charges,payments,adjustments});
      setCardDetails(cards);setDiscountDetails(discounts);
      await loadSchedules();
    } catch(err:any) {
      setReportLedgerError(`Não foi possível consultar o relatório financeiro: ${err?.message || "erro desconhecido"}`);
    } finally {setReportLedgerLoading(false);}
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === "reports") void loadReportLedger();
  }, [isAuthenticated, activeTab, enrollments, classFinancialSummary]);

  const reportDateMatches = (timestamp:string) => {
    const date = timestamp?.slice(0,10) || "";
    if (reportPeriodType === "month") return !!selectedMonth && date.startsWith(selectedMonth);
    if (reportPeriodType === "year") return !!selectedYear && date.startsWith(selectedYear);
    if (reportPeriodType === "custom") return (!customStartDate || date >= customStartDate) && (!customEndDate || date <= customEndDate);
    return true;
  };
  // Etapa 11: quantidades por lançamento, sem confundir pagamentos com contratos.
  const reportClassLedger = (() => {
    const relevantCharges = reportLedger.charges.filter(c =>
      (reportSportFilter === "Todas" || c.sport === reportSportFilter) &&
      (c.charge_type === "mensalidade" || c.charge_type === "avulsa"));
    const ids = new Set(relevantCharges.map(c => c.id));
    const payments = reportLedger.payments.filter(p => ids.has(p.charge_id));
    const adjustments = reportLedger.adjustments.filter(a => ids.has(a.charge_id));
    const cancellations = adjustments.filter(a => a.adjustment_type === "cancelamento_contrato");
    const sum = (rows:Array<{amount:number}>) => rows.reduce((n,r) => n + Number(r.amount || 0),0);
    const periodCharges = relevantCharges.filter(c => reportDateMatches(c.created_at));
    const periodPayments = payments.filter(p => reportDateMatches(p.created_at));
    const periodAdjustments = cancellations.filter(a => reportDateMatches(a.created_at));
    const receivedByCharge = new Map<string,number>();
    const adjustedByCharge = new Map<string,number>();
    payments.forEach(p => receivedByCharge.set(p.charge_id,(receivedByCharge.get(p.charge_id) || 0)+Number(p.amount)));
    adjustments.forEach(a => adjustedByCharge.set(a.charge_id,(adjustedByCharge.get(a.charge_id) || 0)+Number(a.amount)));
    const outstandingCharges = relevantCharges.filter(c =>
      Number(c.amount) - (receivedByCharge.get(c.id) || 0) - (adjustedByCharge.get(c.id) || 0) > 0.009);
    const unique = (values:string[]) => new Set(values).size;
    return {
      contracted:sum(periodCharges), contractedCount:periodCharges.length,
      received:sum(periodPayments), paymentCount:periodPayments.length,
      paidChargeCount:unique(periodPayments.map(p => p.charge_id)),
      cancelled:sum(periodAdjustments), cancelledCount:unique(periodAdjustments.map(a => a.charge_id)),
      totalOutstanding:sum(outstandingCharges.map(c => ({amount:Math.max(0,Number(c.amount)-(receivedByCharge.get(c.id)||0)-(adjustedByCharge.get(c.id)||0))}))),
      outstandingCount:outstandingCharges.length
    };
  })();

  // Reserva consolidada pelo código: uma reserva pode ocupar vários horários/quadras.
  const reportBookingCounts = (() => {
    const relevant = filteredBookingsForReport;
    const cancelled = relevant.filter(b => b.status === "cancelada");
    const confirmed = relevant.filter(b => b.status === "confirmada");
    const count = (rows:BookingRecord[]) => new Set(rows.map(b => b.code)).size;
    return {
      cancelledCount:count(cancelled), cancelledValue:cancelled.reduce((n,b)=>n+b.price,0) + [...new Set(cancelled.map(b=>b.code))].reduce((n,code)=>n+addonTotal(code),0),
      confirmedCount:count(confirmed), confirmedValue:confirmed.reduce((n,b)=>n+b.price,0) + [...new Set(confirmed.map(b=>b.code))].reduce((n,code)=>n+addonTotal(code),0)
    };
  })();

  // Etapa 12: caixa por data do lançamento, não pelo dia da reserva.
  // Apenas pagamentos com situação "recebido" integram o caixa.
  const reportBookingCash = (() => {
    const allowedCodes = new Set(bookings.filter(b =>
      reportSportFilter === "Todas" || (b.sport || (b.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis")) === reportSportFilter
    ).map(b => b.code));
    const paid = bookingPayments.filter(p => allowedCodes.has(p.booking_code) &&
      p.settlement_status === "recebido" && reportDateMatches(p.created_at));
    return {
      received: paid.reduce((total,p) => total + Number(p.amount || 0), 0),
      paymentCount: paid.length,
      bookingCount: new Set(paid.map(p => p.booking_code)).size
    };
  })();
  // Taxas apenas sobre pagamentos efetivamente lançados no período, respeitando os filtros.
  const reportCardFees = cardDetails.reduce((total,card)=>{
    if(card.source_type==="aula") {
      if(reportTypeFilter==="Reservas")return total;
      const payment=reportLedger.payments.find(p=>String(p.id)===String(card.payment_id));
      const charge=payment&&reportLedger.charges.find(c=>c.id===payment.charge_id);
      return charge && reportDateMatches(payment!.created_at) && (reportSportFilter==="Todas"||charge.sport===reportSportFilter)?total+Number(card.fee_amount):total;
    }
    if(reportTypeFilter==="Aulas")return total;
    const payment=bookingPayments.find(p=>String(p.id)===String(card.payment_id));
    const booking=payment&&bookings.find(b=>b.code===payment.booking_code);
    return payment&&booking&&reportDateMatches(payment.created_at)&&(reportSportFilter==="Todas"||booking.sport===reportSportFilter)?total+Number(card.fee_amount):total;
  },0);
  const existingBookingDiscounts = reportTypeFilter==="Aulas"?0:bookingAdjustments.filter(a=>a.adjustment_type==="desconto"&&reportDateMatches(a.created_at)&&(
    reportSportFilter==="Todas"||bookings.some(b=>b.code===a.booking_code&&b.sport===reportSportFilter)
  )).reduce((n,a)=>n+Number(a.amount),0);
  const reportDiscountTotal = existingBookingDiscounts + discountDetails.filter(d=>!(d.source_type==="reserva"&&bookingAdjustments.some(a=>a.booking_code===d.source_id&&a.adjustment_type==="desconto"))).reduce((total,d)=>{
    if(d.source_type==="aula"&&reportTypeFilter==="Reservas")return total;
    if(d.source_type==="reserva"&&reportTypeFilter==="Aulas")return total;
    if(!reportDateMatches(d.applied_at))return total;
    const sport=d.source_type==="reserva"?bookings.find(b=>b.code===d.source_id)?.sport:reportLedger.charges.find(c=>c.id===d.source_id)?.sport;
    return (reportSportFilter==="Todas"||sport===reportSportFilter)?total+Number(d.discount_amount):total;
  },0);
  // Perdas encerradas: separadas dos descontos e do saldo ainda em aberto.
  const reportFinancialLosses = (() => {
    const classChargeIds = new Set(reportLedger.charges.filter(c =>
      (c.charge_type === "mensalidade" || c.charge_type === "avulsa") &&
      (reportSportFilter === "Todas" || c.sport === reportSportFilter)
    ).map(c => c.id));
    const classLosses = reportTypeFilter === "Reservas" ? [] : reportLedger.adjustments.filter(a =>
      a.adjustment_type === "perda" && classChargeIds.has(a.charge_id) && reportDateMatches(a.created_at));
    const bookingLosses = reportTypeFilter === "Aulas" ? [] : bookingAdjustments.filter(a =>
      a.adjustment_type === "perda" && reportDateMatches(a.created_at) &&
      (reportSportFilter === "Todas" || bookings.some(b => b.code === a.booking_code && b.sport === reportSportFilter)));
    return {
      amount: [...classLosses, ...bookingLosses].reduce((sum, a) => sum + Number(a.amount || 0), 0),
      count: classLosses.length + bookingLosses.length
    };
  })();
  // Cancelamentos contratuais são baixas de cobrança, nunca recebimentos ou perdas.
  const reportContractCancellations = (() => {
    const classIds = new Set(reportLedger.charges.filter(c =>
      (c.charge_type === "mensalidade" || c.charge_type === "avulsa") &&
      (reportSportFilter === "Todas" || c.sport === reportSportFilter)
    ).map(c => c.id));
    const classRows = reportTypeFilter === "Reservas" ? [] : reportLedger.adjustments.filter(a =>
      a.adjustment_type === "cancelamento_contrato" && classIds.has(a.charge_id) && reportDateMatches(a.created_at));
    const bookingRows = reportTypeFilter === "Aulas" ? [] : bookingAdjustments.filter(a =>
      a.adjustment_type === "cancelamento_contrato" && reportDateMatches(a.created_at) &&
      (reportSportFilter === "Todas" || bookings.some(b => b.code === a.booking_code && b.sport === reportSportFilter)));
    return {
      amount: [...classRows, ...bookingRows].reduce((sum, a) => sum + Number(a.amount || 0), 0),
      count: classRows.length + bookingRows.length
    };
  })();
  // Dívidas de reservas são saldos atuais, independentemente da data do pagamento.
  // Respeitam esporte e excluem reservas canceladas.
  const reportBookingOutstanding = (() => {
    const grouped = new Map<string, BookingRecord[]>();
    bookings.forEach(b => {
      if (!grouped.has(b.code)) grouped.set(b.code, []);
      grouped.get(b.code)!.push(b);
    });
    let amount = 0;
    let count = 0;
    grouped.forEach((items, code) => {
      if (items.some(b => b.status === "cancelada")) return;
      if (reportSportFilter !== "Todas" && !items.some(b => b.sport === reportSportFilter)) return;
      const total = items.reduce((sum,b) => sum + Number(b.price || 0),0) + addonTotal(code);
      const remaining = bookingFinancials(code, total).remaining;
      if (remaining > 0.009) { amount += remaining; count++; }
    });
    return {amount, count};
  })();
  const reportCashTotal = (reportTypeFilter === "Reservas" ? 0 : reportClassLedger.received) +
    (reportTypeFilter === "Aulas" ? 0 : reportBookingCash.received);
  const reportCashCount = (reportTypeFilter === "Reservas" ? 0 : reportClassLedger.paymentCount) +
    (reportTypeFilter === "Aulas" ? 0 : reportBookingCash.paymentCount);

  // Etapa 17: saldos atuais por obrigação; data do filtro = criação da cobrança
  // (aulas) ou data da reserva (reservas), não data de recebimento.
  type PendingRow = {
    key:string; origin:"Reservas"|"Aulas"; name:string; phone:string;
    sport:string; date:string; total:number; received:number;
    expected:number; adjusted:number; balance:number;
    code?:string; enrollmentId?:string|null; chargeId?:string; chargeType?:string;
    nextDue?:string; dueStatus?:"vencido"|"proximo"|"futuro"|"sem_data";
  };
  const pendingRows: PendingRow[] = (() => {
    const rows:PendingRow[] = [];
    const grouped = new Map<string, BookingRecord[]>();
    bookings.forEach(b => {
      if (!grouped.has(b.code)) grouped.set(b.code, []);
      grouped.get(b.code)!.push(b);
    });
    grouped.forEach((items,code) => {
      // Reservas canceladas não são cobradas como dívida.
      if (items.some(b => b.status === "cancelada")) return;
      const total = items.reduce((n,b) => n + Number(b.price || 0),0) + addonTotal(code);
      const f = bookingFinancials(code,total);
      if (f.remaining <= 0.009) return;
      const first = items[0];
      rows.push({key:`reserva-${code}`,origin:"Reservas",name:first.customerName,
        phone:first.customerPhone || "",sport:first.sport || (first.courtName.toLowerCase().includes("society") ? "Futebol Society" : "Beach Tennis"),
        date:first.date,total,received:f.received,expected:f.expected,
        adjusted:f.losses+f.discounts+f.contractCancellations,balance:f.remaining,code});
    });
    const paid = new Map<string,number>();
    const adjusted = new Map<string,number>();
    reportLedger.payments.forEach(p => paid.set(p.charge_id,(paid.get(p.charge_id)||0)+Number(p.amount || 0)));
    reportLedger.adjustments.forEach(a => adjusted.set(a.charge_id,(adjusted.get(a.charge_id)||0)+Number(a.amount || 0)));
    reportLedger.charges.forEach(c => {
      const total=Number(c.amount || 0);
      const received=paid.get(c.id)||0;
      const adjustment=adjusted.get(c.id)||0;
      const balance=Math.max(0,Math.round((total-received-adjustment)*100)/100);
      if (balance<=0.009) return;
      const en=c.enrollment_id ? enrollments.find(e=>e.id===c.enrollment_id) : undefined;
      const term=termsByCharge[c.id];
      // FIFO: recebimentos e ajustes reduzem as parcelas mais antigas, sem criar receitas.
      const installments=term ? dueItems.filter(i=>i.payment_terms_id===term.id).sort((a,b)=>a.due_date.localeCompare(b.due_date)||a.installment_number-b.installment_number) : [];
      let applied=received+adjustment;
      const next=installments.find(i=>{const rest=Math.max(0,Number(i.amount)-applied);applied=Math.max(0,applied-Number(i.amount));return rest>0.009;});
      const today=getBrazilDateString();
      const limit=addMonthsToDate(today,0); // calculado abaixo em dias corridos
      const nearDate=new Date(`${today}T12:00:00Z`);nearDate.setUTCDate(nearDate.getUTCDate()+2);
      const near=nearDate.toISOString().slice(0,10);
      const dueStatus=next ? (next.due_date<today?"vencido":next.due_date<=near?"proximo":"futuro") : "sem_data";
      rows.push({key:`aula-${c.id}`,origin:"Aulas",name:c.student_name || en?.student_name || "Aluno não identificado",
        phone:c.student_phone || en?.student_phone || "",sport:c.sport,
        date:c.created_at?.slice(0,10) || "",total,received,expected:0,adjusted:adjustment,
        balance,enrollmentId:c.enrollment_id,chargeId:c.id,chargeType:c.charge_type,
        nextDue:next?.due_date,dueStatus});
    });
    return rows;
  })();
  const pendingDateMatches = (date:string) => {
    if (pendingPeriod==="month") return !!pendingMonth && date.startsWith(pendingMonth);
    if (pendingPeriod==="custom") return (!pendingFrom || date>=pendingFrom) && (!pendingTo || date<=pendingTo);
    return true;
  };
  const filteredPendingRows = pendingRows.filter(r => {
    const q=pendingSearch.trim().toLocaleLowerCase("pt-BR");
    return (pendingAttention==="all" || r.dueStatus==="vencido" || r.dueStatus==="proximo") &&
      (pendingOrigin==="Todos" || r.origin===pendingOrigin) &&
      (pendingSport==="Todas" || r.sport===pendingSport) && pendingDateMatches(r.date) &&
      (!q || [r.name,r.phone,r.code||"",r.sport].some(v=>v.toLocaleLowerCase("pt-BR").includes(q)));
  }).sort((a,b) => pendingSort==="antigas" ? a.date.localeCompare(b.date) :
    pendingSort==="recentes" ? b.date.localeCompare(a.date) :
    pendingSort==="nome" ? a.name.localeCompare(b.name,"pt-BR") :
    pendingSort==="menor" ? a.balance-b.balance : b.balance-a.balance);
  const pendingTotals = filteredPendingRows.reduce((v,r)=>({balance:v.balance+r.balance}),{balance:0});
  const pendingPages = Math.max(1,Math.ceil(filteredPendingRows.length/pendingPageSize));
  const pendingCurrentPage = Math.min(pendingPage,pendingPages);
  const pendingVisibleRows = filteredPendingRows.slice((pendingCurrentPage-1)*pendingPageSize,pendingCurrentPage*pendingPageSize);
  const openPendingRow = async (r:PendingRow) => {
    if (r.origin==="Reservas" && r.code) {openPaymentModal(r.code);return;}
    setActiveTab("classes");
    if (r.enrollmentId) {
      const enrollment=enrollments.find(e=>e.id===r.enrollmentId);
      if (enrollment) {await openMonthlyModal(enrollment);return;}
    }
    const walkIn=classCharges.find(c=>c.id===r.chargeId);
    if (walkIn) {await openWalkInDetail(walkIn);return;}
    alert("Cobrança não encontrada na lista de aulas. Atualize os dados antes de continuar.");
  };

  // Conversão operacional de reservas do site: confirmadas e integralmente recebidas.
  const onlineConversion = (() => {
    const grouped = new Map<string,{total:number;confirmed:boolean;cancelled:boolean}>();
    filteredBookingsForReport.filter(b => b.channel === "online").forEach(b => {
      const item = grouped.get(b.code) || {total:0,confirmed:false,cancelled:false};
      item.total += Number(b.price);
      item.confirmed ||= b.status === "confirmada";
      item.cancelled ||= b.status === "cancelada";
      grouped.set(b.code,item);
    });
    grouped.forEach((item,code) => { item.total += addonTotal(code); });
    const paid = new Map<string,number>();
    bookingPayments.filter(p => p.settlement_status === "recebido").forEach(p =>
      paid.set(p.booking_code,(paid.get(p.booking_code)||0)+Number(p.amount)));
    const complete = [...grouped.entries()].filter(([code,b]) =>
      b.confirmed && !b.cancelled && b.total > 0 && (paid.get(code)||0) >= b.total - 0.009).length;
    return {total:grouped.size,complete,percent:grouped.size ? 100*complete/grouped.size : 0};
  })();
  // Análises descritivas calculadas apenas a partir dos registros disponíveis.
  const reportInsights = (() => {
    const items:string[] = [];
    if (reportTypeFilter !== "Reservas" && reportClassLedger.totalOutstanding > 0) {
      items.push(`${reportClassLedger.outstandingCount} cobrança(s) de aulas em aberto, somando ${formatCurrency(reportClassLedger.totalOutstanding)}. Priorize a conferência desses recebimentos.`);
    }
    if (reportTypeFilter !== "Aulas" && reportBookingCounts.cancelledCount > 0) {
      items.push(`${reportBookingCounts.cancelledCount} reserva(s) cancelada(s) no período, com valor reservado de ${formatCurrency(reportBookingCounts.cancelledValue)}. Isso não equivale a perda de caixa.`);
    }
    if (reportTypeFilter !== "Aulas" && reportBookingCounts.confirmedCount > 0 && reportBookingCash.received === 0) {
      items.push(`Existem ${reportBookingCounts.confirmedCount} reserva(s) confirmada(s) no período, mas nenhum recebimento de reservas registrado nesse período. Confira os lançamentos financeiros.`);
    }
    if (reportTypeFilter !== "Aulas" && onlineConversion.total > 0 && onlineConversion.complete === 0) {
      items.push(`Nenhuma das ${onlineConversion.total} reservas criadas pelo site no período consta como confirmada e integralmente paga. Confira se os pagamentos foram lançados.`);
    }
    if (!items.length) items.push("Não foram encontrados alertas pelas regras atuais para os filtros selecionados.");
    return items.slice(0,3);
  })();



  const loadClassFinancialSummary = async () => {
    setClassFinancialLoading(true);
    setClassFinancialLoadError("");
    try {
      const { data: charges, error: chargeError } = await supabase.from("class_charges")
        .select("id,enrollment_id,amount").eq("charge_type", "mensalidade");
      if (chargeError) throw chargeError;
      const chargeRows = charges || [];
      const paymentRows: Array<{charge_id:string;amount:number}> = [];
      const adjustmentRows: Array<{charge_id:string;amount:number}> = [];
      // Consultas em lotes para não ultrapassar o limite de tamanho do filtro IN.
      for (let i = 0; i < chargeRows.length; i += 100) {
        const ids = chargeRows.slice(i, i + 100).map(c => c.id);
        const [payments, adjustments] = await Promise.all([
          supabase.from("class_payments").select("charge_id,amount").in("charge_id", ids),
          supabase.from("class_balance_adjustments").select("charge_id,amount").in("charge_id", ids)
        ]);
        if (payments.error || adjustments.error) throw (payments.error || adjustments.error);
        paymentRows.push(...(payments.data || []));
        adjustmentRows.push(...(adjustments.data || []));
      }
      const paidByCharge: Record<string, number> = {};
      const adjustedByCharge: Record<string, number> = {};
      paymentRows.forEach(p => { paidByCharge[p.charge_id] = (paidByCharge[p.charge_id] || 0) + Number(p.amount); });
      adjustmentRows.forEach(a => { adjustedByCharge[a.charge_id] = (adjustedByCharge[a.charge_id] || 0) + Number(a.amount); });
      const summaries: Record<string, { contracted: number; received: number; cancelled: number; chargeCount: number }> = {};
      chargeRows.forEach(c => {
        if (!c.enrollment_id) return;
        const item = summaries[c.enrollment_id] ||= { contracted: 0, received: 0, cancelled: 0, chargeCount: 0 };
        item.contracted += Number(c.amount);
        item.received += paidByCharge[c.id] || 0;
        item.cancelled += adjustedByCharge[c.id] || 0;
        item.chargeCount += 1;
      });
      setClassFinancialSummary(summaries);
    } catch (err: any) {
      setClassFinancialLoadError(`Não foi possível carregar os saldos: ${err?.message || "erro desconhecido"}`);
    } finally { setClassFinancialLoading(false); }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadClassFinancialSummary();
  }, [isAuthenticated, enrollments]);

  const getClassFinancialStatus = (en: ClassEnrollment) => {
    const item = classFinancialSummary[en.id];
    if (!item || !item.chargeCount) return "sem_cobranca";
    const balance = Math.max(0, Math.round((item.contracted - item.received - item.cancelled) * 100) / 100);
    if (balance > 0) return item.received > 0 ? "parcial" : "pendente";
    if (item.cancelled > 0) return "cancelado";
    return "quitado";
  };
  const classFinancialLabels: Record<string, string> = {
    sem_cobranca: "Sem cobrança", pendente: "Saldo pendente", parcial: "Pagamento parcial",
    quitado: "Quitado", cancelado: "Saldo cancelado"
  };

  const enrollmentDateInArena = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const part = (type: string) => parts.find(p => p.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };

  const filteredEnrollments = enrollments.filter((en) => {
    const enrolledOn = enrollmentDateInArena(en.created_at);
    if (enrollmentPeriodType === "day" && enrollmentPeriodDay && enrolledOn !== enrollmentPeriodDay) return false;
    if (enrollmentPeriodType === "month" && enrollmentPeriodMonth && !enrolledOn.startsWith(enrollmentPeriodMonth)) return false;
    if (enrollmentPeriodType === "year" && enrollmentPeriodYear && !enrolledOn.startsWith(enrollmentPeriodYear)) return false;
    if (enrollmentPeriodType === "custom") {
      if (enrollmentPeriodStart && enrolledOn < enrollmentPeriodStart) return false;
      if (enrollmentPeriodEnd && enrolledOn > enrollmentPeriodEnd) return false;
    }
    const matchesSport = classSportFilter === "Todos" || en.sport.toLowerCase() === classSportFilter.toLowerCase();
    if (!matchesSport) return false;
    if (classEnrollmentStatusFilter === "ativa" && !isActiveEnrollment(en.status)) return false;
    if (classEnrollmentStatusFilter === "encerrada" && en.status !== "encerrada") return false;
    const financialStatus = getClassFinancialStatus(en);
    if (classFinancialFilter === "pendente" && financialStatus !== "pendente" && financialStatus !== "parcial") return false;
    if (classFinancialFilter !== "todos" && classFinancialFilter !== "pendente" && financialStatus !== classFinancialFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchQuery = en.code.toLowerCase().includes(q) || en.student_name.toLowerCase().includes(q) || (en.student_phone && en.student_phone.includes(q));
      if (!matchQuery) return false;
    }
    return true;
  });

  const enrollmentTotalPages = Math.max(1, Math.ceil(filteredEnrollments.length / enrollmentPageSize));
  const currentEnrollmentPage = Math.min(enrollmentPage, enrollmentTotalPages);
  const visibleEnrollments = filteredEnrollments.slice((currentEnrollmentPage - 1) * enrollmentPageSize, currentEnrollmentPage * enrollmentPageSize);

  if (!mounted || checkingSession) return null;

  if (resetMode) return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={handleSaveNewPassword} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
        <h1 className="font-black text-[#041E8C]">Definir nova senha</h1>
        <input type="password" minLength={8} required autoComplete="new-password"
          placeholder="Nova senha (mínimo 8 caracteres)" value={newPasswordInput}
          onChange={e => setNewPasswordInput(e.target.value)}
          className="w-full p-3 border rounded-xl" />
        <button type="submit" className="w-full p-3 rounded-xl bg-[#041E8C] text-white font-bold">Salvar nova senha</button>
      </form>
    </main>
  );

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-[#041E8C] text-[#00E599] rounded-2xl mx-auto flex items-center justify-center shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#041E8C] uppercase tracking-wider">Painel do Gestor</h1>
            <p className="text-xs text-slate-500 mt-1">Entre com seu e-mail e senha de acesso.</p>
          </div>
           
          <form action="#" method="POST" onSubmit={handleLogin} className="space-y-3.5 text-left">
            <div>
  <label htmlFor="email" className="text-[11px] font-bold text-slate-600 block mb-1">E-mail do Gestor</label>
  <input
    id="email"
    name="email"
    type="email"
    autoComplete="username"
    placeholder="seu.email@exemplo.com"
    value={loginEmail}
    onChange={(e) => setLoginEmail(e.target.value)}
    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#041E8C]"
    required
  />
</div>
<div>
  <label htmlFor="password" className="text-[11px] font-bold text-slate-600 block mb-1">Senha</label>
  <input
    id="password"
    name="password"
    type="password"
    autoComplete="current-password"
    placeholder="••••••••"
    value={loginPin}
    onChange={(e) => setLoginPin(e.target.value)}
    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#041E8C]"
    required
  />
</div>

            {loginError && <p className="text-xs text-red-600 font-bold text-center">{loginError}</p>}

            <button type="submit" className="w-full py-3.5 bg-[#041E8C] hover:bg-[#031566] text-white font-black rounded-xl transition shadow-md text-xs tracking-wide">
              ACESSAR PAINEL
            </button>
          </form>

          <div className="pt-1 flex items-center justify-between text-xs">
            <button 
              type="button" 
              onClick={() => { setForgotModalOpen(true); setEmailSentSuccess(false); }} 
              className="font-bold text-[#041E8C] hover:underline"
            >
              Esqueci minha senha?
            </button>
            <Link href="/" className="font-bold text-slate-400 hover:text-slate-600">
              ← Voltar ao site
            </Link>
          </div>
        </div>

        {forgotModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl text-left">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xs font-black text-[#041E8C] uppercase">Recuperar Senha por E-mail</h3>
                <button onClick={() => setForgotModalOpen(false)}><X className="w-5 h-5" /></button>
              </div>

              {emailSentSuccess ? (
                <div className="space-y-3 text-center py-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">E-mail de recuperação enviado com sucesso!</p>
                  <button 
                    onClick={() => setForgotModalOpen(false)} 
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetEmail} className="space-y-3">
                  <p className="text-xs text-slate-500">Informe seu e-mail cadastrado. Enviaremos um link de recuperação instantâneo.</p>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">E-mail Cadastrado</label>
                    <input
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-[#041E8C] text-white font-black text-xs rounded-xl shadow-md">
                    Enviar Link de Recuperação
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  const occupancyFilteredItems = Object.entries(classScheduleMap).flatMap(([sport, categories]) =>
    Object.entries(categories).flatMap(([category, schedules]) => schedules.map(schedule => ({sport, category, schedule})))
  ).filter(item => occupancySport === "Todas" || item.sport === occupancySport)
   .filter(item => occupancyLevel === "Todos" || item.category === occupancyLevel)
   .filter(item => occupancyClass === "Todas" || item.schedule === occupancyClass)
   .filter(item => {
     if (!occupancyDate) return true;
     const weekday = new Date(`${occupancyDate}T12:00:00`).getDay();
     return (item.schedule.includes("Segunda") && (weekday === 1 || weekday === 3)) ||
       (item.schedule.includes("Terça") && (weekday === 2 || weekday === 4));
   });
  const occupancyTotalPages = Math.max(1, Math.ceil(occupancyFilteredItems.length / occupancyPageSize));
  const currentOccupancyPage = Math.min(occupancyPage, occupancyTotalPages);
  const visibleOccupancyItems = occupancyFilteredItems.slice(
    (currentOccupancyPage - 1) * occupancyPageSize,
    currentOccupancyPage * occupancyPageSize
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20 [&_button:not(:disabled)]:cursor-pointer [&_a]:cursor-pointer [&_select]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=radio]]:cursor-pointer">
      <header className="bg-[#041E8C] border-b border-[#021359] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link href="/" className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition flex items-center gap-1 text-xs font-bold"><ArrowLeft className="w-4 h-4" /><span>Voltar ao Site</span></Link>
            <h1 className="text-base font-black tracking-wide text-white uppercase italic">Painel do Gestor</h1>
          </div>
           
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black text-xs rounded-xl transition shadow">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>

            <button 
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-sm ${activeTab === "config" ? "bg-white text-[#041E8C]" : "bg-white/10 hover:bg-white/20 text-white border border-white/20"}`}
            >
              <Settings className="w-4 h-4 text-[#00E599]" />
              <span>Configurações</span>
            </button>

            <button 
              onClick={handleLogout} 
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition shadow"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><DollarSign className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Receita Total</p><p className="text-lg font-black text-[#041E8C]">{formatCurrency(totalRevenue)}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 text-[#041E8C] flex items-center justify-center shrink-0"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Confirmadas</p><p className="text-lg font-black text-slate-800">{confirmedBookings.length + activeEnrollments.length}</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Origem</p><p className="text-xs font-bold text-slate-700"><span className="text-emerald-600">{onlineBookingsCount} Site</span> / {manualBookingsCount} Balcão</p></div></div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5" /></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Canceladas</p><p className="text-lg font-black text-red-600">{cancelledBookingsCount + enrollments.filter(e => e.status === "cancelada").length}</p></div></div>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto gap-1">
          <button onClick={() => setActiveTab("grid")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "grid" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><BarChart3 className="w-4 h-4 text-[#00E599]" /> 1. Horários</button>
          <button onClick={() => setActiveTab("reports")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "reports" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><PieChart className="w-4 h-4 text-[#00E599]" /> 2. Financeiro</button>
          <button onClick={() => setActiveTab("bookings")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "bookings" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Calendar className="w-4 h-4 text-[#00E599]" /> 3. Reservas</button>
          <button onClick={() => setActiveTab("classes")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><GraduationCap className="w-4 h-4 text-[#00E599]" /> 4. Alunos & Aulas </button>
          <button onClick={() => setActiveTab("locks_classes")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "locks_classes" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><Lock className="w-4 h-4 text-[#00E599]" /> 5. Grade de Aulas e Bloqueios</button>
          <button onClick={() => setActiveTab("prices")} className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl transition whitespace-nowrap flex items-center justify-center gap-1.5 ${activeTab === "prices" ? "bg-[#041E8C] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><DollarSign className="w-4 h-4 text-[#00E599]" /> 6. Gestão de Preços</button>
        </div>

        {/* 1. GRADE DIÁRIA (Horários nas linhas 06h-22h e Quadras nas colunas) */}
        {activeTab === "grid" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Grade Horária Operacional (05:00 às 23:00)</h2>
                {isPastDate && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">{retroactiveEnabled ? "Modo Histórico (Lançamento Retroativo)" : "Modo Histórico (Somente Leitura)"}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => changeDateByDays(-1)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><ChevronLeft className="w-4 h-4" /></button>
                <input type="date" value={gridDate} onChange={(e) => setGridDate(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                <button type="button" onClick={() => changeDateByDays(1)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {isPastDate && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-900">
                  {retroactiveEnabled
                    ? "Lançamento retroativo autorizado apenas para esta data. Horários ocupados e bloqueios continuam protegidos."
                    : "Histórico protegido: habilite apenas para cadastrar uma reserva que ocorreu nesta data."}
                </p>
                <button type="button" className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${retroactiveEnabled ? "bg-white border border-amber-300 text-amber-900" : "bg-amber-600 text-white hover:bg-amber-700"}`}
                  onClick={() => {
                    if (retroactiveEnabled) { setRetroactiveAuthorizedDate(null); return; }
                    if (window.confirm(`Autorizar lançamento retroativo em ${gridDate}?\n\nUse apenas para registrar reservas que realmente ocorreram. A data original de criação (created_at) será preservada para auditoria. Horários ocupados e bloqueados não serão liberados.`)) {
                      setRetroactiveAuthorizedDate(gridDate);
                    }
                  }}>
                  {retroactiveEnabled ? "Desabilitar lançamento retroativo" : "Habilitar lançamento retroativo"}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border">
              <span>🟢 <strong>Livre:</strong> Clique para inserção balcão</span>
              <span>🔵 <strong>Reservado:</strong> Ocupado por cliente</span>
              <span>🔒 <strong>Fechado/Inativo:</strong> Clique no botão da linha para abrir horário</span>
            </div>

            <div className="overflow-x-auto pb-2 border border-slate-200 rounded-2xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#041E8C] text-white text-[11px]">
                    <th className="p-3 border-r border-[#021359] sticky left-0 bg-[#041E8C] z-10 w-32 text-center">Horário / Ação</th>
                    {allCourts.map((court) => (
                      <th key={court.id} className="p-3 border-r border-[#021359] text-center font-bold min-w-[140px]">
                        {court.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {businessHours.map((time) => {
                    const parts = gridDate.split("-").map(Number);
                    const dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
                    const allRowLocked = allCourts.every(c => cloudLocks.some(l => l.court_id === c.id && l.lock_time === time && (l.lock_date === gridDate || l.day_of_week === dayOfWeek)));

                    return (
                      <tr key={time} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50 border-r border-slate-200 sticky left-0 z-10 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span>{time}</span>
                            {!isPastDate && (
                              <button 
                                type="button" 
                                onClick={() => toggleEntireHourRow(time)} 
                                className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${allRowLocked ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}
                              >
                                {allRowLocked ? "🔒 Fechado" : "🔓 Aberto"}
                              </button>
                            )}
                          </div>
                        </td>
                        {allCourts.map((court) => {
                          const slot = getSlotStatus(court.id, time, gridDate);
                          return (
                            <td key={court.id} className="p-2 border-r border-slate-200 text-center">
                              {slot.type === "free" ? (
                                !canCreateOnGridDate ? (
                                  <div className="w-full p-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-[11px]">Ocioso</div>
                                ) : (
                                  <button type="button" onClick={() => handleCellClick(court, time, slot.type)} className="w-full p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px] shadow-xs">+ Livre</button>
                                )
                              ) : slot.type === "booked" ? (
                                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[10px] text-center" title={`${slot.label} (${slot.sub})`}>
                                  <div className="font-black truncate">🔵 {slot.label}</div>
                                  <div className="text-[9px] font-semibold truncate">{bookings.find(b => b.courtId === court.id && b.date === gridDate && b.time === time && b.status === "confirmada")?.sport || "Reserva"}</div>
                                  <div className="text-[9px] text-blue-700 truncate">{slot.sub}</div>
                                </div>
                              ) : (
                                <div className="p-2 rounded-xl bg-slate-200 text-slate-700 text-[10px] text-center" title={slot.classInfo ? `${slot.classInfo.sport} · ${slot.classInfo.category} · Professor: ${slot.classInfo.professor}` : `${slot.label} · ${slot.sub}`}>
                                  <div className="font-black flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Bloqueado</div>
                                  {slot.classInfo ? (
                                    <>
                                      <div className="text-[9px] font-bold leading-tight mt-1 break-words">{slot.classInfo.sport}</div>
                                      <div className="text-[9px] leading-tight mt-0.5">{slot.classInfo.category}</div>
                                      <div className="text-[9px] text-slate-600 leading-tight mt-0.5 break-words">Prof. {slot.classInfo.professor}</div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-[9px] font-semibold leading-tight mt-1 break-words">{slot.label}</div>
                                      <div className="text-[9px] text-slate-500">{slot.sub}</div>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. RESUMO FINANCEIRO */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#00E599]" />
                    Resumo Financeiro & Desempenho
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Métricas dinâmicas consolidadas com filtros de tipo, esporte e período.</p>
                </div>
                 
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setReportPeriodType("month")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "month" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Mês</button>
                    <button onClick={() => setReportPeriodType("year")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "year" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Ano</button>
                    <button onClick={() => setReportPeriodType("all")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "all" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Geral</button>
                    <button onClick={() => setReportPeriodType("custom")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${reportPeriodType === "custom" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Intervalo</button>
                  </div>

                  {reportPeriodType === "month" && (
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                  )}

                  {reportPeriodType === "year" && (
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none">
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  )}

                  {reportPeriodType === "custom" && (
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                      <span className="text-xs text-slate-400">até</span>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Filtrar por Categoria:</span>
                <div className="flex gap-1.5">
                  {["Todos", "Reservas", "Aulas"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setReportTypeFilter(type as any)}
                      className={`text-xs font-black px-4 py-2 rounded-xl transition ${
                        reportTypeFilter === type ? "bg-[#041E8C] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Filtrar por Esporte:</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {["Todas", ...orderedSportsList].map((sport) => (
                    <button
                      key={sport}
                      onClick={() => setReportSportFilter(sport)}
                      className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                        reportSportFilter === sport ? "bg-[#00E599] text-[#041E8C] shadow-xs font-black" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>

              {/* Etapa 13 — Resumo único, sem cartões duplicados. */}
              {reportLedgerError && <p className="text-xs text-red-600">{reportLedgerError}</p>}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black uppercase text-[#041E8C]">Resultado financeiro</h3>
                  <button type="button" onClick={() => void loadReportLedger()} disabled={reportLedgerLoading} className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 text-[#041E8C] disabled:opacity-50">{reportLedgerLoading ? "Atualizando..." : "Atualizar dados"}</button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-emerald-800">Recebido no período</p>
                    <p className="text-xl font-black text-emerald-700">{reportLedgerLoading ? "..." : formatCurrency(reportCashTotal)}</p>
                    <p className="text-xs text-emerald-800">{reportCashCount} pagamentos</p>
                    {reportTypeFilter === "Todos" && <p className="text-[10px] text-emerald-800">Aulas {formatCurrency(reportClassLedger.received)} · Reservas {formatCurrency(reportBookingCash.received)}</p>}
                  </div>
                  {reportTypeFilter !== "Reservas" && <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-rose-700">Pendente atual — aulas</p>
                    <p className="text-xl font-black text-rose-700">{reportLedgerLoading ? "..." : formatCurrency(reportClassLedger.totalOutstanding)}</p>
                    <p className="text-xs text-rose-700">{reportClassLedger.outstandingCount} cobranças em aberto</p>
                  </div>}
                  {reportTypeFilter !== "Reservas" && <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Contratado no período — aulas</p>
                    <p className="text-xl font-black text-[#041E8C]">{reportLedgerLoading ? "..." : formatCurrency(reportClassLedger.contracted)}</p>
                    <p className="text-xs text-slate-600">{reportClassLedger.contractedCount} cobranças</p>
                  </div>}
                  {reportTypeFilter !== "Reservas" && <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Não concretizado — aulas</p>
                    <p className="text-xl font-black text-[#041E8C]">{reportLedgerLoading ? "..." : formatCurrency(reportClassLedger.cancelled)}</p>
                    <p className="text-xs text-slate-600">{reportClassLedger.cancelledCount} cobranças com saldo perdoado</p>
                  </div>}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border rounded-xl p-4"><p className="text-xs font-bold text-slate-500">Descontos identificados</p><p className="text-xl font-black">{formatCurrency(reportDiscountTotal)}</p></div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs font-bold text-amber-800">Taxas financeiras</p><p className="text-xl font-black text-amber-900">{formatCurrency(reportCardFees)}</p></div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><p className="text-xs font-bold text-emerald-800">Recebido líquido de taxas</p><p className="text-xl font-black text-emerald-800">{formatCurrency(reportCashTotal-reportCardFees)}</p></div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-rose-800">Perdas financeiras encerradas</p>
                  <p className="text-xl font-black text-rose-800">{formatCurrency(reportFinancialLosses.amount)}</p>
                  <p className="text-xs text-rose-700">{reportFinancialLosses.count} ajuste(s) de perda no período</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-bold text-slate-700">Cancelamentos contratuais no período</p>
                    <p className="text-xl font-black text-[#041E8C]">{formatCurrency(reportContractCancellations.amount)}</p>
                    <p className="text-xs text-slate-600">{reportContractCancellations.count} ajuste(s) de baixa contratual; não são perdas nem recebimentos</p>
                  </div>
                  {reportTypeFilter !== "Aulas" && <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-bold text-rose-800">Pendente atual — reservas</p>
                    <p className="text-xl font-black text-rose-800">{formatCurrency(reportBookingOutstanding.amount)}</p>
                    <p className="text-xs text-rose-700">{reportBookingOutstanding.count} reserva(s) com dívida em aberto, incluindo encerramentos com saldo mantido</p>
                  </div>}
                </div>
                <p className="text-[10px] text-slate-500">Descontos já aplicados ao preço não são subtraídos novamente dos pagamentos. Taxas só aparecem para transações com metadados registrados.</p>
                <p className="text-[10px] text-slate-500">Recebido: pagamentos lançados no período, não reservas confirmadas. Pendente: saldo acumulado atual de aulas e reservas, descontando pagamentos e ajustes. Perdas encerradas não são saldo pendente.</p>
              </div>
              {reportTypeFilter !== "Aulas" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-black uppercase text-[#041E8C]">Reservas no período</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-slate-500">Confirmadas</p><p className="text-lg font-black">{reportBookingCounts.confirmedCount}</p><p className="text-xs">{formatCurrency(reportBookingCounts.confirmedValue)}</p></div>
                    <div><p className="text-xs text-slate-500">Canceladas</p><p className="text-lg font-black">{reportBookingCounts.cancelledCount}</p><p className="text-xs">{formatCurrency(reportBookingCounts.cancelledValue)}</p></div>
                  </div>
                  <p className="text-[10px] text-slate-500">Por código único; valores das reservas, não recebimentos. Filtro pela data reservada.</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-black uppercase text-[#041E8C]">Conversão do site em reservas pagas</h3>
                  <p className="text-2xl font-black text-purple-600">{onlineConversion.percent.toFixed(1)}%</p>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-purple-600" style={{width:`${onlineConversion.percent}%`}} /></div>
                  <p className="text-xs font-semibold text-slate-600">{onlineConversion.complete} confirmadas e integralmente pagas de {onlineConversion.total} reservas criadas pelo site</p>
                  <p className="text-[10px] text-slate-500">Não é conversão de visitantes: mede reservas registradas no site. Pagamentos parciais não contam como integralmente pagos.</p>
                </div>
              </div>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#041E8C]">Recebimentos efetivos por origem</h3>
                  {(() => {
                    const entries = [
                      ...(reportTypeFilter !== "Reservas" ? [{label:"Aulas",value:reportClassLedger.received,color:"bg-emerald-500"}] : []),
                      ...(reportTypeFilter !== "Aulas" ? [{label:"Reservas",value:reportBookingCash.received,color:"bg-blue-500"}] : [])
                    ];
                    const max = Math.max(1,...entries.map(e=>e.value));
                    return entries.map(e=><div key={e.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700"><span>{e.label}</span><span>{formatCurrency(e.value)}</span></div>
                      <div className="h-4 rounded bg-slate-100 overflow-hidden"><div className={`h-full rounded ${e.color}`} style={{width:`${e.value/max*100}%`}} /></div>
                    </div>);
                  })()}
                  <p className="text-[10px] text-slate-500">Valores efetivamente registrados como recebidos no período. O gráfico respeita categoria, modalidade e datas selecionadas.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#041E8C] flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500"/> Análises e sugestões do sistema</h3>
                  <ul className="space-y-2">{reportInsights.map((insight,i)=><li key={i} className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2">{insight}</li>)}</ul>
                  <p className="text-[10px] text-slate-500">Insights automáticos baseados em regras e dados registrados, não em previsões de IA. Não são inventadas tendências ou comparações históricas.</p>
                </div>
              </div>
              {/* Etapa 17 — painel recolhível de pendências. */}
              <section className="border-t border-slate-100 pt-4 space-y-3">
                <button type="button" onClick={() => setPendingExpanded(v=>!v)} aria-expanded={pendingExpanded}
                  className="w-full flex items-center justify-between gap-3 text-left bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-slate-100">
                  <span className="flex items-center gap-2 text-sm font-black text-[#041E8C]"><DollarSign className="w-4 h-4"/> Pendências financeiras <span className="text-xs font-medium text-slate-500">({pendingRows.length} em aberto)</span></span>
                  <span className="text-xs font-bold text-[#041E8C]">{pendingExpanded ? "Recolher −" : "Expandir +"}</span>
                </button>
                {pendingExpanded && <div className="space-y-3 border border-slate-200 rounded-xl p-3 md:p-4">
                  <p className="text-xs text-slate-500">Saldos a receber não são necessariamente atrasos. O modo "Exige atenção" mostra somente cobranças com vencimento ultrapassado ou nos próximos 2 dias. Reservas e contratos sem data de vencimento continuam acessíveis em "Todos os saldos".</p>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <button type="button" onClick={()=>{setPendingAttention("attention");setPendingPage(1);}} className={`rounded-lg px-3 py-2 font-bold ${pendingAttention==="attention"?"bg-[#041E8C] text-white":"bg-slate-100 text-slate-700"}`}>Exige atenção</button>
                    <button type="button" onClick={()=>{setPendingAttention("all");setPendingPage(1);}} className={`rounded-lg px-3 py-2 font-bold ${pendingAttention==="all"?"bg-[#041E8C] text-white":"bg-slate-100 text-slate-700"}`}>Todos os saldos</button>
                    <button type="button" onClick={()=>{setPendingSearch("");setPendingOrigin("Todos");setPendingSport("Todas");setPendingPeriod("all");setPendingMonth("");setPendingFrom("");setPendingTo("");setPendingSort("maior");setPendingPageSize(10);setPendingPage(1);}} className="rounded-lg px-3 py-2 font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">Limpar filtros</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input aria-label="Pesquisar pendências" placeholder="Nome, telefone ou código" value={pendingSearch} onChange={e=>{setPendingSearch(e.target.value);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs"/>
                    <select aria-label="Origem da pendência" value={pendingOrigin} onChange={e=>{setPendingOrigin(e.target.value as typeof pendingOrigin);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs">{["Todos","Reservas","Aulas"].map(x=><option key={x}>{x}</option>)}</select>
                    <select aria-label="Modalidade da pendência" value={pendingSport} onChange={e=>{setPendingSport(e.target.value);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs">{["Todas",...orderedSportsList].map(x=><option key={x}>{x}</option>)}</select>
                    <select aria-label="Período das pendências" value={pendingPeriod} onChange={e=>{setPendingPeriod(e.target.value as typeof pendingPeriod);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs"><option value="all">Todo o período</option><option value="month">Mês</option><option value="custom">Intervalo</option></select>
                    {pendingPeriod==="month" && <input aria-label="Mês da pendência" type="month" value={pendingMonth} onChange={e=>{setPendingMonth(e.target.value);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs"/>}
                    {pendingPeriod==="custom" && <><input aria-label="Data inicial da pendência" type="date" value={pendingFrom} onChange={e=>{setPendingFrom(e.target.value);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs"/><input aria-label="Data final da pendência" type="date" min={pendingFrom || undefined} value={pendingTo} onChange={e=>{setPendingTo(e.target.value);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs"/></>}
                    <select aria-label="Ordenação das pendências" value={pendingSort} onChange={e=>{setPendingSort(e.target.value);setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs"><option value="maior">Maior saldo primeiro</option><option value="menor">Menor saldo primeiro</option><option value="antigas">Mais antigas primeiro</option><option value="recentes">Mais recentes primeiro</option><option value="nome">Nome (A–Z)</option></select>
                    <select aria-label="Itens por página" value={pendingPageSize} onChange={e=>{setPendingPageSize(Number(e.target.value));setPendingPage(1);}} className="border rounded-lg px-3 py-2 text-xs">{[10,25,50].map(n=><option key={n} value={n}>{n} por página</option>)}</select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-3"><p className="text-[10px] uppercase font-bold text-rose-700">Saldo em aberto (filtros da lista)</p><p className="font-black text-rose-800">{formatCurrency(pendingTotals.balance)}</p></div>
                    <div className="bg-slate-50 border rounded-lg p-3"><p className="text-[10px] uppercase font-bold text-slate-600">Cobranças / reservas</p><p className="font-black text-[#041E8C]">{filteredPendingRows.length}</p></div>
                  </div>
                  {reportLedgerError && <p className="text-xs text-red-700">Não foi possível carregar todas as cobranças de aulas. A lista pode estar incompleta.</p>}
                  <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Cliente / aluno</th><th className="p-2">Origem / modalidade</th><th className="p-2">Data</th><th className="p-2">Vencimento / situação</th><th className="p-2 text-right">Original</th><th className="p-2 text-right">Recebido</th><th className="p-2 text-right">Ajustes</th><th className="p-2 text-right">Saldo</th><th className="p-2 text-right">Ação</th></tr></thead><tbody>
                    {pendingVisibleRows.map(r=><tr key={r.key} className="border-t border-slate-100"><td className="p-2 font-semibold">{r.name}<span className="block font-normal text-slate-500">{r.phone || r.code || "—"}</span></td><td className="p-2">{r.origin}<span className="block text-slate-500">{r.sport}</span></td><td className="p-2 whitespace-nowrap">{formatDateToBR(r.date)}</td><td className="p-2 whitespace-nowrap"><span className={`font-bold ${r.dueStatus==="vencido"?"text-red-700":r.dueStatus==="proximo"?"text-amber-700":"text-slate-500"}`}>{r.dueStatus==="vencido"?"Vencido":r.dueStatus==="proximo"?"Próximo":r.dueStatus==="futuro"?"A vencer":"Sem vencimento definido"}</span>{r.nextDue&&<span className="block text-slate-500">{formatDateToBR(r.nextDue)}</span>}</td><td className="p-2 text-right whitespace-nowrap">{formatCurrency(r.total)}</td><td className="p-2 text-right whitespace-nowrap">{formatCurrency(r.received)}</td><td className="p-2 text-right whitespace-nowrap" title="Descontos, perdas ou outros ajustes já aplicados à obrigação">{formatCurrency(r.adjusted)}</td><td className="p-2 text-right whitespace-nowrap font-black text-rose-700">{formatCurrency(r.balance)}</td><td className="p-2 text-right"><button type="button" onClick={()=>void openPendingRow(r)} className="bg-[#041E8C] text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">{r.chargeType==="avulsa" ? "Detalhes" : "Receber"}</button></td></tr>)}
                    {pendingVisibleRows.length===0 && <tr><td colSpan={9} className="p-4 text-center text-slate-500">Nenhuma pendência encontrada para os filtros selecionados.</td></tr>}
                  </tbody></table></div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-600"><span>Página {pendingCurrentPage} de {pendingPages}</span><div className="flex gap-2"><button type="button" disabled={pendingCurrentPage<=1} onClick={()=>setPendingPage(p=>Math.max(1,p-1))} className="border rounded-lg px-3 py-1.5 disabled:opacity-40">Anterior</button><button type="button" disabled={pendingCurrentPage>=pendingPages} onClick={()=>setPendingPage(p=>Math.min(pendingPages,p+1))} className="border rounded-lg px-3 py-1.5 disabled:opacity-40">Próxima</button></div></div>
                  <p className="text-[10px] text-slate-500">Ajustes incluem descontos, perdas e outras baixas registradas; não são recebimentos. Saldo = original − recebido − ajustes (mínimo zero). Para aulas avulsas, o botão abre o histórico existente.</p>
                </div>}
              </section>
            </div>
          </div>
        )}

        {/* 3. RESERVAS COM PESQUISA POR NOME E CÓDIGO */}
        {activeTab === "bookings" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div>
                <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">Histórico de Reservas Consolidado</h2>
                <p className="text-xs text-slate-500 mt-0.5">Filtre por dia, mês, ano ou intervalo de datas.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
<div className="flex bg-slate-100 p-1 rounded-xl">
  <button onClick={() => { setBookingPeriodType("day"); setSelectedBookingDay(todayString); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${bookingPeriodType === "day" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Dia</button>
  <button onClick={() => { setBookingPeriodType("month"); setSelectedBookingMonth(todayString.substring(0, 7)); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${bookingPeriodType === "month" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Mês</button>
  <button onClick={() => { setBookingPeriodType("year"); setSelectedBookingYear(todayString.substring(0, 4)); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${bookingPeriodType === "year" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Ano</button>
  <button onClick={() => setBookingPeriodType("all")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${bookingPeriodType === "all" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Geral</button>
  <button onClick={() => setBookingPeriodType("custom")} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${bookingPeriodType === "custom" ? "bg-[#041E8C] text-white" : "text-slate-600"}`}>Intervalo</button>
</div>

                {(["day", "month", "year"] as const).includes(bookingPeriodType as "day" | "month" | "year") && (
                  <button type="button" onClick={() => shiftBookingPeriod(-1)} aria-label="Período anterior" title="Período anterior" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[#041E8C] transition"><ChevronLeft className="w-4 h-4" /></button>
                )}
                {bookingPeriodType === "day" && (
                  <input type="date" value={selectedBookingDay} onChange={(e) => setSelectedBookingDay(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                )}

                {bookingPeriodType === "month" && (
                  <input type="month" value={selectedBookingMonth} onChange={(e) => setSelectedBookingMonth(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                )}

                {bookingPeriodType === "year" && (
                  <input type="number" min="2000" max="2100" value={selectedBookingYear} onChange={(e) => setSelectedBookingYear(e.target.value)} className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none" />
                )}

                {bookingPeriodType === "custom" && (
                  <div className="flex items-center gap-1.5">
                    <input type="date" value={customBookingStart} onChange={(e) => setCustomBookingStart(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    <span className="text-xs text-slate-400">até</span>
                    <input type="date" value={customBookingEnd} onChange={(e) => setCustomBookingEnd(e.target.value)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                  </div>
                )}
                {(["day", "month", "year"] as const).includes(bookingPeriodType as "day" | "month" | "year") && (
                  <button type="button" onClick={() => shiftBookingPeriod(1)} aria-label="Próximo período" title="Próximo período" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[#041E8C] transition"><ChevronRight className="w-4 h-4" /></button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {["Todos", ...orderedSportsList].map((s) => (
                  <button key={s} onClick={() => setBookingSportFilter(s)} className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${bookingSportFilter === s ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Pesquisar por nome ou código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64 outline-none" />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Status:</span>
              {(["Todos", "Confirmada", "Cancelada", "Finalizada"] as const).map((status) => (
                <button key={status} type="button" onClick={() => setBookingStatusFilter(status)} className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl transition ${bookingStatusFilter === status ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {status === "Todos" ? "Todos" : status === "Confirmada" ? "Confirmadas" : status === "Cancelada" ? "Canceladas" : "Finalizadas"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <label>Por página <select value={bookingPageSize} onChange={e => {setBookingPageSize(Number(e.target.value));setBookingPage(1);}} className="ml-2 p-2 border rounded-lg"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
              <span>{consolidatedBookingsList.length ? `${(currentBookingPage-1)*bookingPageSize+1}–${Math.min(currentBookingPage*bookingPageSize,consolidatedBookingsList.length)} de ${consolidatedBookingsList.length}` : "Nenhuma reserva"}</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left min-w-[760px]">
                <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Código / cliente</th><th className="p-3">Data / horário / quadra</th><th className="p-3">Situação</th><th className="p-3 text-right">Valor / saldo</th><th className="p-3 text-right">Ação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleConsolidatedBookings.map(cb => {
                    const ended = cb.slots.length > 0 && cb.slots.every(slot => slotHasEnded(slot.date,slot.time));
                    const status = cb.status === "cancelada" ? "Cancelada" : ended ? "Finalizada" : "Confirmada";
                    const financial = bookingFinancials(cb.code,cb.totalPrice);
                    return <tr key={cb.code} className="hover:bg-slate-50">
                      <td className="p-3"><p className="font-mono font-black text-[#041E8C]">{cb.code}</p><p className="font-semibold text-slate-800">{cb.customerName}</p></td>
                      <td className="p-3"><p className="font-semibold">{formatDateToBR(cb.date)} · {cb.slots.map(slot=>slot.time).join(", ")}</p><p className="text-slate-500">{Array.from(new Set(cb.slots.map(slot=>allCourts.find(c=>c.id===slot.courtId)?.name || slot.courtId))).join(", ")}</p></td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full font-bold ${status==="Confirmada"?"bg-emerald-100 text-emerald-800":status==="Cancelada"?"bg-red-100 text-red-800":"bg-slate-200 text-slate-700"}`}>{status}</span></td>
                      <td className="p-3 text-right"><p className="font-black text-[#041E8C]">{formatCurrency(cb.totalPrice)}</p><p className="text-slate-500">Saldo: {formatCurrency(financial.remaining)}</p></td>
                      <td className="p-3 text-right"><button type="button" onClick={()=>setSelectedBookingDetail(cb)} className="px-3 py-2 rounded-lg bg-blue-50 text-[#041E8C] font-bold hover:bg-blue-100">Ver detalhes</button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600"><span>Página {currentBookingPage} de {bookingTotalPages}</span><div className="flex gap-2"><button disabled={currentBookingPage===1} onClick={()=>setBookingPage(p=>Math.max(1,p-1))} className="p-2 border rounded-lg disabled:opacity-40">Anterior</button><button disabled={currentBookingPage===bookingTotalPages} onClick={()=>setBookingPage(p=>Math.min(bookingTotalPages,p+1))} className="p-2 border rounded-lg disabled:opacity-40">Próxima</button></div></div>
          </div>
        )}

        {selectedBookingDetail && (() => {
          const cb = selectedBookingDetail;
          const financial = bookingFinancials(cb.code,cb.totalPrice);
          const ended = cb.slots.length > 0 && cb.slots.every(slot=>slotHasEnded(slot.date,slot.time));
          const anyEnded = cb.slots.some(slot=>slotHasEnded(slot.date,slot.time));
          const payments = bookingPayments.filter(p=>p.booking_code===cb.code);
          const adjustments = bookingAdjustments.filter(a=>a.booking_code===cb.code);
          return <div role="dialog" aria-modal="true" aria-label={`Detalhes da reserva ${cb.code}`} className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={()=>setSelectedBookingDetail(null)}>
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-5 space-y-4 shadow-xl" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-start gap-3"><div><h3 className="font-black text-[#041E8C] text-lg">Reserva {cb.code}</h3><p className="text-xs text-slate-500">{cb.status==="cancelada"?"Cancelada":ended?"Finalizada":"Confirmada"} · {cb.channel === "manual" ? "Balcão" : "Online"}</p></div><button aria-label="Fechar detalhes" onClick={()=>setSelectedBookingDetail(null)} className="p-2 rounded-lg hover:bg-slate-100"><X size={20}/></button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border"><div><p className="text-slate-500">Cliente</p><p className="font-bold">{cb.customerName}</p><p>{cb.customerPhone || "Telefone não informado"}</p><p className="break-all">{cb.customerEmail || "E-mail não informado"}</p></div><div><p className="text-slate-500">Data da reserva</p><p className="font-bold">{formatDateToBR(cb.date)}</p></div></div>
              <section className="space-y-2"><h4 className="text-sm font-black text-[#041E8C]">Horários e quadras</h4>{cb.details.map((detail,i)=><p key={i} className="p-2 bg-slate-50 border rounded-lg text-xs">{detail}</p>)}</section>
              {bookingAddonsError && <p role="alert" className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{bookingAddonsError}</p>}
              <section className="space-y-2"><h4 className="text-sm font-black text-[#041E8C]">Resumo financeiro</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{[["Contratado",cb.totalPrice],["Recebido",financial.received],["Perdas",financial.losses],["Cancelamento contratual",financial.contractCancellations],["Saldo pendente",financial.remaining]].map(([label,value])=><div key={String(label)} className="bg-slate-50 border rounded-lg p-3"><p className="text-slate-500">{label}</p><p className="font-black">{formatCurrency(Number(value))}</p></div>)}</div></section>
              <section className="space-y-2"><h4 className="text-sm font-black text-[#041E8C]">Histórico de pagamentos</h4>{payments.length ? payments.map(p=><div key={p.id} className="flex justify-between gap-3 p-2 border rounded-lg text-xs"><div><p className="font-semibold">{p.payment_method} · {p.settlement_status === "recebido" ? "Recebido" : "Repasse previsto"}</p><p className="text-slate-500">{new Date(p.created_at).toLocaleString("pt-BR")}</p>{p.notes && <p>{p.notes}</p>}</div><strong>{formatCurrency(Number(p.amount))}</strong></div>) : <p className="text-xs text-slate-500">Nenhum pagamento registrado.</p>}</section>
              {adjustments.length>0 && <section className="space-y-2"><h4 className="text-sm font-black text-[#041E8C]">Ajustes registrados</h4>{adjustments.map(a=><p key={a.id} className="p-2 border rounded-lg text-xs">{a.adjustment_type === "perda" ? "Perda financeira" : a.adjustment_type === "cancelamento_contrato" ? "Cancelamento contratual" : a.adjustment_type === "desconto" ? "Desconto" : a.adjustment_type} · {formatCurrency(Number(a.amount))} · {a.reason}</p>)}</section>}
              <div className="flex flex-wrap justify-end gap-2 border-t pt-3"><button onClick={()=>{setSelectedBookingDetail(null);openPaymentModal(cb.code);}} className="px-3 py-2 rounded-lg bg-[#041E8C] text-white font-bold text-xs">{cb.status==="cancelada"?"Histórico financeiro":"Pagamentos"}</button>{cb.status === "finalizada" && !bookingClosures.some(c=>c.booking_code===cb.code) && <button type="button" onClick={()=>{setSelectedBookingDetail(null);setBookingClosureModalCode(cb.code);setClosureMode("zerar_saldo");setClosureLoss("0");setLossReason("");}} className="px-3 py-2 rounded-lg bg-red-600 text-white font-bold text-xs">Encerrar contrato</button>}<button disabled={anyEnded} onClick={()=>{setSelectedBookingDetail(null);void handleToggleBookingStatusByCode(cb.code,cb.status);}} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs disabled:opacity-40">{anyEnded?"Reserva encerrada":cb.status==="confirmada"?"Cancelar reserva":"Reativar reserva"}</button></div>
            </div>
          </div>;
        })()}

        {paymentModalCode && (() => {
          const total = bookings.filter(b => b.code === paymentModalCode).reduce((sum, b) => sum + b.price, 0) + addonTotal(paymentModalCode);
          const f = bookingFinancials(paymentModalCode, total);
          const paymentReadOnly = isCancelledPaymentBooking(paymentModalCode);
          const closure = bookingClosures.find(c => c.booking_code === paymentModalCode);
          const feeByPayment = new Map<string, {fee:number;percent:number;installments:number}>();
          bookingModalFees.forEach(detail => {
            const key = String(detail.payment_id);
            const prior = feeByPayment.get(key);
            feeByPayment.set(key, {fee: (prior?.fee || 0) + detail.fee_amount, percent: detail.fee_percent, installments: detail.installments});
          });
          const modalTotalFees = f.payments.reduce((sum,p) => sum + (feeByPayment.get(String(p.id))?.fee || 0), 0);
          const modalNetReceived = f.received - modalTotalFees;
          return (
            <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Controle de pagamentos">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-[#041E8C]">Pagamentos — {paymentModalCode}</h3>
                  <button type="button" onClick={() => setPaymentModalCode(null)} disabled={savingFinancial} aria-label="Fechar"><X className="w-5 h-5" /></button>
                </div>
                {financialError && <p className="text-red-700 text-xs font-bold">{financialError}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                  <p>Total: <strong>{formatCurrency(total)}</strong></p>
                  <p>Recebido: <strong>{formatCurrency(f.received)}</strong></p>
                  <p>Perdas: <strong>{formatCurrency(f.losses)}</strong></p>
                  <p>Descontos: <strong>{formatCurrency(f.discounts)}</strong></p>
                  <p>Cancelamento contratual: <strong>{formatCurrency(f.contractCancellations)}</strong></p>
                  <p>Saldo pendente: <strong>{formatCurrency(f.remaining)}</strong></p>
                  <div className="col-span-2 border-t border-slate-200 mt-1 pt-3 grid grid-cols-2 gap-2">
                    <div><p className="text-slate-600">Taxas financeiras</p><p className="font-black text-red-700 text-base">{bookingModalFeesLoading ? "Carregando..." : bookingModalFeesError ? "Indisponível" : formatCurrency(modalTotalFees)}</p></div>
                    <div><p className="text-slate-600">Recebido líquido de taxas</p><p className="font-black text-emerald-700 text-base">{bookingModalFeesLoading ? "Carregando..." : bookingModalFeesError ? "Indisponível" : formatCurrency(modalNetReceived)}</p></div>
                  </div>
                  {bookingModalFeesError && <p className="col-span-2 text-red-700">{bookingModalFeesError}</p>}
                </div>
                {paymentReadOnly && <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">Reserva cancelada: histórico disponível somente para consulta. Novos pagamentos e perdas estão bloqueados.</p>}
                {!paymentReadOnly && <form onSubmit={handleRegisterPayment} className="space-y-3 border-t pt-3">
                  <h4 className="text-sm font-bold">Registrar pagamento</h4>
                  <label className="block text-xs font-bold">Valor (R$)
                    <input type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="block w-full mt-1 p-2 border rounded-lg" placeholder="Ex.: 30,00" />
                  </label>
                  <label className="block text-xs font-bold">Forma de pagamento
                    <select value={paymentMethodInput} onChange={e => setPaymentMethodInput(e.target.value)} className="block w-full mt-1 p-2 border rounded-lg">
                      <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="wellhub">Wellhub (Gympass)</option><option value="totalpass">TotalPass</option>
                    </select>
                  </label>
{["credito","debito"].includes(paymentMethodInput)&&<div className="grid grid-cols-2 gap-2 col-span-2">{paymentMethodInput==="credito"&&<label className="text-xs font-bold">Parcelas<input type="number" min="1" max="12" value={creditInstallments} onChange={e=>setCreditInstallments(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"/></label>}<label className="text-xs font-bold">Taxa da operadora (%)<input type="text" inputMode="decimal" value={creditFee} onChange={e=>setCreditFee(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"/></label><p className="col-span-2 text-xs text-slate-600">Despesa financeira estimada: {formatCurrency(Math.max(0,Number(paymentAmount.replace(",","."))||0)*Math.max(0,Number(creditFee.replace(",","."))||0)/100)}</p></div>}
                  <label className="block text-xs font-bold">Observações (opcional)
                    <input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} className="block w-full mt-1 p-2 border rounded-lg" />
                  </label>
                  <button type="submit" disabled={savingFinancial || !!financialError || f.remaining <= 0} className="bg-emerald-600 text-white font-bold rounded-lg px-4 py-2 disabled:opacity-50">Salvar pagamento</button>
                </form>}
                <div className="space-y-2 border-t pt-3">
                  <h4 className="text-sm font-bold">Histórico financeiro</h4>
                  {f.payments.length === 0 && f.adjustments.length === 0 && <p className="text-xs text-slate-500">Nenhum lançamento registrado.</p>}
                  {f.payments.map(p => {
                    const cardFee = feeByPayment.get(String(p.id));
                    const fee = cardFee?.fee || 0;
                    return <div key={p.id} className="text-xs border rounded-lg p-2 space-y-1">
                      <p>{new Date(p.created_at).toLocaleString("pt-BR")} — {formatCurrency(Number(p.amount))} — {p.payment_method} (recebido) {p.notes ? `— ${p.notes}` : ""}</p>
                      {!bookingModalFeesLoading && !bookingModalFeesError && <p className="text-slate-600">Taxa financeira: {formatCurrency(fee)}{cardFee ? ` (${cardFee.percent.toLocaleString("pt-BR")}%${cardFee.installments > 1 ? ` · ${cardFee.installments}x` : ""})` : ""} · Líquido: {formatCurrency(Number(p.amount) - fee)}</p>}
                    </div>;
                  })}
                  {f.adjustments.map(a => <p key={a.id} className="text-xs border rounded-lg p-2">{new Date(a.created_at).toLocaleString("pt-BR")} — {formatCurrency(Number(a.amount))} — {a.adjustment_type}: {a.reason}</p>)}
                </div>
                {bookingClosuresError && <p className="text-xs text-red-700">{bookingClosuresError}</p>}
                {closure && <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1 text-xs">
                  <p className="font-black">Encerramento financeiro registrado</p>
                  <p>Modalidade: {closure.termination_mode === "manter_saldo" ? "Dívida preservada" : "Saldo zerado"}</p>
                  <p>Motivo: {closure.termination_reason}</p>
                  <p>Perda no encerramento: {formatCurrency(closure.loss_amount)}</p>
                  <p>Data: {new Date(closure.closed_at).toLocaleString("pt-BR")}</p>
                </div>}
              </div>
            </div>
          );
        })()}

        {bookingClosureModalCode && (() => {
          const code = bookingClosureModalCode;
          const rows = bookings.filter(b => b.code === code);
          const total = rows.reduce((sum,b)=>sum+b.price,0) + addonTotal(code);
          const f = bookingFinancials(code,total);
          const existingClosure = bookingClosures.find(c=>c.booking_code===code);
          const canClose = rows.length > 0 && rows.every(b=>b.status==="finalizada") && !existingClosure && !bookingClosuresError && !bookingAddonsError && !financialError;
          const loss = Number(closureLoss.replace(",","."));
          const validLoss = closureLoss.trim()!=="" && Number.isFinite(loss) && loss>=0 && loss<=f.remaining && Math.abs(loss*100-Math.round(loss*100))<0.00001;
          return <div role="dialog" aria-modal="true" aria-label={`Encerrar contrato da reserva ${code}`} className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" onClick={()=>{if(!savingFinancial)setBookingClosureModalCode(null);}}>
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-5 space-y-4 shadow-xl" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center gap-3"><h3 className="font-black text-[#041E8C]">Encerrar contrato — {code}</h3><button type="button" disabled={savingFinancial} onClick={()=>setBookingClosureModalCode(null)} aria-label="Fechar"><X size={18}/></button></div>
              <p className="text-xs text-slate-600">O encerramento financeiro preserva os pagamentos anteriores. Escolha como tratar o saldo pendente.</p>
              {!canClose && <p role="alert" className="text-xs text-red-700">Encerramento indisponível. Verifique se todos os horários estão finalizados, se o contrato já foi encerrado e se os dados financeiros estão disponíveis.</p>}
              <div className="space-y-3">
                <label className="flex gap-2 items-start text-sm"><input type="radio" checked={closureMode==="zerar_saldo"} onChange={()=>setClosureMode("zerar_saldo")}/><span><strong>Encerrar e zerar saldo</strong><span className="block text-xs text-slate-500">Informe quanto registrar como perda. O restante será cancelado sem perda.</span></span></label>
                {closureMode==="zerar_saldo" && <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm">Saldo pendente: <strong>{formatCurrency(f.remaining)}</strong></p>
                  <label className="block text-xs font-bold">Valor da perda (R$)<input type="text" inputMode="decimal" value={closureLoss} onChange={e=>setClosureLoss(e.target.value)} className="mt-1 w-full border rounded-lg p-2" placeholder="0,00" /></label>
                  <p className="text-xs text-slate-600">Perda: {validLoss?formatCurrency(loss):"Valor inválido"} · Cancelamento sem perda: {validLoss?formatCurrency(f.remaining-loss):"—"}</p>
                  <p className="text-xs font-semibold text-slate-700">Saldo após encerramento: R$ 0,00</p>
                </div>}
                <label className="flex gap-2 items-start text-sm"><input type="radio" checked={closureMode==="manter_saldo"} onChange={()=>setClosureMode("manter_saldo")}/><span><strong>Encerrar mantendo dívida</strong><span className="block text-xs text-slate-500">Mantém o saldo para recebimentos posteriores.</span></span></label>
                <label className="block text-xs font-bold">Motivo do encerramento<textarea required value={lossReason} onChange={e=>setLossReason(e.target.value)} className="mt-1 w-full border rounded-xl p-2.5" rows={3}/></label>
                <button type="button" disabled={!canClose || savingFinancial || !lossReason.trim() || (closureMode==="zerar_saldo" && !validLoss)} onClick={()=>void handleCloseBookingFinancial()} className="w-full py-3 bg-red-700 text-white font-bold rounded-xl disabled:opacity-50">{savingFinancial?"Encerrando...":"Confirmar encerramento"}</button>
              </div>
            </div>
          </div>;
        })()}

        {/* 4. ALUNOS & AULAS COM PESQUISA POR NOME E CÓDIGO */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#00E599]" /> Inserir Aluno Manualmente (Via Balcão)</h2>
              <form onSubmit={handleManualStudentSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input required type="text" placeholder="Nome e Sobrenome do Aluno" value={manualStudentName} onChange={e=>setManualStudentName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g,""))} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" />
                <input required type="tel" maxLength={11} placeholder="WhatsApp (Apenas Números)" value={manualStudentPhone} onChange={e=>setManualStudentPhone(e.target.value.replace(/\D/g,"").slice(0,11))} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" />
                <select value={manualStudentSport} onChange={e=>{setManualStudentSport(e.target.value);setManualStudentCategory("Iniciante");setManualStudentOption(classScheduleMap[e.target.value]?.["Iniciante"]?.[0]||"");}} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none">
                  <option value="Vôlei de Praia">Vôlei de Praia</option><option value="Futevôlei">Futevôlei</option><option value="Beach Tennis">Beach Tennis</option><option value="Futebol Society">Futebol Society</option>
                </select>
                <select value={manualStudentCategory} onChange={e=>{setManualStudentCategory(e.target.value);setManualStudentOption(classScheduleMap[manualStudentSport]?.[e.target.value]?.[0]||"");}} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                  {Object.keys(classScheduleMap[manualStudentSport]||{}).map(cat=><option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select value={manualStudentOption} onChange={e=>setManualStudentOption(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none sm:col-span-2">
                  {(classScheduleMap[manualStudentSport]?.[manualStudentCategory]||[]).map((opt,idx)=><option key={idx} value={opt}>{opt}</option>)}
                </select>
                <select value={manualStudentPlan} onChange={e=>{const plan=e.target.value as typeof manualStudentPlan;setManualStudentPlan(plan);if(plan==="mensal"&&manualPaymentMode==="parcelado_arena"){setManualPaymentMode("integral");setManualInstallmentCount(1);}}} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none sm:col-span-3">
                  <option value="mensal">Plano Mensal - {formatCurrency(classPricesMap[manualStudentSport]?.mensal||200)}</option>
                  <option value="trimestral">Plano Trimestral - {formatCurrency(classPricesMap[manualStudentSport]?.trimestral||540)}</option>
                  <option value="semestral">Plano Semestral - {formatCurrency(classPricesMap[manualStudentSport]?.semestral||960)}</option>
                </select>
                <div className="sm:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#041E8C]">Financeiro da matrícula</p>
                    <p className="text-xs text-slate-600 mt-1">Plano: <strong>{formatCurrency(manualPlanAmount)}</strong> · Recebido: <strong>{formatCurrency(manualInitialPayments.reduce((sum,p)=>sum+(manualMoney(p.amount)||0),0))}</strong> · Saldo: <strong>{formatCurrency(Math.max(0,manualPlanAmount-manualInitialPayments.reduce((sum,p)=>sum+(manualMoney(p.amount)||0),0)))}</strong></p>
                    <p className="text-[11px] text-slate-500 mt-1">Condição: {manualPaymentMode==="integral"?"Integral":"Parcelado pela arena"}</p>
                    <p className="text-xs text-slate-600 mt-1">Taxas financeiras: <strong className="text-red-600">{formatCurrency(manualInitialFeeCents / 100)}</strong> · Líquido da arena: <strong className="text-green-700">{formatCurrency(manualInitialNetCents / 100)}</strong></p>
                  </div>
                  <button type="button" onClick={()=>setManualFinanceModalOpen(true)} className="px-4 py-2.5 bg-white border border-[#041E8C] text-[#041E8C] font-black text-xs rounded-xl hover:bg-blue-50">Configurar financeiro</button>
                </div>
                <button type="submit" disabled={manualStudentSaving} className="sm:col-span-3 py-3 bg-[#041E8C] hover:bg-[#031566] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-md">{manualStudentSaving?"Cadastrando matrícula...":"Confirmar Matrícula Balcão"}</button>
              </form>

              {manualFinanceModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-950/60 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manual-finance-title">
                  <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 id="manual-finance-title" className="text-sm font-black uppercase tracking-wide text-[#041E8C]">Condições financeiras da matrícula</h3><p className="text-xs text-slate-500 mt-1">{manualStudentName.trim()||"Novo aluno"} · {manualStudentPlan.toUpperCase()} · {formatCurrency(manualPlanAmount)}</p></div>
                      <button type="button" onClick={()=>setManualFinanceModalOpen(false)} aria-label="Fechar financeiro" className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs font-bold text-slate-600">Data de início<input required type="date" value={manualStartDate} onChange={e=>setManualStartDate(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl"/></label>
                      <div className="text-xs font-bold text-slate-600 flex items-center">Valor contratado: <span className="ml-2 text-[#041E8C] text-base">{formatCurrency(manualPlanAmount)}</span></div>
                      <label className="text-xs font-bold text-slate-600">Condição de pagamento
                        <select value={manualPaymentMode} onChange={e=>{const mode=e.target.value as typeof manualPaymentMode;setManualPaymentMode(mode);setManualInstallmentCount(mode==="integral"?1:3);}} className="mt-1 w-full p-2.5 border rounded-xl">
                          <option value="integral">Integral / saldo pendente</option>
                          <option value="parcelado_arena" disabled={manualStudentPlan==="mensal"}>Parcelado pela arena{manualStudentPlan==="mensal"?" (indisponível no mensal)":""}</option>
                        </select>
                      </label>
                    </div>
                    {manualPaymentMode==="parcelado_arena"&&<div className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <label className="block text-xs font-bold text-slate-600">Quantidade de vencimentos na arena
                        <select value={manualInstallmentCount} onChange={e=>setManualInstallmentCount(Number(e.target.value))} className="ml-2 p-2 border rounded-lg">{Array.from({length:60},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x</option>)}</select>
                      </label>
                      <p className="text-xs text-slate-500">Os vencimentos devem somar apenas o saldo restante depois dos recebimentos iniciais.</p>
                      {manualInstallments.map((item,index)=><div key={index} className="grid grid-cols-[42px_1fr_1fr] gap-2 items-center"><span className="text-xs font-bold text-slate-500">{index+1}ª</span>
                        <input aria-label={`Vencimento ${index+1}`} type="date" value={item.date} onChange={e=>setManualInstallments(prev=>prev.map((v,i)=>i===index?{...v,date:e.target.value}:v))} className="min-w-0 p-2 border rounded-lg text-xs"/>
                        <input aria-label={`Valor da parcela ${index+1}`} type="number" min="0.01" step="0.01" value={item.amount} onChange={e=>setManualInstallments(prev=>prev.map((v,i)=>i===index?{...v,amount:e.target.value}:v))} className="min-w-0 p-2 border rounded-lg text-xs"/></div>)}
                      <p className="text-xs text-slate-600">Total dos vencimentos: <strong>{formatCurrency(manualInstallments.reduce((sum,item)=>sum+(manualMoney(item.amount)||0),0))}</strong></p>
                    </div>}
                    <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2"><p className="text-xs font-black text-slate-700">Recebimentos iniciais (opcional)</p><button type="button" disabled={manualInitialPayments.length>=20} onClick={()=>setManualInitialPayments(prev=>[...prev,{amount:"",method:"pix",notes:"",feePercent:"0",installments:1}])} className="text-xs font-bold text-[#041E8C] disabled:opacity-40">+ Adicionar recebimento</button></div>
                      {manualInitialPayments.map((payment,index)=><div key={index} className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <input aria-label={`Valor recebido ${index+1}`} type="number" min="0.01" step="0.01" placeholder="Valor (R$)" value={payment.amount} onChange={e=>setManualInitialPayments(prev=>prev.map((p,i)=>i===index?{...p,amount:e.target.value}:p))} className="min-w-0 p-2 border rounded-lg text-xs"/>
                          <select aria-label={`Forma de pagamento ${index+1}`} value={payment.method} onChange={e=>setManualInitialPayments(prev=>prev.map((p,i)=>i===index?{...p,method:e.target.value}:p))} className="min-w-0 p-2 border rounded-lg text-xs"><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="wellhub">Gympass / Wellhub</option><option value="totalpass">TotalPass</option></select>
                          <button type="button" onClick={()=>setManualInitialPayments(prev=>prev.filter((_,i)=>i!==index))} className="text-xs text-red-600 font-bold">Remover</button>
                        </div>
                        {(payment.method==="credito"||payment.method==="debito")&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="text-xs font-bold text-slate-600">Taxa da maquininha (%)<input aria-label={`Taxa do recebimento ${index+1}`} type="number" min="0" max="100" step="0.0001" value={payment.feePercent} onChange={e=>setManualInitialPayments(prev=>prev.map((p,i)=>i===index?{...p,feePercent:e.target.value}:p))} className="mt-1 w-full p-2 border rounded-lg"/></label>
                          {payment.method==="credito"&&<label className="text-xs font-bold text-slate-600">Parcelas no cartão<select value={payment.installments} onChange={e=>setManualInitialPayments(prev=>prev.map((p,i)=>i===index?{...p,installments:Number(e.target.value)}:p))} className="mt-1 w-full p-2 border rounded-lg">{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x</option>)}</select></label>}
                        </div>}
                        {(payment.method==="credito"||payment.method==="debito")&&(()=>{const gross=manualMoney(payment.amount)||0;const pct=manualMoney(payment.feePercent)||0;const fee=Math.round(gross*pct)/100;return <p className="text-xs text-slate-600">Bruto: {formatCurrency(gross)} · Taxa: {formatCurrency(fee)} · Líquido da arena: <strong>{formatCurrency(gross-fee)}</strong></p>;})()}
                      </div>)}
                      <div className="border-t border-slate-200 pt-3 space-y-2" aria-label="Resumo dos recebimentos iniciais">
                        <p className="text-xs font-black text-slate-700">Resumo dos recebimentos iniciais</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600">
                          <p>Total recebido: <strong>{formatCurrency(manualReceivedCents / 100)}</strong></p>
                          <p>Taxas financeiras: <strong className="text-red-600">{formatCurrency(manualInitialFeeCents / 100)}</strong></p>
                          <p>Líquido da arena: <strong className="text-green-700">{formatCurrency(manualInitialNetCents / 100)}</strong></p>
                          <p>Saldo pendente: <strong>{formatCurrency(Math.max(0, manualPlanAmount - manualReceivedCents / 100))}</strong></p>
                        </div>
                      </div>
                    </div>
                    <label className="block text-xs font-bold text-slate-600">Observações financeiras (opcional)<input value={manualFinanceNotes} onChange={e=>setManualFinanceNotes(e.target.value)} maxLength={1000} className="mt-1 w-full p-2.5 border rounded-xl"/></label>
                    <p className="text-xs text-amber-700">O preço é recalculado no Supabase. Divergências rejeitam o cadastro sem gravação parcial.</p>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100">
                      <button type="button" onClick={()=>setManualFinanceModalOpen(false)} className="px-4 py-2.5 border rounded-xl text-slate-700 font-bold text-xs">Voltar</button>
                      <button type="button" onClick={()=>{if(manualStudentPlan==="mensal"&&manualPaymentMode==="parcelado_arena"){alert("O plano mensal não permite parcelamento pela arena.");return;}setManualFinanceModalOpen(false);}} className="px-4 py-2.5 bg-[#041E8C] text-white font-black text-xs rounded-xl">Salvar condições financeiras</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-sm font-black text-[#041E8C]">ALUNOS MATRICULADOS</h2>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:ml-auto">
                {/* Campo de pesquisa por nome e/ou código */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por nome ou código..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#041E8C]" 
                  />
                </div>
                <button type="button" aria-expanded={enrollmentsExpanded} onClick={() => setEnrollmentsExpanded(v => !v)} className="text-xs font-bold text-[#041E8C] px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap">{enrollmentsExpanded ? "Recolher −" : "Expandir +"}</button>
                </div>
              </div>

              {enrollmentsExpanded && (<>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-700 mr-1">Período de matrícula:</span>
                {([ ["day", "Dia"], ["month", "Mês"], ["year", "Ano"], ["all", "Geral"], ["custom", "Intervalo"] ] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setEnrollmentPeriodType(key)}
                    aria-pressed={enrollmentPeriodType === key}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${enrollmentPeriodType === key ? "bg-[#041E8C] text-white" : "bg-white text-slate-600 hover:bg-slate-200"}`}>
                    {label}
                  </button>
                ))}
                {enrollmentPeriodType === "day" && <input aria-label="Dia da matrícula" type="date" value={enrollmentPeriodDay} onChange={e => setEnrollmentPeriodDay(e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-xs" />}
                {enrollmentPeriodType === "month" && <input aria-label="Mês da matrícula" type="month" value={enrollmentPeriodMonth} onChange={e => setEnrollmentPeriodMonth(e.target.value)} className="rounded-lg border border-slate-200 bg-white p-2 text-xs" />}
                {enrollmentPeriodType === "year" && <input aria-label="Ano da matrícula" type="number" min="2000" max="2100" value={enrollmentPeriodYear} onChange={e => setEnrollmentPeriodYear(e.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white p-2 text-xs" />}
                {enrollmentPeriodType === "custom" && <>
                  <label className="text-xs text-slate-600">De <input type="date" value={enrollmentPeriodStart} onChange={e => setEnrollmentPeriodStart(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                  <label className="text-xs text-slate-600">Até <input type="date" value={enrollmentPeriodEnd} min={enrollmentPeriodStart || undefined} onChange={e => setEnrollmentPeriodEnd(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                </>}
                <span className="w-full text-[10px] text-slate-500">Filtra pela data em que o aluno foi matriculado, não pela data dos pagamentos.</span>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-xs font-bold text-slate-700">Financeiro
                  <select value={classFinancialFilter} onChange={e => setClassFinancialFilter(e.target.value)} disabled={classFinancialLoading || !!classFinancialLoadError} className="ml-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <option value="todos">Todos</option>
                    <option value="sem_cobranca">Sem cobrança</option>
                    <option value="pendente">Com saldo pendente (inclui parcial)</option>
                    <option value="parcial">Pagamento parcial</option>
                    <option value="quitado">Quitado</option>
                    <option value="cancelado">Saldo cancelado</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">Matrícula
                  <select value={classEnrollmentStatusFilter} onChange={e => setClassEnrollmentStatusFilter(e.target.value)} className="ml-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <option value="todos">Todas</option>
                    <option value="ativa">Ativas</option>
                    <option value="encerrada">Encerradas</option>
                  </select>
                </label>
                {classFinancialLoading && <span className="text-xs text-slate-500">Carregando financeiro...</span>}
                {classFinancialLoadError && <span className="text-xs text-red-600">{classFinancialLoadError}</span>}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">{["Todos", ...orderedSportsList].map((s) => (<button key={s} onClick={() => {setClassSportFilter(s);setEnrollmentPage(1);}} className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${classSportFilter === s ? "bg-[#041E8C] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>))}</div>
               
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="font-semibold text-slate-600">Por página <select aria-label="Matrículas por página" value={enrollmentPageSize} onChange={e => {setEnrollmentPageSize(Number(e.target.value));setEnrollmentPage(1);}} className="ml-2 p-2 border rounded-lg"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
                <span className="text-slate-500">{filteredEnrollments.length ? `${(currentEnrollmentPage-1)*enrollmentPageSize+1}–${Math.min(currentEnrollmentPage*enrollmentPageSize,filteredEnrollments.length)} de ${filteredEnrollments.length}` : "0 matrículas"}</span>
              </div>
              <div className="overflow-x-auto border rounded-xl border-slate-200"><table className="w-full min-w-[750px] text-xs text-left"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Matrícula / aluno</th><th className="p-3">Modalidade / turma</th><th className="p-3">Situação</th><th className="p-3 text-right">Valor / saldo</th><th className="p-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleEnrollments.map(en=>{
                const summary=classFinancialSummary[en.id];
                const balance=summary?Math.max(0,Math.round((summary.contracted-summary.received-summary.cancelled)*100)/100):null;
                return <tr key={en.id} className="hover:bg-slate-50"><td className="p-3"><p className="font-mono font-black text-[#041E8C]">{en.code}</p><p className="font-semibold">{en.student_name}</p></td><td className="p-3"><p className="font-semibold">{en.sport} · {en.category}</p><p className="text-slate-500">{en.days_selected} · {en.plan_type}</p></td><td className="p-3"><span className={`inline-block px-2 py-1 rounded-full font-bold ${isActiveEnrollment(en.status) ? "bg-emerald-100 text-emerald-800" : en.status === "encerrada" || en.status === "finalizada" ? "bg-slate-200 text-slate-700" : en.status === "cancelada" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{isActiveEnrollment(en.status)?"Confirmada":en.status}</span><p className="text-slate-500 mt-1">{!classFinancialLoading&&!classFinancialLoadError?classFinancialLabels[getClassFinancialStatus(en)]:"Carregando financeiro"}</p></td><td className="p-3 text-right"><p className="font-black text-[#041E8C]">{formatCurrency(Number(en.total_price))}</p><p className="text-slate-500">Saldo: {balance===null?"—":formatCurrency(balance)}</p></td><td className="p-3 text-right"><button onClick={()=>setExpandedEnrollmentId(en.id)} className="px-3 py-2 rounded-lg bg-blue-50 text-[#041E8C] font-bold">Ver detalhes</button></td></tr>;
              })}</tbody></table></div>
              <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-slate-600">
                <span>Página {currentEnrollmentPage} de {enrollmentTotalPages}</span>
                <div className="flex gap-2"><button type="button" disabled={currentEnrollmentPage === 1} onClick={() => setEnrollmentPage(p => Math.max(1,p-1))} className="px-3 py-2 border rounded-lg disabled:opacity-40">Anterior</button><button type="button" disabled={currentEnrollmentPage === enrollmentTotalPages} onClick={() => setEnrollmentPage(p => Math.min(enrollmentTotalPages,p+1))} className="px-3 py-2 border rounded-lg disabled:opacity-40">Próxima</button></div>
              </div>
              </>)}
            </div>


            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black text-[#041E8C]">PARTICIÇÃO AVULSA</h2>
              <p className="text-xs text-slate-500">A participação avulsa não ocupa vagas de matrícula. O gestor autoriza a participação. O valor informado é integralmente recebido no cadastro: não há opção de pagamento parcial ou pendente. Taxas de cartão reduzem apenas o líquido da arena.</p>
              <form onSubmit={handleWalkInCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input required value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="Nome do aluno" className="p-2.5 border rounded-xl text-xs" />
                <input required type="tel" value={walkInPhone} onChange={e => setWalkInPhone(e.target.value.replace(/\D/g, ""))} placeholder="Telefone" className="p-2.5 border rounded-xl text-xs" />
                <select value={walkInSport} onChange={e => { const sport = e.target.value; setWalkInSport(sport); setWalkInCategory(Object.keys(classScheduleMap[sport] || {})[0] || ""); setWalkInClass(""); }} className="p-2.5 border rounded-xl text-xs">
                  {["Vôlei de Praia", "Futevôlei", "Beach Tennis", "Futebol Society"].map(sport => <option key={sport} value={sport}>{sport}</option>)}
                </select>
                <select required aria-label="Categoria da turma" value={walkInCategory} onChange={e => { setWalkInCategory(e.target.value); setWalkInClass(""); }} className="p-2.5 border rounded-xl text-xs">
                  {Object.keys(classScheduleMap[walkInSport] || {}).map(category => <option key={category} value={category}>{category}</option>)}
                </select>
                <select required aria-label="Turma e horário" value={walkInClass} onChange={e => setWalkInClass(e.target.value)} className="p-2.5 border rounded-xl text-xs">
                  <option value="">Selecione a turma / horário</option>
                  {(classScheduleMap[walkInSport]?.[walkInCategory] || []).map(schedule => <option key={schedule} value={schedule}>{schedule}</option>)}
                </select>
                <input required type="date" value={walkInDate} onChange={e => setWalkInDate(e.target.value)} className="p-2.5 border rounded-xl text-xs" />
                <input required type="number" min="0.01" step="0.01" value={walkInAmount} onChange={e => setWalkInAmount(e.target.value)} placeholder="Valor (R$)" className="p-2.5 border rounded-xl text-xs" />
                <select required aria-label="Forma de pagamento" value={walkInPaymentMethod} onChange={e => setWalkInPaymentMethod(e.target.value)} className="sm:col-span-2 p-2.5 border rounded-xl text-xs">
                  <option value="pix">PIX — recebido</option>
                  <option value="dinheiro">Dinheiro — recebido</option>
                  <option value="debito">Débito — recebido</option>
                  <option value="credito">Crédito — recebido</option>
                  <option value="wellhub">Wellhub (Gympass) — recebido</option>
                  <option value="totalpass">TotalPass — recebido</option>
                </select>
                {["credito","debito"].includes(walkInPaymentMethod)&&<div className="grid grid-cols-2 gap-2 col-span-2">{walkInPaymentMethod==="credito"&&<label className="text-xs font-bold">Parcelas<input type="number" min="1" max="12" value={walkInCreditInstallments} onChange={e=>setWalkInCreditInstallments(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"/></label>}<label className="text-xs font-bold">Taxa da operadora (%)<input type="text" inputMode="decimal" value={walkInCreditFee} onChange={e=>setWalkInCreditFee(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"/></label><p className="col-span-2 text-xs text-slate-600">Despesa financeira estimada: {formatCurrency(Math.max(0,Number(walkInAmount.replace(",","."))||0)*Math.max(0,Number(walkInCreditFee.replace(",","."))||0)/100)}</p></div>}
                <p className="sm:col-span-3 text-xs font-semibold text-emerald-700">Pagamento integral obrigatório: o valor cadastrado será registrado como recebido e a participação ficará quitada.</p>
                <button type="submit" disabled={walkInSaving} className="sm:col-span-3 py-3 bg-[#041E8C] text-white font-bold text-xs rounded-xl disabled:opacity-50">{walkInSaving ? "Salvando..." : "Cadastrar participação avulsa quitada"}</button>
              </form>
              {walkInMessage && <p role="status" className="text-xs font-semibold text-slate-700">{walkInMessage}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <h3 className="text-sm font-black text-[#041E8C]">PARTICIPAÇÕES AVULSAS REGISTRADAS</h3>
                <span className="text-[11px] text-slate-500">Lista paginada · detalhes e pagamentos preservados</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <input aria-label="Pesquisar avulsos" value={walkInSearch} onChange={e => {setWalkInSearch(e.target.value);setWalkInPage(1);}} placeholder="Buscar nome ou telefone..." className="p-2.5 border rounded-xl text-xs" />
                <select aria-label="Filtrar modalidade dos avulsos" value={walkInSportFilter} onChange={e => {setWalkInSportFilter(e.target.value);setWalkInPage(1);}} className="p-2.5 border rounded-xl text-xs">
                  <option value="Todas">Todas as modalidades</option>
                  {Object.keys(classScheduleMap).map(sport => <option key={sport} value={sport}>{sport}</option>)}
                </select>
                <label className="text-[11px] text-slate-600">De<input aria-label="Data inicial dos avulsos" type="date" value={walkInStartDate} onChange={e => {setWalkInStartDate(e.target.value);setWalkInPage(1);}} className="block w-full p-2 border rounded-xl text-xs" /></label>
                <label className="text-[11px] text-slate-600">Até<input aria-label="Data final dos avulsos" type="date" value={walkInEndDate} onChange={e => {setWalkInEndDate(e.target.value);setWalkInPage(1);}} className="block w-full p-2 border rounded-xl text-xs" /></label>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label>Ordenar <select value={walkInSort} onChange={e => {setWalkInSort(e.target.value);setWalkInPage(1);}} className="ml-1 p-2 border rounded-lg"><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="nome">Nome A–Z</option></select></label>
                <label>Por página <select value={walkInPageSize} onChange={e => {setWalkInPageSize(Number(e.target.value));setWalkInPage(1);}} className="ml-1 p-2 border rounded-lg"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
                <button type="button" onClick={() => {setWalkInSearch("");setWalkInSportFilter("Todas");setWalkInStartDate("");setWalkInEndDate("");setWalkInPage(1);}} className="text-blue-800 font-bold underline">Limpar filtros</button>
              </div>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Aluno</th><th className="p-3">Modalidade / turma</th><th className="p-3">Data</th><th className="p-3 text-right">Valor</th><th className="p-3 text-right">Ação</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleWalkIns.map(charge => <tr key={charge.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{charge.student_name}</td><td className="p-3">{charge.sport}<span className="block text-[10px] text-slate-500">{charge.class_name}</span></td><td className="p-3 whitespace-nowrap">{charge.class_date ? formatDateToBR(charge.class_date) : "—"}</td><td className="p-3 text-right whitespace-nowrap font-bold">{formatCurrency(Number(charge.amount))}</td><td className="p-3 text-right"><button type="button" onClick={() => openWalkInDetail(charge)} aria-label={`Ver detalhes de ${charge.student_name}`} className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg font-bold hover:bg-blue-100">Ver detalhes</button></td></tr>)}
                    {visibleWalkIns.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Nenhuma participação encontrada.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-slate-600">
                <span>{filteredWalkIns.length ? `${(currentWalkInPage-1)*walkInPageSize+1}–${Math.min(currentWalkInPage*walkInPageSize,filteredWalkIns.length)} de ${filteredWalkIns.length}` : "0 registros"}</span>
                <div className="flex items-center gap-3"><button type="button" disabled={currentWalkInPage===1} onClick={() => setWalkInPage(p=>Math.max(1,p-1))} className="px-3 py-2 border rounded-lg disabled:opacity-40">Anterior</button><span>Página {currentWalkInPage} de {walkInTotalPages}</span><button type="button" disabled={currentWalkInPage===walkInTotalPages} onClick={() => setWalkInPage(p=>Math.min(walkInTotalPages,p+1))} className="px-3 py-2 border rounded-lg disabled:opacity-40">Próxima</button></div>
              </div>
              {selectedWalkIn && (
                <div role="dialog" aria-modal="true" aria-label="Detalhes da participação avulsa" className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedWalkIn(null)}>
                  <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center"><h3 className="text-base font-black text-[#041E8C]">Detalhes da participação avulsa</h3><button type="button" onClick={() => setSelectedWalkIn(null)} aria-label="Fechar detalhes" className="p-2 rounded-lg hover:bg-slate-100"><X size={18}/></button></div>
                    <div className="text-sm space-y-2">
                      <p><strong>Aluno:</strong> {selectedWalkIn.student_name}</p>
                      <p><strong>Telefone:</strong> {selectedWalkIn.student_phone || "Não informado"}</p>
                      <p><strong>Modalidade:</strong> {selectedWalkIn.sport}</p>
                      <p><strong>Turma / horário:</strong> {selectedWalkIn.class_name}</p>
                      <p><strong>Data da aula:</strong> {selectedWalkIn.class_date || "Não informada"}</p>
                      <p><strong>Valor:</strong> {formatCurrency(Number(selectedWalkIn.amount))}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border p-3 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div><span className="text-slate-500">Contratado</span><p className="font-bold text-sm">{formatCurrency(Number(selectedWalkIn.amount))}</p></div>
                        <div><span className="text-slate-500">Recebido</span><p className="font-bold text-sm">{formatCurrency(walkInReceived)}</p></div>

                        <div><span className="text-slate-500">Situação</span><p className="font-bold text-sm">{walkInReceived >= Number(selectedWalkIn.amount)-0.005 ? "Quitado" : "Pendente"}</p></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-t pt-3">
                        <div><span className="text-slate-500">Taxas financeiras</span><p className="font-bold text-sm text-red-700">{walkInDetailLoading ? "Carregando..." : walkInFeesError ? "Indisponível" : formatCurrency(walkInFeeTotal)}</p></div>
                        <div><span className="text-slate-500">Recebido líquido de taxas</span><p className="font-bold text-sm text-emerald-700">{walkInDetailLoading ? "Carregando..." : walkInFeesError ? "Indisponível" : formatCurrency(walkInReceived-walkInFeeTotal)}</p></div>
                      </div>
                      {walkInFeesError && <p role="alert" className="text-red-600">{walkInFeesError}</p>}
                    </div>
                    <h4 className="font-bold text-sm">Histórico financeiro</h4>
                    {walkInDetailLoading ? <p className="text-xs">Carregando pagamentos...</p> : walkInDetailError ? <p role="alert" className="text-xs text-red-600">{walkInDetailError}</p> : selectedWalkInPayments.length === 0 ? <p className="text-xs text-slate-500">Nenhum pagamento encontrado.</p> : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedWalkInPayments.map(payment => {
                          const fee = walkInFees.find(item => item.payment_id === String(payment.id));
                          const feeAmount = Number(fee?.fee_amount || 0);
                          return <div key={payment.id} className="text-xs p-3 bg-slate-50 rounded-xl border space-y-1">
                            <div className="flex justify-between gap-3"><span>{({pix:"PIX",dinheiro:"Dinheiro",debito:"Débito",credito:"Crédito",wellhub:"Wellhub (Gympass)",totalpass:"TotalPass"} as Record<string,string>)[payment.payment_method] || payment.payment_method}<br/><span className="text-slate-500">{payment.settlement_status === "recebido" ? "Recebido" : payment.settlement_status}</span></span><strong>{formatCurrency(Number(payment.amount))}</strong></div>
                            {payment.settlement_status === "recebido" && !walkInFeesError && <p className="text-slate-500">Taxa financeira: {formatCurrency(feeAmount)}{fee ? ` (${Number(fee.fee_percent).toLocaleString("pt-BR",{maximumFractionDigits:2})}%)` : ""} · Líquido: {formatCurrency(Number(payment.amount)-feeAmount)}</p>}
                          </div>;
                        })}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
            {expandedEnrollmentId && (()=>{
              const en=enrollments.find(item=>item.id===expandedEnrollmentId);
              if(!en)return null;
              const summary=classFinancialSummary[en.id];
              const balance=summary?Math.max(0,Math.round((summary.contracted-summary.received-summary.cancelled)*100)/100):null;
              return <div role="dialog" aria-modal="true" aria-label={`Detalhes da matrícula ${en.code}`} className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={()=>setExpandedEnrollmentId(null)}><div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-start"><div><h3 className="text-lg font-black text-[#041E8C]">Matrícula {en.code}</h3><p className="text-xs text-slate-500">{isActiveEnrollment(en.status)?"Confirmada":en.status}</p></div><button onClick={()=>setExpandedEnrollmentId(null)} aria-label="Fechar detalhes" className="p-2 rounded-lg hover:bg-slate-100"><X size={20}/></button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border rounded-xl p-4 text-xs"><div><p className="text-slate-500">Aluno</p><p className="font-bold">{en.student_name}</p><p>{en.student_phone}</p></div><div><p className="text-slate-500">Data da matrícula</p><p className="font-bold">{new Date(en.created_at).toLocaleDateString("pt-BR")}</p></div><div><p className="text-slate-500">Modalidade e categoria</p><p className="font-bold">{en.sport} · {en.category}</p></div><div><p className="text-slate-500">Turma e plano</p><p className="font-bold">{en.days_selected} · {en.plan_type}</p></div><div><p className="text-slate-500">Dias extras</p><p className="font-bold">{en.extra_days_count || 0}</p></div></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">{[["Plano",Number(en.total_price)],["Contratado",summary?.contracted],["Recebido",summary?.received],["Saldo pendente",balance]].map(([label,value])=><div key={String(label)} className="p-3 border rounded-lg bg-slate-50"><p className="text-slate-500">{label}</p><p className="font-black">{value==null?"—":formatCurrency(Number(value))}</p></div>)}</div>
                <div className="flex flex-wrap gap-2 justify-end border-t pt-3">{(isActiveEnrollment(en.status)||en.status==="encerrada")&&<button onClick={()=>{setExpandedEnrollmentId(null);void openMonthlyModal(en);}} className="px-3 py-2 rounded-lg bg-[#041E8C] text-white font-bold text-xs">Financeiro do plano</button>}<button onClick={()=>{setExpandedEnrollmentId(null);setEditingStudent(en);setNewStudentOption(en.days_selected);}} className="px-3 py-2 rounded-lg bg-slate-200 font-bold text-xs">Alterar turma</button>{en.status==="reservada"&&<><button onClick={()=>{setExpandedEnrollmentId(null);void handleUpdateEnrollmentStatus(en,"confirmada");}} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs">Confirmar</button><button onClick={()=>{setExpandedEnrollmentId(null);void handleUpdateEnrollmentStatus(en,"reprovada");}} className="px-3 py-2 rounded-lg bg-red-600 text-white font-bold text-xs">Reprovar</button></>}{isActiveEnrollment(en.status)&&<button onClick={()=>{setExpandedEnrollmentId(null);setTerminationEnrollment(en);setTerminationMode("zerar_saldo");setTerminationLossAmount("0");setTerminationReason("");setTerminationError("");}} className="px-3 py-2 rounded-lg bg-red-600 text-white font-bold text-xs">Encerrar contrato</button>}</div>
              </div></div>;
            })()}

            {monthlyEnrollment && (
              <div role="dialog" aria-modal="true" aria-label="Financeiro do plano" className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setMonthlyEnrollment(null)}>
                <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-black text-[#041E8C]">Financeiro do plano — {monthlyEnrollment.student_name}</h3>
                    <button type="button" onClick={() => setMonthlyEnrollment(null)} aria-label="Fechar" className="p-2 rounded-lg hover:bg-slate-100"><X size={18}/></button>
                  </div>
                  <p className="text-xs text-slate-600">{monthlyEnrollment.sport} · {monthlyEnrollment.days_selected} · Plano {monthlyEnrollment.plan_type} · {monthlyEnrollment.status === "encerrada" ? "Encerrado" : isActiveEnrollment(monthlyEnrollment.status) ? "Ativo" : monthlyEnrollment.status}</p>
                  {monthlyHistoryLoading ? <p className="text-xs">Carregando...</p> : (
                    <>
                      {monthlyHistory.length > 0 && <div className="space-y-2">{monthlyHistory.map(c => {
                        const balance = Math.max(0,Math.round((c.amount-c.received-c.cancelled)*100)/100);
                        return <div key={c.id} className="p-3 bg-slate-50 border rounded-xl text-xs space-y-2">
                          <p className="font-bold">{c.plan_start_date ? `Início: ${formatDateToBR(c.plan_start_date)} · Término: ${formatDateToBR(c.plan_end_date || "")}` : `Contrato registrado em ${c.reference_month} (data exata não informada)`}</p>
                          <div className="grid grid-cols-2 gap-2"><span>Contratado: <strong>{formatCurrency(c.amount)}</strong></span><span>Recebido: <strong>{formatCurrency(c.received)}</strong></span><span>Saldo: <strong>{formatCurrency(balance)}</strong></span><span>Cancelado/ajustado: <strong>{formatCurrency(c.cancelled)}</strong></span></div>
                          {(() => {
                            const fees=c.payments.reduce((sum,p)=>sum+classModalFees.filter(f=>f.payment_id===String(p.id)).reduce((n,f)=>n+f.fee_amount,0),0);
                            return <div className="grid grid-cols-2 gap-2 border-t pt-2">
                              <div><span className="text-slate-600">Taxas financeiras</span><p className="font-bold text-red-700">{classModalFeesLoading?"Carregando...":classModalFeesError?"Indisponível":formatCurrency(fees)}</p></div>
                              <div><span className="text-slate-600">Recebido líquido de taxas</span><p className="font-bold text-emerald-700">{classModalFeesLoading?"Carregando...":classModalFeesError?"Indisponível":formatCurrency(c.received-fees)}</p></div>
                            </div>;
                          })()}
                          <div className="border-t pt-2 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">Condições de pagamento</span>
                              {isActiveEnrollment(monthlyEnrollment.status) ? <button type="button" onClick={()=>openSchedule(c)} className="px-2 py-1 rounded bg-blue-700 text-white font-bold">{termsByCharge[c.id]?"Editar vencimentos":"Configurar vencimentos"}</button> : <span className="text-slate-500">Somente consulta</span>}
                            </div>
                            {!termsByCharge[c.id] && <p className="text-amber-700">Vencimento não definido — não classificar como atrasado.</p>}
                            {termsByCharge[c.id] && (()=>{
                              const term=termsByCharge[c.id];
                              const isCard=term.payment_mode==="cartao_maquininha";
                              const list=isCard ? cardItems.filter(i=>i.payment_terms_id===term.id).sort((a,b)=>a.installment_number-b.installment_number) : dueItems.filter(i=>i.payment_terms_id===term.id).sort((a,b)=>a.installment_number-b.installment_number);
                              let applied=c.received+c.cancelled;
                              return <div className="space-y-1"><p className="font-semibold">{isCard?"Crédito parcelado na maquininha (aluno quitado)":term.payment_mode==="integral"?"Pagamento integral":"Parcelado pela arena"}</p>
                                {list.map((i:any)=>{const due=isCard?i.expected_date:i.due_date;const amount=Number(isCard?i.gross_amount:i.amount);const outstanding=isCard?0:Math.max(0,Math.round((amount-applied)*100)/100);applied=Math.max(0,applied-amount);return <p key={i.installment_number} className="flex justify-between border-b py-1"><span>{i.installment_number}/{list.length} · {formatDateToBR(due)} {isCard?"· repasse da operadora":outstanding<=0.009?"· quitada":due<getBrazilDateString()?"· vencida":"· a vencer"}</span><strong>{formatCurrency(amount)}{!isCard&&outstanding>0.009?` (saldo ${formatCurrency(outstanding)})`:""}</strong></p>;})}
                                {isCard&&<div className="space-y-1"><p className="text-slate-600">Taxa da operadora: {formatCurrency(Number(term.card_fee_amount||0))}. Repasses não são novas dívidas do aluno.</p>{cardItems.filter(i=>i.payment_terms_id===term.id).sort((a,b)=>a.installment_number-b.installment_number).map(item=><div key={item.id} className="flex justify-between items-center gap-2 border-t pt-1"><span>Repasse {item.installment_number} · líquido previsto {formatCurrency(Number(item.gross_amount)-Number(item.fee_amount))}{item.received_at?` · recebido ${formatCurrency(Number(item.received_amount||0))}`:" · aguardando"}</span>{!item.received_at&&<button type="button" disabled={!!remittanceSaving} onClick={()=>void receiveRemittance(item)} className="px-2 py-1 bg-emerald-700 text-white rounded disabled:opacity-50">Baixar repasse</button>}</div>)}</div>}
                              </div>;
                            })()}
                          </div>
                          <p className="font-bold">Histórico de pagamentos</p>
                          {c.payments.length === 0 ? <p className="text-slate-500">Nenhum pagamento registrado.</p> : c.payments.map(p => {
                            const feeRows=classModalFees.filter(f=>f.payment_id===String(p.id));
                            const fee=feeRows.reduce((sum,f)=>sum+f.fee_amount,0);
                            return <div key={p.id} className="border-t pt-1 space-y-1">
                              <div className="flex justify-between"><span>{new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.payment_method}</span><strong>{formatCurrency(p.amount)}</strong></div>
                              {!classModalFeesLoading&&!classModalFeesError&&<p className="text-slate-600">Taxa financeira: {formatCurrency(fee)}{feeRows.length?` (${feeRows.map(f=>`${f.fee_percent}%`).join(" + ")})`:""} · Líquido: {formatCurrency(p.amount-fee)}</p>}
                            </div>;
                          })}
                        </div>;
                      })}</div>}
                      {monthlyHistory.length === 0 && monthlyEnrollment.status === "encerrada" && <p className="text-xs text-slate-500">Contrato encerrado sem cobrança registrada.</p>}
                      {scheduleChargeId && (()=>{
                        const charge=monthlyHistory.find(c=>c.id===scheduleChargeId);
                        if(!charge)return null;
                        return <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-3 space-y-3 text-xs">
                          <div className="flex justify-between items-center"><h4 className="font-black text-blue-900">Configurar pagamento — {formatCurrency(charge.amount)}</h4><button type="button" onClick={()=>setScheduleChargeId(null)} aria-label="Fechar configuração"><X size={16}/></button></div>
                          <label className="block font-bold">Modalidade<select value={scheduleMode} onChange={e=>{const mode=e.target.value as PaymentMode;setScheduleMode(mode);setScheduleItems(defaultSchedule(charge.amount,mode==="integral"?1:mode==="parcelado_arena"?(monthlyEnrollment.plan_type==="semestral"?6:monthlyEnrollment.plan_type==="trimestral"?3:1):1,charge.plan_start_date||getBrazilDateString()));}} className="mt-1 w-full border p-2 rounded-lg"><option value="integral">Integral — um vencimento</option><option value="parcelado_arena">Parcelado pela arena — cobrança ao aluno</option></select></label>
                          
                          {scheduleMode!=="integral"&&<label className="block font-bold">Número de parcelas (1–60)<input type="number" min={1} max={60} value={scheduleItems.length} onChange={e=>{const count=Number(e.target.value);if(Number.isInteger(count)&&count>=1&&count<=60)setScheduleItems(defaultSchedule(charge.amount,count,scheduleItems[0]?.date||charge.plan_start_date||getBrazilDateString()));}} className="mt-1 w-full border p-2 rounded-lg"/></label>}
                          {<div className="max-h-48 overflow-y-auto space-y-2">{scheduleItems.map((item,i)=><div key={i} className="grid grid-cols-[35px_1fr_1fr] gap-2 items-center"><span className="font-bold">{i+1}.</span><input type="date" aria-label={`Vencimento ${i+1}`} value={item.date} onChange={e=>setScheduleItems(v=>v.map((x,j)=>j===i?{...x,date:e.target.value}:x))} className="border p-2 rounded-lg min-w-0"/><input type="text" inputMode="decimal" aria-label={`Valor ${i+1}`} value={item.amount} onChange={e=>setScheduleItems(v=>v.map((x,j)=>j===i?{...x,amount:e.target.value}:x))} className="border p-2 rounded-lg min-w-0"/></div>)}</div>}
                          {<p>Soma: <strong>{formatCurrency(scheduleItems.reduce((n,i)=>n+(Number.isFinite(moneyNum(i.amount))?moneyNum(i.amount):0),0))}</strong> · Contratado: <strong>{formatCurrency(charge.amount)}</strong></p>}
                          {scheduleError&&<p role="alert" className="text-red-700 font-bold">{scheduleError}</p>}
                          <div className="flex gap-2"><button type="button" disabled={scheduleSaving} onClick={()=>void handleSaveSchedule()} className="bg-blue-800 text-white rounded-lg px-4 py-2 font-bold disabled:opacity-50">{scheduleSaving?"Salvando...":"Salvar cronograma"}</button><button type="button" onClick={()=>setScheduleChargeId(null)} className="border rounded-lg px-4 py-2">Cancelar</button></div>
                        </div>;
                      })()}
                      {((isActiveEnrollment(monthlyEnrollment.status) && (monthlyHistory.length===0 || monthlyHistory.some(c=>c.amount-c.received-c.cancelled>0.009))) || (monthlyEnrollment.status==="encerrada" && monthlyHistory.some(c=>c.amount-c.received-c.cancelled>0.009))) && (
                        <form onSubmit={handleCreateMonthlyCharge} className="space-y-3">
                          <h4 className="font-bold text-sm">{monthlyHistory.length ? "Registrar pagamento parcial" : "Cadastrar cobrança única do plano"}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {monthlyHistory.length === 0 && <>
                              <label className="text-xs font-bold">Data de início do plano<input type="date" required value={monthlyReference} onChange={e => setMonthlyReference(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl"/></label>
                              <label className="text-xs font-bold">Valor total contratado (R$)<input type="text" inputMode="decimal" required value={monthlyChargeAmount} onChange={e => setMonthlyChargeAmount(e.target.value)} className="mt-1 w-full p-2.5 border rounded-xl"/></label>
                            </>}
                            <label className="text-xs font-bold">{monthlyHistory.length ? "Novo pagamento (R$)" : "Pagamento inicial (R$) — opcional"}<input type="text" inputMode="decimal" required={monthlyHistory.length > 0} value={monthlyPaidAmount} onChange={e => setMonthlyPaidAmount(e.target.value)} placeholder={monthlyHistory.length ? "0,00" : "0 (sem entrada)"} className="mt-1 w-full p-2.5 border rounded-xl"/></label>
                            <label className="text-xs font-bold">Forma de pagamento<select value={monthlyMethod} onChange={e => setMonthlyMethod(e.target.value)} disabled={monthlyPaidAmount.trim() === "" || Number(monthlyPaidAmount.replace(",", ".")) === 0} className="mt-1 w-full p-2.5 border rounded-xl"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="wellhub">Wellhub</option><option value="totalpass">TotalPass</option></select></label>
                            {["credito","debito"].includes(monthlyMethod)&&<div className="grid grid-cols-2 gap-2 col-span-2">{monthlyMethod==="credito"&&<label className="text-xs font-bold">Parcelas<input type="number" min="1" max="12" value={monthlyCreditInstallments} onChange={e=>setMonthlyCreditInstallments(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"/></label>}<label className="text-xs font-bold">Taxa da operadora (%)<input type="text" inputMode="decimal" value={monthlyCreditFee} onChange={e=>setMonthlyCreditFee(e.target.value)} className="mt-1 w-full p-2 border rounded-lg"/></label><p className="col-span-2 text-xs text-slate-600">Despesa financeira estimada: {formatCurrency(Math.max(0,Number(monthlyPaidAmount.replace(",","."))||0)*Math.max(0,Number(monthlyCreditFee.replace(",","."))||0)/100)}</p></div>}
                          </div>
                          {monthlyHistory.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(monthlyReference) && (() => {
                            const [year, month, day] = monthlyReference.split("-").map(Number);
                            const months = monthlyEnrollment.plan_type === "semestral" ? 6 : monthlyEnrollment.plan_type === "trimestral" ? 3 : 1;
                            const target = new Date(Date.UTC(year, month - 1 + months, 1));
                            const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
                            const endDate = `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
                            return <p className="text-xs text-slate-600">Término previsto: <strong>{formatDateToBR(endDate)}</strong>. Pagamentos conforme negociação do gestor; sem parcelas automáticas.</p>;
                          })()}
                          <button type="submit" disabled={monthlySaving} className="w-full py-3 bg-[#041E8C] disabled:opacity-50 text-white font-bold rounded-xl">{monthlySaving ? "Salvando..." : monthlyHistory.length ? "Registrar pagamento" : "Cadastrar cobrança do plano"}</button>
                        </form>
                      )}
                      {monthlyHistory.length > 0 && monthlyHistory.every(c => c.amount-c.received-c.cancelled <= 0.009) && <p className="text-sm font-bold text-emerald-700">{monthlyHistory.every(c=>c.amount-c.received<=0.009)?"Saldo quitado por pagamentos.":"Saldo encerrado por pagamentos e/ou ajustes."} Nenhum novo pagamento necessário.</p>}
                      {monthlyHistory.length===0 && !isActiveEnrollment(monthlyEnrollment.status) && monthlyEnrollment.status!=="encerrada" && <p className="text-sm text-slate-600">Matrícula não ativa: novos lançamentos financeiros bloqueados.</p>}
                      {classModalFeesError && <p role="alert" className="text-xs text-red-700">{classModalFeesError}</p>}
                    </>
                  )}
                  {monthlyError && <p role="status" className="text-xs font-semibold text-blue-700">{monthlyError}</p>}
                </div>
              </div>
            )}

            {terminationEnrollment && (
              <div role="dialog" aria-modal="true" aria-label="Encerrar contrato" className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" onClick={() => setTerminationEnrollment(null)}>
                <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center"><h3 className="font-black text-[#041E8C]">Encerrar contrato — {terminationEnrollment.student_name}</h3><button type="button" onClick={() => setTerminationEnrollment(null)} aria-label="Fechar"><X size={18}/></button></div>
                  <p className="text-xs text-slate-600">A matrícula será encerrada e a vaga na turma liberada. Os pagamentos anteriores serão preservados.</p>
                  <form onSubmit={handleTerminateEnrollment} className="space-y-3">
                    <label className="flex gap-2 items-start text-sm"><input type="radio" checked={terminationMode === "zerar_saldo"} onChange={() => setTerminationMode("zerar_saldo")}/><span><strong>Encerrar e zerar saldo</strong><br/><span className="text-xs text-slate-500">Informe quanto registrar como perda. O restante será cancelado sem perda.</span></span></label>
                    {terminationMode === "zerar_saldo" && (() => {
                      const financial = classFinancialSummary[terminationEnrollment.id];
                      const pending = financial ? Math.max(0, Math.round((financial.contracted-financial.received-financial.cancelled)*100)/100) : 0;
                      const loss = Number(terminationLossAmount.replace(",","."));
                      const valid = terminationLossAmount.trim() !== "" && Number.isFinite(loss) && loss >= 0 && loss <= pending && Math.abs(loss*100-Math.round(loss*100)) < 0.00001;
                      return <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm">Saldo pendente: <strong>{financial ? formatCurrency(pending) : "Carregando..."}</strong></p>
                        <label className="block text-xs font-bold">Valor da perda (R$)<input type="text" inputMode="decimal" value={terminationLossAmount} onChange={e => setTerminationLossAmount(e.target.value)} className="mt-1 w-full border rounded-lg p-2" placeholder="0,00"/></label>
                        <p className="text-xs text-slate-600">Perda: {valid ? formatCurrency(loss) : "Valor inválido"} · Cancelamento sem perda: {valid ? formatCurrency(pending-loss) : "—"}</p>
                        <p className="text-xs font-semibold text-slate-700">Saldo após encerramento: R$ 0,00</p>
                      </div>;
                    })()}
                    <label className="flex gap-2 items-start text-sm"><input type="radio" checked={terminationMode === "manter_saldo"} onChange={() => setTerminationMode("manter_saldo")}/><span><strong>Encerrar mantendo dívida</strong><br/><span className="text-xs text-slate-500">Mantém o saldo para recebimentos posteriores.</span></span></label>
                    <label className="block text-xs font-bold">Motivo do encerramento<textarea required value={terminationReason} onChange={e => setTerminationReason(e.target.value)} className="mt-1 w-full border rounded-xl p-2.5" rows={3}/></label>
                    {terminationError && <p role="alert" className="text-xs text-red-700">{terminationError}</p>}
                    <button type="submit" disabled={terminationSaving} className="w-full py-3 bg-red-700 text-white font-bold rounded-xl disabled:opacity-50">{terminationSaving ? "Encerrando..." : "Confirmar encerramento"}</button>
                  </form>
                </div>
              </div>
            )}

            {editingStudent && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
                  <div className="flex justify-between border-b pb-3">
                    <h3 className="text-sm font-black text-[#041E8C] uppercase">Alterar Turma de {editingStudent.student_name}</h3>
                    <button onClick={() => setEditingStudent(null)}><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleUpdateStudentClass} className="space-y-3">
                    <p className="text-xs text-slate-500">Modalidade: <strong>{editingStudent.sport} ({editingStudent.category})</strong></p>
                    <label className="text-[11px] font-bold text-slate-600 block">Nova Turma / Horário:</label>
                    <select value={newStudentOption} onChange={(e) => setNewStudentOption(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                      {(classScheduleMap[editingStudent.sport]?.[editingStudent.category] || []).map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button type="submit" className="w-full py-3 bg-[#041E8C] text-white font-black text-xs rounded-xl shadow-md">Salvar Nova Turma</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

{activeTab === "locks_classes" && (
  <div className="space-y-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#00E599]" /> Gestão de Capacidade & Vagas por Turma Específica</h2>
              <form onSubmit={handleSaveSpecificCapacity} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Modalidade</label>
                  <select value={selectedSportForCap} onChange={(e) => { setSelectedSportForCap(e.target.value); setSelectedCategoryForCap("Iniciante"); }} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C] outline-none">
                    <option value="Vôlei de Praia">Vôlei de Praia</option>
                    <option value="Futevôlei">Futevôlei</option>
                    <option value="Beach Tennis">Beach Tennis</option>
                    <option value="Futebol Society">Futebol Society</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nível</label>
                  <select value={selectedCategoryForCap} onChange={(e) => setSelectedCategoryForCap(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                    {Object.keys(classScheduleMap[selectedSportForCap] || {}).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Turma / Horário</label>
                  <select value={selectedTurmaForCap} onChange={(e) => setSelectedTurmaForCap(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                    {(classScheduleMap[selectedSportForCap]?.[selectedCategoryForCap] || []).map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Máx. Vagas</label>
                  <div className="flex gap-2">
                    <input type="number" value={specificCapInput} onChange={(e) => setSpecificCapInput(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none" />
                    <button type="submit" className="px-4 py-2.5 bg-[#041E8C] text-white text-xs font-bold rounded-xl">Salvar</button>
                  </div>
                </div>
              </form>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <h3 className="text-xs font-black text-[#041E8C]">Associar espaço à turma da grade</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Usa a turma já existente na capacidade. Esta associação aparece na agenda, mas não bloqueia a quadra automaticamente.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <label className="text-[11px] font-bold text-slate-500">Quadra / espaço
                    <select value={classLocationCourt} onChange={e => setClassLocationCourt(e.target.value)} className="mt-1 w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold">
                      {allCourts.map(court => <option key={court.id} value={court.id}>{court.name}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-slate-500">Professor
                    <input value={classLocationProfessor} onChange={e => setClassLocationProfessor(e.target.value)} placeholder="Nome do professor" className="mt-1 w-full p-2.5 bg-slate-50 border rounded-xl text-xs" />
                  </label>
                  <button type="button" onClick={handleAssignClassLocation} disabled={classLocationSaving} className="p-2.5 bg-[#041E8C] text-white text-xs font-bold rounded-xl disabled:opacity-50">{classLocationSaving ? "Salvando..." : "Associar à grade"}</button>
                </div>
                {classLocationMessage && <p className="text-xs text-slate-600">{classLocationMessage}</p>}
              </div>
            </div>

    {/* Governança informativa: matrículas e avulsos são contagens separadas. */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-[#041E8C]">OCUPAÇÃO DAS TURMAS</h2>
          <p className="text-xs text-slate-500 mt-1">Participações avulsas são contabilizadas separadamente.</p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <label className="text-xs text-slate-600" htmlFor="occupancy-date">Data da aula</label>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Dia anterior" title="Dia anterior" onClick={() => shiftOccupancyDate(-1)} disabled={!occupancyDate} className="p-2 border border-slate-200 rounded-lg text-[#041E8C] hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <input id="occupancy-date" type="date" value={occupancyDate} onChange={e => {setOccupancyDate(e.target.value);setOccupancyPage(1);setOccupancyDetails(null);}} className="border border-slate-300 rounded-lg p-2 text-xs" />
            <button type="button" aria-label="Próximo dia" title="Próximo dia" onClick={() => shiftOccupancyDate(1)} disabled={!occupancyDate} className="p-2 border border-slate-200 rounded-lg text-[#041E8C] hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
          <button type="button" aria-expanded={occupancyExpanded} onClick={() => setOccupancyExpanded(v => !v)} className="text-xs font-bold text-[#041E8C] px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap">{occupancyExpanded ? "Recolher −" : "Expandir +"}</button>
        </div>
      </div>
      {occupancyExpanded && <>
      <div className="space-y-3">
        <div><p className="text-xs font-bold text-slate-600 mb-2">Modalidade</p>
          <div className="flex flex-wrap gap-1.5">{["Todas", ...Object.keys(classScheduleMap)].map(sport =>
            <button key={sport} type="button" onClick={() => {setOccupancySport(sport);setOccupancyLevel("Todos");setOccupancyClass("Todas");setOccupancyDetails(null);setOccupancyPage(1);}} className={`rounded-xl px-3 py-2 text-xs font-bold ${occupancySport === sport ? "bg-[#041E8C] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{sport}</button>
          )}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-600">Nível
            <select value={occupancyLevel} onChange={e => {setOccupancyLevel(e.target.value);setOccupancyClass("Todas");setOccupancyDetails(null);setOccupancyPage(1);}} className="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white">
              <option value="Todos">Todos os níveis</option>
              {Array.from(new Set(Object.entries(classScheduleMap).filter(([sport]) => occupancySport === "Todas" || sport === occupancySport).flatMap(([, cats]) => Object.keys(cats)))).map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Turma / horário
            <select value={occupancyClass} onChange={e => {setOccupancyClass(e.target.value);setOccupancyDetails(null);setOccupancyPage(1);}} className="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white">
              <option value="Todas">Todas as turmas</option>
              {Array.from(new Set(Object.entries(classScheduleMap).filter(([sport]) => occupancySport === "Todas" || sport === occupancySport).flatMap(([, cats]) => Object.entries(cats).filter(([level]) => occupancyLevel === "Todos" || level === occupancyLevel).flatMap(([, schedules]) => schedules)))).map(schedule => <option key={schedule} value={schedule}>{schedule}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead className="bg-slate-50 text-[11px] text-slate-600"><tr><th className="px-3 py-2">Turma / horário</th><th className="px-3 py-2 text-center">Matrículas</th><th className="px-3 py-2 text-center">Livres</th><th className="px-3 py-2 text-center">Avulsos</th><th className="px-3 py-2 text-right">Ação</th></tr></thead>
          <tbody>
        {visibleOccupancyItems.map(item => {
           const key = `${item.sport}|${item.category}|${item.schedule}`;
           const students = enrollments.filter(en => isActiveEnrollment(en.status) && en.sport === item.sport && en.category === item.category && (en.days_selected || "").includes(item.schedule));
           const capacity = Number(classCapacityMap[item.schedule] ?? defaultCapacity);
           const validCapacity = Number.isFinite(capacity) && capacity >= 0 ? capacity : 0;
           const walkins = classCharges.filter(c => c.charge_type === "avulsa" && c.sport === item.sport && c.class_name === item.schedule && c.class_date === occupancyDate);
           const free = Math.max(0, validCapacity - students.length);
           const open = occupancyDetails === key;
           return <React.Fragment key={key}>
             <tr className="border-b border-slate-100 hover:bg-slate-50">
               <td className="px-3 py-3 text-xs"><span className="font-bold text-[#041E8C]">{item.sport} · {item.category}</span><span className="block text-slate-500 mt-0.5">{item.schedule}</span></td>
               <td className="px-3 py-3 text-xs font-bold text-center">{students.length}/{validCapacity}</td>
               <td className="px-3 py-3 text-center"><span className={`inline-block rounded-lg px-2 py-1 text-[11px] font-bold ${free <= 1 ? "bg-red-100 text-red-700" : free <= 4 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{free}</span></td>
               <td className="px-3 py-3 text-xs text-center">{walkins.length}</td>
               <td className="px-3 py-3 text-right"><button type="button" onClick={() => setOccupancyDetails(open ? null : key)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#041E8C]">{open ? "Fechar" : "Detalhes"}</button></td>
             </tr>
             {open && <tr className="bg-slate-50"><td colSpan={5} className="px-4 py-3 text-xs">
               <div className="space-y-2"><p className="font-bold">Matriculados ({students.length})</p>
               {students.length ? students.map(en => <p key={en.id}>{en.student_name} · {en.code}</p>) : <p className="text-slate-500">Nenhum matriculado ativo.</p>}
               <p className="font-bold pt-2">Avulsos em {formatDateToBR(occupancyDate)} ({walkins.length})</p>
               {walkins.length ? walkins.map(c => <p key={c.id}>{c.student_name}</p>) : <p className="text-slate-500">Nenhum avulso registrado.</p>}</div>
             </td></tr>}
           </React.Fragment>;
         })}
      </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <label className="font-semibold">Por página
          <select aria-label="Turmas por página" value={occupancyPageSize} onChange={e => {setOccupancyPageSize(Number(e.target.value));setOccupancyPage(1);}} className="ml-2 p-2 border border-slate-200 rounded-lg bg-white">
            <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
          </select>
        </label>
        <span>{occupancyFilteredItems.length ? `${(currentOccupancyPage-1)*occupancyPageSize+1}–${Math.min(currentOccupancyPage*occupancyPageSize,occupancyFilteredItems.length)} de ${occupancyFilteredItems.length}` : "0 turmas"}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentOccupancyPage===1} onClick={() => setOccupancyPage(page => Math.max(1,page-1))} className="px-3 py-2 border border-slate-200 rounded-lg disabled:opacity-40">Anterior</button>
          <span>Página {currentOccupancyPage} de {occupancyTotalPages}</span>
          <button type="button" disabled={currentOccupancyPage===occupancyTotalPages} onClick={() => setOccupancyPage(page => Math.min(occupancyTotalPages,page+1))} className="px-3 py-2 border border-slate-200 rounded-lg disabled:opacity-40">Próxima</button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">As vagas são calculadas com base nas matrículas ativas e na capacidade configurada. Esta visão não altera o limite nem associa automaticamente uma turma a uma quadra.</p>
      </>}
    </div>
    {/* Planner compacto: mostra a grade de capacidade sem criar bloqueios automaticamente. */}
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-sm font-black text-[#041E8C]">GRADE DE AULAS</h2>
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-600">
          <span><span className="text-green-600">●</span> Bloqueio vinculado</span>
          <span><span className="text-amber-600">●</span> Bloqueio independente</span>
          <span><span className="text-red-600">●</span> Sem bloqueio</span>
          <span><span className="text-slate-400">●</span> Sem quadra</span>
        </div>
        <button type="button" aria-expanded={weeklyAgendaExpanded} onClick={() => setWeeklyAgendaExpanded(v => !v)} className="text-xs font-bold text-[#041E8C] px-3 py-2 rounded-lg hover:bg-slate-100 whitespace-nowrap">{weeklyAgendaExpanded ? "Recolher −" : "Expandir +"}</button>
        </div>
      </div>
      {weeklyAgendaExpanded && <>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <div className="min-w-[900px] grid grid-cols-[64px_repeat(6,minmax(0,1fr))] text-[10px]">
          <div className="bg-slate-100 p-2 font-bold text-slate-600 sticky left-0 z-10 text-center">Hora</div>
          {daysOfWeek.filter(day => day.id !== 0).map(day => <div key={day.id} className="bg-slate-100 p-2 font-bold text-[#041E8C] text-center border-l border-slate-200">{day.name.replace('-feira','')}</div>)}
          {Array.from(new Set(registeredClasses.filter(c => c.active).map(c => c.class_time.slice(0, 5)))).sort().map(time => <React.Fragment key={time}>
            <div className="p-2 font-bold text-slate-700 bg-slate-50 border-t border-slate-200 sticky left-0 z-10 flex items-center justify-center text-center">{time}</div>
            {daysOfWeek.filter(day => day.id !== 0).map(day => {
              const items = registeredClasses.filter(c => c.active && c.day_of_week === day.id && c.class_time.slice(0, 5) === time).map(assigned => {
                const matchingLock = cloudLocks.find(lock => lock.court_id === assigned.court_id && lock.lock_type === 'weekly' && Number(lock.day_of_week) === day.id && String(lock.lock_time).slice(0, 5) === time);
                const status = !matchingLock ? 'missing' : matchingLock.class_schedule_id === assigned.id ? 'linked' : 'independent';
                return { assigned, status };
              }).sort((a,b) => a.assigned.sport.localeCompare(b.assigned.sport, 'pt-BR') || a.assigned.category.localeCompare(b.assigned.category, 'pt-BR'));
              return <div key={`${day.id}-${time}`} className="border-l border-t border-slate-200 p-1 min-h-[48px] space-y-1 text-center">
                {items.map(({assigned, status}) => <button type="button" key={assigned.id}
                  onClick={() => setSelectedClassDetail({
                    sport: assigned.sport, category: assigned.category, schedule: assigned.class_name,
                    dayName: day.name, time, professor: assigned.professor,
                    court: allCourts.find(c => c.id === assigned.court_id)?.name || assigned.court_id,
                    status: status === 'linked' ? 'Bloqueio vinculado' : status === 'independent' ? 'Bloqueio independente' : 'Sem bloqueio físico'
                  })}
                  aria-label={`Ver detalhes de ${assigned.sport}, ${assigned.category}, ${day.name}, ${time}`}
                  className={`w-full rounded px-1.5 py-1 border-l-[3px] text-center cursor-pointer hover:ring-2 hover:ring-blue-300 focus-visible:outline-2 focus-visible:outline-blue-700 ${status === 'linked' ? 'bg-green-50 border-green-500' : status === 'independent' ? 'bg-amber-50 border-amber-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="font-semibold text-slate-800 leading-tight">{assigned.sport}</div>
                  <div className="text-slate-600 leading-tight">{assigned.category} · {allCourts.find(c => c.id === assigned.court_id)?.name.replace(' (Areia)','').replace('Quadra ','Q') || assigned.court_id}</div>
                </button>)}
              </div>;
            })}
          </React.Fragment>)}
        </div>
      </div>
      <p className="text-[10px] text-slate-500">Clique em uma aula para ver os detalhes, incluindo quadra e professor. A agenda é informativa e não altera reservas ou bloqueios.</p>
      </>}
    </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Formulário de Cadastro Manual (Sem Excel) */}
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Cadastrar bloqueio físico recorrente</h2>

      <p className="text-xs text-slate-500">Este cadastro apenas bloqueia o uso da quadra. Não cria turmas, vagas ou matrículas.</p>
      <form onSubmit={handleAddLock} className="space-y-3 pt-2">
        <div>
          <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Modalidade</label>
          <select value={bulkSport} onChange={(e) => setBulkSport(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C] outline-none">
            {orderedSportsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Professor</label>
            <input type="text" value={bulkProfessor} onChange={(e) => setBulkProfessor(e.target.value)} placeholder="Ex: Prof. João" className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none" required />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Nível</label>
            <select value={bulkLevel} onChange={(e) => setBulkLevel(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
              <option value="Kids">Kids</option>
              <option value="Iniciante">Iniciante</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Quadra / Espaço</label>
          <select value={selectedCourtId} onChange={(e) => setSelectedCourtId(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium">
            {allCourts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Dia da Semana</label>
            <select value={selectedDayOfWeek} onChange={(e) => setSelectedDayOfWeek(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium">
              {daysOfWeek.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Horário (05h às 22h)</label>
            <select value={selectedLockTime} onChange={(e) => setSelectedLockTime(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium">
              {businessHours.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Período de Vigência</label>
          <select value={bulkVigencia} onChange={(e) => setBulkVigencia(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-[#041E8C] outline-none">
            <option value="indeterminado">Prazo Indeterminado (Recorrente)</option>
            
            
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Observações / Motivo</label>
          <input type="text" value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder="Ex: Treino Fixo Equipe" className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium" />
        </div>

        <button type="submit" className="w-full py-3 bg-[#041E8C] hover:bg-[#031566] text-white font-bold text-xs rounded-xl shadow-md">Bloquear horário da quadra</button>
      </form>
    </div>

    {/* Lista Direita filtrada apenas para Turmas Reais (ocultando fechos de horários diários) */}
    <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">
        Bloqueios físicos e horários fixos ativos ({cloudLocks.filter(l => !l.reason?.includes("Horário Fechado")).length})
      </h2>
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <label className="block text-xs font-semibold text-slate-700">Liberar ou restabelecer aula vinculada em uma data</label>
        <input type="date" value={classExceptionDate} onChange={e => { setClassExceptionDate(e.target.value); setClassExceptionError(""); }} className="p-2 border rounded-lg text-xs" />
        {classExceptionError && <p className="text-xs text-red-700">{classExceptionError}</p>}
        <p className="text-[10px] text-slate-500">Escolha uma data e use a ação na aula vinculada abaixo. A alteração vale apenas para essa data.</p>
      </div>
      <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
        {cloudLocks
          .filter(l => !l.reason?.includes("Horário Fechado")) // Filtra para esconder os fechos automáticos da grade
          .map((l) => {
            const court = allCourts.find(c => c.id === l.court_id);
            const dayName = l.day_of_week !== null && l.day_of_week !== undefined ? daysOfWeek.find(d => d.id === l.day_of_week)?.name : "";
            return (
              <div key={l.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#041E8C]">{court?.name}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">
                      {l.lock_type === "date" ? `Dia ${formatDateToBR(l.lock_date)} às ${l.lock_time}` : `Toda ${dayName} às ${l.lock_time}`}
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs font-medium">Detalhes: <strong>{l.reason}</strong></p>
                </div>
                {l.class_schedule_id && registeredClasses.some(c => c.id === l.class_schedule_id) ? (() => {
                  const schedule = registeredClasses.find(c => c.id === l.class_schedule_id)!;
                  const validDay = Boolean(classExceptionDate) && new Date(`${classExceptionDate}T12:00:00`).getDay() === schedule.day_of_week;
                  const cancelled = Boolean(classExceptionDate) && classCancelledOnDate(schedule.id, classExceptionDate);
                  return <button type="button" disabled={!validDay || classExceptionBusy !== null} onClick={() => changeClassException(schedule, !cancelled)} className="px-3 py-1.5 bg-blue-100 text-[#041E8C] font-bold rounded-lg disabled:opacity-40">{cancelled ? "Restabelecer nesta data" : "Liberar nesta data"}</button>;
                })() : <button type="button" disabled={Boolean(l.class_schedule_id)} onClick={() => handleRemoveLock(l.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg disabled:opacity-50">{l.class_schedule_id ? "Vinculado à aula" : "Remover bloqueio"}</button>}
              </div>
            );
          })}
      </div>
    </div>
  </div>
  </div>
)}

        {activeTab === "prices" && (
          <form onSubmit={handleSaveSettingsAndUpgrades} className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide">Gestão de Preços</h2>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Futebol Society</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Preço Promocional</label><input type="number" value={priceSocietyPromo} onChange={(e) => setPriceSocietyPromo(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Normal / Manhã / Noite</label><input type="number" value={priceSocietyNormal} onChange={(e) => setPriceSocietyNormal(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Quadras de Areia</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Preço Promocional</label><input type="number" value={priceAreiaPromo} onChange={(e) => setPriceAreiaPromo(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">Normal / Manhã / Noite</label><input type="number" value={priceAreiaNormal} onChange={(e) => setPriceAreiaNormal(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                </div>
              </div>

              {/* BLOCO DE CONFIGURAÇÃO DINÂMICA DE HORÁRIO PROMOCIONAL */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Horário Promocional / Happy Hour</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={promoEnabled} 
                      onChange={(e) => setPromoEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E599]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Início da Promoção</label>
                    <input 
                      type="time" 
                      value={promoStartHour}
                      onChange={(e) => setPromoStartHour(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Fim da Promoção</label>
                    <input 
                      type="time" 
                      value={promoEndHour}
                      onChange={(e) => setPromoEndHour(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041E8C] outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Durante este intervalo, o sistema aplicará automaticamente os valores promocionais reduzidos nas quadras para reservas feitas pelos clientes no site.
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">Preços dos Planos de Aulas por Modalidade</h3>
              <div className="space-y-4">
                {Object.keys(classPricesMap).map((sport) => (
                  <div key={sport} className="p-3.5 bg-white rounded-xl border space-y-2">
                    <p className="text-xs font-bold text-[#041E8C]">{sport}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Mensal (R$)</label>
                        <input type="number" value={classPricesMap[sport]?.mensal || 0} onChange={(e) => setClassPricesMap({ ...classPricesMap, [sport]: { ...classPricesMap[sport], mensal: Number(e.target.value) } })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Trimestral (R$)</label>
                        <input type="number" value={classPricesMap[sport]?.trimestral || 0} onChange={(e) => setClassPricesMap({ ...classPricesMap, [sport]: { ...classPricesMap[sport], trimestral: Number(e.target.value) } })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Semestral (R$)</label>
                        <input type="number" value={classPricesMap[sport]?.semestral || 0} onChange={(e) => setClassPricesMap({ ...classPricesMap, [sport]: { ...classPricesMap[sport], semestral: Number(e.target.value) } })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5"><Award className="w-4 h-4 text-[#00E599]" /> Upgrades & Adicionais por Modalidade</h3>
              <p className="text-xs text-slate-500">Ative ou desative os adicionais e defina os preços para cada esporte.</p>

              <div className="space-y-3 pt-1">
                <div className="p-3.5 bg-white rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Vôlei de Praia (Upgrade: Bola Mikasa Pro Oficial)</p>
                    <span className="text-[10px] text-slate-400">Adicional opcional para locação</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <input type="number" step="0.5" value={upgradeVolleyPrice} onChange={(e) => setUpgradeVolleyPrice(e.target.value)} className="w-20 p-2 bg-slate-50 border rounded-lg text-xs font-bold text-center" />
                    <button type="button" onClick={() => setUpgradeVolleyEnabled(!upgradeVolleyEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${upgradeVolleyEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {upgradeVolleyEnabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Beach Tennis (Aluguel de Raquetes)</p>
                    <span className="text-[10px] text-slate-400">Adicional opcional para locação</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <input type="number" step="0.5" value={upgradeBeachTennisPrice} onChange={(e) => setUpgradeBeachTennisPrice(e.target.value)} className="w-20 p-2 bg-slate-50 border rounded-lg text-xs font-bold text-center" />
                    <button type="button" onClick={() => setUpgradeBeachTennisEnabled(!upgradeBeachTennisEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${upgradeBeachTennisEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {upgradeBeachTennisEnabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Futebol Society (Aluguel de Coletes)</p>
                    <span className="text-[10px] text-slate-400">Adicional opcional para locação</span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <input type="number" step="0.5" value={upgradeSocietyPrice} onChange={(e) => setUpgradeSocietyPrice(e.target.value)} className="w-20 p-2 bg-slate-50 border rounded-lg text-xs font-bold text-center" />
                    <button type="button" onClick={() => setUpgradeSocietyEnabled(!upgradeSocietyEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${upgradeSocietyEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {upgradeSocietyEnabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 logo rounded-xl border border-purple-200 text-[11px] text-purple-900 font-medium">
                  ℹ️ <strong>Carimba</strong> e <strong>Futevôlei</strong> não possuem adicionais configurados conforme regra da arena.
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wide">{editingCouponId ? "Editar Cupom" : "Criar Cupom com Restrição de Escopo"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <input type="text" placeholder="CÓDIGO" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none" />
                <select value={newCouponType} onChange={(e) => setNewCouponType(e.target.value as "percent" | "fixed")} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none"><option value="percent">%</option><option value="fixed">R$</option></select>
                <input type="number" placeholder="Valor" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                <select value={newCouponScope} onChange={(e) => setNewCouponScope(e.target.value as "quadras" | "aulas" | "ambos")} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold text-[#041E8C]">
                  <option value="ambos">Ambos (Quadras & Aulas)</option>
                  <option value="quadras">Apenas Quadras</option>
                  <option value="aulas">Apenas Aulas</option>
                </select>
                <input type="number" placeholder="Limite usos" value={newCouponMaxUses} onChange={(e) => setNewCouponMaxUses(e.target.value)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                <button type="button" onClick={handleSaveCoupon} className="py-2.5 bg-[#041E8C] text-white text-xs font-black rounded-xl shadow-xs">{editingCouponId ? "Atualizar" : "Adicionar"}</button>
              </div>
              <div className="space-y-2 pt-1">
                {coupons.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                    <div>
                      <span><strong>{c.code}</strong> ({c.discount_value}{c.discount_type === 'percent' ? '%' : 'R$'})</span>
                      <span className="ml-3 text-[10px] bg-blue-50 text-[#041E8C] px-2 py-0.5 rounded font-bold uppercase">Uso: {c.scope || "ambos"}</span>
                    </div>
                    <div className="flex gap-1.5"><button type="button" onClick={() => handleEditCoupon(c)} className="px-2.5 py-1 bg-slate-100 rounded-lg font-semibold">Editar</button><button type="button" onClick={() => toggleCouponStatus(c)} className={`px-2.5 py-1 rounded-lg font-semibold ${c.active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{c.active ? "Desativar" : "Ativar"}</button><button type="button" onClick={() => handleDeleteCoupon(c.id)} className="text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-3.5 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow-md">Salvar Configurações</button>
          </form>
        )}

        {activeTab === "config" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#00E599]" />
                Notificações por E-mail (Aviso de Novas Reservas)
              </h2>
              <p className="text-xs text-slate-500">Cadastre o e-mail que receberá os alertas automáticos sempre que uma reserva for confirmada.</p>

              <form onSubmit={handleSaveManagerEmail} className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">E-mail Principal do Gestor</label>
                  <input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none" required />
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                  <p className="font-bold">ℹ️ Funcionamento Automático:</p>
                  <p>O endereço acima agora está vinculado ao Supabase. Sempre que houver uma reserva paga, o sistema buscará este e-mail e enviará o alerta do Resend instantaneamente.</p>
                </div>
                <button type="submit" className="py-2.5 px-5 bg-[#041E8C] text-white font-black text-xs rounded-xl shadow-md">Salvar E-mail de Alerta</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-sm font-black uppercase text-[#041E8C] tracking-wide flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00E599]" />
                Gestão de Novos Administradores
              </h2>
              <p className="text-xs text-slate-500">Cadastre outros administradores que terão acesso a este painel.</p>

              <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 opacity-60">
                <input type="text" placeholder="Nome do Gestor" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none" />
                <input type="email" placeholder="E-mail" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none" />
                <input type="password" placeholder="Senha" value={newAdminPin} onChange={(e) => setNewAdminPin(e.target.value)} className="p-2.5 bg-slate-50 border rounded-xl text-xs font-medium outline-none" />
                <button type="submit" disabled className="sm:col-span-3 py-3 bg-[#041E8C] text-white font-black text-xs rounded-xl shadow-md">Adicionar Novo Gestor</button>
              </form>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Gestores Autorizados:</span>
                {adminList.map((adm) => (
                  <div key={adm.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{adm.name} <span className={`text-[10px] px-2 py-0.5 rounded font-bold ml-2 ${adm.role === 'Master' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{adm.role}</span></p>
                      <p className="text-slate-500 text-[11px]">{adm.email}</p>
                    </div>
                    {adm.role !== "Master" && (
                      <button disabled onClick={() => handleDeleteAdmin(adm.id, adm.role)} className="text-red-600 font-bold hover:underline">Remover</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedClassDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedClassDetail(null)}>
          <div role="dialog" aria-modal="true" aria-label="Detalhes da aula" className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-[#041E8C] uppercase">Detalhes da aula</h3>
              <button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedClassDetail(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-3 text-xs">
              {([
                ["Modalidade", selectedClassDetail.sport],
                ["Nível", selectedClassDetail.category],
                ["Turma", selectedClassDetail.schedule],
                ["Dia", selectedClassDetail.dayName],
                ["Horário", selectedClassDetail.time],
                ["Professor", selectedClassDetail.professor],
                ["Quadra", selectedClassDetail.court],
                ["Bloqueio", selectedClassDetail.status],
              ] as Array<[string, string]>).map(([label, value]) => (
                <React.Fragment key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="font-semibold text-slate-800 break-words">{value}</dd></React.Fragment>
              ))}
            </dl>
            <button type="button" onClick={() => setSelectedClassDetail(null)} className="w-full py-2.5 bg-[#041E8C] text-white font-bold text-xs rounded-xl">Fechar</button>
          </div>
        </div>
      )}

      {slotModalOpen && modalCourt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-[#041E8C] uppercase">Nova Reserva</h3>
                <p className="text-xs text-slate-500">{modalCourt.name} • {formatDateToBR(gridDate)} • {modalTime}</p>
              </div>
              <button onClick={() => setSlotModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
             
            <form onSubmit={handleSaveQuickAction} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome e Sobrenome do Atleta</label>
                <input 
                  type="text" 
                  placeholder="Ex: Carlos Alberto" 
                  value={quickCustomerName} 
                  onChange={(e) => setQuickCustomerName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none" 
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">WhatsApp do Atleta (Apenas Números)</label>
                <input 
                  type="tel" 
                  placeholder="Ex: 85988887777" 
                  value={quickCustomerPhone} 
                  onChange={(e) => setQuickCustomerPhone(e.target.value.replace(/\D/g, ''))} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none" 
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">E-mail do atleta (opcional)</label>
                <input
                  type="email"
                  placeholder="Ex: atleta@email.com"
                  value={quickCustomerEmail}
                  onChange={(e) => setQuickCustomerEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Modalidade da reserva</label>
                <select value={quickSport} onChange={e => setQuickSport(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" required>
                  {(modalCourt.type === "society" ? ["Futebol Society"] : ["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"]).map(sport => <option key={sport} value={sport}>{sport}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Valor da Reserva em R$</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={quickPrice} 
                  onChange={(e) => setQuickPrice(e.target.value)} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none text-[#041E8C]" 
                  required
                />
              </div>

              <div className="border-t pt-3 space-y-3">
                <label className="text-[11px] font-bold text-slate-600 block">Recebimento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!!quickCreatedCode} onClick={() => setQuickPaymentMode("later")} className={`rounded-xl border p-2 text-xs font-bold ${quickPaymentMode === "later" ? "bg-[#041E8C] text-white" : "bg-slate-50"}`}>Pagar depois</button>
                  <button type="button" disabled={!!quickCreatedCode && quickPaymentMode === "later"} onClick={() => {setQuickPaymentMode("now");setQuickPaymentAmount(quickPrice);}} className={`rounded-xl border p-2 text-xs font-bold ${quickPaymentMode === "now" ? "bg-[#041E8C] text-white" : "bg-slate-50"}`}>Receber agora</button>
                </div>
                {quickPaymentMode === "now" ? <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-600 block">Valor recebido (R$) — pode ser parcial
                    <input type="number" min="0.01" max={quickPrice} step="0.01" required value={quickPaymentAmount} onChange={e=>setQuickPaymentAmount(e.target.value)} className="w-full mt-1 p-3 border rounded-xl text-xs" />
                  </label>
                  <label className="text-[11px] font-bold text-slate-600 block">Forma de pagamento
                    <select value={quickPaymentMethod} onChange={e=>setQuickPaymentMethod(e.target.value)} className="w-full mt-1 p-3 border rounded-xl text-xs">
                      <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="wellhub">Wellhub (Gympass)</option><option value="totalpass">TotalPass</option>
                    </select>
                  </label>
                  {["credito","debito"].includes(quickPaymentMethod) && <div className="grid grid-cols-2 gap-2">
                    {quickPaymentMethod === "credito" && <label className="text-[11px] font-bold text-slate-600">Parcelas
                      <input type="number" min="1" max="12" value={quickCardInstallments} onChange={e=>setQuickCardInstallments(e.target.value)} className="w-full mt-1 p-2 border rounded-lg" />
                    </label>}
                    <label className="text-[11px] font-bold text-slate-600">Taxa da operadora (%)
                      <input type="text" inputMode="decimal" value={quickCardFee} onChange={e=>setQuickCardFee(e.target.value)} className="w-full mt-1 p-2 border rounded-lg" />
                    </label>
                    <p className="col-span-2 text-[11px] text-slate-600">Taxa estimada: {formatCurrency((Number(quickPaymentAmount)||0)*(Number(quickCardFee.replace(",","."))||0)/100)}</p>
                  </div>}
                  <label className="text-[11px] font-bold text-slate-600 block">Observações (opcional)
                    <input value={quickPaymentNotes} onChange={e=>setQuickPaymentNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-lg" />
                  </label>
                  <p className="text-[11px] text-slate-600">Saldo restante: {formatCurrency(Math.max(0,(Number(quickPrice)||0)-(Number(quickPaymentAmount)||0)))}</p>
                </div> : <p className="text-xs text-slate-600">A reserva será confirmada com o valor pendente para receber na aba 3.</p>}
              </div>
              {quickError && <p role="alert" className="text-xs font-semibold text-red-600">{quickError}</p>}
              <button type="submit" disabled={quickSaving} className="w-full py-3 bg-[#00E599] text-[#041E8C] font-black text-xs rounded-xl shadow-md mt-2 disabled:opacity-50">
                {quickSaving ? "Salvando..." : quickCreatedCode ? "Concluir recebimento" : "Confirmar Reserva"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}