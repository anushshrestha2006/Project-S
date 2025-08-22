
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, getFooterSettings } from '@/lib/data';
import type { FooterSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FooterSettingsForm } from '@/components/admin/FooterSettingsForm';

function SettingsSkeleton() {
    return (
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
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-1/4 ml-auto" />
            </CardContent>
        </Card>
    );
}

export default function SiteSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [footerSettings, setFooterSettings] = useState<FooterSettings | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                // Only the super-admin can access this page
                if (profile?.email !== 'anushshrestha8683@gmail.com') {
                    router.replace('/admin');
                } else {
                    const settings = await getFooterSettings();
                    setFooterSettings(settings);
                    setLoading(false);
                }
            } else {
                router.replace('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Site Settings</h1>
                <p className="text-muted-foreground">Manage global content for the website.</p>
            </div>

            <div className="max-w-2xl mx-auto">
                 {loading ? (
                    <SettingsSkeleton />
                 ) : footerSettings ? (
                    <FooterSettingsForm currentSettings={footerSettings} />
                 ): (
                    <p>Could not load settings.</p>
                 )}
            </div>
        </div>
    );
}
