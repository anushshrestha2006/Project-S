
'use client';

import { getAllUsers, getUserProfile } from "@/lib/data";
import { UserTable } from "@/components/admin/UserTable";
import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";


export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
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
                    // Always fetch the latest user list when the component mounts
                    const allUsers = await getAllUsers();
                    setUsers(allUsers);
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
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">User Management</h1>
                <p className="text-muted-foreground">View and manage user roles.</p>
            </div>
             <Suspense fallback={<div>Loading users...</div>}>
                <UserTable initialUsers={users} />
            </Suspense>
        </div>
    );
}
