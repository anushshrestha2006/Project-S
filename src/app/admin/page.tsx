import { getBookings } from "@/lib/data";
import { BookingTable } from "@/components/admin/BookingTable";

export default async function AdminPage() {
    const bookings = await getBookings();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage and view all bookings.</p>
            </div>
            <BookingTable initialBookings={bookings} />
        </div>
    );
}
