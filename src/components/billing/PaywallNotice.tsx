
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Info, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface PaywallNoticeProps {
  currentPersonaCount: number;
  freePersonaLimit: number;
}

export default function PaywallNotice({ currentPersonaCount, freePersonaLimit }: PaywallNoticeProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Upgrade to Create More Personas</CardTitle>
          <CardDescription>
            You've used {currentPersonaCount} of your {freePersonaLimit} free personas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            To create additional personas, please purchase more slots. Each new persona costs £2.
          </p>
          <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <p className="font-semibold text-lg text-green-700 dark:text-green-300">Unlock Persona for £2</p>
              <p className="text-xs text-green-500 dark:text-green-500">One-time payment per persona</p>
            </div>
          </div>
           <p className="text-xs text-center text-muted-foreground/80 mt-2">
            <Info className="inline h-3 w-3 mr-1" />
            This is a simulated payment. Clicking the button below will not process a real transaction.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button className="w-full" size="lg" onClick={() => alert('Payment processing not implemented in this simulation.')}>
            <ShoppingCart className="mr-2 h-5 w-5" /> Pay £2 to Create Persona
          </Button>
          <Link href="/" passHref className="w-full">
            <Button variant="outline" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
