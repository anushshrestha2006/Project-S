'use server';

import { z } from 'zod';
import { createBooking } from './data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const BookingFormSchema = z.object({
  rideId: z.string(),
  userId: z.string({ required_error: 'User must be logged in to book.'}),
  seats: z.preprocess((val) => JSON.parse(val as string), z.array(z.number()).min(1, 'Please select at least one seat.')),
  passengerName: z.string().min(2, 'Passenger name must be at least 2 characters.'),
  passengerPhone: z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number.'),
});

export type BookingState = {
  errors?: {
    rideId?: string[];
    userId?: string[];
    seats?: string[];
    passengerName?: string[];
    passengerPhone?: string[];
    server?: string[];
  };
  message?: string | null;
} | null;

export async function processBooking(prevState: BookingState, formData: FormData): Promise<BookingState> {
  const validatedFields = BookingFormSchema.safeParse({
    rideId: formData.get('rideId'),
    userId: formData.get('userId'),
    seats: formData.get('seats'),
    passengerName: formData.get('passengerName'),
    passengerPhone: formData.get('passengerPhone'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Booking failed. Please check the form for errors.',
    };
  }
  
  const { rideId, seats, passengerName, passengerPhone, userId } = validatedFields.data;

  try {
    await createBooking({
      rideId,
      seats,
      passengerName,
      passengerPhone,
      userId,
    });
    
  } catch (error) {
    return {
      errors: { server: [(error as Error).message] },
      message: 'Booking failed due to a server error.',
    };
  }

  // Revalidate the booking page to show updated seat status
  revalidatePath(`/booking/${rideId}`);
  // Don't redirect here, let the client-side handle it after showing a toast.
  return { message: `Booking successful! Seat(s) ${seats.join(', ')} confirmed.` };
}
