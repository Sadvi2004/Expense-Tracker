import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function Home() {
    const { user, login, loading } = useAuth();
    const nav = useNavigate();

    useEffect(() => { if (user) nav("/app"); }, [user, nav]);

    if (loading) {
        return (
            <main className="min-h-screen grid place-items-center text-white">
                <p className="font-inter opacity-80">Checking session…</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center text-white px-6">
            <section className="text-center max-w-2xl">
                <h1 className="font-display font-bold text-5xl sm:text-6xl">
                    Hi 🖐️, Welcome to <br />Expense Tracker
                </h1>
                <p className="font-sans mt-6 opacity-90">
                    Smartly track expenses, set budgets, and gain clear insights to achieve financial goals.
                </p>
                <div className="mt-10">
                    <Button
                        onClick={login}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-6 rounded-full font-inter font-semibold text-lg shadow-soft transition-all cursor-pointer"
                    >
                        <LogIn className="mr-2 h-5 w-5" /> SignUp With Google
                    </Button>
                </div>
            </section>
        </main>
    );
}