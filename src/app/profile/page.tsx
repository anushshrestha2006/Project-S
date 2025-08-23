
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/data';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UpdateProfileForm } from '@/components/auth/UpdateProfileForm';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { User, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ProfileSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-1/4 ml-auto" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-1/4 ml-auto" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                setUser(profile);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
             <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="mb-8">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-6 w-1/2 mt-2" />
                </div>
                <ProfileSkeleton />
            </div>
        );
    }

    if (!user) {
         return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p className="text-muted-foreground mb-6">You must be logged in to view your profile.</p>
                <Button asChild>
                    <Link href="/login">Login</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">My Profile</h1>
                <p className="text-muted-foreground">Update your personal information and manage your account.</p>
            </div>

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                           <User className="mr-3 h-6 w-6 text-primary"/>
                            Personal Information
                        </CardTitle>
                        <CardDescription>
                            This information is used to pre-fill booking details. Your email cannot be changed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UpdateProfileForm currentUser={user} />
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center">
                           <KeyRound className="mr-3 h-6 w-6 text-primary"/>
                            Security
                        </CardTitle>
                        <CardDescription>
                            Change your password to keep your account secure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChangePasswordForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
