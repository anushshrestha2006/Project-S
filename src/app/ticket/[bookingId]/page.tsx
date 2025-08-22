
'use client';

import { useState, useEffect, useRef } from 'react';
import { getBookingById } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Booking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Calendar, Clock, User, Ticket, Armchair, ArrowRight, Download, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function TicketContent({ booking }: { booking: Booking }) {
    if (!booking.rideDetails) return null;

    const { rideDetails: ride, passengerName, seats, status, id: bookingId } = booking;
    const rideDate = format(new Date(ride.date), "MMMM d, yyyy");

    return (
        <div className="w-full max-w-md bg-background shadow-2xl rounded-2xl overflow-hidden relative">
            <div className="bg-primary text-primary-foreground p-5 text-center">
                <h1 className="text-2xl font-bold font-headline">Travel Ticket</h1>
                <p className="text-sm opacity-90">Sumo Sewa</p>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="text-center">
                     <Badge variant={status === 'confirmed' ? 'default' : 'destructive'} className="capitalize text-lg px-4 py-1">{status.replace('-', ' ')}</Badge>
                     {status !== 'confirmed' && <p className="text-destructive text-sm mt-2">This ticket is not valid for travel.</p>}
                </div>

                <div className="flex justify-between items-center text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">From</p>
                        <p className="font-bold text-xl text-primary">{ride.from}</p>
                    </div>
                    <ArrowRight className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                     <div>
                        <p className="text-sm text-muted-foreground">To</p>
                        <p className="font-bold text-xl text-primary">{ride.to}</p>
                    </div>
                </div>

                <div className="border-t border-dashed my-4"></div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Passenger</p>
                            <p className="font-semibold">{passengerName}</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Armchair className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Seat(s)</p>
                            <p className="font-semibold">{seats.join(', ')}</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Calendar className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-semibold">{rideDate}</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Departure</p>
                            <p className="font-semibold">{ride.departureTime}</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Bus className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Vehicle</p>
                            <p className="font-semibold">{ride.vehicleType}</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Ticket className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Booking ID</p>
                            <p className="font-mono text-xs font-semibold">{bookingId}</p>
                        </div>
                    </div>
                </div>
                
                <div className="border-t border-dashed my-4"></div>

                <div className="text-center text-xs text-muted-foreground">
                    <p>Please present this ticket (digital or printed) at the time of boarding.</p>
                    <p>Thank you for choosing Sumo Sewa!</p>
                </div>

            </div>
             <div className="bg-gray-50 p-4 border-t text-center">
                <p className="text-xs text-muted-foreground">This is an auto-generated ticket.</p>
            </div>
        </div>
    )
}

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
    const [isDownloading, setIsDownloading] = useState(false);
    const ticketRef = useRef<HTMLDivElement>(null);

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

    const handleDownload = async () => {
        if (!ticketRef.current || !booking) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(ticketRef.current, {
                scale: 2, // Higher scale for better quality
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`sumo-sewa-ticket-${booking.id}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            // You could show a toast message here
        } finally {
            setIsDownloading(false);
        }
    };
    
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-4 flex flex-col items-center justify-center">
            {isLoading ? (
                <TicketSkeleton />
            ) : booking ? (
                <>
                    <div ref={ticketRef} className="p-2">
                        <TicketContent booking={booking} />
                    </div>
                     <div className="mt-8 w-full max-w-md">
                        <Button onClick={handleDownload} disabled={isDownloading} className="w-full py-6 text-lg">
                            {isDownloading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-5 w-5" />
                                    Download as PDF
                                </>
                            )}
                        </Button>
                    </div>
                </>
            ) : null}
        </div>
    );
}
