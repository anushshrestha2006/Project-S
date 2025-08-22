

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch, setDoc } from 'firebase/firestore';
import type { Ride, Booking, User, Seat, SeatStatus } from './types';
import { format, startOfDay, parse, endOfDay, isToday, parseISO, addDays, isPast } from 'date-fns';

const initialSeats: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

const RIDE_TEMPLATES = [
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '06:00 AM', arrivalTime: '02:00 PM' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '06:00 AM', arrivalTime: '02:00 PM' },
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '10:00 AM', arrivalTime: '06:00 PM' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '10:00 AM', arrivalTime: '06:00 PM' },
] as const;


/**
 * Generates a list of all rides for the next 7 days.
 * IDs are deterministic based on date and template.
 */
const generateRides = (): Ride[] => {
    const rides: Ride[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        RIDE_TEMPLATES.forEach((template, index) => {
            rides.push({
                id: `${dateStr}-${index + 1}`,
                ...template,
                price: 850,
                vehicleType: 'Sumo',
                date: dateStr,
                seats: JSON.parse(JSON.stringify(initialSeats)),
                totalSeats: 9,
            });
        });
    }
    return rides;
}


// Helper to get current time in Nepal (UTC+5:45)
const getNepalTime = () => {
    const now = new Date();
    const utcOffset = now.getTimezoneOffset() * 60000; // in milliseconds
    const utcTime = now.getTime() + utcOffset;
    const nepalOffset = (5 * 60 + 45) * 60000; // 5 hours 45 minutes in milliseconds
    return new Date(utcTime + nepalOffset);
};


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    
    let allRides: Ride[] = generateRides();
    
    const rideIds = allRides.map(r => r.id);
    const ridesSnapshot = await getDocs(query(collection(db, 'rides'), where('__name__', 'in', rideIds)));
    const firestoreRides = new Map(ridesSnapshot.docs.map(doc => [doc.id, doc.data() as Ride]));

    allRides = allRides.map(ride => {
        const firestoreRide = firestoreRides.get(ride.id);
        return firestoreRide ? { ...ride, seats: firestoreRide.seats } : ride;
    });

    
    if (filters.from && filters.from !== 'all') {
        allRides = allRides.filter(ride => ride.from === filters.from);
    }
    if (filters.to && filters.to !== 'all') {
        allRides = allRides.filter(ride => ride.to === filters.to);
    }
    
    const now = getNepalTime();
    const todayStr = format(now, 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');

    let finalRideList;

    if (filters.date) {
        finalRideList = allRides.filter(ride => ride.date === filters.date);
    } else {
        const todayRides = allRides.filter(ride => ride.date === todayStr);
        const availableTodayRides = todayRides.filter(ride => {
            const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
            return departureDateTime > now;
        });

        if (availableTodayRides.length > 0) {
            finalRideList = availableTodayRides;
        } else {
            finalRideList = allRides.filter(ride => ride.date === tomorrowStr);
        }
    }

    finalRideList = finalRideList.filter(ride => {
        const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
        return departureDateTime > now;
    });


    finalRideList.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        const timeA = parse(a.departureTime, 'hh:mm a', new Date()).getTime();
        const timeB = parse(b.departureTime, 'hh:mm a', new Date()).getTime();
        return timeA - timeB;
    });

    return finalRideList;
};

export const getRideById = async (id: string, includePast = false): Promise<Ride | undefined> => {
    const rideRef = doc(db, 'rides', id);
    const rideSnap = await getDoc(rideRef);
    
    if (rideSnap.exists()) {
        const ride = rideSnap.data() as Ride;
        const allRides = generateRides();
        const templateRide = allRides.find(r => r.id === id);
        if (!templateRide) return undefined; 
        
        const mergedRide = { ...templateRide, ...ride };
        
        if (!includePast) {
            const now = getNepalTime();
            const departureDateTime = parse(`${mergedRide.date} ${mergedRide.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
            if (isPast(departureDateTime)) {
                return undefined;
            }
        }
        return { id: rideSnap.id, ...mergedRide };

    } else {
        const baseRide = generateRides().find(r => r.id === id);
        if(!baseRide) return undefined;
        
         if (!includePast) {
            const now = getNepalTime();
            const departureDateTime = parse(`${baseRide.date} ${baseRide.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
            if (isPast(departureDateTime)) {
                return undefined;
            }
        }
        return baseRide as Ride;
    }
};

export const getBookings = async (): Promise<Booking[]> => {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(bookingsCollection, orderBy('bookingTime', 'desc'));
    const bookingsSnapshot = await getDocs(q);
    
    return bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            bookingTime: (data.bookingTime as Timestamp).toDate(),
        } as Booking;
    });
};

