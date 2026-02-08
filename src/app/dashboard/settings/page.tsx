'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@/lib/supabase';
import { Profile, AlertChannel } from '@/types/database';

interface VerificationState {
  sending: boolean;
  codeSent: boolean;
  confirming: boolean;
  code: string;
  cooldown: number;
}

const INITIAL_VERIFY: VerificationState = {
  sending: false,
  codeSent: false,
  confirming: false,
  code: '',
  cooldown: 0,
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Estados de verificação por canal
  const [emailVerify, setEmailVerify] = useState<VerificationState>({ ...INITIAL_VERIFY });
  const [smsVerify, setSmsVerify] = useState<VerificationState>({ ...INITIAL_VERIFY });
  const [whatsappVerify, setWhatsappVerify] = useState<VerificationState>({ ...INITIAL_VERIFY });

  const { addToast } = useToast();
  const supabase = createBrowserClient();

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      const p = data as Profile;
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
    }
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Cooldown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setEmailVerify((prev) => prev.cooldown > 0 ? { ...prev, cooldown: prev.cooldown - 1 } : prev);
      setSmsVerify((prev) => prev.cooldown > 0 ? { ...prev, cooldown: prev.cooldown - 1 } : prev);
      setWhatsappVerify((prev) => prev.cooldown > 0 ? { ...prev, cooldown: prev.cooldown - 1 } : prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    // Se telefone mudou, resetar verificação de phone e whatsapp
    const phoneChanged = (phone || null) !== profile.phone;
    const updates: Record<string, unknown> = { full_name: fullName, phone: phone || null };
    if (phoneChanged) {
      updates.phone_verified = false;
      updates.whatsapp_verified = false;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      addToast('Erro ao salvar perfil.', 'error');
    } else {
      addToast('Perfil atualizado com sucesso!', 'success');
      await loadProfile();
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      addToast('Erro ao alterar senha.', 'error');
    } else {
      addToast('Senha alterada com sucesso!', 'success');
      setNewPassword('');
    }
    setChangingPassword(false);
  }

  function getVerifyState(channel: AlertChannel): [VerificationState, React.Dispatch<React.SetStateAction<VerificationState>>] {
    switch (channel) {
      case 'email': return [emailVerify, setEmailVerify];
      case 'sms': return [smsVerify, setSmsVerify];
      case 'whatsapp': return [whatsappVerify, setWhatsappVerify];
    }
  }

  async function handleSendCode(channel: AlertChannel) {
    const [, setVerify] = getVerifyState(channel);
    setVerify((prev) => ({ ...prev, sending: true }));

    try {
      const res = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (data.success) {
        setVerify((prev) => ({ ...prev, codeSent: true, cooldown: 60 }));
        addToast(`Codigo enviado via ${channel === 'email' ? 'email' : channel === 'sms' ? 'SMS' : 'WhatsApp'}!`, 'success');
      } else {
        addToast(data.error || 'Erro ao enviar codigo.', 'error');
      }
    } catch {
      addToast('Erro ao enviar codigo.', 'error');
    } finally {
      setVerify((prev) => ({ ...prev, sending: false }));
    }
  }

  async function handleConfirmCode(channel: AlertChannel) {
    const [verify, setVerify] = getVerifyState(channel);
    if (verify.code.length !== 6) {
      addToast('Digite o codigo de 6 digitos.', 'error');
      return;
    }
    setVerify((prev) => ({ ...prev, confirming: true }));

    try {
      const res = await fetch('/api/verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, code: verify.code }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Verificado!', 'success');
        setVerify({ ...INITIAL_VERIFY });
        await loadProfile();
      } else {
        addToast(data.error || 'Codigo invalido.', 'error');
      }
    } catch {
      addToast('Erro ao confirmar codigo.', 'error');
    } finally {
      setVerify((prev) => ({ ...prev, confirming: false }));
    }
  }

  function renderVerificationCard(
    channel: AlertChannel,
    icon: React.ReactNode,
    title: string,
    value: string,
    isVerified: boolean,
    disabled?: boolean,
    disabledReason?: string,
  ) {
    const [verify, setVerify] = getVerifyState(channel);

    return (
      <div className={`p-4 rounded-lg border ${isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium text-gray-900">{title}</span>
          </div>
          {isVerified ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Verificado
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Nao verificado
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">{value}</p>

        {!isVerified && !disabled && (
          <>
            {!verify.codeSent ? (
              <Button
                size="sm"
                onClick={() => handleSendCode(channel)}
                loading={verify.sending}
                disabled={verify.sending}
              >
                <Send className="h-3 w-3 mr-1" />
                Enviar codigo de verificacao
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={verify.code}
                    onChange={(e) => setVerify((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="000000"
                    className="w-28 h-9 text-center text-lg font-mono tracking-widest rounded-lg border border-gray-300 bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleConfirmCode(channel)}
                    loading={verify.confirming}
                    disabled={verify.code.length !== 6}
                  >
                    {verify.confirming ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    Confirmar
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSendCode(channel)}
                    disabled={verify.cooldown > 0 || verify.sending}
                    className="text-xs text-emerald-600 hover:text-emerald-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {verify.cooldown > 0 ? `Reenviar em ${verify.cooldown}s` : 'Reenviar codigo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerify({ ...INITIAL_VERIFY })}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Pular por agora
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!isVerified && disabled && disabledReason && (
          <p className="text-xs text-gray-400">{disabledReason}</p>
        )}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const hasUnverified = !profile.email_verified || (profile.phone && (!profile.phone_verified || !profile.whatsapp_verified));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-gray-500 mt-1">Gerencie suas informacoes pessoais e verificacao de canais.</p>
      </div>

      {/* Verificação de Canais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasUnverified ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            )}
            Verificacao de Canais
          </CardTitle>
          <CardDescription>
            Verifique seus meios de comunicacao para garantir a entrega dos alertas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderVerificationCard(
            'email',
            <Mail className="h-4 w-4 text-emerald-600" />,
            'Email',
            profile.email,
            profile.email_verified,
          )}

          {renderVerificationCard(
            'sms',
            <Phone className="h-4 w-4 text-emerald-600" />,
            'Telefone (SMS)',
            profile.phone || 'Nao informado',
            profile.phone_verified,
            !profile.phone,
            'Informe seu telefone acima e salve para poder verificar.',
          )}

          {renderVerificationCard(
            'whatsapp',
            <MessageSquare className="h-4 w-4 text-green-600" />,
            'WhatsApp',
            profile.phone || 'Nao informado',
            profile.whatsapp_verified,
            !profile.phone,
            'Informe seu telefone acima e salve para poder verificar.',
          )}
        </CardContent>
      </Card>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Informacoes Pessoais</CardTitle>
          <CardDescription>Atualize seus dados de contato.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={profile.email}
              disabled
            />
            <Input
              id="fullName"
              label="Nome completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
            <Input
              id="phone"
              label="Telefone (para SMS e WhatsApp)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
            {phone !== (profile.phone || '') && (
              <p className="text-xs text-amber-600">Ao alterar o telefone, as verificacoes de SMS e WhatsApp serao resetadas.</p>
            )}
            <Button type="submit" loading={saving}>
              Salvar Alteracoes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              id="newPassword"
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              minLength={6}
            />
            <Button type="submit" loading={changingPassword}>
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
