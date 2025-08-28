
'use client';

import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile, getRideTemplates } from "@/lib/data";
import type { RideTemplate, User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleTemplateTable } from "@/components/admin/VehicleTemplateTable";

function VehicleManagementSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-6 w-1/2 mt-2" />
            </div>
             <div className="flex justify-end mb-4">
                <Skeleton className="h-10 w-36" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    )
}


export default function VehicleManagementPage() {
    const [templates, setTemplates] = useState<RideTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                // Only the super-admin can access this page
                if (profile?.email !== 'anushshrestha8683@gmail.com') {
                    router.replace('/admin');
                } else {
                    const fetchedTemplates = await getRideTemplates();
                    setTemplates(fetchedTemplates);
                    setLoading(false);
                }
            } else {
                router.replace('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);


    if (loading) {
         return <VehicleManagementSkeleton />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Vehicle Management</h1>
                <p className="text-muted-foreground">Add, edit, or remove the base vehicle templates used for daily schedule generation.</p>
            </div>
             <Suspense fallback={<VehicleManagementSkeleton />}>
                <VehicleTemplateTable initialTemplates={templates} />
            </Suspense>
        </div>
    );
}
