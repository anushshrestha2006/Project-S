
'use client';

import { useState, useTransition, useMemo } from "react";
import type { User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateUserRole, deleteUser } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Loader2 } from "lucide-react";

function DeleteUserDialog({ user, onConfirm, isPending }: { user: User, onConfirm: () => void, isPending: boolean }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete User</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete the user record for <strong>{user.name} ({user.email})</strong> from the application database. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                         {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Yes, delete user
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function UserTable({ initialUsers }: { initialUsers: User[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [emailFilter, setEmailFilter] = useState('');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleRoleChange = (userId: string, currentRole: 'user' | 'admin') => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        startTransition(async () => {
            const result = await updateUserRole(userId, newRole);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        });
    }

    const handleDeleteUser = (userId: string) => {
        startTransition(async () => {
            const result = await deleteUser(userId);
            if(result.success) {
                toast({ title: "User Deleted", description: result.message });
                setUsers(users.filter(u => u.id !== userId));
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        });
    }

    const filteredUsers = useMemo(() => {
        if (!emailFilter) {
            return users;
        }
        return users.filter(user =>
            user.email.toLowerCase().includes(emailFilter.toLowerCase())
        );
    }, [users, emailFilter]);

    return (
        <>
            <div className="mb-4">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email..."
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
                        className="pl-8 max-w-sm"
                    />
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Admin Toggle</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`role-switch-${user.id}`}
                                                checked={user.role === 'admin'}
                                                onCheckedChange={() => handleRoleChange(user.id, user.role)}
                                                disabled={isPending || user.email === 'anushshrestha8683@gmail.com'}
                                                aria-label={`Toggle admin role for ${user.name}`}
                                            />
                                            <Label htmlFor={`role-switch-${user.id}`}>
                                                {user.role === 'admin' ? 'Admin' : 'User'}
                                            </Label>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {user.email !== 'anushshrestha8683@gmail.com' && (
                                           <DeleteUserDialog 
                                                user={user} 
                                                onConfirm={() => handleDeleteUser(user.id)}
                                                isPending={isPending}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
