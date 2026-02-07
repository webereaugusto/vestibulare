import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function UpgradeSuccessPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Confirmado!</h1>
          <p className="text-gray-600 mb-6">
            Seu plano foi atualizado com sucesso. Agora você tem acesso a todos os recursos do novo plano.
          </p>
          <Link href="/dashboard">
            <Button className="w-full">Ir para o Painel</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
