
'use client';

import { useState, useEffect } from 'react';
import { getBookingById } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Booking } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketContent } from '@/components/Ticket';

function TicketSkeleton() {
    return (
        <div className="w-full max-w-md bg-background shadow-2xl rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-1/4" />
            </div>
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-10 w-1/4" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-2 gap-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
             <Skeleton className="h-px w-full" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
        </div>
    )
}

export default function TicketPage({ params }: { params: { bookingId: string }}) {
    const { bookingId } = params;
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            setIsLoading(true);
            const bookingData = await getBookingById(bookingId);
            if (!bookingData) {
                notFound();
            }
            setBooking(bookingData);
            setIsLoading(false);
        };
        fetchBooking();
    }, [bookingId]);
    
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-4 flex flex-col items-center justify-center">
            {isLoading ? (
                <TicketSkeleton />
            ) : booking ? (
                <div className="p-2">
                    <TicketContent booking={booking} />
                </div>
            ) : null}
        </div>
    );
}
