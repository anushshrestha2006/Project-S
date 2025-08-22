
'use client';

import { useState, useEffect } from 'react';
import { getBookingsByUserId } from '@/lib/data';
import type { Booking, Ride } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { format } from 'date-fns';
import { Bus, Calendar, Clock, Ticket, ArrowRight, Armchair, Download } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import Link from 'next/link';

function BookingCard({ booking }: { booking: Booking }) {
    if (!booking.rideDetails) return null;

    const ride = booking.rideDetails;
    const rideDate = format(new Date(ride.date), "MMMM d, yyyy");

    const getStatusBadgeVariant = (status: Booking['status']) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'pending-payment': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <Card className="mb-4 shadow-md transition-all hover:shadow-lg">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl font-headline flex items-center">
                            {ride.from} <ArrowRight className="mx-2 h-5 w-5" /> {ride.to}
                        </CardTitle>
                        <CardDescription className="flex items-center pt-1 text-sm">
                            <Calendar className="mr-2 h-4 w-4" />
                            {rideDate}
                        </CardDescription>
                    </div>
                     <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">{booking.status.replace('-', ' ')}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-primary" />
                        <span>{ride.departureTime} - {ride.arrivalTime}</span>
                    </div>
                    <div className="flex items-center">
                        <Armchair className="mr-2 h-4 w-4 text-primary" />
                        <strong>Seat(s): {booking.seats.join(', ')}</strong>
                    </div>
                    <div className="flex items-center">
                        <Bus className="mr-2 h-4 w-4 text-primary" />
                        <span>{ride.vehicleType}</span>
                    </div>
                </div>
                 <div className="text-xs text-muted-foreground mt-4">
                    Booked on: {format(booking.bookingTime as Date, "PPP p")}
                </div>
            </CardContent>
             {booking.status === 'confirmed' && (
                 <CardFooter>
                     <Button asChild variant="outline" className="w-full">
                        <Link href={`/ticket/${booking.id}`} target="_blank">
                             <Ticket className="mr-2 h-4 w-4" />
                            View Ticket
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}


export function MyBookings({ userId }: { userId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setIsLoading(true);
        const userBookings = await getBookingsByUserId(userId);
        setBookings(userBookings);
      } catch (err) {
        setError('Failed to load your bookings. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBookings();
  }, [userId]);

  const now = new Date();
  
  const upcomingBookings = bookings.filter(b => 
    b.status === 'confirmed' && b.rideDetails && new Date(b.rideDetails.date) >= now
  );
  
  const pendingConfirmationBookings = bookings.filter(b => 
    b.status === 'pending-payment' && b.rideDetails && new Date(b.rideDetails.date) >= now
  );

  const pastBookings = bookings.filter(b => 
      !b.rideDetails || new Date(b.rideDetails.date) < now || b.status === 'cancelled'
  );


  const renderBookingList = (list: Booking[]) => {
      if (isLoading) {
          return Array.from({length: 2}).map((_, i) => (
               <div key={i} className="p-4 border rounded-lg space-y-3 mb-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                   <Skeleton className="h-4 w-32" />
                  <div className="flex space-x-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
               </div>
          ))
      }
      if (list.length === 0) {
          return (
             <div className="text-center py-10 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4"/>
                <p>No bookings found in this category.</p>
            </div>
          )
      }
      return list.map(booking => <BookingCard key={booking.id} booking={booking} />);
  }


  if (error) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }

  return (
    <Card className="shadow-xl mb-8">
        <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary">My Bookings</CardTitle>
            <CardDescription>View your upcoming and past ride reservations.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="upcoming">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({pendingConfirmationBookings.length})</TabsTrigger>
                    <TabsTrigger value="past">Past Trips ({pastBookings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="mt-4">
                    {renderBookingList(upcomingBookings)}
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                    {renderBookingList(pendingConfirmationBookings)}
                </TabsContent>
                <TabsContent value="past" className="mt-4">
                    {renderBookingList(pastBookings)}
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
