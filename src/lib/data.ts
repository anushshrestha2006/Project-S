
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, startOfDay, parse, endOfDay } from 'date-fns';

const initialSeats: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

// Hardcoded templates for daily rides.
const RIDE_TEMPLATES = [
    {
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '06:00 AM',
        arrivalTime: '02:00 PM',
        price: 1200,
        vehicleType: 'Sumo',
    },
    {
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '10:00 AM',
        arrivalTime: '06:00 PM',
        price: 1200,
        vehicleType: 'Sumo',
    },
     {
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '07:00 PM',
        arrivalTime: '03:00 AM',
        price: 1200,
        vehicleType: 'Sumo',
    },
    {
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '08:00 PM',
        arrivalTime: '04:00 AM',
        price: 1200,
        vehicleType: 'Sumo',
    },
];


/**
 * Seeds the database with daily rides based on hardcoded templates.
 * This function checks if rides for the current date have already been created and, if not,
 * creates them.
 */
async function seedDailyRides() {
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    const ridesCol = collection(db, 'rides');

    const startOfToday = Timestamp.fromDate(today);
    const endOfToday = Timestamp.fromDate(endOfDay(today));

    // Check if rides for today already exist to prevent re-seeding.
    const q = query(ridesCol, where('date', '>=', startOfToday), where('date', '<=', endOfToday));
    const existingRidesSnapshot = await getDocs(q);
    
    if (existingRidesSnapshot.empty) {
        console.log(`No rides found for ${todayStr}. Seeding from code templates...`);
        
        const batch = writeBatch(db);
        RIDE_TEMPLATES.forEach(template => {
            const newRideDoc = doc(collection(db, 'rides'));

            const rideData = {
                ...template,
                seats: initialSeats,
                totalSeats: initialSeats.length,
                date: Timestamp.fromDate(today),
            };
            batch.set(newRideDoc, rideData);
        });

        await batch.commit();
        console.log(`Successfully seeded ${RIDE_TEMPLATES.length} rides for today.`);
    }
}


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    
    await seedDailyRides();
    
    const ridesCol = collection(db, 'rides');
    let q = query(ridesCol);
    
    const hasFilters = (filters.from && filters.from !== 'all') || (filters.to && filters.to !== 'all') || filters.date;

    if (hasFilters) {
        if (filters.date) {
            const filterDateStart = startOfDay(new Date(filters.date));
            const filterDateEnd = endOfDay(new Date(filters.date));
            q = query(q, where('date', '>=', Timestamp.fromDate(filterDateStart)), where('date', '<=', Timestamp.fromDate(filterDateEnd)));
        } else {
             q = query(q, where('date', '>=', Timestamp.fromDate(startOfDay(new Date()))));
        }

        if (filters.from && filters.from !== 'all') {
            q = query(q, where('from', '==', filters.from));
        }
        if (filters.to && filters.to !== 'all') {
            q = query(q, where('to', '==', filters.to));
        }
        q = query(q, orderBy('date'), orderBy('departureTime'));

    } else {
        // Default query: no filters, just get upcoming rides
        q = query(q, 
            where('date', '>=', Timestamp.fromDate(startOfDay(new Date()))),
            orderBy('date'), 
            orderBy('departureTime')
        );
    }
    
    const rideSnapshot = await getDocs(q);
    const rideList = rideSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: format((data.date as Timestamp).toDate(), 'yyyy-MM-dd'),
        } as Ride;
    });

    return rideList;
};

export const getRideById = async (id: string): Promise<Ride | undefined> => {
    const rideDocRef = doc(db, 'rides', id);
    const rideSnap = await getDoc(rideDocRef);

    if (rideSnap.exists()) {
        const data = rideSnap.data();
        return {
            id: rideSnap.id,
            ...data,
            date: format((data.date as Timestamp).toDate(), 'yyyy-MM-dd'),
        } as Ride;
    } else {
        return undefined;
    }
};

export const getBookings = async (): Promise<Booking[]> => {
    const bookingsCol = collection(db, 'bookings');
    const q = query(bookingsCol, orderBy('bookingTime', 'desc'));
    const bookingSnapshot = await getDocs(q);
    const bookingList = bookingSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            bookingTime: (data.bookingTime as Timestamp).toDate(),
        } as Booking;
    });
    return bookingList;
};

export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime'>
): Promise<Booking> => {
    const rideDocRef = doc(db, 'rides', bookingData.rideId);

    try {
        await runTransaction(db, async (transaction) => {
            const rideDoc = await transaction.get(rideDocRef);
            if (!rideDoc.exists()) {
                throw new Error("Ride not found!");
            }

            const rideData = rideDoc.data();
            
            const currentSeats: Seat[] = rideData.seats || [];

            // Check seat availability
            bookingData.seats.forEach(seatNumber => {
                const seat = currentSeats.find(s => s.number === seatNumber);
                if (!seat || seat.status !== 'available') {
                    throw new Error(`Seat ${seatNumber} is no longer available.`);
                }
            });

            // Update seats
            const newSeats = currentSeats.map(seat => 
                bookingData.seats.includes(seat.number) 
                    ? { ...seat, status: 'booked' } 
                    : seat
            );
            
            transaction.update(rideDocRef, { seats: newSeats });
            
            // Create new booking document
            const newBookingRef = doc(collection(db, "bookings"));
            const newBookingData = {
                ...bookingData,
                bookingTime: Timestamp.now(),
            };
            transaction.set(newBookingRef, newBookingData);
        });

         const newBooking: Booking = {
            ...bookingData,
            id: `temp-id-${Date.now()}`,
            bookingTime: new Date(),
        };

        return newBooking;

    } catch (e) {
        console.error("Booking transaction failed: ", e);
        if (e instanceof Error) {
            throw e;
        }
        throw new Error("An unknown error occurred during booking.");
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
}
