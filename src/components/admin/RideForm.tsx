
'use client';

import { useActionState, useRef, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Ride, User } from '@/lib/types';
import { createOrUpdateRide } from '@/lib/actions';
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
import { Loader2, Save, Hash, Clock, ArrowRight, DollarSign, User as UserIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { initialSeatsEV, initialSeatsSumo, getRideTemplates } from '@/lib/data';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/data';
import type { RideTemplate } from '@/lib/types';


function SubmitButton({ isEditMode }: { isEditMode: boolean }) {
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
                    {isEditMode ? 'Save Changes' : 'Create Ride'}
                </>
            )}
        </Button>
    )
}

interface RideFormProps {
    ride: Ride | null; // null for creating new ride
    date: string; // YYYY-MM-DD
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onSuccess: (ride: Ride) => void;
}

export function RideForm({ ride, date, isOpen, setIsOpen, onSuccess }: RideFormProps) {
    const isEditMode = !!ride;
    const initialState = { success: false, message: '', errors: {}, ride: null };
    const [state, formAction] = useActionState(createOrUpdateRide, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [templates, setTemplates] = useState<RideTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    
    // States for form fields to allow template selection to override them
    const [from, setFrom] = useState(ride?.from || '');
    const [to, setTo] = useState(ride?.to || '');
    const [vehicleType, setVehicleType] = useState<'Sumo' | 'EV' | undefined>(ride?.vehicleType);
    const [vehicleNumber, setVehicleNumber] = useState(ride?.vehicleNumber || '');
    const [ownerName, setOwnerName] = useState(ride?.ownerName || '');
    const [price, setPrice] = useState(ride?.price || 850);
    const [departureTime, setDepartureTime] = useState(ride?.departureTime || '');
    const [arrivalTime, setArrivalTime] = useState(ride?.arrivalTime || '');


    useEffect(() => {
        async function fetchTemplates() {
            const fetchedTemplates = await getRideTemplates();
            setTemplates(fetchedTemplates);
        }
        fetchTemplates();
    }, []);

    // Effect to update form fields when a template is selected
    useEffect(() => {
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        if (selectedTemplate) {
            setFrom(selectedTemplate.from);
            setTo(selectedTemplate.to);
            setVehicleType(selectedTemplate.vehicleType);
            setVehicleNumber(selectedTemplate.vehicleNumber);
            setOwnerName(selectedTemplate.ownerName);
            setPrice(selectedTemplate.price);
            setDepartureTime(selectedTemplate.departureTime);
            setArrivalTime(selectedTemplate.arrivalTime);
        }
    }, [selectedTemplateId, templates]);

    // Effect to reset form state when dialog opens/closes or ride prop changes
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && ride) {
                setFrom(ride.from);
                setTo(ride.to);
                setVehicleType(ride.vehicleType);
                setVehicleNumber(ride.vehicleNumber);
                setOwnerName(ride.ownerName || '');
                setPrice(ride.price);
                setDepartureTime(ride.departureTime);
                setArrivalTime(ride.arrivalTime);
                setSelectedTemplateId(''); // Clear template selection in edit mode
            } else {
                // Reset for new ride
                formRef.current?.reset();
                setFrom('');
                setTo('');
                setVehicleType(undefined);
                setVehicleNumber('');
                setOwnerName('');
                setPrice(850);
                setDepartureTime('');
                setArrivalTime('');
                setSelectedTemplateId('');
            }
        }
    }, [isOpen, isEditMode, ride]);


    useEffect(() => {
        if (state.success && state.ride) {
            toast({
                title: 'Success!',
                description: state.message,
            });
            onSuccess(state.ride);
            setIsOpen(false);
        } else if (!state.success && state.message) {
            toast({
                variant: 'destructive',
                title: 'Operation Failed',
                description: state.message,
            });
        }
    }, [state, toast, setIsOpen, onSuccess]);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEditMode ? 'Edit Ride' : 'Create New Ride'}</SheetTitle>
                    <SheetDescription>
                        {isEditMode 
                            ? `Modify the details for this ride on ${date}.`
                            : `Create a new ride for ${date}. You can start from a template.`
                        }
                    </SheetDescription>
                </SheetHeader>
                <form ref={formRef} action={formAction} className="py-6 space-y-6">
                    <input type="hidden" name="rideId" value={ride?.id || ''} />
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="seats" value={JSON.stringify(ride?.seats)} />
                     
                    {!isEditMode && (
                        <div className="space-y-2">
                             <Label htmlFor="template">Start with a Template (Optional)</Label>
                             <Select onValueChange={setSelectedTemplateId}>
                                <SelectTrigger><SelectValue placeholder="Select a Vehicle Template" /></SelectTrigger>
                                <SelectContent>
                                    {templates.map(template => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.vehicleNumber} ({template.from} to {template.to} at {template.departureTime})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    )}


                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label htmlFor="from">From</Label>
                             <Select name="from" value={from} onValueChange={setFrom}>
                                <SelectTrigger><SelectValue placeholder="Select Origin" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Birgunj">Birgunj</SelectItem>
                                    <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                                </SelectContent>
                             </Select>
                            {state?.errors?.from && <p className="text-xs text-destructive">{state.errors.from[0]}</p>}
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="to">To</Label>
                             <Select name="to" value={to} onValueChange={setTo}>
                                <SelectTrigger><SelectValue placeholder="Select Destination" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Birgunj">Birgunj</SelectItem>
                                    <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                                </SelectContent>
                             </Select>
                             {state?.errors?.to && <p className="text-xs text-destructive">{state.errors.to[0]}</p>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label htmlFor="vehicleType">Vehicle Type</Label>
                             <Select name="vehicleType" value={vehicleType} onValueChange={(val) => setVehicleType(val as 'Sumo' | 'EV')}>
                                <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sumo">Sumo</SelectItem>
                                    <SelectItem value="EV">EV</SelectItem>
                                </SelectContent>
                             </Select>
                             {state?.errors?.vehicleType && <p className="text-xs text-destructive">{state.errors.vehicleType[0]}</p>}
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="totalSeats">Total Seats</Label>
                             <Input id="totalSeats" name="totalSeats" value={vehicleType === 'Sumo' ? '9' : vehicleType === 'EV' ? '10' : ''} readOnly/>
                             {state?.errors?.totalSeats && <p className="text-xs text-destructive">{state.errors.totalSeats[0]}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="vehicleNumber" name="vehicleNumber" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="pl-10"/>
                        </div>
                        {state?.errors?.vehicleNumber && <p className="text-xs text-destructive">{state.errors.vehicleNumber[0]}</p>}
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="ownerName">Owner Name</Label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="ownerName" name="ownerName" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="pl-10"/>
                        </div>
                        {state?.errors?.ownerName && <p className="text-xs text-destructive">{state.errors.ownerName[0]}</p>}
                    </div>
                    
                     <div className="space-y-2">
                        <Label htmlFor="price">Price (NPR)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="price" name="price" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="pl-10"/>
                        </div>
                        {state?.errors?.price && <p className="text-xs text-destructive">{state.errors.price[0]}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="departureTime">Departure Time</Label>
                             <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="departureTime" name="departureTime" value={departureTime} onChange={e => setDepartureTime(e.target.value)} placeholder="hh:mm AM/PM" className="pl-10"/>
                            </div>
                            {state?.errors?.departureTime && <p className="text-xs text-destructive">{state.errors.departureTime[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="arrivalTime">Arrival Time</Label>
                             <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input id="arrivalTime" name="arrivalTime" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} placeholder="hh:mm AM/PM" className="pl-10"/>
                            </div>
                            {state?.errors?.arrivalTime && <p className="text-xs text-destructive">{state.errors.arrivalTime[0]}</p>}
                        </div>
                    </div>

                    <SheetFooter className="pt-6">
                        <SheetClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </SheetClose>
                        <SubmitButton isEditMode={isEditMode} />
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
