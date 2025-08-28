
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
import { User as UserIcon, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UpdateProfilePictureForm } from '@/components/auth/UpdateProfilePictureForm';

function ProfileSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
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
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                         <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
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

    const handleProfileUpdate = (updatedUser: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    }

    if (loading) {
        return (
             <div className="container mx-auto px-4 py-8 max-w-4xl">
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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">My Profile</h1>
                <p className="text-muted-foreground">Update your personal information and manage your account.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                 <div className="space-y-8 md:col-span-1">
                    <UpdateProfilePictureForm currentUser={user} onProfileUpdate={handleProfileUpdate} />
                </div>
                <div className="space-y-8 md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                            <UserIcon className="mr-3 h-6 w-6 text-primary"/>
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                This information is used to pre-fill booking details. Your email cannot be changed.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UpdateProfileForm currentUser={user} onProfileUpdate={handleProfileUpdate} />
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
        </div>
    );
}
