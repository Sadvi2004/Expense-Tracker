// lib/data.js
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export const userProfileRef = (uid) => doc(db, "profiles", uid);
export const txColRef = (uid) => collection(db, "transactions", uid, "items");

// Create profile if missing
export const initProfileIfMissing = async (uid) => {
    const ref = userProfileRef(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            balance: 0,
            totals: { income: 0, expenses: 0, savings: 0 },
        });
    }
};

// Add a transaction
export const addTransaction = async (uid, payload) => {
    const docRef = await addDoc(txColRef(uid), {
        ...payload,
        date: payload.date ?? new Date().toISOString(),
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

// Watch live transactions
export const watchTransactions = (uid, cb) => {
    const q = query(txColRef(uid), orderBy("date", "asc"));
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cb(items);
    });
};

// Update a transaction (partial update allowed)
export const updateTransaction = async (uid, id, payload) => {
    const ref = doc(db, "transactions", uid, "items", id);
    // ensure amount stored as number (if present)
    const body = { ...payload };
    if (body.amount !== undefined) body.amount = Number(body.amount);
    await updateDoc(ref, body);
};

// Delete a single transaction
export const deleteTransaction = async (uid, id) => {
    const ref = doc(db, "transactions", uid, "items", id);
    await deleteDoc(ref);
};

// Delete ALL user transactions
export const deleteAllTransactions = async (uid) => {
    const col = await getDocs(txColRef(uid));
    const promises = col.docs.map((d) =>
        deleteDoc(doc(db, "transactions", uid, "items", d.id))
    );
    await Promise.all(promises);
};