export type SeatStatus = 'available' | 'booked' | 'locked';

export type Seat = {
  number: number;
  status: SeatStatus;
};

export type Ride = {
  id: string;
  from: 'Birgunj' | 'Kathmandu';
  to: 'Birgunj' | 'Kathmandu';
  departureTime: string; // e.g., "06:00 AM"
  arrivalTime: string; // e.g., "02:00 PM"
  vehicleType: 'Sumo';
  totalSeats: 9;
  seats: Seat[];
  price: number;
  date: string; // YYYY-MM-DD
};

export type Booking = {
  id: string;
  rideId: string;
  userId: string;
  seats: number[]; // array of seat numbers
  bookingTime: Date;
  passengerName: string;
  passengerPhone: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  bookings?: Pick<Booking, 'rideId' | 'seats'>[];
};
