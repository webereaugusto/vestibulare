import { PlanType, AlertChannel } from '@/types/database';

export interface PlanConfig {
  name: string;
  description: string;
  maxVestibulares: number;
  channels: AlertChannel[];
  price: number;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Gratuito',
    description: 'Comece a receber alertas sem custo',
    maxVestibulares: 1,
    channels: ['email'],
    price: 0,
    features: [
      'Até 1 vestibular',
      'Alertas por email',
      'Datas de inscrição e prova',
      'Painel de controle básico',
    ],
  },
  basic: {
    name: 'Básico',
    description: 'Para quem quer mais opções',
    maxVestibulares: 10,
    channels: ['email', 'sms', 'whatsapp'],
    price: 29.90,
    popular: true,
    features: [
      'Até 10 vestibulares',
      'Alertas por email, SMS e WhatsApp',
      'Todas as datas importantes',
      'Alertas personalizados',
      'Suporte por email',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Cobertura completa para não perder nada',
    maxVestibulares: 20,
    channels: ['email', 'sms', 'whatsapp'],
    price: 79.90,
    features: [
      'Até 20 vestibulares',
      'Alertas por email, SMS e WhatsApp',
      'Todas as datas importantes',
      'Alertas personalizados',
      'Suporte prioritário',
      'Alertas antecipados exclusivos',
    ],
  },
} as const;

export function canAddAlert(planType: PlanType, currentAlertCount: number): boolean {
  return currentAlertCount < PLANS[planType].maxVestibulares;
}

export function isChannelAllowed(planType: PlanType, channel: AlertChannel): boolean {
  return PLANS[planType].channels.includes(channel);
}

export function getAvailableChannels(planType: PlanType): AlertChannel[] {
  return [...PLANS[planType].channels];
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}
