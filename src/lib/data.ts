

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch, setDoc, DocumentData, QuerySnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Ride, Booking, User, Seat, SeatStatus, PaymentDetails, FooterSettings, RideTemplate } from './types';
import { format, startOfDay, parse, endOfDay, isToday, parseISO, addDays, isPast } from 'date-fns';

export const initialSeatsSumo: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

export const initialSeatsEV: Seat[] = Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

const RIDE_TEMPLATES_FALLBACK: Omit<RideTemplate, 'id'>[] = [
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 1234', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo, ownerName: 'Anush Travels', ownerEmail: 'anushshrestha8683@gmail.com' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 5678', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo, ownerName: 'Anush Travels', ownerEmail: 'anushshrestha8683@gmail.com' },
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 9012', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo, ownerName: 'Acme Transport', ownerEmail: 'owner2@example.com' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 3456', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo, ownerName: 'Acme Transport', ownerEmail: 'owner2@example.com' },
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 1111', price: 850, totalSeats: 10, initialSeats: initialSeatsEV, ownerName: 'Anush Travels', ownerEmail: 'anushshrestha8683@gmail.com' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 2222', price: 850, totalSeats: 10, initialSeats: initialSeatsEV, ownerName: 'Anush Travels', ownerEmail: 'anushshrestha8683@gmail.com' },
    { from: 'Birgunj', to: 'Kathmandu', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 3333', price: 850, totalSeats: 10, initialSeats: initialSeatsEV, ownerName: 'Acme Transport', ownerEmail: 'owner2@example.com' },
    { from: 'Kathmandu', to: 'Birgunj', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 4444', price: 850, totalSeats: 10, initialSeats: initialSeatsEV, ownerName: 'Acme Transport', ownerEmail: 'owner2@example.com' },
];


export const getRideTemplates = async (ownerEmail?: string): Promise<RideTemplate[]> => {
    const templatesCollection = collection(db, 'rideTemplates');
    let templatesQuery = query(templatesCollection, orderBy('ownerName'), orderBy('departureTime'));

    // If an ownerEmail is provided, filter the templates by it
    if (ownerEmail) {
        templatesQuery = query(templatesQuery, where('ownerEmail', '==', ownerEmail));
    }
    
    const snapshot = await getDocs(templatesQuery);

    // This initialization logic should only run if the database is completely empty.
    if (snapshot.empty && !ownerEmail) {
        const batch = writeBatch(db);
        RIDE_TEMPLATES_FALLBACK.forEach(template => {
            const docRef = doc(collection(db, 'rideTemplates'));
            batch.set(docRef, template);
        });
        await batch.commit();
        
        const newSnapshot = await getDocs(templatesQuery);
        return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideTemplate));
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideTemplate));
};

export const getRideTemplateById = async (templateId: string): Promise<RideTemplate | null> => {
    const templateRef = doc(db, 'rideTemplates', templateId);
    const docSnap = await getDoc(templateRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as RideTemplate;
    }
    
    return null;
}


// Helper to get current time in Nepal (UTC+5:45)
const getNepalTime = () => {
    const now = new Date();
    const utcOffset = now.getTimezoneOffset() * 60000; // in milliseconds
    const utcTime = now.getTime() + utcOffset;
    const nepalOffset = (5 * 60 + 45) * 60000; // 5 hours 45 minutes in milliseconds
    return new Date(utcTime + nepalOffset);
};


export async function getRidesForDate(date: string, ownerEmail?: string): Promise<Ride[]> {
    let ridesQuery = query(collection(db, 'rides'), where('date', '==', date));
    if (ownerEmail) {
        ridesQuery = query(ridesQuery, where('ownerEmail', '==', ownerEmail));
    }
    const ridesSnapshot = await getDocs(ridesQuery);
    return ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
}


