
'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { MyBookings } from './MyBookings';

export function HomePageClientContent() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const storedUser = localStorage.getItem('sumo-sewa-user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return null; 
    }

    if (user) {
        return <MyBookings userId={user.id} />;
    }

    return null;
}
