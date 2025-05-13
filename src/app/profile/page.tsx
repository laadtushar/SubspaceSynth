
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, UserCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image'; // For picsum placeholder if avatarUrl is missing

export default function ProfilePage() {
  const { user, userProfile, loadingAuth, logout } = useAuth(); // Get userProfile
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

  if (loadingAuth || (!user && !userProfile)) { // Check for userProfile as well
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) { // Fallback if user exists but profile doesn't (shouldn't happen with new AuthContext)
     return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <p>Error loading profile. Please try logging out and back in.</p>
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
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