export async function generateRidesForDate(date: string, ownerEmail?: string): Promise<Ride[]> {
    let templates = await getRideTemplates();
    if (ownerEmail) {
        templates = templates.filter(t => t.ownerEmail === ownerEmail);
    }
    
    const batch = writeBatch(db);

    const generatedRides = templates.map(template => {
        const rideId = `${date}-${template.vehicleNumber.replace(/\s/g, '')}`;
        const newRide: Omit<Ride, 'id'> = {
            from: template.from,
            to: template.to,
            departureTime: template.departureTime,
            arrivalTime: template.arrivalTime,
            price: template.price,
            vehicleType: template.vehicleType,
            vehicleNumber: template.vehicleNumber,
            date: date,
            seats: JSON.parse(JSON.stringify(template.initialSeats)),
            totalSeats: template.totalSeats,
            ownerName: template.ownerName,
            ownerEmail: template.ownerEmail,
        };
        const rideRef = doc(db, 'rides', rideId);
        batch.set(rideRef, newRide);
        return { id: rideId, ...newRide };
    });

    await batch.commit();
    return generatedRides;
}


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    
    let ridesQuery = query(collection(db, 'rides'));

    const now = getNepalTime();
    const todayStr = format(now, 'yyyy-MM-dd');
    let targetDate = filters.date || todayStr;

    // Default logic: if no date is selected, check for available rides today. If none, show tomorrow's.
    if (!filters.date) {
        const todayRidesSnapshot = await getDocs(query(collection(db, 'rides'), where('date', '==', todayStr)));
        const availableTodayRides = todayRidesSnapshot.docs
            .map(doc => doc.data() as Ride)
            .filter(ride => {
                const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
                return departureDateTime > now;
            });
        
        if (availableTodayRides.length > 0) {
            targetDate = todayStr;
        } else {
            targetDate = format(addDays(now, 1), 'yyyy-MM-dd');
        }
    }
    
    // Always filter by a specific date
    ridesQuery = query(ridesQuery, where('date', '==', targetDate));
    
    if (filters.from && filters.from !== 'all') {
        ridesQuery = query(ridesQuery, where('from', '==', filters.from));
    }
    if (filters.to && filters.to !== 'all') {
        ridesQuery = query(ridesQuery, where('to', '==', filters.to));
    }
    
    const ridesSnapshot = await getDocs(ridesQuery);

    let finalRideList = ridesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));

    // Filter out rides that have already departed
    finalRideList = finalRideList.filter(ride => {
        const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
        return departureDateTime > now;
    });
    
    // If after all filtering for a future date, there are no rides, generate them.
    if (finalRideList.length === 0 && !isPast(parseISO(targetDate))) {
        await generateRidesForDate(targetDate);
        // Re-fetch after generation
        const newSnapshot = await getDocs(ridesQuery);
        finalRideList = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
    }

    finalRideList.sort((a, b) => {
        const timeA = parse(a.departureTime, 'hh:mm a', new Date()).getTime();
        const timeB = parse(b.departureTime, 'hh:mm a', new Date()).getTime();
        return timeA - timeB;
    });

    return finalRideList;
};


export const getRideById = async (id: string, includePast = false): Promise<Ride | undefined> => {
    const rideRef = doc(db, 'rides', id);
    const rideSnap = await getDoc(rideRef);
    
    if (!rideSnap.exists()) {
        return undefined;
    }
    
    const ride = { id: rideSnap.id, ...rideSnap.data() } as Ride;
    
    if (!includePast) {
        const now = getNepalTime();
        const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
        if (isPast(departureDateTime)) {
            return undefined;
        }
    }
    return ride;
};

export const getBookings = async (): Promise<Booking[]> => {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(bookingsCollection, orderBy('bookingTime', 'desc'));
    const bookingsSnapshot = await getDocs(q);

    const bookingsWithRides = await Promise.all(
        bookingsSnapshot.docs.map(async (bookingDoc) => {
            const bookingData = bookingDoc.data();
            const rideDetails = await getRideById(bookingData.rideId, true); // Include past rides
            return {
                id: bookingDoc.id,
                ...bookingData,
                bookingTime: (bookingData.bookingTime as Timestamp).toDate().toISOString(),
                rideDetails: rideDetails,
            } as Booking;
        })
    );

    return bookingsWithRides.filter(b => b.rideDetails);
};

export const getBookingsByUserId = async (userId: string): Promise<Booking[]> => {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(
        bookingsCollection, 
        where('userId', '==', userId), 
        orderBy('bookingTime', 'desc')
    );
    const bookingsSnapshot = await getDocs(q);

    const bookingsWithRides = await Promise.all(
        bookingsSnapshot.docs.map(async (doc) => {
            const bookingData = doc.data();
            const rideDetails = await getRideById(bookingData.rideId, true); // Include past rides
            return {
                id: doc.id,
                ...bookingData,
                bookingTime: (bookingData.bookingTime as Timestamp).toDate(),
                rideDetails: rideDetails,
            } as Booking;
        })
    );

    return bookingsWithRides.filter(b => b.rideDetails); 
};

export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
        return null;
    }

    const bookingData = bookingSnap.data();
    const rideDetails = await getRideById(bookingData.rideId, true);
    if (!rideDetails) {
        return null;
    }

    return {
        id: bookingSnap.id,
        ...bookingData,
        bookingTime: (bookingData.bookingTime as Timestamp).toDate(),
        rideDetails: rideDetails,
    } as Booking;
}


const generateTicketId = (bookingDate: Date, docId: string) => {
    const datePart = format(bookingDate, 'yyMMdd');
    const randomPart = docId.substring(0, 5).toUpperCase();
    return `BZO-${datePart}-${randomPart}`;
};

