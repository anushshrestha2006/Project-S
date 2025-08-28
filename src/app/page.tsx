
import { RideCard } from '@/components/RideCard';
import { getRides } from '@/lib/data';
import { Bus, Search } from 'lucide-react';
import { SearchForm } from '@/components/SearchForm';
import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Ride } from '@/lib/types';

export default async function Home({
  searchParams,
}: {
  searchParams?: {
    from?: string;
    to?: string;
    date?: string;
  };
}) {
  const from = searchParams?.from;
  const to = searchParams?.to;
  const date = searchParams?.date;

  const rides = await getRides({ from, to, date });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8 mt-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
          Book Your Ride
        </h1>
        <p className="text-muted-foreground mt-2">
          Seamless travel between Birgunj and Kathmandu.
        </p>
      </div>

       <div className="mb-12">
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center">
                    <Search className="mr-3 h-6 w-6 text-primary" />
                    Find Your Ride
                </CardTitle>
                <CardDescription>
                    Select your route and date to find available Sumo rides.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<div>Loading search...</div>}>
                    <SearchForm />
                </Suspense>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
