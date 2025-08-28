

'use server';

import { z } from 'zod';
import { createBooking, updateRideSeats, getAllCollectionDocuments, deleteAllDocuments, getAllUsers, getPaymentDetails, setPaymentQrUrl, deleteUserFromFirestore, updateFooterSettings as updateFooterSettingsInDb, updateUserProfileInDb, getRidesForDate, createOrUpdateRideInDb, deleteRideFromDb, createOrUpdateRideTemplateInDb, deleteRideTemplateFromDb } from './data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { storage, db, auth } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, collection } from 'firebase/firestore';
import type { User, FooterSettings, Ride, RideTemplate } from './types';
import { format } from 'date-fns';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';

const commonBookingFields = {
  rideId: z.string(),
  userId: z.string({ required_error: 'User must be logged in to book.'}),
  seats: z.preprocess((val) => JSON.parse(val as string), z.array(z.number()).min(1, 'Please select at least one seat.')),
  passengerName: z.string().min(2, 'Passenger name must be at least 2 characters.'),
  passengerPhone: z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number.'),
  paymentMethod: z.enum(['esewa', 'khalti', 'imepay']),
  userRole: z.enum(['user', 'admin']),
};

const UserBookingFormSchema = z.object({
    ...commonBookingFields,
    paymentScreenshot: z
        .instanceof(File, { message: 'Payment screenshot is required.' })
        .refine((file) => file.size > 0, 'Payment screenshot cannot be empty.'),
});

const AdminBookingFormSchema = z.object({
    ...commonBookingFields,
    transactionId: z.string().min(1, 'Transaction ID is required for admin bookings.'),
});


