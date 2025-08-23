
'use client';

import { useState, useMemo, useEffect, useTransition } from "react";
import type { Booking, User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, ExternalLink, CheckCircle, XCircle, CalendarIcon, ArrowRight, Ticket, Bus, Eye, Clock, Loader2, Link as LinkIcon } from "lucide-react";
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
import Link from "next/link";
import { useDebouncedCallback } from "use-debounce";
import { ClearBookingsButton } from "./ClearBookingsButton";
import { TicketContent } from "../Ticket";


function UpdateStatusButton({ 
    booking, 
    newStatus, 
    onUpdate,
    isPending
} : { 
    booking: Booking, 
    newStatus: 'confirmed' | 'cancelled', 
    onUpdate: (bookingId: string, rideId: string, seats: number[], newStatus: 'confirmed' | 'cancelled') => void,
    isPending: boolean 
}) {
    const isConfirm = newStatus === 'confirmed';
    const buttonVariant = isConfirm ? 'outline' : 'outline';
    const buttonClasses = isConfirm 
        ? "text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" 
        : "text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700";
    const Icon = isConfirm ? CheckCircle : XCircle;
    const title = `Are you sure you want to ${isConfirm ? 'confirm' : 'cancel'} this booking?`;
    const description = `This will update the booking status to "${newStatus}" and ${isConfirm ? "book the seats" : "make the seats available again"}. This action cannot be immediately undone.`;
    const actionText = `Yes, ${isConfirm ? 'Confirm' : 'Cancel'} Booking`;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button size="sm" variant={buttonVariant} className={buttonClasses} disabled={isPending}>
                    <Icon className="mr-2 h-4 w-4" /> {isConfirm ? 'Confirm' : 'Cancel'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Dismiss</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={() => onUpdate(booking.id, booking.rideId, booking.seats, newStatus)}
                        className={isConfirm ? '' : 'bg-destructive hover:bg-destructive/90'}
                    >
                         {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                        {actionText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function BookingTable({ initialBookings }: { initialBookings: Booking[] }) {
    const [bookings, setBookings] = useState(initialBookings);
    const [dateFilter, setDateFilter] = useState<Date | undefined>();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<string>("all");
    const [ticketIdFilter, setTicketIdFilter] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profile = await getUserProfile(user.uid);
                setCurrentUser(profile);
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
    
    const handleTicketIdChange = useDebouncedCallback((value: string) => {
        setTicketIdFilter(value);
    }, 300);

    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            if (!booking.rideDetails) return false;
            const rideDate = new Date(booking.rideDetails.date);
            
            const dateMatch = !dateFilter || format(rideDate, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd');
            const statusMatch = statusFilter === 'all' || booking.status === statusFilter;
            const vehicleMatch = vehicleTypeFilter === 'all' || booking.rideDetails.vehicleType === vehicleTypeFilter;
            const timeMatch = timeFilter === 'all' || booking.rideDetails.departureTime === timeFilter;
            const idMatch = !ticketIdFilter || (booking.ticketId && booking.ticketId.toLowerCase().includes(ticketIdFilter.toLowerCase()));

            return dateMatch && statusMatch && idMatch && vehicleMatch && timeMatch;
        });
    }, [bookings, dateFilter, statusFilter, ticketIdFilter, vehicleTypeFilter, timeFilter]);

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
        const headers = ["Ticket ID", "Booking ID", "Ride ID", "Passenger Name", "Phone", "Seats", "Booking Date", "Status", "Payment Method", "Screenshot URL", "Ride From", "Ride To", "Ride Date", "Departure Time", "Vehicle Type"];
        const csvRows = [headers.join(",")];
        
        filteredBookings.forEach(booking => {
            if (!booking.rideDetails) return;
            const bookingTime = booking.bookingTime instanceof Timestamp ? booking.bookingTime.toDate() : new Date(booking.bookingTime);
            const row = [
                booking.ticketId,
                booking.id,
                booking.rideId,
                `"${booking.passengerName}"`,
                booking.passengerPhone,
                `"${booking.seats.join(" ")}"`,
                format(bookingTime, "yyyy-MM-dd HH:mm"),
                booking.status,
                booking.paymentMethod || "",
                booking.paymentScreenshotUrl || "",
                booking.rideDetails.from,
                booking.rideDetails.to,
                booking.rideDetails.date,
                booking.rideDetails.departureTime,
                booking.rideDetails.vehicleType,
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

    const handlePreviewTicket = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsTicketDialogOpen(true);
    };

    const formatBookingTime = (time: Date | Timestamp | string) => {
        if (!isClient) return '...';
        const date = time instanceof Timestamp ? time.toDate() : new Date(time);
        return format(date, "PPpp");
    }
    
    const formatRideDate = (dateString: string) => {
        if (!isClient) return '...';
        return format(new Date(dateString), "EEE, MMM d");
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end">
                <div className="grid w-full items-center gap-1.5 lg:col-span-2">
                    <Label htmlFor="ticketId">Search by Ticket ID</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="ticketId"
                            placeholder="Enter Ticket ID..."
                            className="pl-8"
                            onChange={(e) => handleTicketIdChange(e.target.value)}
                        />
                    </div>
                </div>

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
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="vehicleTypeFilter">Filter by Vehicle</Label>
                    <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                        <SelectTrigger id="vehicleTypeFilter">
                            <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Vehicles</SelectItem>
                            <SelectItem value="Sumo">Sumo</SelectItem>
                            <SelectItem value="EV">EV</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-2 w-full items-center gap-2 lg:col-start-4 lg:col-span-2">
                     <Button onClick={handleExport} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    {currentUser?.email === 'anushshrestha8683@gmail.com' && (
                        <ClearBookingsButton onClear={() => setBookings([])} />
                    )}
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
                                        <div className="font-bold">{booking.ticketId}</div>
                                        {booking.rideDetails && (
                                            <div className="font-medium flex items-center">
                                                {booking.rideDetails.from} <ArrowRight className="mx-1 h-4 w-4" /> {booking.rideDetails.to}
                                            </div>
                                        )}
                                         {booking.rideDetails && (
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <span>{formatRideDate(booking.rideDetails.date)} at {booking.rideDetails.departureTime}</span>
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <Bus className="h-3 w-3" />
                                                    {booking.rideDetails.vehicleType}
                                                </Badge>
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
                                        {booking.paymentScreenshotUrl ? (
                                            <a href={booking.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                               <LinkIcon className="h-3 w-3" /> View Screenshot
                                            </a>
                                        ) : (
                                            <div className="text-xs text-muted-foreground">No screenshot</div>
                                        )}
                                    </TableCell>
                                     <TableCell>
                                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                                            {booking.status.replace('-', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2 items-center">
                                           {booking.status === 'pending-payment' && (
                                              <>
                                                <UpdateStatusButton 
                                                    booking={booking}
                                                    newStatus="confirmed"
                                                    onUpdate={handleStatusUpdate}
                                                    isPending={isPending}
                                                />
                                                <UpdateStatusButton 
                                                    booking={booking}
                                                    newStatus="cancelled"
                                                    onUpdate={handleStatusUpdate}
                                                    isPending={isPending}
                                                />
                                              </>
                                           )}
                                            {booking.status === 'confirmed' && (
                                                 <Button size="sm" variant="ghost" onClick={() => handlePreviewTicket(booking)}>
                                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                                 </Button>
                                            )}
                                        </div>
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
             <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
                <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
                     <DialogHeader className="sr-only">
                        <DialogTitle>Ticket Preview</DialogTitle>
                        <DialogDescription>A preview of the generated ticket for booking {selectedBooking?.ticketId}.</DialogDescription>
                    </DialogHeader>
                    {selectedBooking && <TicketContent booking={selectedBooking} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
