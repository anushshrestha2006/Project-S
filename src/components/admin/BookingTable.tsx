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
import { getUserProfile } from "@/lib/data";

export function BookingTable({ initialBookings }: { initialBookings: Booking[] }) {
    const [bookings, setBookings] = useState(initialBookings);
    const [filter, setFilter] = useState("");
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile?.role !== 'admin') {
                    router.replace('/');
                }
            } else {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => 
            booking.passengerName.toLowerCase().includes(filter.toLowerCase()) ||
            booking.passengerPhone.includes(filter) ||
            booking.rideId.toLowerCase().includes(filter.toLowerCase())
        );
    }, [bookings, filter]);

    const handleExport = () => {
        const headers = ["Booking ID", "Ride ID", "Passenger Name", "Phone", "Seats", "Booking Date"];
        const csvRows = [headers.join(",")];
        
        filteredBookings.forEach(booking => {
            const row = [
                booking.id,
                booking.rideId,
                `"${booking.passengerName}"`,
                booking.passengerPhone,
                `"${booking.seats.join(" ")}"`,
                format(booking.bookingTime, "yyyy-MM-dd HH:mm")
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

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter by name, phone, or ride..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm pl-10"
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
                                    <TableCell>{format(booking.bookingTime, "PPpp")}</TableCell>
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
