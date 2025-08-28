

import type { Timestamp } from 'firebase/firestore';

export type SeatStatus = 'available' | 'booked' | 'locked';

export type Seat = {
  number: number;
  status: SeatStatus;
};

export type RideTemplate = {
  id: string;
  from: 'Birgunj' | 'Kathmandu';
  to: 'Birgunj' | 'Kathmandu';
  departureTime: string;
  arrivalTime: string;
  vehicleType: 'Sumo' | 'EV';
  vehicleNumber: string;
  price: number;
  totalSeats: number;
  initialSeats: Seat[];
  ownerName: string;
  ownerEmail: string;
}

export type Ride = {
  id: string;
  from: 'Birgunj' | 'Kathmandu';
  to: 'Birgunj' | 'Kathmandu';
  departureTime: string; // e.g., "06:00 AM"
  arrivalTime: string; // e.g., "02:00 PM"
  vehicleType: 'Sumo' | 'EV';
  vehicleNumber: string;
  totalSeats: number;
  seats: Seat[];
  price: number;
  date: string; // YYYY-MM-DD
  ownerName: string;
  ownerEmail: string;
};

export type BookingStatus = 'confirmed' | 'pending-payment' | 'cancelled';

export type Booking = {
  id: string;
  ticketId: string;
  rideId: string;
  userId: string;
  seats: number[]; // array of seat numbers
  bookingTime: Date | Timestamp | string;
  passengerName: string;
  passengerPhone: string;
  rideDetails?: Ride;
  status: BookingStatus;
  paymentMethod?: 'esewa' | 'khalti' | 'imepay';
  paymentScreenshotUrl?: string;
  transactionId?: string; // For admin bookings
};

export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  bookings?: Pick<Booking, 'rideId' | 'seats'>[];
  photoURL?: string;
  dob?: string; // YYYY-MM-DD
};

export type PaymentMethod = 'esewa' | 'khalti' | 'imepay';

export type PaymentDetails = {
    [key in PaymentMethod]: {
        qrUrl: string;
    }
};

export interface FooterSettings {
  customerServicePhone: string;
  whatsappNumber: string;
  facebookUrl: string;
  instagramUrl: string;
}
