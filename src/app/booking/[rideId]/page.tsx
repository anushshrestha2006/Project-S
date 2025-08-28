import { getRideById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { SeatSelection } from '@/components/SeatSelection';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, Clock, Bus, Calendar, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default async function BookingPage({
  params,
}: {
  params: { rideId: string };
}) {
  const ride = await getRideById(params.rideId);

  if (!ride) {
    notFound();
  }

  const rideDate = format(new Date(ride.date), "MMMM d, yyyy");

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
             {ride.from} <ArrowRight className="mx-4 h-6 w-6" /> {ride.to}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-base">
            <span className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" /> {rideDate}
            </span>
             <span className="flex items-center">
              <Clock className="mr-2 h-4 w-4" /> {ride.departureTime}
            </span>
             <span className="flex items-center">
              <Bus className="mr-2 h-4 w-4" /> {ride.vehicleType}
            </span>
             <span className="flex items-center font-mono text-sm">
                <Hash className="mr-1.5 h-4 w-4" /> {ride.vehicleNumber}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeatSelection ride={ride} />
        </CardContent>
      </Card>
    </div>
  );
}
