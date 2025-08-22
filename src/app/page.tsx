import { RideCard } from '@/components/RideCard';
import { getRides } from '@/lib/data';
import { Bus } from 'lucide-react';

export default async function Home() {
  const rides = await getRides();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
          Find Your Next Ride
        </h1>
        <p className="text-muted-foreground mt-2">
          Seamless travel between Birgunj and Kathmandu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rides.map((ride) => (
          <RideCard key={ride.id} ride={ride} />
        ))}
      </div>
      {rides.length === 0 && (
        <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
            <Bus className="w-16 h-16 mb-4"/>
            <p>No rides available at the moment. Please check back later.</p>
        </div>
      )}
    </div>
  );
}
