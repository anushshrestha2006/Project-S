
'use client';

import type { Booking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Calendar, Clock, User, Ticket, Armchair, ArrowRight, Download, Loader2, Hash } from "lucide-react";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export function TicketContent({ booking }: { booking: Booking }) {
    if (!booking.rideDetails) return null;

    const { rideDetails: ride, passengerName, seats, status, ticketId } = booking;
    const rideDate = format(new Date(ride.date), "MMMM d, yyyy");

    return (
        <div className="w-full max-w-md bg-background shadow-2xl rounded-2xl overflow-hidden relative">
            <div className="bg-primary text-primary-foreground p-5 text-center">
                <h1 className="text-2xl font-bold font-headline">Travel Ticket</h1>
                <p className="text-sm opacity-90">Bryzoo</p>
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
                            <p className="font-semibold">{ride.vehicleType} ({ride.vehicleNumber})</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Ticket className="w-5 h-5 mt-0.5 text-primary"/>
                        <div>
                            <p className="text-xs text-muted-foreground">Ticket ID</p>
                            <p className="font-mono text-sm font-semibold break-all">{ticketId}</p>
                        </div>
                    </div>
                </div>
                
                <div className="border-t border-dashed my-4"></div>

                <div className="text-center text-xs text-muted-foreground">
                    <p>Please present this ticket (digital or printed) at the time of boarding.</p>
                    <p>Thank you for choosing Bryzoo!</p>
                </div>

            </div>
             <div className="bg-gray-50 p-4 border-t text-center">
                <p className="text-xs text-muted-foreground">This is an auto-generated ticket.</p>
            </div>
        </div>
    )
}
