
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
     // Add a ride for tomorrow for testing
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


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    let rideList = [...ridesDB];

    if (filters.from && filters.from !== 'all') {
        rideList = rideList.filter(ride => ride.from === filters.from);
    }
    if (filters.to && filters.to !== 'all') {
        rideList = rideList.filter(ride => ride.to === filters.to);
    }
    
    const now = new Date();
    
    // Filter logic
    let finalRideList = rideList.filter(ride => {
        const rideDate = parseISO(ride.date);
        
        // If a date is specified in the filter, only show rides for that date
        if (filters.date) {
            return ride.date === filters.date;
        }

        // If no date is specified, show rides for today and future dates
        const rideDateStr = format(rideDate, 'yyyy-MM-dd');
        const todayStr = format(now, 'yyyy-MM-dd');
        
        // Exclude past dates
        if (rideDateStr < todayStr) {
            return false;
        }

        // For rides scheduled today, check if departure time has passed
        if (rideDateStr === todayStr) {
            const departureDateTime = parse(ride.departureTime, 'hh:mm a', rideDate);
            if (departureDateTime < now) {
                return false;
            }
        }

        return true;
    });


    // Sort the results
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
