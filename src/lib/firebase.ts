import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    "projectId": "sumo-sewa-9z1gw",
    "appId": "1:340934069863:web:4fb28f7ad5398403e90ec2",
    "storageBucket": "sumo-sewa-9z1gw.firebasestorage.app",
    "apiKey": "AIzaSyAqVEi9NDEukcp376xP7VXXhv_CBZapSSI",
    "authDomain": "sumo-sewa-9z1gw.firebaseapp.com",
    "messagingSenderId": "340934069863",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
