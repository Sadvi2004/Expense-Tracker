import { db } from "./firebase";
import {
    collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
    doc, getDoc, setDoc, updateDoc
} from "firebase/firestore";

export const userProfileRef = (uid) => doc(db, "profiles", uid);
export const txColRef = (uid) => collection(db, "transactions", uid, "items");

export const initProfileIfMissing = async (uid) => {
    const ref = userProfileRef(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { balance: 0, totals: { income: 0, expenses: 0, savings: 0 } });
    }
};

export const addTransaction = async (uid, payload) => {
    const docRef = await addDoc(txColRef(uid), {
        ...payload,
        date: payload.date ?? new Date().toISOString(),
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const watchTransactions = (uid, cb) => {
    const q = query(txColRef(uid), orderBy("date", "asc"));
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cb(items);
    });
};

export const setProfile = async (uid, data) => {
    const ref = userProfileRef(uid);
    await updateDoc(ref, data);
};