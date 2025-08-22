import type { Ride, Booking, User } from './types';
import { format } from 'date-fns';

// Mock data
let rides: Ride[] = [
  {
    id: 'BKT1',
    from: 'Birgunj',
    to: 'Kathmandu',
    departureTime: '07:00 AM',
    arrivalTime: '03:00 PM',
    vehicleType: 'Sumo',
    totalSeats: 12,
    bookedSeats: [3, 4, 8],
    price: 800,
    date: '2024-08-01',
  },
  {
    id: 'KTM1',
    from: 'Kathmandu',
    to: 'Birgunj',
    departureTime: '08:00 AM',
    arrivalTime: '04:00 PM',
    vehicleType: 'Hiace',
    totalSeats: 15,
    bookedSeats: [1, 2, 5, 10, 11],
    price: 900,
    date: '2024-08-01',
  },
  {
    id: 'BKT2',
    from: 'Birgunj',
    to: 'Kathmandu',
    departureTime: '09:00 PM',
    arrivalTime: '05:00 AM',
    vehicleType: 'Scorpio',
    totalSeats: 7,
    bookedSeats: [1, 5],
    price: 1200,
    date: '2024-08-02',
  },
  {
    id: 'KTM2',
    from: 'Kathmandu',
    to: 'Birgunj',
    departureTime: '08:30 PM',
    arrivalTime: '04:30 AM',
    vehicleType: 'Sumo',
    totalSeats: 12,
    bookedSeats: [2, 6, 7, 12],
    price: 850,
    date: '2024-08-02',
  },
   {
    id: 'BKT3',
    from: 'Birgunj',
    to: 'Kathmandu',
    departureTime: '07:30 AM',
    arrivalTime: '03:30 PM',
    vehicleType: 'Sumo',
    totalSeats: 12,
    bookedSeats: [],
    price: 800,
    date: '2024-08-02',
  },
];

let bookings: Booking[] = [
  {
    id: 'BOOK001',
    rideId: 'BKT1',
    userId: 'user1',
    userName: 'John Doe',
    seats: [3, 4],
    bookingTime: new Date('2023-10-26T10:00:00Z'),
    passengerName: 'John Doe',
    passengerPhone: '9800000001',
  },
  {
    id: 'BOOK002',
    rideId: 'KTM1',
    userId: 'user2',
    userName: 'Jane Smith',
    seats: [5],
    bookingTime: new Date('2023-10-26T11:30:00Z'),
    passengerName: 'Jane Smith',
    passengerPhone: '9800000002',
  },
];

let users: User[] = [
    { id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'user'},
    { id: 'adminuser', name: 'Admin', email: 'admin@sumosewa.com', role: 'admin'},
]

// Simulate API calls
export const getRides = async (filters?: { from?: string; to?: string; date?: string }): Promise<Ride[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let filteredRides = rides;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Filter for upcoming rides first
            filteredRides = rides.filter(ride => new Date(ride.date) >= today);

            if (filters && (filters.from || filters.to || filters.date)) {
                 filteredRides = filteredRides.filter(ride => {
                    const fromMatch = !filters.from || ride.from === filters.from;
                    const toMatch = !filters.to || ride.to === filters.to;
                    const dateMatch = !filters.date || ride.date === filters.date;
                    return fromMatch && toMatch && dateMatch;
                });
            }
           
            // Sort by date
            filteredRides.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            resolve(filteredRides);
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
      
      const isAlreadyBooked = bookingData.seats.some(seat => ride.bookedSeats.includes(seat));
      if (isAlreadyBooked) {
          return reject(new Error('One or more selected seats are already booked.'));
      }

      const newBooking: Booking = {
        ...bookingData,
        id: `BOOK${String(bookings.length + 1).padStart(3, '0')}`,
        bookingTime: new Date(),
      };
      bookings.push(newBooking);
      
      // Update booked seats for the ride
      ride.bookedSeats.push(...bookingData.seats);
      
      resolve(newBooking);
    }, 1000);
  });
};
