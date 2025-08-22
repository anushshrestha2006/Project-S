'use client';

import { useState, useEffect } from 'react';
import type { Ride, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Armchair, SteeringWheel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFormState, useFormStatus } from 'react-dom';
import { processBooking, type BookingState } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface SeatProps {
  seatNumber: number;
  isBooked: boolean;
  isSelected: boolean;
  onSelect: (seatNumber: number) => void;
}

function Seat({ seatNumber, isBooked, isSelected, onSelect }: SeatProps) {
  const seatStatus = isBooked ? 'booked' : isSelected ? 'selected' : 'available';

  return (
    <button
      onClick={() => onSelect(seatNumber)}
      disabled={isBooked}
      className={cn(
        'flex flex-col items-center justify-center p-1 rounded-md transition-all duration-200 aspect-square',
        'disabled:cursor-not-allowed disabled:opacity-50',
        seatStatus === 'available' && 'bg-accent/50 text-accent-foreground hover:bg-accent',
        seatStatus === 'selected' && 'bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary ring-offset-background',
        seatStatus === 'booked' && 'bg-muted text-muted-foreground'
      )}
      aria-label={`Seat ${seatNumber}`}
    >
      <Armchair className="w-6 h-6 sm:w-8 sm:h-8" />
      <span className="text-xs font-semibold">{seatNumber}</span>
    </button>
  );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Processing...' : 'Confirm Booking'}
        </Button>
    )
}

export function SeatSelection({ ride }: { ride: Ride }) {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('sumo-sewa-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSelectSeat = (seatNumber: number) => {
    setSelectedSeats((prev) =>
      prev.includes(seatNumber)
        ? prev.filter((s) => s !== seatNumber)
        : [...prev, seatNumber]
    );
  };
  
  const initialState: BookingState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(processBooking, initialState);

  useEffect(() => {
    if (state.message && !state.errors?.server && !state.errors?.seats) {
        toast({
            title: "Booking Confirmed!",
            description: state.message,
            className: "bg-green-500 text-white"
        });
        setSelectedSeats([]);
        setTimeout(() => router.push('/'), 2000);
    } else if (state.message && (state.errors?.server || state.errors?.seats)) {
        toast({
            variant: "destructive",
            title: "Booking Failed",
            description: state.errors.server?.[0] || state.errors.seats?.[0] || "An unexpected error occurred."
        })
    }
  }, [state, toast, router]);

  const totalPrice = selectedSeats.length * ride.price;

  const renderSeats = () => {
    const seats = [];
    // Driver seat
    seats.push(
        <div key="driver" className="flex flex-col items-center justify-center text-muted-foreground">
            <SteeringWheel className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-xs font-semibold">Driver</span>
        </div>
    );
    // Spacer
    seats.push(<div key="spacer-front" className="col-span-1"></div>);

    for (let i = 1; i <= ride.totalSeats; i++) {
        seats.push(
            <Seat
                key={i}
                seatNumber={i}
                isBooked={ride.bookedSeats.includes(i)}
                isSelected={selectedSeats.includes(i)}
                onSelect={handleSelectSeat}
            />
        );
        // Add a spacer for aisle
        if (i % 3 === 0 && i < ride.totalSeats) {
             seats.push(<div key={`spacer-${i}`} className="col-span-1"></div>)
        }
    }
    return seats;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Select Your Seat</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-background rounded-lg border">
                        <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-md mx-auto">
                            {renderSeats()}
                        </div>
                    </div>
                     <div className="flex justify-center space-x-6 mt-6 text-sm">
                        <div className="flex items-center"><div className="w-4 h-4 rounded bg-accent/50 mr-2"></div>Available</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded bg-primary mr-2"></div>Selected</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded bg-muted mr-2"></div>Booked</div>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={dispatch} className="space-y-4">
                        <input type="hidden" name="rideId" value={ride.id} />
                        <input type="hidden" name="seats" value={JSON.stringify(selectedSeats)} />
                        <input type="hidden" name="user" value={JSON.stringify(user)} />
                        
                        <div className="space-y-2">
                            <Label htmlFor="passengerName">Passenger Name</Label>
                            <Input id="passengerName" name="passengerName" placeholder="Full Name" defaultValue={user?.name} required />
                            {state.errors?.passengerName && <p className="text-xs text-destructive">{state.errors.passengerName[0]}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="passengerPhone">Phone Number</Label>
                            <Input id="passengerPhone" name="passengerPhone" placeholder="98XXXXXXXX" required />
                             {state.errors?.passengerPhone && <p className="text-xs text-destructive">{state.errors.passengerPhone[0]}</p>}
                        </div>

                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Selected Seats:</span>
                                <strong>{selectedSeats.join(', ') || 'None'}</strong>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Price:</span>
                                <strong>NPR {totalPrice.toLocaleString()}</strong>
                            </div>
                        </div>

                        {selectedSeats.length > 0 ? (
                            <SubmitButton/>
                        ) : (
                             <Button disabled className="w-full">Select a seat to book</Button>
                        )}
                        {state.errors?.seats && <p className="text-sm text-destructive text-center">{state.errors.seats[0]}</p>}
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
