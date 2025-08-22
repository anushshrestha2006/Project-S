import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    "projectId": "sumo-sewa",
    "appId": "1:463428358443:web:963564a983416973322079",
    "storageBucket": "sumo-sewa.appspot.com",
    "apiKey": "AIzaSyChh9_p27g39L9wz0n2Z_s-xcyRCpD7v9A",
    "authDomain": "sumo-sewa.firebaseapp.com",
    "messagingSenderId": "463428358443",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
