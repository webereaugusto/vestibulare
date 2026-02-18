 'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OnboardingSelectVestibulares() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg text-center p-8 rounded-lg bg-white shadow">
        <h2 className="text-2xl font-bold mb-2">Comece a acompanhar vestibulares</h2>
        <p className="text-gray-600 mb-6">
          Escolha os vestibulares que você quer acompanhar e receba alertas por WhatsApp, SMS ou Email.
        </p>
        <Link href="/dashboard/select-vestibulares">
          <Button className="w-full">Escolher vestibulares</Button>
        </Link>
      </div>
    </div>
  );
}

