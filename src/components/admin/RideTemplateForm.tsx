
'use client';

import { useActionState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { RideTemplate } from '@/lib/types';
import { updateRideTemplate } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Loader2, Save, Hash, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
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

interface RideTemplateFormProps {
    template: RideTemplate;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function RideTemplateForm({ template, isOpen, setIsOpen }: RideTemplateFormProps) {
    const initialState = { success: false, message: '', errors: {} };
    const [state, formAction] = useActionState(updateRideTemplate, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({
                    title: 'Success!',
                    description: state.message,
                });
                setIsOpen(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, setIsOpen]);

    if (!template) return null;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Edit Ride Template</SheetTitle>
                    <SheetDescription>
                        Modify the details for this ride template. Price and route are not editable.
                    </SheetDescription>
                </SheetHeader>
                <form ref={formRef} action={formAction} className="py-6 space-y-6">
                    <input type="hidden" name="templateId" value={template.id} />
                    
                    <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex justify-between items-center">
                             <div className="font-bold text-lg flex items-center">{template.from} <ArrowRight className="mx-2 h-5 w-5" /> {template.to}</div>
                             <Badge variant="secondary">{template.vehicleType}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">Price: NPR {template.price.toLocaleString()}</div>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="vehicleNumber" name="vehicleNumber" defaultValue={template.vehicleNumber} className="pl-10"/>
                        </div>
                        {state?.errors?.vehicleNumber && <p className="text-xs text-destructive">{state.errors.vehicleNumber[0]}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="departureTime">Departure Time</Label>
                             <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="departureTime" name="departureTime" defaultValue={template.departureTime} placeholder="hh:mm AM/PM" className="pl-10"/>
                            </div>
                            {state?.errors?.departureTime && <p className="text-xs text-destructive">{state.errors.departureTime[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="arrivalTime">Arrival Time</Label>
                             <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="arrivalTime" name="arrivalTime" defaultValue={template.arrivalTime} placeholder="hh:mm AM/PM" className="pl-10"/>
                            </div>
                            {state?.errors?.arrivalTime && <p className="text-xs text-destructive">{state.errors.arrivalTime[0]}</p>}
                        </div>
                    </div>

                    <SheetFooter className="pt-6">
                        <SheetClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </SheetClose>
                        <SubmitButton />
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
