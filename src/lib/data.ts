


import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, startOfDay, parse, endOfDay, isToday, parseISO, addDays } from 'date-fns';

const initialSeats: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

// Hardcoded in-memory database for rides. We will keep this for ride schedules.
let ridesDB: Ride[] = [
    // Rides for today
    {
        id: '1',
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '06:00 AM',
        arrivalTime: '02:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(new Date(), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
    {
        id: '2',
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '06:00 AM',
        arrivalTime: '02:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(new Date(), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
     {
        id: '3',
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '10:00 AM',
        arrivalTime: '06:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(new Date(), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
    {
        id: '4',
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '10:00 AM',
        arrivalTime: '06:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(new Date(), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
    // Rides for tomorrow
    {
        id: '5',
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '06:00 AM',
        arrivalTime: '02:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
     {
        id: '6',
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '06:00 AM',
        arrivalTime: '02:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
      {
        id: '7',
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '10:00 AM',
        arrivalTime: '06:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
       {
        id: '8',
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '10:00 AM',
        arrivalTime: '06:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
     // Add some rides for 2 days from now for testing upcoming logic
    {
        id: '9',
        from: 'Birgunj',
        to: 'Kathmandu',
        departureTime: '06:00 AM',
        arrivalTime: '02:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    },
    {
        id: '10',
        from: 'Kathmandu',
        to: 'Birgunj',
        departureTime: '10:00 AM',
        arrivalTime: '06:00 PM',
        price: 850,
        vehicleType: 'Sumo',
        date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        seats: JSON.parse(JSON.stringify(initialSeats)),
        totalSeats: 9,
    }
];
const ridesCollection = collection(db, 'rides');

/**
 * Initializes the rides in Firestore if they don't exist.
 * This should be run once, but it's safe to call multiple times.
 */
async function seedDatabase() {
    for (const rideData of ridesDB) {
        const rideRef = doc(db, 'rides', rideData.id);
        const rideSnap = await getDoc(rideRef);
        if (!rideSnap.exists()) {
            await runTransaction(db, async (transaction) => {
                const rideDoc = await transaction.get(rideRef);
                if (!rideDoc.exists()) {
                    transaction.set(rideRef, rideData);
                }
            });
        }
    }
}
// Seed the database on startup
seedDatabase().catch(console.error);


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
    
    // Create a fresh copy to avoid in-memory data modification across requests.
    // In a real Firestore implementation, you'd query Firestore directly.
    // For this app, we'll keep rides in-memory but manage state in Firestore.
    let allRides: Ride[] = JSON.parse(JSON.stringify(ridesDB));
    
    // Query Firestore for the current state of all rides
    const ridesSnapshot = await getDocs(query(ridesCollection));
    const firestoreRides = new Map(ridesSnapshot.docs.map(doc => [doc.id, doc.data() as Ride]));

    // Update in-memory rides with Firestore state
    allRides = allRides.map(ride => {
        const firestoreRide = firestoreRides.get(ride.id);
        return firestoreRide ? { ...ride, seats: firestoreRide.seats } : ride;
    });

    
    // 1. Filter by route (from/to)
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

    // If a specific date is selected, filter by that date.
    if (filters.date) {
        finalRideList = allRides.filter(ride => ride.date === filters.date);
    } else {
        // If no date is selected, try to find rides for today first.
        const todayRides = allRides.filter(ride => ride.date === todayStr);
        const availableTodayRides = todayRides.filter(ride => {
            const departureDateTime = parse(ride.departureTime, 'hh:mm a', parseISO(`${ride.date}T00:00:00.000Z`));
            return departureDateTime > now;
        });

        if (availableTodayRides.length > 0) {
            // If there are available rides today, show them.
            finalRideList = availableTodayRides;
        } else {
            // Otherwise, show all rides for tomorrow.
            finalRideList = allRides.filter(ride => ride.date === tomorrowStr);
        }
    }

    // 3. Filter by time logic for the selected day if it is today
    if (filters.date === todayStr) {
         finalRideList = finalRideList.filter(ride => {
            const departureDateTime = parse(ride.departureTime, 'hh:mm a', parseISO(`${ride.date}T00:00:00.000Z`));
            return departureDateTime > now;
        });
    }


    // Sort the final results
    finalRideList.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        // If dates are same, sort by departure time
        const timeA = parse(a.departureTime, 'hh:mm a', new Date()).getTime();
        const timeB = parse(b.departureTime, 'hh:mm a', new Date()).getTime();
        return timeA - timeB;
    });

    return finalRideList;
};

export const getRideById = async (id: string): Promise<Ride | undefined> => {
    const rideRef = doc(db, 'rides', id);
    const rideSnap = await getDoc(rideRef);
    
    if (!rideSnap.exists()) {
        // Fallback to in-memory generation for dynamic future rides if not found in Firestore
        const baseRideId = id.split('-day')[0];
        const baseRide = ridesDB.find(r => r.id === baseRideId);
        if(!baseRide) return undefined;
        
        const dayIndexMatch = id.match(/-day(\d+)$/);
        const dayIndex = dayIndexMatch ? parseInt(dayIndexMatch[1], 10) : -1;
        
        if (dayIndex >= 0) {
            const newRide = JSON.parse(JSON.stringify(baseRide));
            newRide.id = id;
            newRide.date = format(addDays(new Date(), dayIndex), 'yyyy-MM-dd');
            // Before returning, ensure it's seeded in DB for future bookings
            await setDoc(rideRef, newRide);
            return newRide as Ride;
        }

        return undefined;
    }

    const ride = rideSnap.data() as Ride;

    // Add filtering logic to ensure ride is not in the past
    const now = getNepalTime();
    const rideDate = parseISO(ride.date);

    if (isToday(rideDate)) {
        const departureDateTime = parse(ride.departureTime, 'hh:mm a', rideDate);
        if (departureDateTime < now) {
            return undefined; // Ride has already departed
        }
    }

    return { id: rideSnap.id, ...ride };
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

export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime'>
): Promise<Booking> => {
    const rideRef = doc(db, 'rides', bookingData.rideId);
    const userRef = doc(db, 'users', bookingData.userId);

    let newBookingId: string;

    await runTransaction(db, async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
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

        // Update ride seats
        const newSeats = ride.seats.map(seat =>
            bookingData.seats.includes(seat.number)
                ? { ...seat, status: 'booked' }
                : seat
        );
        transaction.update(rideRef, { seats: newSeats });

        // Create new booking document
        const bookingWithTimestamp = {
            ...bookingData,
            bookingTime: Timestamp.now()
        };
        const newBookingRef = doc(collection(db, 'bookings'));
        transaction.set(newBookingRef, bookingWithTimestamp);
        newBookingId = newBookingRef.id;

        // Optionally, add booking reference to user document
        // This is commented out but is good practice for more complex apps
        // const userDoc = await transaction.get(userRef);
        // if (userDoc.exists()) {
        //     const bookings = userDoc.data().bookings || [];
        //     transaction.update(userRef, {
        //         bookings: [...bookings, { rideId: bookingData.rideId, seats: bookingData.seats }]
        //     });
        // }
    });

    const newBookingSnap = await getDoc(doc(db, 'bookings', newBookingId!));
    const newBookingData = newBookingSnap.data();

    return {
        id: newBookingSnap.id,
        ...newBookingData,
        bookingTime: (newBookingData!.bookingTime as Timestamp).toDate()
    } as Booking;
};

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
