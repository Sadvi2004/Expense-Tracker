import { createContext, useContext, useEffect, useState } from "react";
import { auth, provider, db } from "../lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const cached = localStorage.getItem("et:user");
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                localStorage.setItem("et:user", JSON.stringify(u));
                const ref = doc(db, "users", u.uid);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    await setDoc(ref, {
                        displayName: u.displayName,
                        email: u.email,
                        photoURL: u.photoURL,
                        createdAt: serverTimestamp()
                    });
                }
            } else {
                setUser(null);
                localStorage.removeItem("et:user");
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const login = async () => { await signInWithPopup(auth, provider); };
    const logout = async () => { await signOut(auth); };

    return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);