export type BookingState = {
  errors?: {
    rideId?: string[];
    userId?: string[];
    seats?: string[];
    passengerName?: string[];
    passengerPhone?: string[];
    paymentMethod?: string[];
    paymentScreenshot?: string[];
    transactionId?: string[];
    server?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function processBooking(prevState: BookingState | null, formData: FormData): Promise<BookingState> {
  const userRole = formData.get('userRole');

  const rawData = Object.fromEntries(formData.entries());

  const validatedFields = userRole === 'admin'
    ? AdminBookingFormSchema.safeParse(rawData)
    : UserBookingFormSchema.safeParse(rawData);


  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Booking failed. Please check the form for errors.',
      success: false,
    };
  }
  
  const { rideId, seats, passengerName, passengerPhone, userId, paymentMethod, userRole: role } = validatedFields.data;

  try {
     const bookingPayload: any = {
        rideId,
        seats,
        passengerName,
        passengerPhone,
        userId,
        paymentMethod,
        status: role === 'admin' ? 'confirmed' : 'pending-payment',
     };

     if(role === 'admin') {
         bookingPayload.transactionId = validatedFields.data.transactionId;
     }

    const createdBooking = await createBooking(bookingPayload);
    const bookingId = createdBooking.id;

    if (role === 'user') {
        const screenshotFile = formData.get('paymentScreenshot') as File;
        if (!screenshotFile || screenshotFile.size === 0) {
             return { message: 'Payment screenshot is missing or empty.', success: false, errors: { server: ["Payment screenshot is missing or empty."] } };
        }
        
        const storagePath = `payment_screenshots/${bookingId}.${screenshotFile.type.split('/')[1] || 'jpg'}`;
        const storageRef = ref(storage, storagePath);

        const arrayBuffer = await screenshotFile.arrayBuffer();
        await uploadBytes(storageRef, arrayBuffer, { contentType: screenshotFile.type });
        const downloadURL = await getDownloadURL(storageRef);

        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { paymentScreenshotUrl: downloadURL });
    }
    
  } catch (error: any) {
    console.error("Booking Error:", error);
    let errorMessage = "An unknown error occurred during booking.";
    
    if (error.code && typeof error.code === 'string' && error.code.startsWith('storage/')) {
        switch (error.code) {
            case 'storage/unauthorized':
                errorMessage = "Permission denied. Please ensure you are logged in and that Firebase Storage security rules allow uploads for authenticated users.";
                break;
            case 'storage/unknown':
                 errorMessage = "An unknown storage error occurred. This is often due to permission issues. Please check your Firebase Storage security rules.";
                 break;
            default:
                errorMessage = `File upload failed: ${error.message} (${error.code})`;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return {
      errors: { server: [errorMessage] },
      message: `Booking failed: ${errorMessage}`,
      success: false,
    };
  }

  revalidatePath(`/booking/${rideId}`);
  if(role === 'admin') {
      revalidatePath('/admin');
  }
  
  const message = role === 'admin' 
    ? `Booking successful! Seat(s) ${seats.join(', ')} have been confirmed.`
    : `Booking successful! Your request for seat(s) ${seats.join(', ')} is pending confirmation.`;
  
  return { message, success: true };
}


export async function updateBookingStatus(
    bookingId: string,
    rideId: string,
    seats: number[],
    newStatus: 'confirmed' | 'cancelled'
): Promise<{ success: boolean; message: string }> {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);

        if (newStatus === 'confirmed') {
            await updateRideSeats(rideId, seats, 'booked');
        } else if (newStatus === 'cancelled') {
            await updateRideSeats(rideId, seats, 'available');
        }

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

export async function clearAllBookings(): Promise<{ success: boolean; message: string }> {
    try {
        const bookingsCollection = collection(db, 'bookings');
        const ridesCollection = collection(db, 'rides');

        const bookingsToDelete = await getAllCollectionDocuments(bookingsCollection);
        await deleteAllDocuments(bookingsToDelete);
        
        const ridesToDelete = await getAllCollectionDocuments(ridesCollection);
        await deleteAllDocuments(ridesToDelete);
        
        revalidatePath('/admin');
        revalidatePath('/my-bookings');
        revalidatePath('/');

        return { success: true, message: 'All bookings and ride data have been cleared.' };
    } catch (error) {
        console.error('Error clearing all bookings:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: `Failed to clear bookings: ${errorMessage}` };
    }
}

export async function updateUserRole(userId: string, newRole: 'user' | 'admin'): Promise<{ success: boolean, message: string }> {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { role: newRole });
        
        revalidatePath('/admin/users');

        return { success: true, message: `User role has been updated to ${newRole}.` };
    } catch (error) {
        console.error('Error updating user role:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: `Failed to update user role: ${errorMessage}` };
    }
}

export async function deleteUser(userId: string): Promise<{ success: boolean, message: string }> {
    try {
        await deleteUserFromFirestore(userId);
        revalidatePath('/admin/users');
        return { success: true, message: 'User data has been deleted from the application.' };
    } catch (error) {
         console.error('Error deleting user:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message: `Failed to delete user: ${errorMessage}` };
    }
}


const QrCodeFormSchema = z.object({
    paymentMethod: z.enum(['esewa', 'khalti', 'imepay']),
    qrCode: z
        .instanceof(File)
        .refine((file) => file.size > 0, "QR code image is required.")
        .refine((file) => file.size < 4 * 1024 * 1024, "Image must be less than 4MB.")
        .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type), "Only .jpg, .png, and .webp formats are supported."),
});

