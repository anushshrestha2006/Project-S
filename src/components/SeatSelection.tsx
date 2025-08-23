
'use client';

import { useState, useEffect } from 'react';
import type { Ride, User, Seat as SeatType, PaymentDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Armchair, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PaymentDialog } from './PaymentDialog';
import { getPaymentDetails } from '@/lib/data';
import { Separator } from './ui/separator';

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
  const isUnavailable = seat.status === 'booked' || seat.status === 'locked';

  return (
    <button
      onClick={() => onSelect(seat.number)}
      disabled={isUnavailable}
      className={cn(
        'flex flex-col items-center justify-center p-1 rounded-md transition-all duration-200 aspect-square border-2',
        'disabled:cursor-not-allowed disabled:opacity-40',
        status === 'available' && 'border-accent bg-accent/20 text-accent-foreground hover:bg-accent',
        status === 'selected' && 'border-primary bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary ring-offset-background',
        isUnavailable && 'border-muted bg-muted text-muted-foreground'
      )}
      aria-label={`Seat ${seat.number}`}
    >
      <Armchair className="w-6 h-6 sm:w-8 sm:h-8" />
      <span className="text-xs font-semibold">{seat.number}</span>
    </button>
  );
}


interface PassengerDetail {
    seatNumber: number;
    name: string;
    phone: string;
}

