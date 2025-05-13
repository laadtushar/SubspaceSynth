
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { XCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <XCircle className="h-16 w-16 text-destructive mb-4" />
          <CardTitle className="text-2xl font-bold">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment process was cancelled. Your persona quota has not been changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            If you wish to try again, you can return to the persona creation page.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Link href="/personas/new" passHref className="w-full">
            <Button className="w-full" size="lg" variant="outline">
              <ShoppingCart className="mr-2 h-5 w-5" /> Back to Upgrade Options
            </Button>
          </Link>
           <Link href="/" passHref className="w-full">
            <Button className="w-full" size="sm" variant="ghost">
              Go to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
