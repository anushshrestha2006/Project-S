

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, getPaymentDetails } from '@/lib/data';
import type { User, PaymentMethod } from '@/lib/types';
import { QrUploadForm } from "@/components/admin/QrUploadForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function QrSettings() {
    const paymentDetails = await getPaymentDetails();
    
    return (
         <Tabs defaultValue="esewa" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="esewa">eSewa</TabsTrigger>
                <TabsTrigger value="khalti">Khalti</TabsTrigger>
                <TabsTrigger value="imepay">IMEPay</TabsTrigger>
            </TabsList>
            <TabsContent value="esewa">
                <QrUploadForm paymentMethod="esewa" currentQrUrl={paymentDetails.esewa.qrUrl} />
            </TabsContent>
            <TabsContent value="khalti">
                <QrUploadForm paymentMethod="khalti" currentQrUrl={paymentDetails.khalti.qrUrl} />
            </TabsContent>
            <TabsContent value="imepay">
                <QrUploadForm paymentMethod="imepay" currentQrUrl={paymentDetails.imepay.qrUrl} />
            </TabsContent>
        </Tabs>
    )
}

function SettingsSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="border rounded-lg p-6">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-48 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const router = useRouter();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile?.email !== 'anushshrestha8683@gmail.com') {
                    router.replace('/admin');
                } else {
                    setIsSuperAdmin(true);
                    setLoading(false);
                }
            } else {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Skeleton className="h-10 w-1/4" />
                    <Skeleton className="h-6 w-1/2 mt-2" />
                </div>
                <div className="max-w-lg mx-auto">
                    <SettingsSkeleton />
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Payment Settings</h1>
                <p className="text-muted-foreground">Manage QR codes for payment methods.</p>
            </div>

            <Card className="max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>QR Code Management</CardTitle>
                    <CardDescription>Upload a new QR code image for each payment provider. The new QR will be shown to users immediately.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<SettingsSkeleton />}>
                        <QrSettings />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
