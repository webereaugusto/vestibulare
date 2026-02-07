import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    inscricao: 'Inscrição',
    prova: 'Prova',
    resultado: 'Resultado',
    segunda_chamada: 'Segunda Chamada',
    recurso: 'Recurso',
    matricula: 'Matrícula',
    outro: 'Outro',
  };
  return labels[type] || type;
}

export function formatChannel(channel: string): string {
  const labels: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
  };
  return labels[channel] || channel;
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    sent: 'Enviado',
    failed: 'Falhou',
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  };
  return labels[status] || status;
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
