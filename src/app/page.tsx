import Link from 'next/link';
import { Bell, Mail, MessageSquare, Smartphone, Clock, Shield, Check, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLANS, formatPrice } from '@/lib/plans';
import { PlanType } from '@/types/database';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">
              Vestibula<span className="text-indigo-600">Re</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Como Funciona
            </a>
            <a href="#vestibulares" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Vestibulares
            </a>
            <a href="#planos" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 animate-fade-in" variant="default">
            Alertas automáticos para vestibulares
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 animate-fade-in-delay-1">
            Nunca mais perca uma<br />
            <span className="text-indigo-600">data de vestibular</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in-delay-2">
            Receba alertas automáticos por email, SMS e WhatsApp sobre inscrições,
            provas e resultados dos principais vestibulares do Brasil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-3">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Começar Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#planos">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Ver Planos
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { value: '14+', label: 'Vestibulares' },
              { value: '3', label: 'Canais de Alerta' },
              { value: '24h', label: 'Monitoramento' },
              { value: '100%', label: 'Automatizado' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Em apenas 3 passos, você começa a receber alertas sobre os vestibulares que mais importam para você.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: <Shield className="h-8 w-8 text-indigo-600" />,
                title: 'Crie sua conta',
                description: 'Cadastre-se gratuitamente e escolha o plano ideal para você.',
              },
              {
                step: '2',
                icon: <Bell className="h-8 w-8 text-indigo-600" />,
                title: 'Escolha seus vestibulares',
                description: 'Selecione os vestibulares que deseja acompanhar e configure seus canais de notificação.',
              },
              {
                step: '3',
                icon: <Clock className="h-8 w-8 text-indigo-600" />,
                title: 'Receba alertas',
                description: 'Receba notificações automáticas dias antes de cada data importante.',
              },
            ].map((item) => (
              <Card key={item.step} className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold text-lg">
                      {item.step}
                    </div>
                    {item.icon}
                  </div>
                  <CardTitle className="mt-4">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Canais */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Alertas Multi-Canal</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Escolha como deseja receber seus alertas. Combine canais para garantir que nenhuma data passe despercebida.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <Mail className="h-10 w-10" />,
                title: 'Email',
                description: 'Alertas detalhados com todas as informações que você precisa.',
                available: 'Todos os planos',
              },
              {
                icon: <Smartphone className="h-10 w-10" />,
                title: 'SMS',
                description: 'Mensagens curtas e diretas, mesmo sem internet.',
                available: 'Planos Básico e Premium',
              },
              {
                icon: <MessageSquare className="h-10 w-10" />,
                title: 'WhatsApp',
                description: 'Receba alertas no app que você já usa o dia todo.',
                available: 'Planos Básico e Premium',
              },
            ].map((channel) => (
              <Card key={channel.title} className="text-center hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mx-auto p-4 rounded-full bg-indigo-50 text-indigo-600 w-fit">
                    {channel.icon}
                  </div>
                  <CardTitle>{channel.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{channel.description}</p>
                  <Badge variant="secondary">{channel.available}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Vestibulares */}
      <section id="vestibulares" className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Vestibulares Monitorados</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Acompanhamos os principais vestibulares e processos seletivos do Brasil.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              'ENEM', 'Provão Paulista', 'ProUni', 'FIES', 'SiSU',
              'FUVEST', 'UNICAMP', 'UNESP', 'ITA', 'IME',
              'UERJ', 'UFMG', 'UFRGS', 'ENCCEJA',
            ].map((name) => (
              <div
                key={name}
                className="flex items-center justify-center p-4 rounded-lg bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Planos e Preços</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Escolha o plano que melhor se encaixa na sua necessidade. Comece grátis e faça upgrade quando quiser.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {(Object.entries(PLANS) as [PlanType, typeof PLANS[PlanType]][]).map(
              ([key, plan]) => (
                <Card
                  key={key}
                  className={`relative ${
                    plan.popular
                      ? 'border-indigo-600 border-2 shadow-lg scale-105'
                      : 'hover:shadow-md'
                  } transition-all`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-indigo-600 text-white">Mais Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Grátis' : formatPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 text-sm">/ano</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.price === 0 ? '/auth/signup' : `/auth/signup?plan=${key}`} className="block">
                      <Button
                        className="w-full"
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-indigo-600 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para não perder nenhuma data?
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Crie sua conta gratuita agora e comece a receber alertas sobre os vestibulares que você acompanha.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
              Criar Conta Grátis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
                <span className="text-lg font-bold text-white">
                  Vestibula<span className="text-indigo-400">Re</span>
                </span>
              </div>
              <p className="text-sm">
                Alertas automáticos sobre vestibulares brasileiros. Nunca mais perca uma data importante.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Produto</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#vestibulares" className="hover:text-white transition-colors">Vestibulares</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Contato</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:contato@vestibulare.com.br" className="hover:text-white transition-colors">contato@vestibulare.com.br</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} VestibulaRe. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
