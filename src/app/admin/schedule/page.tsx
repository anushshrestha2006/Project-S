

'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { format, addDays, isPast, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, PlusCircle, Loader2, AlertTriangle, User as UserIcon } from 'lucide-react';
import { getOrCreateRidesForDate } from '@/lib/actions';
import type { Ride, User } from '@/lib/types';
import { DailyRideTable } from '@/components/admin/DailyRideTable';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserProfile } from '@/lib/data';

function ScheduleSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-36" />
            </div>
            <div className="border rounded-lg">
                <div className="p-4 border-b grid grid-cols-5 gap-4">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-1/5" />
                     <Skeleton className="h-5 w-1/4" />
                </div>
                <div className="p-4 space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        </div>
    )
}

// Helper to get current time in Nepal (UTC+5:45)
const getNepalTime = () => {
    const now = new Date();
    const utcOffset = now.getTimezoneOffset() * 60000;
    const utcTime = now.getTime() + utcOffset;
    const nepalOffset = (5 * 60 + 45) * 60000;
    return new Date(utcTime + nepalOffset);
};

export default function SchedulePage() {
    const [date, setDate] = useState<Date>(new Date());
    const [rides, setRides] = useState<Ride[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
         const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile?.email !== 'anushshrestha8683@gmail.com') {
                    router.replace('/admin');
                } else {
                    setCurrentUser(profile);
                    setIsSuperAdmin(true);
                }
            } else {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!currentUser) {
            setIsLoading(true);
            return;
        };

        const fetchRidesForDate = (selectedDate: Date) => {
            setIsLoading(true);
            setError(null);
            startTransition(async () => {
                // Super admin sees all rides, so no email is passed
                const ownerEmail = isSuperAdmin ? undefined : currentUser?.email;
                const result = await getOrCreateRidesForDate(format(selectedDate, 'yyyy-MM-dd'), ownerEmail);
                
                if (result.success && result.rides) {
                    const now = getNepalTime();
                    const todayStr = format(now, 'yyyy-MM-dd');
                    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

                    if (selectedDateStr === todayStr) {
                         const availableTodayRides = result.rides.filter(ride => {
                            const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
                            return !isPast(departureDateTime);
                        });

                        if (availableTodayRides.length === 0) {
                            setDate(addDays(new Date(), 1));
                            return; 
                        }
                    }
                    
                    setRides(result.rides);
                } else {
                    setError(result.message ?? 'An unknown error occurred.');
                    setRides([]);
                }
                setIsLoading(false);
            });
        };

        fetchRidesForDate(date);
    }, [date, currentUser, isSuperAdmin]);

    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
        }
    };
    
    const handleRideUpdate = (updatedRide: Ride) => {
        setRides(prevRides => prevRides.map(r => r.id === updatedRide.id ? updatedRide : r));
    }
    
    const handleRideCreate = (newRide: Ride) => {
        setRides(prevRides => [...prevRides, newRide].sort((a, b) => a.departureTime.localeCompare(b.departureTime)));
    }
    
    const handleRideDelete = (deletedRideId: string) => {
        setRides(prevRides => prevRides.filter(r => r.id !== deletedRideId));
    }

    if (!currentUser) {
        return (
             <div className="container mx-auto px-4 py-8">
                <ScheduleSkeleton />
             </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Daily Schedule Management</h1>
                <p className="text-muted-foreground">Create, edit, or cancel rides for a specific date. {isSuperAdmin ? "You can view all rides." : "You can only view your own assigned rides."}</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                             <CardTitle>Schedule for {format(date, 'MMMM d, yyyy')}</CardTitle>
                             <CardDescription>
                                {rides.length} rides scheduled for this day.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(date, 'PPP')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={handleDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <ScheduleSkeleton />
                    ) : error ? (
                         <div className="text-center py-10 text-destructive bg-red-50 border border-destructive rounded-lg">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4"/>
                            <p className="font-semibold">Could not load schedule</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : (
                       <DailyRideTable 
                            rides={rides} 
                            date={format(date, 'yyyy-MM-dd')}
                            onRideCreated={handleRideCreate}
                            onRideUpdated={handleRideUpdate}
                            onRideDeleted={handleRideDelete}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
