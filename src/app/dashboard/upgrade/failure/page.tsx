import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function UpgradeFailurePage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardContent className="p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento não aprovado</h1>
          <p className="text-gray-600 mb-6">
            Houve um problema com o pagamento. Verifique os dados do cartão e tente novamente.
          </p>
          <div className="space-y-3">
            <Link href="/dashboard/upgrade">
              <Button className="w-full">Tentar Novamente</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Voltar ao Painel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
