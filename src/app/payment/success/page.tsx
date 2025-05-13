
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth'; // To potentially refresh profile or show user info

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { userProfile, loadingAuth } = useAuth();

  useEffect(() => {
    if (sessionId) {
      console.log('Stripe Checkout Session ID:', sessionId);
      // Here you might:
      // 1. Verify the session status with your backend if needed (though webhook is preferred for fulfillment)
      // 2. Trigger a refresh of user data if quota updates are not immediate via DB listeners.
      // For this app, AuthContext's listener on Firebase DB should update the profile.
    }
  }, [sessionId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your persona quota has been updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            You can now create more personas.
          </p>
          {sessionId && (
            <p className="text-xs text-muted-foreground mt-2">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Link href="/" passHref className="w-full">
            <Button className="w-full" size="lg">
              <Home className="mr-2 h-5 w-5" /> Go to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
