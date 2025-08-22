'use server';

import { z } from 'zod';
import { createBooking } from './data';
import type { User } from './types';

const BookingSchema = z.object({
  rideId: z.string(),
  seats: z.array(z.number()).min(1, 'Please select at least one seat.'),
  passengerName: z.string().min(2, 'Passenger name is required.'),
  passengerPhone: z.string().min(10, 'A valid phone number is required.'),
  user: z.string().nullable(), // JSON string of user object or null
});

export type BookingState = {
  errors?: {
    rideId?: string[];
    seats?: string[];
    passengerName?: string[];
    passengerPhone?: string[];
    user?: string[];
    server?: string[];
  };
  message?: string | null;
};

export async function processBooking(prevState: BookingState, formData: FormData): Promise<BookingState> {
  const validatedFields = BookingSchema.safeParse({
    rideId: formData.get('rideId'),
    seats: JSON.parse(formData.get('seats') as string),
    passengerName: formData.get('passengerName'),
    passengerPhone: formData.get('passengerPhone'),
    user: formData.get('user'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Booking failed. Please check the fields.',
    };
  }
  
  const { rideId, seats, passengerName, passengerPhone, user: userJson } = validatedFields.data;
  const user: User | null = userJson ? JSON.parse(userJson) : null;

  try {
    await createBooking({
      rideId,
      seats,
      passengerName,
      passengerPhone,
      userId: user?.id ?? null,
      userName: user?.name ?? passengerName,
    });
    return { message: 'Booking successful! Your seat is confirmed.' };
  } catch (error) {
    return {
      errors: { server: [(error as Error).message] },
      message: 'Booking failed. Please try again.',
    };
  }
}
