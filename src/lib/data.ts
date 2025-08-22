

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, startOfDay, parse, endOfDay, isToday, parseISO, addDays } from 'date-fns';

const initialSeats: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

// Hardcoded in-memory database for rides
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
    let allRides = JSON.parse(JSON.stringify(ridesDB));
    
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
    // We add more rides to the DB to ensure upcoming rides are available
    const allRides: Ride[] = [];
    for (let i = 0; i <= 7; i++) { // Generate for today + next 7 days
        ridesDB.forEach(ride => {
            // The original ride object in ridesDB represents a template for a certain time/route
            // We create a new ride instance for each day
            const dailyRide = JSON.parse(JSON.stringify(ride));
            // Important: Create a unique ID for each day's ride
            dailyRide.id = i === 0 && (dailyRide.id === '1' || dailyRide.id === '2' || dailyRide.id === '3' || dailyRide.id === '4') ? dailyRide.id : `${ride.id}-day${i}`;
            dailyRide.date = format(addDays(new Date(), i), 'yyyy-MM-dd');
            allRides.push(dailyRide);
        });
    }
    const ride = allRides.find(ride => ride.id === id);

    if (!ride) {
        return undefined;
    }

    // Add filtering logic to ensure ride is not in the past
    const now = getNepalTime();
    const rideDate = parseISO(ride.date);

    if (isToday(rideDate)) {
        const departureDateTime = parse(ride.departureTime, 'hh:mm a', rideDate);
        if (departureDateTime < now) {
            return undefined; // Ride has already departed
        }
    }

    return ride;
};

export const getBookings = async (): Promise<Booking[]> => {
    // This would now need to fetch from an in-memory booking list or be adapted.
    // For now, returning an empty array to avoid breaking the Admin page.
    return [];
};

export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime'>
): Promise<Booking> => {
    // This function will now update the in-memory ridesDB.
    // Note: These changes are not persistent and will be lost on server restart.
    const ride = ridesDB.find(r => r.id === bookingData.rideId);

    if (!ride) {
        // Since we now generate future rides dynamically for getRideById,
        // we might not have it in the base ridesDB. Let's check a generated future ride list.
         const allRides: Ride[] = [];
         for (let i = 0; i <= 7; i++) {
            ridesDB.forEach(baseRide => {
                const futureRide = JSON.parse(JSON.stringify(baseRide));
                futureRide.id = i === 0 ? baseRide.id : `${baseRide.id}-day${i}`;
                futureRide.date = format(addDays(new Date(), i), 'yyyy-MM-dd');
                allRides.push(futureRide);
            });
        }
        const futureRide = allRides.find(r => r.id === bookingData.rideId);
        if(!futureRide) {
            throw new Error("Ride not found!");
        }
         // This is a temporary booking on a dynamically created ride.
        // It won't persist, but it will simulate the booking flow.
    }


    const rideToUpdate = ridesDB.find(r => r.id === bookingData.rideId);

    if (rideToUpdate) {
        // Check seat availability
        bookingData.seats.forEach(seatNumber => {
            const seat = rideToUpdate.seats.find(s => s.number === seatNumber);
            if (!seat || seat.status !== 'available') {
                throw new Error(`Seat ${seatNumber} is no longer available.`);
            }
        });

        // Update seats
        rideToUpdate.seats = rideToUpdate.seats.map(seat => 
            bookingData.seats.includes(seat.number) 
                ? { ...seat, status: 'booked' } 
                : seat
        );
    }
    
    // In a real app, you would also save the booking record.
    // Here we'll just return a success-like object.
    const newBooking: Booking = {
        ...bookingData,
        id: `temp-booking-${Date.now()}`,
        bookingTime: new Date(),
    };

    return newBooking;
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
}
