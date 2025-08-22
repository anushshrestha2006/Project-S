import { getAllUsers } from "@/lib/data";
import { UserTable } from "@/components/admin/UserTable";
import { Suspense } from "react";

export default async function AdminUsersPage() {
    const users = await getAllUsers();

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
