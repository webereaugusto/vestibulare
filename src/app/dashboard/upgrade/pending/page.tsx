import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function UpgradePendingPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Pendente</h1>
          <p className="text-gray-600 mb-6">
            Seu pagamento está sendo processado. Assim que for confirmado, seu plano será atualizado automaticamente.
          </p>
          <Link href="/dashboard">
            <Button className="w-full">Voltar ao Painel</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
