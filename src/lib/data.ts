import type { Ride, Booking, User, Seat } from './types';
import { format } from 'date-fns';

const generateSeats = (totalSeats: number, bookedSeats: number[]): Seat[] => {
  return Array.from({ length: totalSeats }, (_, i) => {
    const seatNumber = i + 1;
    return {
      number: seatNumber,
      status: bookedSeats.includes(seatNumber) ? 'booked' : 'available',
    };
  });
};

// Mock data
let rides: Ride[] = [
  {
    id: 'BKT-AM1',
    from: 'Birgunj',
    to: 'Kathmandu',
    departureTime: '06:00 AM',
    arrivalTime: '02:00 PM',
    vehicleType: 'Sumo',
    totalSeats: 9,
    seats: generateSeats(9, [3, 8]),
    price: 850,
    date: format(new Date(), 'yyyy-MM-dd'),
  },
  {
    id: 'BKT-AM2',
    from: 'Birgunj',
    to: 'Kathmandu',
    departureTime: '10:00 AM',
    arrivalTime: '06:00 PM',
    vehicleType: 'Sumo',
    totalSeats: 9,
    seats: generateSeats(9, [1, 5]),
    price: 850,
    date: format(new Date(), 'yyyy-MM-dd'),
  },
  {
    id: 'KTM-AM1',
    from: 'Kathmandu',
    to: 'Birgunj',
    departureTime: '06:00 AM',
    arrivalTime: '02:00 PM',
    vehicleType: 'Sumo',
    totalSeats: 9,
    seats: generateSeats(9, [7]),
    price: 850,
    date: format(new Date(), 'yyyy-MM-dd'),
  },
    {
    id: 'KTM-AM2',
    from: 'Kathmandu',
    to: 'Birgunj',
    departureTime: '10:00 AM',
    arrivalTime: '04:00 PM',
    vehicleType: 'Sumo',
    totalSeats: 9,
    seats: generateSeats(9, []),
    price: 850,
    date: format(new Date(), 'yyyy-MM-dd'),
  },
];

let bookings: Booking[] = [];
let users: User[] = [];

// Simulate API calls
export const getRides = async (): Promise<Ride[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(rides);
    }, 500);
  });
};

export const getRideById = async (id: string): Promise<Ride | undefined> => {
  return new Promise((resolve) =>
    setTimeout(() => resolve(rides.find((r) => r.id === id)), 500)
  );
};

export const getBookings = async (): Promise<Booking[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(bookings), 500));
};

export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime'>
): Promise<Booking> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const ride = rides.find((r) => r.id === bookingData.rideId);
      if (!ride) {
        return reject(new Error('Ride not found'));
      }
      
      bookingData.seats.forEach(seatNumber => {
        const seat = ride.seats.find(s => s.number === seatNumber);
        if (seat?.status !== 'available') {
            return reject(new Error(`Seat ${seatNumber} is not available.`));
        }
      });

      const newBooking: Booking = {
        ...bookingData,
        id: `BOOK${String(bookings.length + 1).padStart(3, '0')}`,
        bookingTime: new Date(),
      };
      bookings.push(newBooking);
      
      // Update seat status
      bookingData.seats.forEach(seatNumber => {
        const seat = ride.seats.find(s => s.number === seatNumber);
        if (seat) {
            seat.status = 'booked';
        }
      });
      
      resolve(newBooking);
    }, 1000);
  });
};
