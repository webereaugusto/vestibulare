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
      'At\u00e9 2 vestibulares',
      'Apenas WhatsApp',
      'Alerta de inscri\u00e7\u00e3o e data da prova',
      'At\u00e9 20 alertas',
      'Painel de controle b\u00e1sico',
    ],
  },
  basic: {
    name: 'B\u00e1sico',
    description: 'Acompanhe os principais vestibulares',
    maxVestibulares: 10,
    maxAlerts: 100,
    maxPhones: 1,
    channels: ['whatsapp', 'sms', 'email'],
    allowedEventTypes: null, // todos os tipos
    price: 29.90,
    popular: true,
    features: [
      'At\u00e9 10 vestibulares',
      'WhatsApp, SMS e Email',
      '1 n\u00famero de WhatsApp',
      'At\u00e9 100 alertas',
      'Inscri\u00e7\u00e3o, Prova e Resultado',
      'Segunda Chamada e Matr\u00edcula',
      'Alertas personalizados',
      'Suporte por email',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Todos os vestibulares, sem limites',
    maxVestibulares: 999, // sem limite pr\u00e1tico
    maxAlerts: 300,
    maxPhones: 3,
    channels: ['whatsapp', 'sms', 'email'],
    allowedEventTypes: null, // todos os tipos
    price: 79.90,
    features: [
      'Todos os vestibulares dispon\u00edveis',
      'WhatsApp, SMS e Email',
      'At\u00e9 3 n\u00fameros de WhatsApp',
      'At\u00e9 300 alertas',
      'Inscri\u00e7\u00e3o, Prova e Resultado',
      'Segunda Chamada, Recurso e Matr\u00edcula',
      'Alertas personalizados',
      'Suporte priorit\u00e1rio',
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
