

'use client';

import { getRideTemplates, getUserProfile } from "@/lib/data";
import { RideTemplateTable } from "@/components/admin/RideTemplateTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User, RideTemplate } from "@/lib/types";
import { useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";

function RideTemplatesSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="border rounded-lg">
                <div className="p-4 border-b grid grid-cols-5 gap-4">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-1/5" />
                     <Skeleton className="h-5 w-1/4" />
                </div>
                <div className="p-4 space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        </div>
    )
}


export default function RideManagementPage() {
    const [templates, setTemplates] = useState<RideTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                setCurrentUser(profile);
                if (profile?.role !== 'admin') {
                   router.replace('/');
                   return;
                }
                const allTemplates = await getRideTemplates(profile.email);
                setTemplates(allTemplates);
                setLoading(false);
            } else {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Ride Template Management</h1>
                <p className="text-muted-foreground">Manage the base templates used to automatically generate daily schedules for your vehicles.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Your Ride Templates</CardTitle>
                            <CardDescription>
                                Edit the vehicle number and timings for each ride template you own.
                            </CardDescription>
                        </div>
                         {currentUser && (
                            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                <UserIcon className="h-4 w-4" />
                                <span>{currentUser.name}</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <RideTemplatesSkeleton />
                    ) : (
                        <RideTemplateTable templates={templates} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
