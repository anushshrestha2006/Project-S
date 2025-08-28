

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, runTransaction, query, where, orderBy, Timestamp, writeBatch, setDoc, DocumentData, QuerySnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Ride, Booking, User, Seat, SeatStatus, PaymentDetails, FooterSettings, RideTemplate } from './types';
import { format, startOfDay, parse, endOfDay, isToday, parseISO, addDays, isPast } from 'date-fns';

const initialSeatsSumo: Seat[] = Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

const initialSeatsEV: Seat[] = Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    status: 'available',
}));

const RIDE_TEMPLATES_FALLBACK = [
    { id: '1', from: 'Birgunj', to: 'Kathmandu', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 1234', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo },
    { id: '2', from: 'Kathmandu', to: 'Birgunj', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 5678', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo },
    { id: '3', from: 'Birgunj', to: 'Kathmandu', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 9012', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo },
    { id: '4', from: 'Kathmandu', to: 'Birgunj', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'Sumo', vehicleNumber: 'NA 1 JA 3456', price: 850, totalSeats: 9, initialSeats: initialSeatsSumo },
    { id: '5', from: 'Birgunj', to: 'Kathmandu', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 1111', price: 850, totalSeats: 10, initialSeats: initialSeatsEV },
    { id: '6', from: 'Kathmandu', to: 'Birgunj', departureTime: '06:00 AM', arrivalTime: '02:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 2222', price: 850, totalSeats: 10, initialSeats: initialSeatsEV },
    { id: '7', from: 'Birgunj', to: 'Kathmandu', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 3333', price: 850, totalSeats: 10, initialSeats: initialSeatsEV },
    { id: '8', from: 'Kathmandu', to: 'Birgunj', departureTime: '10:00 AM', arrivalTime: '06:00 PM', vehicleType: 'EV', vehicleNumber: 'BA 1 YA 4444', price: 850, totalSeats: 10, initialSeats: initialSeatsEV },
] as const;


export const getRideTemplates = async (): Promise<RideTemplate[]> => {
    const templatesCollection = collection(db, 'rideTemplates');
    const snapshot = await getDocs(query(templatesCollection, orderBy('departureTime')));

    if (snapshot.empty) {
        // If the collection is empty, populate it from the fallback and return that.
        const batch = writeBatch(db);
        RIDE_TEMPLATES_FALLBACK.forEach(template => {
            const docRef = doc(db, 'rideTemplates', template.id);
            batch.set(docRef, template);
        });
        await batch.commit();
        return RIDE_TEMPLATES_FALLBACK.map(t => ({...t}));
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideTemplate));
};


/**
 * Generates a list of all rides for the next 7 days based on templates from Firestore.
 */
const generateRides = async (): Promise<Ride[]> => {
    const rides: Ride[] = [];
    const today = new Date();
    const templates = await getRideTemplates();

    for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        templates.forEach((template) => {
            rides.push({
                id: `${dateStr}-${template.id}`,
                from: template.from,
                to: template.to,
                departureTime: template.departureTime,
                arrivalTime: template.arrivalTime,
                price: template.price,
                vehicleType: template.vehicleType,
                vehicleNumber: template.vehicleNumber,
                date: dateStr,
                seats: JSON.parse(JSON.stringify(template.initialSeats)),
                totalSeats: template.totalSeats,
            });
        });
    }
    return rides;
}


// Helper to get current time in Nepal (UTC+5:45)
const getNepalTime = () => {
    const now = new Date();
    const utcOffset = now.getTimezoneOffset() * 60000; // in milliseconds
    const utcTime = now.getTime() + utcOffset;
    const nepalOffset = (5 * 60 + 45) * 60000; // 5 hours 45 minutes in milliseconds
    return new Date(utcTime + nepalOffset);
};


export const getRides = async (
    filters: { from?: string, to?: string, date?: string } = {}
): Promise<Ride[]> => {
    
    let allRides: Ride[] = await generateRides();
    const rideIds = allRides.map(r => r.id);

    const firestoreRides = new Map<string, Ride>();
    const CHUNK_SIZE = 30; // Firestore 'in' query limit

    for (let i = 0; i < rideIds.length; i += CHUNK_SIZE) {
        const chunk = rideIds.slice(i, i + CHUNK_SIZE);
        if (chunk.length > 0) {
            const ridesSnapshot = await getDocs(query(collection(db, 'rides'), where('__name__', 'in', chunk)));
            ridesSnapshot.docs.forEach(doc => {
                firestoreRides.set(doc.id, doc.data() as Ride);
            });
        }
    }

    allRides = allRides.map(ride => {
        const firestoreRide = firestoreRides.get(ride.id);
        return firestoreRide ? { ...ride, seats: firestoreRide.seats } : ride;
    });

    
    if (filters.from && filters.from !== 'all') {
        allRides = allRides.filter(ride => ride.from === filters.from);
    }
    if (filters.to && filters.to !== 'all') {
        allRides = allRides.filter(ride => ride.to === filters.to);
    }
    
    const now = getNepalTime();
    const todayStr = format(now, 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');

    let finalRideList;

    if (filters.date) {
        finalRideList = allRides.filter(ride => ride.date === filters.date);
    } else {
        const todayRides = allRides.filter(ride => ride.date === todayStr);
        const availableTodayRides = todayRides.filter(ride => {
            const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
            return departureDateTime > now;
        });

        if (availableTodayRides.length > 0) {
            finalRideList = availableTodayRides;
        } else {
            finalRideList = allRides.filter(ride => ride.date === tomorrowStr);
        }
    }

    finalRideList = finalRideList.filter(ride => {
        const departureDateTime = parse(`${ride.date} ${ride.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
        return departureDateTime > now;
    });


    finalRideList.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
            return dateA - dateB;
        }
        const timeA = parse(a.departureTime, 'hh:mm a', new Date()).getTime();
        const timeB = parse(b.departureTime, 'hh:mm a', new Date()).getTime();
        return timeA - timeB;
    });

    return finalRideList;
};

export const getRideById = async (id: string, includePast = false): Promise<Ride | undefined> => {
    const rideRef = doc(db, 'rides', id);
    const rideSnap = await getDoc(rideRef);
    
    const allRides = await generateRides();
    const templateRide = allRides.find(r => r.id === id);
    if (!templateRide) return undefined;

    if (rideSnap.exists()) {
        const ride = rideSnap.data() as Ride;
        
        const mergedRide = { ...templateRide, ...ride };
        
        if (!includePast) {
            const now = getNepalTime();
            const departureDateTime = parse(`${mergedRide.date} ${mergedRide.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
            if (isPast(departureDateTime)) {
                return undefined;
            }
        }
        return { id: rideSnap.id, ...mergedRide };

    } else {
        if (!includePast) {
            const now = getNepalTime();
            const departureDateTime = parse(`${templateRide.date} ${templateRide.departureTime}`, 'yyyy-MM-dd hh:mm a', new Date());
            if (isPast(departureDateTime)) {
                return undefined;
            }
        }
        return templateRide;
    }
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
    return `SS-${datePart}-${randomPart}`;
};

export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingTime' | 'ticketId'>
): Promise<Booking> => {
    const rideRef = doc(db, 'rides', bookingData.rideId);
    
    let newBookingId: string | null = null;

    await runTransaction(db, async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        let ride: Ride;

        const generatedRides = await generateRides();
        const generatedRide = generatedRides.find(r => r.id === bookingData.rideId);
        if (!generatedRide) {
            throw new Error("Ride schedule not found!");
        }

        if (!rideDoc.exists()) {
            ride = generatedRide;
        } else {
            ride = { ...generatedRide, ...rideDoc.data() } as Ride;
        }

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
        
        transaction.set(rideRef, { seats: newSeats }, { merge: true });
        
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
         let ride: Ride;

        const generatedRides = await generateRides();
        const generatedRide = generatedRides.find(r => r.id === rideId);
        if (!generatedRide) throw new Error("Ride not found for seat update");

        if (!rideDoc.exists()) {
            ride = generatedRide;
        } else {
            ride = { ...generatedRide, ...rideDoc.data() } as Ride;
        }

        const newSeats = ride.seats.map(seat => 
            seatNumbers.includes(seat.number) ? { ...seat, status: newStatus } : seat
        );
        
        transaction.set(rideRef, { seats: newSeats }, { merge: true });
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
