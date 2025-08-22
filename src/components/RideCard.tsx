import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Users, Bus, Armchair } from 'lucide-react';
import type { Ride } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface RideCardProps {
  ride: Ride;
}

export function RideCard({ ride }: RideCardProps) {
  const availableSeats = ride.totalSeats - ride.bookedSeats.length;

  return (
    <Card className="flex flex-col transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl font-headline flex items-center">
                    {ride.from} <ArrowRight className="mx-2 h-5 w-5" /> {ride.to}
                </CardTitle>
                <CardDescription>
                    Departs at {ride.departureTime}
                </CardDescription>
            </div>
             <Badge variant={availableSeats > 0 ? "secondary" : "destructive"} className="whitespace-nowrap">
                {availableSeats > 0 ? `${availableSeats} seats left` : 'Full'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-2 h-4 w-4" />
          <span>{ride.departureTime} - {ride.arrivalTime}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Bus className="mr-2 h-4 w-4" />
          <span>{ride.vehicleType}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4" />
          <span>{ride.totalSeats} Total Seats</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" disabled={availableSeats === 0}>
          <Link href={`/booking/${ride.id}`}>
            Book Now <Armchair className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
