import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, isAfter, isEqual, startOfDay, parse } from 'date-fns';


// A flag to control the one-time reset. In a real app, you'd use a more robust
// system for data seeding, like a separate admin script.
const RESET_DATA_ONCE = false; 

const initialSeats: Seat[] = [
    { number: 1, status: 'available' },
    { number: 2, status: 'available' },
    { number: 3, status: 'available' },
    { number: 4, status: 'available' },
    { number: 5, status: 'available' },
    { number: 6, status: 'available' },
    { number: 7, status: 'available' },
    { number: 8, status: 'available' },
    { number: 9, status: 'available' },
];

async function resetRidesAndBookings() {
    console.log("Performing one-time data reset...");
    const batch = writeBatch(db);

    // 1. Delete all bookings
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    bookingsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Reset seats in all rides
    const ridesSnapshot = await getDocs(collection(db, 'rides'));
    ridesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { seats: initialSeats });
    });

    await batch.commit();
    console.log("Data reset complete.");
}


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    // This is a temporary development feature to easily reset the data.
    // To re-run, change RESET_DATA_ONCE to true, save, let it run, then change it back to false.
    if (RESET_DATA_ONCE) {
        await resetRidesAndBookings();
    }
    
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

    // Post-filter for today's rides to exclude those that have already departed
    if (!filters.date) {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        
        return rideList.filter(ride => {
            if (ride.date !== todayStr) {
                // If the ride is for a future date, always include it
                return true;
            }
            // If the ride is for today, check the departure time
            const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd h:mm a', new Date());
            return isAfter(departureDateTime, now);
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
            
            // Ensure rideData.seats exists and is an array
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
            const bookingsCol = collection(db, 'bookings');
            const newBookingData = {
                ...bookingData,
                bookingTime: Timestamp.now(),
            };
            // Use addDoc within the transaction by getting the collection ref
            const newBookingRef = doc(collection(db, "bookings"));
            transaction.set(newBookingRef, newBookingData);
        });

         const newBooking: Booking = {
            ...bookingData,
            id: `temp-id-${Date.now()}`, // This ID is temporary, Firestore will generate one
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
