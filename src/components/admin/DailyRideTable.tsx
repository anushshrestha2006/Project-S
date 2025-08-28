
'use client';

import { useState, useTransition } from 'react';
import type { Ride } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Edit, Hash, PlusCircle, Trash2, Loader2, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import { RideForm } from './RideForm';
import { useToast } from '@/hooks/use-toast';
import { deleteRide } from '@/lib/actions';

function DeleteRideButton({ ride, onConfirm, isPending }: { ride: Ride, onConfirm: (rideId: string) => void, isPending: boolean }) {
    const hasBookings = ride.seats.some(s => s.status !== 'available');

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-red-50" disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this ride?</AlertDialogTitle>
                    <AlertDialogDescription>
                         {hasBookings && (
                            <p className="text-yellow-600 font-bold mb-2">Warning: This ride has existing bookings. Deleting it will NOT cancel the bookings, which will need to be handled manually.</p>
                         )}
                        This will permanently remove the ride for {ride.from} to {ride.to} at {ride.departureTime} on {ride.date}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onConfirm(ride.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Yes, delete ride
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function DailyRideTable({ 
    rides,
    date,
    onRideCreated,
    onRideUpdated,
    onRideDeleted,
}: { 
    rides: Ride[],
    date: string,
    onRideCreated: (newRide: Ride) => void;
    onRideUpdated: (updatedRide: Ride) => void;
    onRideDeleted: (deletedRideId: string) => void;
 }) {
    const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleEdit = (ride: Ride) => {
        setSelectedRide(ride);
        setIsSheetOpen(true);
    };
    
    const handleAdd = () => {
        setSelectedRide(null); // Ensure we're creating a new one
        setIsSheetOpen(true);
    };

    const handleDelete = (rideId: string) => {
        startTransition(async () => {
            const result = await deleteRide(rideId);
            if (result.success) {
                toast({ title: "Success", description: "Ride has been deleted." });
                onRideDeleted(rideId);
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        })
    }

    const availableSeatsCount = (ride: Ride) => ride.seats.filter(s => s.status === 'available').length;

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Ride
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rides.length > 0 ? rides.map(ride => (
                            <TableRow key={ride.id}>
                                <TableCell>
                                    <div className="flex items-center text-sm font-medium gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        {ride.departureTime}
                                    </div>
                                     <div className="text-xs text-muted-foreground">Arrival: {ride.arrivalTime}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium flex items-center">
                                        {ride.from} <ArrowRight className="mx-2 h-4 w-4" /> {ride.to}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Price: NPR {ride.price}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{ride.vehicleType}</Badge>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-1 font-mono">
                                        <Hash className="h-3 w-3" />
                                        {ride.vehicleNumber}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm gap-2">
                                        <Users className="h-4 w-4" />
                                        {availableSeatsCount(ride)} / {ride.totalSeats} seats available
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(ride)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                     <DeleteRideButton ride={ride} onConfirm={handleDelete} isPending={isPending} />
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No rides scheduled for this date.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <RideForm 
                ride={selectedRide}
                date={date}
                isOpen={isSheetOpen}
                setIsOpen={setIsSheetOpen}
                onSuccess={(savedRide) => {
                    if (selectedRide) { // It was an edit
                        onRideUpdated(savedRide);
                    } else { // It was a create
                        onRideCreated(savedRide);
                    }
                }}
            />
        </>
    );
}