export function SeatSelection({ ride }: { ride: Ride }) {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [passengers, setPassengers] = useState<PassengerDetail[]>([]);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<number, {name?: string, phone?: string}>>({});
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('sumo-sewa-user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
    
    async function fetchPaymentDetails() {
        const details = await getPaymentDetails();
        setPaymentDetails(details);
    }
    fetchPaymentDetails();
  }, []);

  const handleSelectSeat = (seatNumber: number) => {
    const isSelected = selectedSeats.includes(seatNumber);
    if (isSelected) {
        // Deselecting seat
        setSelectedSeats(prev => prev.filter(s => s !== seatNumber));
        setPassengers(prev => prev.filter(p => p.seatNumber !== seatNumber));
    } else {
        // Selecting seat
        setSelectedSeats(prev => [...prev, seatNumber]);
        const newPassenger: PassengerDetail = {
            seatNumber,
            // Pre-fill if this is the first seat selected by a logged-in user
            name: passengers.length === 0 && user ? user.name : '',
            phone: passengers.length === 0 && user ? user.phoneNumber || '' : ''
        };
        setPassengers(prev => [...prev, newPassenger].sort((a,b) => a.seatNumber - b.seatNumber));
    }
  };

  const handlePassengerDetailChange = (seatNumber: number, field: 'name' | 'phone', value: string) => {
      setPassengers(prev => prev.map(p => 
          p.seatNumber === seatNumber ? { ...p, [field]: value } : p
      ));
  };
  
  const handleProceedToPayment = () => {
    const errors: Record<number, {name?: string, phone?: string}> = {};
    let hasErrors = false;
    
    passengers.forEach((p, index) => {
        const passengerErrors: {name?: string, phone?: string} = {};
        if (!p.name || p.name.length < 2) {
            passengerErrors.name = 'Name must be at least 2 characters.';
            hasErrors = true;
        }
        // Phone number is required for the first passenger, optional for others
        if (index === 0 && (!p.phone || !/^\d{10}$/.test(p.phone))) {
            passengerErrors.phone = 'Enter a valid 10-digit phone number.';
            hasErrors = true;
        }
        if (Object.keys(passengerErrors).length > 0) {
            errors[p.seatNumber] = passengerErrors;
        }
    });

    setFormErrors(errors);

    if (!hasErrors) {
      setPaymentDialogOpen(true);
    }
  };


  const totalPrice = selectedSeats.length * ride.price;

  const renderSeats = () => {
    const seatLayout: React.ReactNode[] = [];
    
    // Driver seat is always in the same position
    seatLayout.push(
        <div key="driver" className="flex flex-col items-center justify-center text-muted-foreground col-start-4">
            <SteeringWheel className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-xs font-semibold">Driver</span>
        </div>
    );
     seatLayout.push(<div key="spacer-driver" className="col-span-4 h-4"></div>);


    if (ride.vehicleType === 'Sumo' && ride.totalSeats === 9) {
        // Sumo layout: 1 front, 4x2 back
        const frontSeat = ride.seats[0];
        seatLayout.push(
            <div key={`seat-${frontSeat.number}`} className="col-start-1">
                <Seat
                    seat={frontSeat}
                    isSelected={selectedSeats.includes(frontSeat.number)}
                    onSelect={handleSelectSeat}
                />
            </div>
        );
        seatLayout.push(<div key="spacer-sumo-1" className="col-span-4 h-4"></div>);
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
    } else if (ride.vehicleType === 'EV' && ride.totalSeats === 10) {
        // EV Layout: 1, 3, 3, 3
        const rows = [1, 3, 3, 3];
        let seatIndex = 0;

        rows.forEach((numSeats, rowIndex) => {
            for (let i = 0; i < numSeats; i++) {
                const seat = ride.seats[seatIndex];
                if(seat) {
                    seatLayout.push(
                        <Seat
                            key={seat.number}
                            seat={seat}
                            isSelected={selectedSeats.includes(seat.number)}
                            onSelect={handleSelectSeat}
                        />
                    );
                }
                seatIndex++;
            }
             // Add a spacer after each row except the last
            if (rowIndex < rows.length -1) {
                seatLayout.push(<div key={`spacer-ev-${rowIndex}`} className="col-span-4 h-4"></div>);
            }
        });

    } else {
        // Default layout for any other case
         ride.seats.forEach((seat) => {
            seatLayout.push(
                <Seat
                    key={seat.number}
                    seat={seat}
                    isSelected={selectedSeats.includes(seat.number)}
                    onSelect={handleSelectSeat}
                />
            );
        });
    }
    
    return seatLayout;
  };

  const passengerNameForBooking = passengers.map(p => p.name).join(', ');
  const passengerPhoneForBooking = passengers.length > 0 ? passengers[0].phone : '';

  return (
    <>
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
                    <div className="space-y-4">
                        {passengers.length > 0 ? (
                           passengers.map((passenger, index) => (
                                <div key={passenger.seatNumber} className="space-y-4 border-b pb-4 last:border-b-0 last:pb-0">
                                    <h4 className="font-semibold text-lg text-primary">Seat {passenger.seatNumber}</h4>
                                     <div className="space-y-2">
                                        <Label htmlFor={`passengerName-${passenger.seatNumber}`}>Passenger Name</Label>
                                        <Input 
                                            id={`passengerName-${passenger.seatNumber}`} 
                                            name={`passengerName-${passenger.seatNumber}`}
                                            placeholder="Full Name" 
                                            value={passenger.name} 
                                            onChange={e => handlePassengerDetailChange(passenger.seatNumber, 'name', e.target.value)} 
                                            required 
                                        />
                                        {formErrors[passenger.seatNumber]?.name && <p className="text-xs text-destructive">{formErrors[passenger.seatNumber]?.name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`passengerPhone-${passenger.seatNumber}`}>Phone Number {index > 0 && '(Optional)'}</Label>
                                        <Input 
                                            id={`passengerPhone-${passenger.seatNumber}`} 
                                            name={`passengerPhone-${passenger.seatNumber}`}
                                            placeholder="98XXXXXXXX" 
                                            value={passenger.phone} 
                                            onChange={e => handlePassengerDetailChange(passenger.seatNumber, 'phone', e.target.value)} 
                                            required={index === 0}
                                        />
                                        {formErrors[passenger.seatNumber]?.phone && <p className="text-xs text-destructive">{formErrors[passenger.seatNumber]?.phone}</p>}
                                    </div>
                                </div>
                           ))
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <p>Select one or more seats to begin.</p>
                            </div>
                        )}

                        {selectedSeats.length > 0 && (
                             <div className="border-t pt-4 space-y-3">
                                <div className="flex justify-between font-medium">
                                    <span className="text-muted-foreground flex items-center gap-1"><UserIcon className="w-4 h-4" /> x {selectedSeats.length} Seat(s)</span>
                                    <strong>NPR {ride.price.toLocaleString()} / seat</strong>
                                </div>
                                <div className="flex justify-between text-xl font-bold">
                                    <span className="text-muted-foreground">Total Price:</span>
                                    <span>NPR {totalPrice.toLocaleString()}</span>
                                </div>
                             </div>
                        )}

                        {selectedSeats.length > 0 ? (
                            <Button onClick={handleProceedToPayment} className="w-full text-lg py-6" disabled={!paymentDetails}>
                                {paymentDetails ? 'Proceed to Payment' : 'Loading Payment Options...'}
                            </Button>
                        ) : (
                             <Button disabled className="w-full text-lg py-6">Select a seat to book</Button>
                        )}
                         {Object.keys(formErrors).length > 0 && <p className="text-sm text-destructive text-center pt-2">Please fix the errors above.</p>}
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
    {user && paymentDetails && (
         <PaymentDialog
            isOpen={isPaymentDialogOpen}
            setIsOpen={setPaymentDialogOpen}
            bookingDetails={{
                rideId: ride.id,
                userId: user.id,
                seats: selectedSeats,
                // For simplicity, we'll use the combined names and the first phone number for the main booking record.
                // In a more complex system, you might store all passenger details in the booking document.
                passengerName: passengerNameForBooking,
                passengerPhone: passengerPhoneForBooking,
                totalPrice: totalPrice,
            }}
            paymentDetails={paymentDetails}
        />
    )}
   
    </>
  );
}

    

    