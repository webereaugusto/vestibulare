import { PlanType, AlertChannel, EventType } from '@/types/database';

export interface PlanConfig {
  name: string;
  description: string;
  maxVestibulares: number;
  maxAlerts: number; // limite de alertas enviados por ciclo/periodo
  maxPhones: number; // quantos numeros de whatsapp pode cadastrar
  channels: AlertChannel[];
  allowedEventTypes: EventType[] | null; // null = todos, array = apenas esses
  price: number;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Gratuito',
    description: 'Comece a receber alertas no seu Zap',
    maxVestibulares: 2,
    maxAlerts: 20,
    maxPhones: 1,
    channels: ['whatsapp'],
    allowedEventTypes: ['inscricao', 'prova'],
    price: 0,
    features: [
      'Até 2 vestibulares',
      'Apenas WhatsApp',
      'Alerta de inscrição e data da prova',
      'Até 20 alertas',
      'Painel de controle básico',
    ],
  },
  basic: {
    name: 'Básico',
    description: 'Acompanhe os principais vestibulares',
    maxVestibulares: 10,
    maxAlerts: 100,
    maxPhones: 1,
    channels: ['whatsapp', 'sms', 'email'],
    allowedEventTypes: null, // todos os tipos
    price: 29.90,
    popular: true,
    features: [
      'Até 10 vestibulares',
      'WhatsApp, SMS e Email',
      '1 número de WhatsApp',
      'Até 100 alertas',
      'Inscrição, Prova e Resultado',
      'Segunda Chamada e Matrícula',
      'Alertas personalizados',
      'Suporte por email',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Todos os vestibulares, sem limites',
    maxVestibulares: 999, // sem limite prático
    maxAlerts: 300,
    maxPhones: 3,
    channels: ['whatsapp', 'sms', 'email'],
    allowedEventTypes: null, // todos os tipos
    price: 79.90,
    features: [
      'Todos os vestibulares disponíveis',
      'WhatsApp, SMS e Email',
      'Até 3 números de WhatsApp',
      'Até 300 alertas',
      'Inscrição, Prova e Resultado',
      'Segunda Chamada, Recurso e Matrícula',
      'Alertas personalizados',
      'Suporte prioritário',
      'Alertas antecipados exclusivos',
    ],
  },
};

export function canAddAlert(planType: PlanType, currentAlertCount: number): boolean {
  return currentAlertCount < PLANS[planType].maxVestibulares;
}

export function isChannelAllowed(planType: PlanType, channel: AlertChannel): boolean {
  return PLANS[planType].channels.includes(channel);
}

export function getAvailableChannels(planType: PlanType): AlertChannel[] {
  return [...PLANS[planType].channels];
}

export function isEventTypeAllowed(planType: PlanType, eventType: EventType): boolean {
  const allowed = PLANS[planType].allowedEventTypes;
  if (allowed === null) return true; // null = todos permitidos
  return allowed.includes(eventType);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}
