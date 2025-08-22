
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateUserRole } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
                            <TableHead>Actions</TableHead>
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
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
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