export const getBookingsByUserId = async (userId: string): Promise<Booking[]> => {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(
        bookingsCollection, 
        where('userId', '==', userId), 
        orderBy('bookingTime', 'desc')
    );
    const bookingsSnapshot = await getDocs(q);

    const bookingsWithRides = await Promise.all(
        bookingsSnapshot.docs.map(async (doc) => {
            const bookingData = doc.data();
            const rideDetails = await getRideById(bookingData.rideId, true); // Include past rides
            return {
                id: doc.id,
                ...bookingData,
                bookingTime: (bookingData.bookingTime as Timestamp).toDate(),
                rideDetails: rideDetails,
            } as Booking;
        })
    );

    return bookingsWithRides.filter(b => b.rideDetails); 
};


export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime'>
): Promise<Booking> => {
    const rideRef = doc(db, 'rides', bookingData.rideId);
    
    let newBookingId: string;

    await runTransaction(db, async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        let ride: Ride;

        if (!rideDoc.exists()) {
            const generatedRide = generateRides().find(r => r.id === bookingData.rideId);
            if (!generatedRide) {
                throw new Error("Ride schedule not found!");
            }
            ride = generatedRide;
        } else {
            ride = { ...generateRides().find(r => r.id === bookingData.rideId)!, ...rideDoc.data() } as Ride;
        }

        bookingData.seats.forEach(seatNumber => {
            const seat = ride.seats.find(s => s.number === seatNumber);
            if (!seat || seat.status !== 'available') {
                throw new Error(`Seat ${seatNumber} is no longer available.`);
            }
        });

        const newSeats = ride.seats.map(seat =>
            bookingData.seats.includes(seat.number)
                ? { ...seat, status: 'locked' } // Mark as locked, not booked, until payment is confirmed
                : seat
        );
        
        transaction.set(rideRef, { seats: newSeats }, { merge: true });

        const bookingWithTimestamp = {
            ...bookingData,
            bookingTime: Timestamp.now()
        };
        const newBookingRef = doc(collection(db, 'bookings'));
        transaction.set(newBookingRef, bookingWithTimestamp);
        newBookingId = newBookingRef.id;
    });

    const newBookingSnap = await getDoc(doc(db, 'bookings', newBookingId!));
    const newBookingData = newBookingSnap.data();

    return {
        id: newBookingSnap.id,
        ...newBookingData,
        bookingTime: (newBookingData!.bookingTime as Timestamp).toDate()
    } as Booking;
};


export const updateRideSeats = async (rideId: string, seatNumbers: number[], newStatus: SeatStatus): Promise<void> => {
     const rideRef = doc(db, 'rides', rideId);
      await runTransaction(db, async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
         let ride: Ride;

        if (!rideDoc.exists()) {
            const generatedRide = generateRides().find(r => r.id === rideId);
            if (!generatedRide) throw new Error("Ride not found for seat update");
            ride = generatedRide;
        } else {
            ride = { ...generateRides().find(r => r.id === rideId)!, ...rideDoc.data() } as Ride;
        }

        const newSeats = ride.seats.map(seat => 
            seatNumbers.includes(seat.number) ? { ...seat, status: newStatus } : seat
        );
        
        transaction.set(rideRef, { seats: newSeats }, { merge: true });
    });
}


export const getUserProfile = async (userId: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return { 
            id: userSnap.id,
             ...data 
        } as User;
    }
    return null;
}
