
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { Ride, Booking, User, Seat } from './types';
import { format, startOfDay, parse, endOfDay, isToday, parseISO } from 'date-fns';

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
        date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
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
        date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
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
        date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
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
        date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
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
    
    // 1. Filter by route (from/to) first
    let filteredByRoute = [...ridesDB];
    if (filters.from && filters.from !== 'all') {
        filteredByRoute = filteredByRoute.filter(ride => ride.from === filters.from);
    }
    if (filters.to && filters.to !== 'all') {
        filteredByRoute = filteredByRoute.filter(ride => ride.to === filters.to);
    }
    
    const now = getNepalTime();
    const todayStr = format(now, 'yyyy-MM-dd');

    // 2. Filter by date and time logic
    let finalRideList = filteredByRoute.filter(ride => {
        const rideDate = parseISO(ride.date);
        
        // If a specific date is selected in the filter
        if (filters.date) {
            // Show only rides for that date
            return ride.date === filters.date;
        }

        // --- If no specific date is selected (default view) ---

        // Exclude rides from dates that are completely in the past
        if (ride.date < todayStr) {
            return false;
        }

        // For rides scheduled for today, check if departure time has passed
        if (ride.date === todayStr) {
            const departureDateTime = parse(ride.departureTime, 'hh:mm a', rideDate);
            // Only include the ride if its departure time is in the future
            if (departureDateTime < now) {
                return false;
            }
        }
        
        // Include all future rides and valid today's rides
        return true;
    });


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
    return ridesDB.find(ride => ride.id === id);
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
        throw new Error("Ride not found!");
    }

    // Check seat availability
    bookingData.seats.forEach(seatNumber => {
        const seat = ride.seats.find(s => s.number === seatNumber);
        if (!seat || seat.status !== 'available') {
            throw new Error(`Seat ${seatNumber} is no longer available.`);
        }
    });

    // Update seats
    ride.seats = ride.seats.map(seat => 
        bookingData.seats.includes(seat.number) 
            ? { ...seat, status: 'booked' } 
            : seat
    );
    
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
