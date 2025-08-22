import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, isAfter, isEqual, startOfDay } from 'date-fns';


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
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

            const ride = rideDoc.data() as Ride;
            
            // Check seat availability
            bookingData.seats.forEach(seatNumber => {
                const seat = ride.seats.find(s => s.number === seatNumber);
                if (!seat || seat.status !== 'available') {
                    throw new Error(`Seat ${seatNumber} is no longer available.`);
                }
            });

            // Update seats
            const newSeats = ride.seats.map(seat => 
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
            transaction.set(doc(bookingsCol), newBookingData);
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
