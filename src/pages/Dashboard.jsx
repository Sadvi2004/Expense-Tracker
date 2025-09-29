import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { initProfileIfMissing, watchTransactions, addTransaction } from "../lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import LineChart from "../components/LineChart";
import { LogOut, Plus, IndianRupee, TrendingUp, TrendingDown, Menu, X } from "lucide-react";

const labelsForMonth = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return days.map((n) => n.toString().padStart(2, "0"));
};

export default function Dashboard() {
    const { user, logout, loading } = useAuth();
    const nav = useNavigate();

    const [items, setItems] = useState(() => {
        const cached = localStorage.getItem("et:tx");
        return cached ? JSON.parse(cached) : [];
    });
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [type, setType] = useState("expense");
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) nav("/");
    }, [loading, user, nav]); // responsive flow [web:38]

    useEffect(() => {
        if (!user) return;
        initProfileIfMissing(user.uid);
        const unsub = watchTransactions(user.uid, (rows) => {
            setItems(rows);
            localStorage.setItem("et:tx", JSON.stringify(rows));
        });
        return () => unsub();
    }, [user]); // single subscription [web:38]

    // FIXED: balance subtracts both expenses and savings
    const totals = useMemo(() => {
        const toNum = (v) => {
            const n = Number(v ?? 0);
            return Number.isFinite(n) ? n : 0;
        };
        const sum = (arr) => arr.reduce((a, b) => a + toNum(b.amount), 0);

        const income = sum(items.filter((i) => i.type === "income"));
        const expenses = sum(items.filter((i) => i.type === "expense"));
        const savings = sum(items.filter((i) => i.type === "savings"));
        const balance = income - expenses - savings; // corrected logic

        return { income, expenses, savings, balance };
    }, [items]); // memo totals [web:45]

    const peakExpense = useMemo(() => {
        const ex = items.filter((i) => i.type === "expense");
        ex.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        return ex[0] ?? null;
    }, [items]); // memo [web:45]

    const lowExpense = useMemo(() => {
        const ex = items.filter((i) => i.type === "expense");
        ex.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        return ex[0] ?? null;
    }, [items]); // memo [web:45]

    const labels = labelsForMonth();

    const grouped = useMemo(() => {
        const makeSeries = (t) => {
            const arr = Array(labels.length).fill(0);
            for (const i of items) {
                if (i.type !== t) continue;
                const d = new Date(i.date ?? Date.now());
                const day = Number.isFinite(d.getTime()) ? d.getDate() : 1;
                const idx = Math.min(Math.max(day - 1, 0), labels.length - 1);
                arr[idx] += Number(i.amount || 0);
            }
            for (let k = 1; k < arr.length; k++) arr[k] += arr[k - 1];
            return arr;
        };
        return {
            income: makeSeries("income"),
            expenses: makeSeries("expense"),
            savings: makeSeries("savings"),
        };
    }, [items, labels]); // memo series [web:45]

    const itemsReversed = useMemo(() => {
        const copy = Array.isArray(items) ? items.slice() : [];
        copy.reverse();
        return copy;
    }, [items]); // memo list [web:45]

    const submitTx = async (e) => {
        e.preventDefault();
        if (!user) return;
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return;
        if (!category.trim()) return;

        await addTransaction(user.uid, {
            type,
            category: category.trim(),
            amount: amt,
            date: new Date().toISOString(),
        });

        setAmount("");
        setCategory("");
    };

    if (!user) return null;

    const firstName = user.displayName?.split(" ")[0] || "User";

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#111827] text-[#0f172a]">
            {/* Header */}
            <header className="w-full">
                <div className="container mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
                                Hii {firstName}
                            </h2>
                            <p className="font-Inter text-white/80 text-sm sm:text-base">
                                Trace all expenses and transactions
                            </p>
                        </div>

                        {/* Desktop (sm+) actions */}
                        <div className="hidden sm:flex items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 bg-white/10 rounded-full pl-2 pr-4 py-2">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.photoURL || ""} />
                                    <AvatarFallback>{firstName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-white font-sans text-sm sm:text-base">
                                    {user.displayName || "User"}
                                </span>
                            </div>

                            <Button
                                variant="secondary"
                                onClick={logout}
                                className="font-display font-semibold bg-white text-[#0f172a] hover:bg-gray-100"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>

                        {/* Mobile hamburger */}
                        <div className="sm:hidden">
                            <button
                                aria-label="Open menu"
                                onClick={() => setMenuOpen((v) => !v)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile slide-down menu */}
                    <div
                        className={[
                            "sm:hidden overflow-hidden transition-all duration-300",
                            menuOpen ? "max-h-40 mt-3" : "max-h-0",
                        ].join(" ")}
                    >
                        <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.photoURL || ""} />
                                    <AvatarFallback>{firstName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-white text-sm">{user.displayName || "User"}</span>
                            </div>
                            <Button
                                onClick={logout}
                                className="font-display font-semibold bg-white text-[#0f172a] hover:bg-gray-100"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full">
                <div className="container mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 sm:gap-8">
                        <Card className="w-full p-4 sm:p-6 lg:p-8 bg-white/95 rounded-2xl shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                                <div className="space-y-1">
                                    <p className="font-sans text-gray-600 text-sm">Your Balance</p>
                                    <p className="font-display font-bold text-2xl sm:text-3xl">
                                        ₹ {totals.balance.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-sans text-gray-600 text-sm">Total Income</p>
                                    <p className="font-display font-bold text-2xl sm:text-3xl">
                                        ₹ {totals.income.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-sans text-gray-600 text-sm">Total Expenses</p>
                                    <p className="font-display font-bold text-2xl sm:text-3xl">
                                        ₹ {totals.expenses.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 sm:mt-8 rounded-2xl overflow-hidden bg-white">
                                <div className="p-3 sm:p-4 lg:p-6">
                                    <LineChart
                                        labels={labels}
                                        income={grouped.income}
                                        expenses={grouped.expenses}
                                        savings={grouped.savings}
                                    />
                                </div>
                            </div>
                        </Card>
                        <Card className="w-full p-4 sm:p-6 lg:p-8 bg-[var(--panel,#f8fafc)] rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h3 className="font-display font-bold text-lg sm:text-xl">Type of Savings</h3>
                                <span className="font-display font-bold text-lg sm:text-xl">Amount</span>
                            </div>

                            <div className="rounded-xl overflow-hidden bg-white">
                                <div className="p-3 sm:p-4">
                                    <LineChart
                                        labels={labels}
                                        income={grouped.income}
                                        expenses={grouped.expenses}
                                        savings={grouped.savings}
                                    />
                                </div>
                            </div>

                            <form
                                onSubmit={submitTx}
                                className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-5"
                            >
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="sm:col-span-1 rounded-md border border-gray-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                    <option value="savings">Savings</option>
                                </select>

                                <Input
                                    placeholder="Category e.g. Haircut"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="sm:col-span-2"
                                />

                                <div className="relative sm:col-span-1">
                                    <IndianRupee className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="pl-7"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="sm:col-span-1 font-display font-semibold w-full sm:w-fit justify-center"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Transaction
                                </Button>
                            </form>

                            <div className="mt-4 sm:mt-6 text-sm text-gray-700 space-y-1.5">
                                <p>
                                    Peak expense : {" "}
                                    {peakExpense
                                        ? `${peakExpense.category} ₹ ${Number(peakExpense.amount || 0).toLocaleString()}`
                                        : "—"}
                                </p>
                                <p>
                                    Lowest expense : {" "}
                                    {lowExpense
                                        ? `${lowExpense.category} ₹ ${Number(lowExpense.amount || 0).toLocaleString()}`
                                        : "—"}
                                </p>
                                <p>
                                    Total savings this month : ₹ {totals.savings.toLocaleString()}

                                </p>
                                <p>
                                    Overall savings this month: ₹ {(totals.income - totals.expenses - totals.savings).toLocaleString()}
                                </p>
                            </div>
                        </Card>
                        <Card className="w-full md:col-span-2 lg:col-span-1 p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-sm">
                            <h3 className="font-display font-bold text-xl sm:text-2xl mb-3 sm:mb-4">
                                Transaction History
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-gray-50 rounded-md p-3 sm:p-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-700" />
                                    Income ₹ {totals.income.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                    Expenses ₹ {totals.expenses.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4 text-blue-600" />
                                    Savings ₹ {totals.savings.toLocaleString()}
                                </div>
                            </div>

                            <ul className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 max-h-96 overflow-auto pr-1 sm:pr-2">
                                {itemsReversed.map((tx) => {
                                    const val = Number(tx.amount || 0);
                                    const sign = tx.type === "expense" ? "-" : "+";
                                    const d = new Date(tx.date);
                                    const dateStr = Number.isFinite(d.getTime()) ? d.toLocaleDateString() : "";
                                    return (
                                        <li
                                            key={tx.id || `${tx.category}-${tx.date}-${val}`}
                                            className="flex items-center justify-between rounded-md border border-gray-200 p-3 sm:p-4 hover:shadow transition-all bg-white"
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <span
                                                    className={[
                                                        "h-2.5 w-2.5 rounded-full",
                                                        tx.type === "income"
                                                            ? "bg-green-600"
                                                            : tx.type === "expense"
                                                                ? "bg-red-600"
                                                                : "bg-blue-600",
                                                    ].join(" ")}
                                                />
                                                <div className="space-y-0.5">
                                                    <p className="font-display font-semibold text-sm sm:text-base">
                                                        {tx.category}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{dateStr}</p>
                                                </div>
                                            </div>

                                            <div className="font-display font-semibold text-sm sm:text-base">
                                                {sign}₹{val.toLocaleString()}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}