export async function uploadPaymentQr(prevState: any, formData: FormData): Promise<{success: boolean, message: string}> {
    const validatedFields = QrCodeFormSchema.safeParse({
        paymentMethod: formData.get('paymentMethod'),
        qrCode: formData.get('qrCode'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: validatedFields.error.flatten().fieldErrors.qrCode?.[0] ?? "Invalid input."
        };
    }
    
    const { paymentMethod, qrCode } = validatedFields.data;
    const storagePath = `payment_qrs/${paymentMethod}.${qrCode.type.split('/')[1]}`;
    const storageRef = ref(storage, storagePath);

    try {
        const arrayBuffer = await qrCode.arrayBuffer();
        await uploadBytes(storageRef, arrayBuffer, { contentType: qrCode.type });
        const downloadURL = await getDownloadURL(storageRef);

        await setPaymentQrUrl(paymentMethod, downloadURL);
        
        revalidatePath('/admin/settings');
        revalidatePath('/booking/*');

        return { success: true, message: `${paymentMethod.toUpperCase()} QR code updated successfully.` };
    } catch (error) {
        console.error("QR Upload Error:", error);
        const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
        return { success: false, message: `Upload failed: ${errorMessage}` };
    }
}


const FooterSettingsSchema = z.object({
    customerServicePhone: z.string().min(1, 'Customer service phone is required.'),
    whatsappNumber: z.string().min(1, 'WhatsApp number is required.'),
    facebookUrl: z.string().url('Please enter a valid URL for Facebook.'),
    instagramUrl: z.string().url('Please enter a valid URL for Instagram.'),
});

export async function updateFooterSettings(prevState: any, formData: FormData): Promise<{ success: boolean; message: string, errors?: any }> {
    const validatedFields = FooterSettingsSchema.safeParse({
        customerServicePhone: formData.get('customerServicePhone'),
        whatsappNumber: formData.get('whatsappNumber'),
        facebookUrl: formData.get('facebookUrl'),
        instagramUrl: formData.get('instagramUrl'),
    });
    
    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed. Please check the fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        await updateFooterSettingsInDb(validatedFields.data);
        revalidatePath('/');
        return { success: true, message: 'Footer settings updated successfully.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, message: `Failed to update settings: ${errorMessage}` };
    }
}

const UpdateProfileSchema = z.object({
    userId: z.string(),
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    phoneNumber: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number.' }),
    dob: z.string().optional(),
});

type UpdateProfileState = {
    success: boolean;
    message: string;
    errors?: any;
    user?: Partial<User> | null;
}

export async function updateUserProfile(prevState: any, formData: FormData): Promise<UpdateProfileState> {
    const validatedFields = UpdateProfileSchema.safeParse({
        userId: formData.get('userId'),
        name: formData.get('name'),
        phoneNumber: formData.get('phoneNumber'),
        dob: formData.get('dob') || undefined,
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { userId, ...profileData } = validatedFields.data;

    try {
        const currentUser = auth.currentUser;
        if (!currentUser || currentUser.uid !== userId) {
            throw new Error("Authentication error.");
        }

        await updateUserProfileInDb(userId, profileData);

        if (currentUser.displayName !== profileData.name) {
            await updateProfile(currentUser, { displayName: profileData.name });
        }

        revalidatePath('/profile');
        revalidatePath('/header'); // to update name in header
        return { success: true, message: 'Profile updated successfully!', user: profileData };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, message: `Failed to update profile: ${errorMessage}` };
    }
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
});

export async function changeUserPassword(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any }> {
    if (!auth.currentUser) {
        return { success: false, message: 'You must be logged in to change your password.' };
    }
    
    const validatedFields = ChangePasswordSchema.safeParse({
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
    });

     if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { currentPassword, newPassword } = validatedFields.data;
    const user = auth.currentUser;

    try {
        if (user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
        } else {
            throw new Error("User email is not available for re-authentication.");
        }
        
        await updatePassword(user, newPassword);

        return { success: true, message: 'Password updated successfully.' };

    } catch (error: any) {
        console.error("Password Change Error:", error);
        let message = 'An unexpected error occurred.';
        if (error.code === 'auth/wrong-password') {
            return {
                success: false,
                message: 'Incorrect current password.',
                errors: { currentPassword: ['The password you entered is incorrect.'] }
            };
        }
        if(error.code === 'auth/too-many-requests') {
             message = 'Too many attempts. Please try again later.';
        }
        return { success: false, message: message };
    }
}

export async function getRidesForDateAction(date: string): Promise<{ success: boolean; rides?: Ride[]; message?: string }> {
    try {
        let rides = await getRidesForDate(date);
        return { success: true, rides };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Failed to get rides for ${date}:`, message);
        return { success: false, message: `Failed to load schedule: ${message}` };
    }
}

const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
const RideSchema = z.object({
    rideId: z.string().optional(),
    from: z.enum(['Birgunj', 'Kathmandu']),
    to: z.enum(['Birgunj', 'Kathmandu']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format.'),
    departureTime: z.string().regex(timeRegex, 'Invalid time format. Use hh:mm AM/PM.'),
    arrivalTime: z.string().regex(timeRegex, 'Invalid time format. Use hh:mm AM/PM.'),
    vehicleType: z.enum(['Sumo', 'EV']),
    vehicleNumber: z.string().min(1, 'Vehicle number is required.'),
    price: z.coerce.number().int().positive('Price must be a positive number.'),
    totalSeats: z.coerce.number().int().positive(),
    seats: z.string().optional(), // JSON string of seats, only present for edits
});

export async function createOrUpdateRide(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; ride?: Ride }> {
    const validatedFields = RideSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const savedRide = await createOrUpdateRideInDb(validatedFields.data);
        revalidatePath('/admin/schedule');
        revalidatePath('/');
        return { 
            success: true, 
            message: validatedFields.data.rideId ? 'Ride updated successfully.' : 'Ride created successfully.',
            ride: savedRide
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, message: `Failed to save ride: ${errorMessage}` };
    }
}

export async function deleteRide(rideId: string): Promise<{ success: boolean, message: string }> {
    try {
        await deleteRideFromDb(rideId);
        revalidatePath('/admin/schedule');
        revalidatePath('/');
        return { success: true, message: 'Ride deleted successfully.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, message: `Failed to delete ride: ${errorMessage}` };
    }
}

const ProfilePictureSchema = z.object({
  userId: z.string(),
  photo: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Please select an image file.")
    .refine((file) => file.size < 2 * 1024 * 1024, "Image must be less than 2MB.")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Only .jpg, .png, and .webp formats are supported."
    ),
});

export async function updateProfilePicture(prevState: any, formData: FormData): Promise<UpdateProfileState> {
  const validatedFields = ProfilePictureSchema.safeParse({
    userId: formData.get("userId"),
    photo: formData.get("photo"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { userId, photo } = validatedFields.data;
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    return { success: false, message: "Authentication error." };
  }

  const storagePath = `profile_pictures/${userId}.${photo.type.split('/')[1] || 'jpg'}`;
  const storageRef = ref(storage, storagePath);

  try {
    const arrayBuffer = await photo.arrayBuffer();
    await uploadBytes(storageRef, arrayBuffer, { contentType: photo.type });
    const downloadURL = await getDownloadURL(storageRef);

    // Update both Firestore and Firebase Auth profile
    await updateDoc(doc(db, 'users', userId), { photoURL: downloadURL });
    await updateProfile(currentUser, { photoURL: downloadURL });

    revalidatePath('/profile');
    revalidatePath('/header');

    return { success: true, message: "Profile picture updated!", user: { photoURL: downloadURL } };
  } catch (error) {
    console.error("Profile picture upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Upload failed: ${errorMessage}` };
  }
}

const RideTemplateSchema = RideSchema.omit({ rideId: true, date: true, seats: true });

export async function createOrUpdateRideTemplate(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; errors?: any; rideTemplate?: RideTemplate }> {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = RideTemplateSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    try {
        const savedTemplate = await createOrUpdateRideTemplateInDb({
            ...validatedFields.data,
            id: rawData.id as string | undefined,
        });
        revalidatePath('/admin/vehicles');
        return { 
            success: true, 
            message: rawData.id ? 'Vehicle template updated successfully.' : 'Vehicle template created successfully.',
            rideTemplate: savedTemplate,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, message: `Failed to save vehicle template: ${errorMessage}` };
    }
}

export async function deleteRideTemplate(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteRideTemplateFromDb(id);
    revalidatePath('/admin/vehicles');
    return { success: true, message: 'Vehicle template deleted successfully.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: `Failed to delete vehicle template: ${errorMessage}` };
  }
}
