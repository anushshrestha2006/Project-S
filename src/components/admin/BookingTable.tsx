'use client';

import { useState, useMemo, useEffect } from "react";
import type { Booking, User } from "@/lib/types";
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
import { Download, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile, getBookings } from "@/lib/data";
import { Timestamp } from "firebase/firestore";
import { Label } from "@/components/ui/label";

export function BookingTable({ initialBookings }: { initialBookings: Booking[] }) {
    const [bookings, setBookings] = useState(initialBookings);
    const [nameFilter, setNameFilter] = useState("");
    const [phoneFilter, setPhoneFilter] = useState("");
    const [rideIdFilter, setRideIdFilter] = useState("");
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile?.role !== 'admin') {
                    router.replace('/');
                } else {
                    // Fetch latest bookings when admin is confirmed
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
            const nameMatch = nameFilter ? booking.passengerName.toLowerCase().includes(nameFilter.toLowerCase()) : true;
            const phoneMatch = phoneFilter ? booking.passengerPhone.includes(phoneFilter) : true;
            const rideIdMatch = rideIdFilter ? booking.rideId.toLowerCase().includes(rideIdFilter.toLowerCase()) : true;
            return nameMatch && phoneMatch && rideIdMatch;
        });
    }, [bookings, nameFilter, phoneFilter, rideIdFilter]);

    const handleExport = () => {
        const headers = ["Booking ID", "Ride ID", "Passenger Name", "Phone", "Seats", "Booking Date"];
        const csvRows = [headers.join(",")];
        
        filteredBookings.forEach(booking => {
            const bookingTime = booking.bookingTime instanceof Timestamp ? booking.bookingTime.toDate() : booking.bookingTime;
            const row = [
                booking.id,
                booking.rideId,
                `"${booking.passengerName}"`,
                booking.passengerPhone,
                `"${booking.seats.join(" ")}"`,
                format(bookingTime, "yyyy-MM-dd HH:mm")
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

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="nameFilter">Passenger Name</Label>
                    <Input 
                        id="nameFilter"
                        placeholder="Filter by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                    />
                </div>
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="phoneFilter">Phone Number</Label>
                    <Input 
                        id="phoneFilter"
                        placeholder="Filter by phone..."
                        value={phoneFilter}
                        onChange={(e) => setPhoneFilter(e.target.value)}
                    />
                </div>
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="rideIdFilter">Ride ID</Label>
                    <Input 
                        id="rideIdFilter"
                        placeholder="Filter by ride ID..."
                        value={rideIdFilter}
                        onChange={(e) => setRideIdFilter(e.target.value)}
                    />
                </div>
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Booking ID</TableHead>
                            <TableHead>Ride ID</TableHead>
                            <TableHead>Passenger</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Seats</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map(booking => (
                                <TableRow key={booking.id}>
                                    <TableCell className="font-medium">{booking.id.substring(0, 7)}...</TableCell>
                                    <TableCell>{booking.rideId}</TableCell>
                                    <TableCell>{booking.passengerName}</TableCell>
                                    <TableCell>{booking.passengerPhone}</TableCell>
                                    <TableCell>{booking.seats.join(', ')}</TableCell>
                                    <TableCell>{formatBookingTime(booking.bookingTime)}</TableCell>
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
