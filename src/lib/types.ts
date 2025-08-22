export type Ride = {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  vehicleType: 'Scorpio' | 'Sumo' | 'Hiace';
  totalSeats: number;
  bookedSeats: number[]; // Array of seat numbers that are booked
  price: number;
};

export type Booking = {
  id: string;
  rideId: string;
  userId: string | null;
  userName: string;
  seats: number[];
  bookingTime: Date;
  passengerName: string;
  passengerPhone: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
};
