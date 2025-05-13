
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, LogOut, UserCircle2, Edit3, MailWarning, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProfilePage() {
  const { user, userProfile, loadingAuth, logout, isEmailVerified, resendVerificationEmail } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  const handleLogout = async () => {
    await logout();
    // AuthProvider handles redirect after logout
  };

  if (loadingAuth || (!user && !userProfile)) { 
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) { 
     return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)] text-center p-4">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Profile Error</h1>
        <p className="text-muted-foreground mb-4">Could not load your profile. Please try logging out and back in.</p>
        <Button onClick={handleLogout} variant="outline" className="ml-4">Log Out</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
            <AvatarImage 
              src={userProfile.avatarUrl || `https://picsum.photos/seed/${userProfile.id}/100/100`} 
              alt={userProfile.name || 'User'} 
              data-ai-hint="profile avatar"
            />
            <AvatarFallback className="text-4xl">
              {userProfile.name ? userProfile.name[0].toUpperCase() : <UserCircle2 size={48}/>}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{userProfile.name || 'User Profile'}</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEmailVerified && user?.providerData.some(provider => provider.providerId === 'password') && (
            <Alert variant="destructive">
              <MailWarning className="h-4 w-4" />
              <AlertTitle>Email Not Verified</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row justify-between items-center gap-2">
                Please verify your email address.
                <Button onClick={resendVerificationEmail} variant="outline" size="sm">
                  Resend Email
                </Button>
              </AlertDescription>
            </Alert>
          )}
           {isEmailVerified && user?.providerData.some(provider => provider.providerId === 'password') && (
            <Alert variant="default" className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700">
              <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-700 dark:text-green-300">Email Verified</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                Your email address has been successfully verified.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-lg">{userProfile.email}</p>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p className="text-lg">{userProfile.name}</p>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Joined</p>
            <p className="text-sm">{new Date(userProfile.createdAt).toLocaleDateString()}</p>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Login</p>
            <p className="text-sm">{userProfile.lastLogin ? new Date(userProfile.lastLogin).toLocaleString() : 'N/A'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
            <Link href="/profile/edit" passHref>
              <Button variant="outline" className="w-full sm:w-auto">
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </Link>
            <Button onClick={handleLogout} variant="destructive" className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    