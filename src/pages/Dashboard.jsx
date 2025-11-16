// Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

import {
    initProfileIfMissing,
    watchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteAllTransactions,
} from "../lib/data";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import LineChart from "../components/LineChart";
import {
    LogOut,
    Plus,
    IndianRupee,
    TrendingUp,
    TrendingDown,
    Menu,
    X,
    Trash,
    Edit2,
    Check,
    XCircle,
} from "lucide-react";

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

    // Editing state
    const [editId, setEditId] = useState(null);
    const [editCategory, setEditCategory] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editType, setEditType] = useState("expense");

    useEffect(() => {
        if (!loading && !user) nav("/");
    }, [loading, user, nav]);

    useEffect(() => {
        if (!user) return;

        initProfileIfMissing(user.uid);

        const unsub = watchTransactions(user.uid, (rows) => {
            setItems(rows);
            localStorage.setItem("et:tx", JSON.stringify(rows));
        });

        return () => unsub();
    }, [user]);

    // ------------------------------
    // Delete single transaction
    // ------------------------------
    const removeTx = async (id) => {
        if (!user) return;
        try {
            await deleteTransaction(user.uid, id);
            const updated = items.filter((i) => i.id !== id);
            setItems(updated);
            localStorage.setItem("et:tx", JSON.stringify(updated));
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    // ------------------------------
    // Remove all transactions
    // ------------------------------
    const removeAll = async () => {
        if (!user) return;
        if (!confirm("Delete ALL transactions? This cannot be undone!")) return;
        try {
            await deleteAllTransactions(user.uid);
            setItems([]);
            localStorage.setItem("et:tx", JSON.stringify([]));
        } catch (err) {
            console.error("Failed to delete all:", err);
        }
    };

    // ------------------------------
    // Start editing a transaction
    // ------------------------------
    const startEdit = (tx) => {
        setEditId(tx.id);
        setEditCategory(tx.category ?? "");
        setEditAmount(String(tx.amount ?? ""));
        setEditType(tx.type ?? "expense");
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditId(null);
        setEditCategory("");
        setEditAmount("");
        setEditType("expense");
    };

    // Save edit (updates Firestore + local)
    const saveEdit = async () => {
        if (!user || !editId) return;

        const amt = Number(editAmount);
        if (!editCategory.trim() || !Number.isFinite(amt) || amt <= 0) {
            alert("Please provide valid category and amount.");
            return;
        }

        try {
            // update in Firestore
            await updateTransaction(user.uid, editId, {
                category: editCategory.trim(),
                amount: amt,
                type: editType,
            });

            // update local state
            const updated = items.map((it) =>
                it.id === editId ? { ...it, category: editCategory.trim(), amount: amt, type: editType } : it
            );
            setItems(updated);
            localStorage.setItem("et:tx", JSON.stringify(updated));

            // clear edit state
            cancelEdit();
        } catch (err) {
            console.error("Failed to update:", err);
            alert("Failed to update transaction. Try again.");
        }
    };

    // ------------------------------
    // Totals
    // ------------------------------
    const totals = useMemo(() => {
        const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const sum = (arr) => arr.reduce((a, b) => a + toNum(b.amount), 0);
        const income = sum(items.filter((i) => i.type === "income"));
        const expenses = sum(items.filter((i) => i.type === "expense"));
        const savings = sum(items.filter((i) => i.type === "savings"));
        const balance = income - expenses - savings;
        return { income, expenses, savings, balance };
    }, [items]);

    const peakExpense = useMemo(() => {
        const ex = items.filter((i) => i.type === "expense");
        ex.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        return ex[0] ?? null;
    }, [items]);

    const lowExpense = useMemo(() => {
        const ex = items.filter((i) => i.type === "expense");
        ex.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        return ex[0] ?? null;
    }, [items]);

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
    }, [items, labels]);

    const itemsReversed = useMemo(() => {
        const copy = Array.isArray(items) ? [...items] : [];
        return copy.reverse();
    }, [items]);

    const submitTx = async (e) => {
        e.preventDefault();
        if (!user) return;

        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0 || !category.trim()) return;

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
                        {/* Left */}
                        <div className="space-y-1">
                            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">Hii {firstName}</h2>
                            <p className="font-Inter text-white/80 text-sm sm:text-base">Trace all expenses and transactions</p>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden sm:flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-white/10 rounded-full pl-2 pr-4 py-2">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.photoURL || ""} />
                                    <AvatarFallback>{firstName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-white font-sans text-sm sm:text-base">{user.displayName || "User"}</span>
                            </div>
                            <Button onClick={removeAll} className="font-display font-semibold bg-red-600 text-white hover:bg-red-700">
                                Remove All
                            </Button>
                            <Button variant="secondary" onClick={logout} className="font-display font-semibold bg-white text-[#0f172a] hover:bg-gray-100">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>

                        {/* Mobile hamburger */}
                        <div className="sm:hidden">
                            <button aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)} className="inline-flex items-center justify-center rounded-md p-2 text-white bg-white/10 hover:bg-white/20 focus:outline-none">
                                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    <div className={["sm:hidden overflow-hidden transition-all duration-300", menuOpen ? "max-h-52 mt-3" : "max-h-0"].join(" ")}>
                        <div className="bg-white/10 rounded-lg p-3 space-y-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.photoURL || ""} />
                                    <AvatarFallback>{firstName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-white text-sm">{user.displayName}</span>
                            </div>

                            <Button onClick={removeAll} className="w-full bg-red-600 text-white hover:bg-red-700">
                                Remove All
                            </Button>

                            <Button onClick={logout} className="w-full font-display font-semibold bg-white text-[#0f172a] hover:bg-gray-100">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="w-full">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                        {/* Summary Card */}
                        <Card className="p-6 bg-white/95 rounded-2xl shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                                <div>
                                    <p className="text-gray-600 text-sm">Your Balance</p>
                                    <p className="font-display font-bold text-3xl">₹ {totals.balance.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Total Income</p>
                                    <p className="font-display font-bold text-3xl">₹ {totals.income.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 text-sm">Total Expenses</p>
                                    <p className="font-display font-bold text-3xl">₹ {totals.expenses.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="mt-8 bg-white rounded-2xl overflow-hidden">
                                <div className="p-6">
                                    <LineChart labels={labels} income={grouped.income} expenses={grouped.expenses} savings={grouped.savings} />
                                </div>
                            </div>
                        </Card>

                        {/* Add Transaction + Stats Card */}
                        <Card className="p-6 bg-[#f8fafc] rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-display font-bold text-xl">Type of Savings</h3>
                                <span className="font-display font-bold text-xl">Amount</span>
                            </div>

                            <div className="rounded-xl overflow-hidden bg-white">
                                <div className="p-4">
                                    <LineChart labels={labels} income={grouped.income} expenses={grouped.expenses} savings={grouped.savings} />
                                </div>
                            </div>

                            <form onSubmit={submitTx} className="mt-6 grid gap-4 sm:grid-cols-5">
                                <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-gray-300 bg-white p-2 focus:ring-2 focus:ring-indigo-500">
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                    <option value="savings">Savings</option>
                                </select>

                                <Input placeholder="Category e.g. Haircut" value={category} onChange={(e) => setCategory(e.target.value)} className="sm:col-span-2" />

                                <div className="relative">
                                    <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input type="number" step="0.01" min="0" value={amount} placeholder="Enter Amount" onChange={(e) => setAmount(e.target.value)} className="pl-7" />
                                </div>

                                <Button type="submit" className="font-display font-semibold w-full sm:w-fit">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Transaction
                                </Button>
                            </form>
                            <div className="mt-6 test-sm text-gray-700 space-y-1.5">
                                <p>
                                    <span className="font-display font-semibold">Peak expense : </span>
                                    <span className="font-normal">
                                        {peakExpense ? `${peakExpense.category} ₹ ${peakExpense.amount}` : "₹ 0"}
                                    </span>
                                </p>
                                <p>
                                    <span className="font-display font-semibold">Lowest expense : </span>
                                    <span className="font-normal">
                                        {lowExpense ? `${lowExpense.category} ₹ ${lowExpense.amount}` : "₹ 0"}
                                    </span>
                                </p>
                                <p>
                                    <span className="font-display font-semibold">Total savings this month : </span>
                                    <span className="font-normal">₹ {totals.savings.toLocaleString()}</span>
                                </p>
                            </div>
                        </Card>

                        {/* Transaction History */}
                        {/* Transaction History Card (replace your existing card) */}
                        <Card className="p-6 bg-white rounded-2xl shadow-sm">
                            <h3 className="font-display font-bold text-2xl mb-4">Transaction History</h3>

                            {/* --- Updated Stats Row: fills container with padding and equal spacing --- */}
                            <div className="w-full rounded-md bg-gray-50 p-4 mb-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 bg-white rounded-md p-3 flex items-center gap-3 border">
                                        <TrendingUp className="h-5 w-5 text-green-700" />
                                        <div>
                                            <div className="text-xs text-gray-500">Income</div>
                                            <div className="font-display font-semibold">₹ {totals.income.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white rounded-md p-3 flex items-center gap-3 border">
                                        <TrendingDown className="h-5 w-5 text-red-600" />
                                        <div>
                                            <div className="text-xs text-gray-500">Expenses</div>
                                            <div className="font-display font-semibold">₹ {totals.expenses.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white rounded-md p-3 flex items-center gap-3 border">
                                        <IndianRupee className="h-5 w-5 text-blue-600" />
                                        <div>
                                            <div className="text-xs text-gray-500">Savings</div>
                                            <div className="font-display font-semibold">₹ {totals.savings.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Transactions list --- */}
                            <ul className="mt-2 space-y-4 max-h-96 overflow-auto pr-2">
                                {itemsReversed.map((tx) => {
                                    const val = Number(tx.amount || 0);
                                    const sign = tx.type === "expense" ? "-" : "+";
                                    const d = new Date(tx.date);
                                    const dateStr = Number.isFinite(d.getTime()) ? d.toLocaleDateString() : "";
                                    const isEditing = editId === tx.id;

                                    return (
                                        <li
                                            key={tx.id}
                                            className="flex flex-col gap-3 rounded-md border border-gray-200 p-4 bg-white hover:shadow transition overflow-hidden"
                                        >
                                            {/* TOP ROW: left = category or edit inputs, right = price */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                                <div className="flex-1 min-w-0">
                                                    {/* Not editing: show category + date */}
                                                    {!isEditing ? (
                                                        <div className="flex items-start sm:items-center gap-4 min-w-0">
                                                            <span
                                                                className={[
                                                                    "h-2.5 w-2.5 rounded-full mt-1 sm:mt-0 flex-shrink-0",
                                                                    tx.type === "income"
                                                                        ? "bg-green-600"
                                                                        : tx.type === "expense"
                                                                            ? "bg-red-600"
                                                                            : "bg-blue-600",
                                                                ].join(" ")}
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="font-display font-semibold truncate">{tx.category}</p>
                                                                <p className="text-xs text-gray-500">{dateStr}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* EDIT MODE: responsive order for small screens:
                                                           1) category input (full width)
                                                           2) select + amount each half width in a row
                                                           3) Save/Cancel full width (rendered in action row below)
                                                        */
                                                        <div className="w-full max-w-full box-border">
                                                            {/* Category full width */}
                                                            <input
                                                                className="w-full box-border rounded-md border p-2 text-sm mb-2"
                                                                value={editCategory}
                                                                onChange={(e) => setEditCategory(e.target.value)}
                                                                aria-label="Edit category"
                                                            />

                                                            {/* On small screens: select and amount share the row (each half).
                      On larger screens they appear inline and compact.
                  */}
                                                            <div className="flex gap-2">
                                                                <div className="w-1/2">
                                                                    <select
                                                                        className="w-full box-border rounded-md border p-2 text-sm"
                                                                        value={editType}
                                                                        onChange={(e) => setEditType(e.target.value)}
                                                                        aria-label="Edit type"
                                                                    >
                                                                        <option value="expense">Expense</option>
                                                                        <option value="income">Income</option>
                                                                        <option value="savings">Savings</option>
                                                                    </select>
                                                                </div>

                                                                <div className="w-1/2">
                                                                    <input
                                                                        className="w-full box-border rounded-md border p-2 text-sm"
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={editAmount}
                                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                                        aria-label="Edit amount"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Price (right aligned on larger screens) */}
                                                <div className="flex-shrink-0 mt-2 sm:mt-0 ml-0 sm:ml-4">
                                                    <p className="font-display font-semibold text-sm sm:text-lg">
                                                        {sign}₹{val.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* ACTION ROW: Buttons always in their own row below top row.On small screens: Save/Cancel are full-width stacked (when editing),or Edit/Delete are full-width-ish (we wrap them).On larger screens: buttons sit inline to the right */}
                                            <div className="pt-1">
                                                {!isEditing ? (
                                                    <div className="flex flex-wrap items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => startEdit(tx)}
                                                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-indigo-700 min-w-[96px]"
                                                            aria-label="Edit transaction"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                            <span className="text-sm hidden sm:inline">Edit</span>
                                                        </button>

                                                        <button
                                                            onClick={() => removeTx(tx.id)}
                                                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 min-w-[96px]"
                                                            aria-label="Delete transaction"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                            <span className="text-sm hidden sm:inline">Delete</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                                                        <button
                                                            onClick={saveEdit}
                                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                                                            aria-label="Save edit"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            <span className="text-sm">Save</span>
                                                        </button>

                                                        <button
                                                            onClick={cancelEdit}
                                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                                                            aria-label="Cancel edit"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                            <span className="text-sm">Cancel</span>
                                                        </button>
                                                    </div>
                                                )}
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