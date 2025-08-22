
'use server';

import { z } from 'zod';
import { createBooking, updateRideSeats } from './data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { storage, db } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const BookingFormSchema = z.object({
  rideId: z.string(),
  userId: z.string({ required_error: 'User must be logged in to book.'}),
  seats: z.preprocess((val) => JSON.parse(val as string), z.array(z.number()).min(1, 'Please select at least one seat.')),
  passengerName: z.string().min(2, 'Passenger name must be at least 2 characters.'),
  passengerPhone: z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number.'),
  paymentMethod: z.enum(['esewa', 'khalti', 'imepay']),
  transactionId: z.string().optional(),
  paymentScreenshot: z.instanceof(File).refine(file => file.size > 0, 'Payment screenshot is required.'),
});

export type BookingState = {
  errors?: {
    rideId?: string[];
    userId?: string[];
    seats?: string[];
    passengerName?: string[];
    passengerPhone?: string[];
    paymentMethod?: string[];
    transactionId?: string[];
    paymentScreenshot?: string[];
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
    paymentMethod: formData.get('paymentMethod'),
    transactionId: formData.get('transactionId'),
    paymentScreenshot: formData.get('paymentScreenshot'),
  });

  if (!validatedFields.success) {
    console.log(validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Booking failed. Please check the form for errors.',
    };
  }
  
  const { rideId, seats, passengerName, passengerPhone, userId, paymentMethod, transactionId, paymentScreenshot } = validatedFields.data;

  let paymentScreenshotUrl = '';

  try {
     // 1. Upload the image to Firebase Storage
    const storageRef = ref(storage, `payment_screenshots/${userId}_${Date.now()}_${paymentScreenshot.name}`);
    await uploadBytes(storageRef, paymentScreenshot);
    paymentScreenshotUrl = await getDownloadURL(storageRef);

    // 2. Create the booking in Firestore
    await createBooking({
      rideId,
      seats,
      passengerName,
      passengerPhone,
      userId,
      status: 'pending-payment',
      paymentMethod,
      transactionId,
      paymentScreenshotUrl,
    });
    
  } catch (error) {
    console.error("Booking Error:", error);
    const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
    
    // Check for storage permission errors
    if (errorMessage.includes('storage/unauthorized')) {
         return {
            errors: { server: ["You don't have permission to upload files. This might be because you are on the free Firebase plan. Please upgrade to the 'Blaze' plan to enable Cloud Storage."] },
            message: 'File upload failed due to a permissions error.',
        };
    }

    return {
      errors: { server: [errorMessage] },
      message: 'Booking failed due to a server error.',
    };
  }

  // Revalidate the booking page to show updated seat status
  revalidatePath(`/booking/${rideId}`);
  // Don't redirect here, let the client-side handle it after showing a toast.
  return { message: `Booking successful! Your request for seat(s) ${seats.join(', ')} is pending confirmation.` };
}


export async function updateBookingStatus(
    bookingId: string,
    rideId: string,
    seats: number[],
    newStatus: 'confirmed' | 'cancelled'
): Promise<{ success: boolean; message: string }> {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);

        // If confirming, update the seats on the ride to 'booked'
        if (newStatus === 'confirmed') {
            await updateRideSeats(rideId, seats, 'booked');
        } else if (newStatus === 'cancelled') {
             // If cancelling, make the seats available again
            await updateRideSeats(rideId, seats, 'available');
        }

        // Update the booking status
        await updateDoc(bookingRef, { status: newStatus });

        revalidatePath('/admin');
        revalidatePath('/my-bookings');

        return { success: true, message: `Booking has been ${newStatus}.` };
    } catch (error) {
        console.error('Error updating booking status:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: errorMessage };
    }
}
