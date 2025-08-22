
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, isAfter, startOfDay, parse } from 'date-fns';

const initialSeats: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

const dailyRideTemplates = [
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '06:00 AM', arrivalTime: '02:00 PM', price: 2500, vehicleType: 'Sumo' },
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '10:00 AM', arrivalTime: '06:00 PM', price: 2500, vehicleType: 'Sumo' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '06:00 AM', arrivalTime: '02:00 PM', price: 2500, vehicleType: 'Sumo' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '10:00 AM', arrivalTime: '06:00 PM', price: 2500, vehicleType: 'Sumo' },
] as const;


/**
 * Seeds the database with the four standard daily rides for a given date if they don't already exist.
 * This prevents duplicate rides from being created on subsequent page loads.
 */
async function seedDailyRides() {
    const today = startOfDay(new Date());
    const ridesCol = collection(db, 'rides');
    const todayStr = format(today, 'yyyy-MM-dd');

    // Check if rides for today already exist
    const q = query(ridesCol, where('date', '==', Timestamp.fromDate(today)));
    const existingRidesSnapshot = await getDocs(q);

    if (existingRidesSnapshot.empty) {
        console.log(`No rides found for ${todayStr}. Seeding now...`);
        const batch = writeBatch(db);

        dailyRideTemplates.forEach(template => {
            const newRideDoc = doc(ridesCol); // Create a new document reference with a unique ID
            const rideData: Omit<Ride, 'id'> = {
                ...template,
                date: todayStr,
                seats: initialSeats,
                totalSeats: 9,
            };
            batch.set(newRideDoc, {
                ...rideData,
                date: Timestamp.fromDate(today), // Store as Firestore Timestamp
            });
        });

        await batch.commit();
        console.log("Successfully seeded rides for today.");
    }
}


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    
    // Ensure daily rides for today exist.
    // In a production app, this might be a scheduled job.
    await seedDailyRides();
    
    const ridesCol = collection(db, 'rides');
    let q = query(ridesCol);

    const queryConstraints = [];

    if (filters.date) {
        const filterDateStart = startOfDay(new Date(filters.date));
        const filterDateEnd = new Date(filterDateStart);
        filterDateEnd.setDate(filterDateEnd.getDate() + 1);
        queryConstraints.push(where('date', '>=', Timestamp.fromDate(filterDateStart)));
        queryConstraints.push(where('date', '<', Timestamp.fromDate(filterDateEnd)));
    } else {
        // Default to showing rides from today onwards
        queryConstraints.push(where('date', '>=', Timestamp.fromDate(startOfDay(new Date()))));
    }
    
    if (filters.from && filters.from !== 'all') {
        queryConstraints.push(where('from', '==', filters.from));
    }
    if (filters.to && filters.to !== 'all') {
        queryConstraints.push(where('to', '==', filters.to));
    }

    q = query(ridesCol, ...queryConstraints, orderBy('date'), orderBy('departureTime'));

    const rideSnapshot = await getDocs(q);
    const rideList = rideSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: format((data.date as Timestamp).toDate(), 'yyyy-MM-dd'),
        } as Ride;
    });

    // If filtering for today (or no date is provided), filter out past departure times
     if (!filters.date || format(new Date(filters.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        
        return rideList.filter(ride => {
            if (ride.date !== todayStr) {
                // If the ride is for a future date, always include it
                return true;
            }
            // If the ride is for today, check the departure time
            try {
                const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd h:mm a', new Date());
                return isAfter(departureDateTime, now);
            } catch (e) {
                console.error(`Could not parse date for ride ${ride.id}: ${ride.date} ${ride.departureTime}`);
                return false;
            }
        });
    }

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
