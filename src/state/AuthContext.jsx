import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { auth, provider, db } from "../lib/firebase";
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const STORAGE_KEY = "et:user:min";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const cached = localStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Keep raw Firebase User separate to avoid serializing full object
    const rawUserRef = useRef(null);

    // Process redirect result early on load for reliability on browsers that block popups/3rd-party cookies
    useEffect(() => {
        getRedirectResult(auth).catch(() => void 0);
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            rawUserRef.current = u;

            if (u) {
                // Trim user shape for cache and UI to reduce rerenders and stale data risk
                const appUser = {
                    uid: u.uid,
                    displayName: u.displayName,
                    email: u.email,
                    photoURL: u.photoURL,
                };
                setUser(appUser);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));

                // Upsert Firestore profile in background; do not block UI
                try {
                    const ref = doc(db, "users", u.uid);
                    const snap = await getDoc(ref);
                    if (!snap.exists()) {
                        await setDoc(ref, {
                            displayName: u.displayName,
                            email: u.email,
                            photoURL: u.photoURL,
                            createdAt: serverTimestamp(),
                        });
                    }
                } catch (e) {
                    // Non-fatal; keep UI responsive
                    console.error("User profile upsert failed", e);
                }
            } else {
                setUser(null);
                localStorage.removeItem(STORAGE_KEY);
            }

            setLoading(false);
        });

        return () => unsub();
    }, []);

    const login = async () => {
        setError(null);
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            // Fallback for popup blockers / iOS Safari
            const code = e && e.code ? e.code : "";
            if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (e2) {
                    setError(e2?.message || "Login failed");
                }
            } else if (code === "auth/account-exists-with-different-credential") {
                setError("Account exists with a different sign-in method. Use the original provider and link accounts.");
            } else {
                setError(e?.message || "Login failed");
            }
        }
    };

    const logout = async () => {
        setError(null);
        try {
            await signOut(auth);
        } catch (e) {
            setError(e?.message || "Logout failed");
        }
    };

    const value = useMemo(() => ({ user, loading, login, logout, error }), [user, loading, error]);

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);