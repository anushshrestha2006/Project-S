'use client';

import { useState, useEffect } from 'react';
import type { Ride, User, Seat as SeatType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Armchair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { processBooking, type BookingState } from '@/lib/actions';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

interface SeatProps {
  seat: SeatType;
  isSelected: boolean;
  onSelect: (seatNumber: number) => void;
}

const SteeringWheel = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 15.5V22" />
      <path d="M18.36 18.36L16 16" />
      <path d="M5.64 18.36L8 16" />
      <path d="M12 4.5V2" />
    </svg>
  );

function Seat({ seat, isSelected, onSelect }: SeatProps) {
  const status = isSelected ? 'selected' : seat.status;
  const isBooked = seat.status === 'booked';

  return (
    <button
      onClick={() => onSelect(seat.number)}
      disabled={isBooked}
      className={cn(
        'flex flex-col items-center justify-center p-1 rounded-md transition-all duration-200 aspect-square border-2',
        'disabled:cursor-not-allowed disabled:opacity-40',
        status === 'available' && 'border-accent bg-accent/20 text-accent-foreground hover:bg-accent',
        status === 'selected' && 'border-primary bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary ring-offset-background',
        status === 'booked' && 'border-muted bg-muted text-muted-foreground'
      )}
      aria-label={`Seat ${seat.number}`}
    >
      <Armchair className="w-6 h-6 sm:w-8 sm:h-8" />
      <span className="text-xs font-semibold">{seat.number}</span>
    </button>
  );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full text-lg py-6">
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
    // In a real app, you'd get this from a proper auth context
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
    if (state.message && !state.errors) {
        toast({
            title: "Booking Confirmed!",
            description: state.message,
            variant: 'default',
            className: "bg-green-500 border-green-500 text-white"
        });
        setSelectedSeats([]);
        // Refresh the page to get latest seat status and redirect
        router.refresh();
        setTimeout(() => router.push('/'), 2000);

    } else if (state.message && state.errors) {
        toast({
            variant: "destructive",
            title: "Booking Failed",
            description: state.errors.server?.[0] || state.errors.seats?.[0] || "An unexpected error occurred."
        })
    }
  }, [state, toast, router]);

  const totalPrice = selectedSeats.length * ride.price;

  const renderSeats = () => {
    const seatLayout = [];

    // Driver seat
    seatLayout.push(
        <div key="driver" className="flex flex-col items-center justify-center text-muted-foreground col-start-2">
            <SteeringWheel className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-xs font-semibold">Driver</span>
        </div>
    );
    // Front seat
    const frontSeat = ride.seats[0];
     seatLayout.push(
        <Seat
            key={frontSeat.number}
            seat={frontSeat}
            isSelected={selectedSeats.includes(frontSeat.number)}
            onSelect={handleSelectSeat}
        />
    );
    // Spacer for full row
    seatLayout.push(<div key="spacer-1" className="col-span-4 h-4"></div>);


    ride.seats.slice(1).forEach((seat) => {
        seatLayout.push(
            <Seat
                key={seat.number}
                seat={seat}
                isSelected={selectedSeats.includes(seat.number)}
                onSelect={handleSelectSeat}
            />
        );
    });
    return seatLayout;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Select Your Seat(s)</CardTitle>
                    <CardDescription>Choose from the available seats below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-background rounded-lg border-2 border-dashed">
                        <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-sm mx-auto">
                            {renderSeats()}
                        </div>
                    </div>
                     <div className="flex justify-center space-x-6 mt-6 text-sm">
                        <div className="flex items-center"><div className="w-4 h-4 rounded border-2 border-accent bg-accent/20 mr-2"></div>Available</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded bg-primary mr-2"></div>Selected</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded bg-muted mr-2"></div>Booked</div>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="sticky top-24">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    {!user ? (
                         <div className="text-center p-4 bg-yellow-100/50 border border-yellow-300 rounded-md">
                            <p className="text-yellow-800">Please <a href="/login" className="font-bold underline">login</a> or <a href="/signup" className="font-bold underline">sign up</a> to complete your booking.</p>
                        </div>
                    ) : (
                    <form action={dispatch} className="space-y-4">
                        <input type="hidden" name="rideId" value={ride.id} />
                        <input type="hidden" name="seats" value={JSON.stringify(selectedSeats)} />
                        <input type="hidden" name="userId" value={user.id} />
                        
                        <div className="space-y-2">
                            <Label htmlFor="passengerName">Passenger Name</Label>
                            <Input id="passengerName" name="passengerName" placeholder="Full Name" defaultValue={user?.name} required />
                            {state?.errors?.passengerName && <p className="text-xs text-destructive">{state.errors.passengerName[0]}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="passengerPhone">Phone Number</Label>
                            <Input id="passengerPhone" name="passengerPhone" placeholder="98XXXXXXXX" defaultValue={user?.phoneNumber} required />
                             {state?.errors?.passengerPhone && <p className="text-xs text-destructive">{state.errors.passengerPhone[0]}</p>}
                        </div>

                        <div className="border-t pt-4 space-y-3">
                            <div className="flex justify-between font-medium">
                                <span className="text-muted-foreground">Selected Seats:</span>
                                <strong>{selectedSeats.join(', ') || 'None'}</strong>
                            </div>
                             <div className="flex justify-between text-xl font-bold">
                                <span className="text-muted-foreground">Total Price:</span>
                                <span>NPR {totalPrice.toLocaleString()}</span>
                            </div>
                        </div>

                        {selectedSeats.length > 0 ? (
                            <SubmitButton/>
                        ) : (
                             <Button disabled className="w-full text-lg py-6">Select a seat to book</Button>
                        )}
                        {state?.errors?.seats && <p className="text-sm text-destructive text-center pt-2">{state.errors.seats[0]}</p>}
                    </form>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
