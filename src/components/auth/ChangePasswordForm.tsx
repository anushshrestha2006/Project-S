
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import * as z from 'zod';
import { changeUserPassword } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const formSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});


function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                </>
            ) : (
                <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                </>
            )}
        </Button>
    )
}

export function ChangePasswordForm() {
    const initialState = { success: false, message: '', errors: {} };
    const [state, formAction] = useActionState(changeUserPassword, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!state.message) return;

        if (state.success) {
            toast({
                title: 'Success!',
                description: state.message,
            });
            formRef.current?.reset();
        } else {
            // Don't show toast for validation errors, they are shown inline
            if (!state.errors) {
                 toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast]);

    return (
        <form ref={formRef} action={formAction} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" name="currentPassword" type="password" required />
                 {state?.errors?.currentPassword && <p className="text-xs text-destructive">{state.errors.currentPassword[0]}</p>}
            </div>

             <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" name="newPassword" type="password" required/>
                 {state?.errors?.newPassword && <p className="text-xs text-destructive">{state.errors.newPassword[0]}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required/>
                 {state?.errors?.confirmPassword && <p className="text-xs text-destructive">{state.errors.confirmPassword[0]}</p>}
            </div>
            
            {state?.message && !state.success && !state.errors && (
                 <Alert variant="destructive">
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end">
                <SubmitButton />
            </div>
        </form>
    )
}