export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime' | 'ticketId'>
): Promise<Booking> => {
    const rideRef = doc(db, 'rides', bookingData.rideId);
    
    let newBookingId: string | null = null;

    await runTransaction(db, async (transaction) => {
        const rideDoc = await transaction.get(rideRef);

        if (!rideDoc.exists()) {
            throw new Error("Ride does not exist.");
        }
        
        const ride = rideDoc.data() as Ride;

        bookingData.seats.forEach(seatNumber => {
            const seat = ride.seats.find(s => s.number === seatNumber);
            if (!seat || seat.status !== 'available') {
                throw new Error(`Seat ${seatNumber} is no longer available.`);
            }
        });

        const newSeats = ride.seats.map(seat =>
            bookingData.seats.includes(seat.number)
                ? { ...seat, status: bookingData.status === 'confirmed' ? 'booked' : 'locked' } 
                : seat
        );
        
        transaction.update(rideRef, { seats: newSeats });
        
        const newBookingRef = doc(collection(db, 'bookings'));
        newBookingId = newBookingRef.id;

        const ticketId = generateTicketId(new Date(), newBookingId);

        const bookingWithTimestamp = {
            ...bookingData,
            bookingTime: Timestamp.now(),
            ticketId: ticketId,
        };
        
        transaction.set(newBookingRef, bookingWithTimestamp);
    });

    if (!newBookingId) {
        throw new Error("Booking transaction failed to complete and did not return a booking ID.");
    }

    const newBookingSnap = await getDoc(doc(db, 'bookings', newBookingId));
    if (!newBookingSnap.exists()) {
        throw new Error("Failed to retrieve the newly created booking.");
    }
    const newBookingData = newBookingSnap.data();

    return {
        id: newBookingSnap.id,
        ...newBookingData,
        bookingTime: (newBookingData!.bookingTime as Timestamp).toDate()
    } as Booking;
};


export const updateRideSeats = async (rideId: string, seatNumbers: number[], newStatus: SeatStatus): Promise<void> => {
     const rideRef = doc(db, 'rides', rideId);
      await runTransaction(db, async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        
        if (!rideDoc.exists()) {
            throw new Error("Ride not found for seat update");
        }

        const ride = rideDoc.data() as Ride;

        const newSeats = ride.seats.map(seat => 
            seatNumbers.includes(seat.number) ? { ...seat, status: newStatus } : seat
        );
        
        transaction.update(rideRef, { seats: newSeats });
    });
}


export const getUserProfile = async (userId: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return { 
            id: userSnap.id,
             ...data 
        } as User;
    }
    return null;
}

export async function getAllUsers(): Promise<User[]> {
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function getAllCollectionDocuments(collectionRef: any): Promise<QuerySnapshot<DocumentData>> {
    return await getDocs(collectionRef);
}

export async function deleteAllDocuments(snapshot: QuerySnapshot<DocumentData>) {
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
}


export async function getPaymentDetails(): Promise<PaymentDetails> {
    const docRef = doc(db, 'config', 'paymentDetails');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as PaymentDetails;
    } else {
        // Return default/empty values if not set
        return {
            esewa: { qrUrl: '' },
            khalti: { qrUrl: '' },
            imepay: { qrUrl: '' },
        };
    }
}

export async function setPaymentQrUrl(paymentMethod: 'esewa' | 'khalti' | 'imepay', url: string): Promise<void> {
    const docRef = doc(db, 'config', 'paymentDetails');
    await setDoc(docRef, {
        [paymentMethod]: { qrUrl: url }
    }, { merge: true });
}

export async function getFooterSettings(): Promise<FooterSettings> {
    const docRef = doc(db, 'config', 'footerSettings');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as FooterSettings;
    } else {
        // Return default/empty values if not set
        return {
            customerServicePhone: '+977-98XXXXXXXX',
            whatsappNumber: '+977-98XXXXXXXX',
            facebookUrl: 'https://facebook.com',
            instagramUrl: 'https://instagram.com',
        };
    }
}

export async function updateFooterSettings(settings: FooterSettings): Promise<void> {
    const docRef = doc(db, 'config', 'footerSettings');
    await setDoc(docRef, settings, { merge: true });
}

export async function updateUserProfileInDb(userId: string, data: Partial<Pick<User, 'name' | 'phoneNumber' | 'dob'>>): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}

export async function updateRideTemplateInDb(templateId: string, data: Partial<Pick<RideTemplate, 'vehicleNumber' | 'departureTime' | 'arrivalTime'>>): Promise<void> {
    const templateRef = doc(db, 'rideTemplates', templateId);
    await updateDoc(templateRef, data);
}


export async function createOrUpdateRideInDb(rideData: Omit<Ride, 'id' | 'seats'> & { rideId?: string, seats?: string }): Promise<Ride> {
    const { rideId, seats: seatsJson, ...dataToSave } = rideData;
    const isEditing = !!rideId;

    let finalSeats: Seat[];
    if (isEditing && seatsJson) {
        // If editing, preserve existing seat status
        finalSeats = JSON.parse(seatsJson);
    } else {
        // If creating, use initial seats based on vehicle type
        finalSeats = dataToSave.vehicleType === 'Sumo' ? initialSeatsSumo : initialSeatsEV;
    }

    const rideDoc: Omit<Ride, 'id'> = {
        ...dataToSave,
        seats: finalSeats,
    };

    if (isEditing) {
        const rideRef = doc(db, 'rides', rideId!);
        await updateDoc(rideRef, rideDoc);
        return { id: rideId!, ...rideDoc };
    } else {
        const newRideRef = doc(collection(db, 'rides'));
        await setDoc(newRideRef, rideDoc);
        return { id: newRideRef.id, ...rideDoc };
    }
}

export async function deleteRideFromDb(rideId: string): Promise<void> {
    const rideRef = doc(db, 'rides', rideId);
    await deleteDoc(rideRef);
}
