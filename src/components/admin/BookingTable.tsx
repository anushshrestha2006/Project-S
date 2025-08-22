
'use client';

import { useState, useMemo, useEffect, useTransition } from "react";
import type { Booking } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, ExternalLink, CheckCircle, XCircle, CalendarIcon, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile, getBookings } from "@/lib/data";
import { Timestamp } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateBookingStatus } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "@/lib/utils";


export function BookingTable({ initialBookings }: { initialBookings: Booking[] }) {
    const [bookings, setBookings] = useState(initialBookings);
    const [dateFilter, setDateFilter] = useState<Date | undefined>();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile?.role !== 'admin') {
                    router.replace('/');
                } else {
                    const freshBookings = await getBookings();
                    setBookings(freshBookings);
                }
            } else {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            if (!booking.rideDetails) return false;
            const rideDate = new Date(booking.rideDetails.date);
            // Adjust for timezone issues by comparing just the date part
            const dateMatch = !dateFilter || format(rideDate, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd');
            const statusMatch = statusFilter === 'all' || booking.status === statusFilter;
            return dateMatch && statusMatch;
        });
    }, [bookings, dateFilter, statusFilter]);

    const handleStatusUpdate = (bookingId: string, rideId: string, seats: number[], newStatus: 'confirmed' | 'cancelled') => {
        startTransition(async () => {
            const result = await updateBookingStatus(bookingId, rideId, seats, newStatus);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        });
    }

    const handleExport = () => {
        const headers = ["Booking ID", "Ride ID", "Passenger Name", "Phone", "Seats", "Booking Date", "Status", "Payment Method", "Transaction ID", "Ride From", "Ride To", "Ride Date", "Departure Time"];
        const csvRows = [headers.join(",")];
        
        filteredBookings.forEach(booking => {
            if (!booking.rideDetails) return;
            const bookingTime = booking.bookingTime instanceof Timestamp ? booking.bookingTime.toDate() : booking.bookingTime;
            const row = [
                booking.id,
                booking.rideId,
                `"${booking.passengerName}"`,
                booking.passengerPhone,
                `"${booking.seats.join(" ")}"`,
                format(bookingTime, "yyyy-MM-dd HH:mm"),
                booking.status,
                booking.paymentMethod || "",
                booking.transactionId || "",
                booking.rideDetails.from,
                booking.rideDetails.to,
                booking.rideDetails.date,
                booking.rideDetails.departureTime,
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `sumo-sewa-bookings-${format(new Date(), "yyyy-MM-dd")}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const formatBookingTime = (time: Date | Timestamp) => {
        const date = time instanceof Timestamp ? time.toDate() : time;
        return format(date, "PPpp");
    }

    const getStatusBadgeVariant = (status: Booking['status']) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'pending-payment': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    }


    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="date">Filter by Ride Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFilter && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dateFilter}
                            onSelect={setDateFilter}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="statusFilter">Filter by Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="statusFilter">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending-payment">Pending Payment</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid w-full items-center gap-1.5 md:col-start-4">
                     <Button onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                 </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ride & Booking Details</TableHead>
                            <TableHead>Passenger</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map(booking => (
                                <TableRow key={booking.id}>
                                    <TableCell>
                                        {booking.rideDetails && (
                                            <div className="font-medium flex items-center">
                                                {booking.rideDetails.from} <ArrowRight className="mx-1 h-4 w-4" /> {booking.rideDetails.to}
                                            </div>
                                        )}
                                         {booking.rideDetails && (
                                            <div className="text-sm text-muted-foreground">
                                                {format(new Date(booking.rideDetails.date), "EEE, MMM d")} at {booking.rideDetails.departureTime}
                                            </div>
                                        )}
                                        <div className="text-xs text-muted-foreground mt-2">Seats: {booking.seats.join(', ')}</div>
                                        <div className="text-xs text-muted-foreground">Booked: {formatBookingTime(booking.bookingTime)}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div>{booking.passengerName}</div>
                                        <div className="text-sm text-muted-foreground">{booking.passengerPhone}</div>
                                    </TableCell>
                                     <TableCell>
                                        <div className="font-medium capitalize">{booking.paymentMethod}</div>
                                        <div className="text-xs text-muted-foreground">{booking.transactionId || 'N/A'}</div>
                                    </TableCell>
                                     <TableCell>
                                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                                            {booking.status.replace('-', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                       {booking.status === 'pending-payment' && (
                                          <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleStatusUpdate(booking.id, booking.rideId, booking.seats, 'confirmed')} disabled={isPending}>
                                                <CheckCircle className="mr-2 h-4 w-4"/> Confirm
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleStatusUpdate(booking.id, booking.rideId, booking.seats, 'cancelled')} disabled={isPending}>
                                                 <XCircle className="mr-2 h-4 w-4"/> Cancel
                                            </Button>
                                          </div>
                                       )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No bookings found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
