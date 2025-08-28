
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Users, Bus, Armchair, Calendar, Hash, User } from 'lucide-react';
import type { Ride } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


interface RideCardProps {
  ride: Ride;
}

export function RideCard({ ride }: RideCardProps) {
  const availableSeats = ride.seats.filter(s => s.status === 'available').length;
  const rideDate = format(new Date(ride.date), "MMMM d, yyyy");

  return (
    <Card className="flex flex-col transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl font-headline flex items-center">
                    {ride.from} <ArrowRight className="mx-2 h-5 w-5" /> {ride.to}
                </CardTitle>
                <CardDescription className="flex items-center pt-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    {rideDate}
                </CardDescription>
            </div>
             <Badge variant={availableSeats > 0 ? "secondary" : "destructive"} className="whitespace-nowrap bg-accent text-accent-foreground">
                {availableSeats > 0 ? `${availableSeats} seats left` : 'Full'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-2 h-4 w-4" />
          <span>{ride.departureTime} - {ride.arrivalTime}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground gap-4">
          <span className="flex items-center">
            <Bus className="mr-2 h-4 w-4" />
            {ride.vehicleType}
          </span>
           <span className="flex items-center font-mono text-xs">
            <Hash className="mr-1 h-3 w-3" />
            {ride.vehicleNumber}
          </span>
        </div>
         <div className="flex items-center text-sm font-semibold">
          <span>NPR {ride.price.toLocaleString()} per seat</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" disabled={availableSeats === 0}>
          <Link href={`/booking/${ride.id}`}>
            Select Seats <Armchair className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
