# ZapVest - Alertas de Vestibulares no WhatsApp

Sistema SaaS para alertas automaticos sobre vestibulares brasileiros (ENEM, Provao Paulista, ProUni, FIES, ITA, IME, etc.). WhatsApp como canal principal, com SMS e email como complementos. 3 planos de assinatura e gestao de datas importantes.

## Stack Tecnológica

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase (Database + Auth)
- **Pagamentos**: Mercado Pago SDK
- **Notificações**: Brevo API (email, SMS, WhatsApp)
- **Automação**: Vercel Cron Jobs
- **Deploy**: Vercel

## Estrutura do Projeto

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── webhooks/mercadopago/  # Webhook de pagamentos
│   │   ├── payments/              # Criação de preferências MP
│   │   ├── alerts/send/           # Envio manual de alertas
│   │   ├── scraper/run/           # Trigger manual do scraper
│   │   └── cron/                  # Jobs automáticos
│   │       ├── check-alerts/      # Verifica alertas diários
│   │       ├── scrape-dates/      # Busca automática de datas
│   │       └── check-expirations/ # Verifica planos expirados
│   ├── dashboard/              # Área logada do usuário
│   ├── admin/                  # Painel administrativo
│   ├── auth/                   # Login/Cadastro
│   └── page.tsx                # Landing page
├── lib/                        # Utilitários e configs
│   ├── supabase.ts             # Clientes Supabase
│   ├── mercadopago.ts          # SDK Mercado Pago
│   ├── brevo.ts                # API Brevo (notificações)
│   ├── plans.ts                # Configuração dos planos
│   └── scrapers/               # Scrapers por vestibular
├── components/                 # Componentes React
│   ├── ui/                     # Componentes base
│   ├── dashboard/              # Componentes do painel
│   └── admin/                  # Componentes admin
└── types/                      # TypeScript types
```

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

### 3. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o SQL em `supabase-setup.sql` no SQL Editor do Supabase
3. Copie as credenciais para `.env.local`

### 4. Configurar Mercado Pago

1. Crie uma conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Obtenha suas credenciais (Access Token e Public Key)
3. Configure o webhook apontando para `https://seu-dominio.com/api/webhooks/mercadopago`

### 5. Configurar Brevo

1. Crie uma conta no [Brevo](https://www.brevo.com)
2. Obtenha sua API Key
3. Configure os templates de email

### 6. Executar

```bash
npm run dev
```

Acesse `http://localhost:3000`

## Planos

| Recurso | Gratuito | Básico (R$29,90/ano) | Premium (R$79,90/ano) |
|---------|----------|---------------------|----------------------|
| Vestibulares | Até 3 | Até 5 | Até 20 |
| Email | ✅ | ✅ | ✅ |
| SMS | ❌ | ✅ | ✅ |
| WhatsApp | ❌ | ✅ | ✅ |

## Cron Jobs (Vercel)

| Job | Horário | Descrição |
|-----|---------|-----------|
| check-alerts | 8h diariamente | Verifica e envia alertas |
| scrape-dates | 2h aos domingos | Scraping automático de datas |
| check-expirations | 1h diariamente | Verifica planos expirados |

## Deploy na Vercel

1. Faça push para o GitHub
2. Importe o projeto na Vercel
3. Configure as variáveis de ambiente
4. Os cron jobs serão configurados automaticamente via `vercel.json`

## Vestibulares Monitorados

ENEM, Provão Paulista, ProUni, FIES, SiSU, FUVEST, UNICAMP, UNESP, ITA, IME, UERJ, UFMG, UFRGS, ENCCEJA
