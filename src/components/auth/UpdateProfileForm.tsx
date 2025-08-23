
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { updateUserProfile } from '@/lib/actions';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User as UserIcon, Phone, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </>
            )}
        </Button>
    )
}

export function UpdateProfileForm({ currentUser }: { currentUser: User }) {
    const initialState = { success: false, message: '', errors: {} };
    const [state, formAction] = useActionState(updateUserProfile, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [date, setDate] = useState<Date | undefined>(currentUser.dob ? parseISO(currentUser.dob) : undefined);

    useEffect(() => {
        if (!state.message) return;

        if (state.success) {
            toast({
                title: 'Success!',
                description: state.message,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: state.message || "Please check the form for errors.",
            });
        }
    }, [state, toast]);

    return (
        <form ref={formRef} action={formAction} className="space-y-6">
            <input type="hidden" name="userId" value={currentUser.id} />
             <input type="hidden" name="dob" value={date ? format(date, 'yyyy-MM-dd') : ''} />

            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="name" name="name" defaultValue={currentUser.name} className="pl-10"/>
                </div>
                 {state?.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
            </div>

             <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                 <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="phoneNumber" name="phoneNumber" defaultValue={currentUser.phoneNumber} className="pl-10"/>
                </div>
                {state?.errors?.phoneNumber && <p className="text-xs text-destructive">{state.errors.phoneNumber[0]}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal pl-10",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        captionLayout="dropdown-buttons"
                        fromYear={1950}
                        toYear={new Date().getFullYear() - 10}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                 {state?.errors?.dob && <p className="text-xs text-destructive">{state.errors.dob[0]}</p>}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" value={currentUser.email} disabled />
                <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
            </div>

            <div className="flex justify-end">
                <SubmitButton />
            </div>
        </form>
    )
}
