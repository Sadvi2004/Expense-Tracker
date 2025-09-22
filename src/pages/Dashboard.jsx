import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { initProfileIfMissing, watchTransactions, addTransaction } from "../lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import LineChart from "../components/LineChart";
import { LogOut, Plus, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";

const labelsForMonth = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return days.map(n => n.toString().padStart(2, "0"));
}

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

    useEffect(() => { if (!loading && !user) nav("/"); }, [loading, user, nav]);

    useEffect(() => {
        if (user) {
            initProfileIfMissing(user.uid);
            const unsub = watchTransactions(user.uid, (rows) => {
                setItems(rows);
                localStorage.setItem("et:tx", JSON.stringify(rows));
            });
            return () => unsub();
        }
    }, [user]);

    const totals = useMemo(() => {
        const income = items.filter(i => i.type === "income").reduce((a, b) => a + Number(b.amount || 0), 0);
        const expenses = items.filter(i => i.type === "expense").reduce((a, b) => a + Number(b.amount || 0), 0);
        const savings = items.filter(i => i.type === "savings").reduce((a, b) => a + Number(b.amount || 0), 0);
        const balance = income - expenses;
        return { income, expenses, savings, balance };
    }, [items]);

    const peakExpense = useMemo(() => {
        const ex = items.filter(i => i.type === "expense").sort((a, b) => Number(b.amount) - Number(a.amount));
        return ex[0] ?? null;
    }, [items]);

    const lowExpense = useMemo(() => {
        const ex = items.filter(i => i.type === "expense").sort((a, b) => Number(a.amount) - Number(b.amount));
        return ex[0] ?? null;
    }, [items]);

    const labels = labelsForMonth();
    const grouped = useMemo(() => {
        const map = (t) => {
            const arr = Array(labels.length).fill(0);
            items.filter(i => i.type === t).forEach(i => {
                const d = new Date(i.date ?? Date.now());
                const idx = Math.min(d.getDate() - 1, labels.length - 1);
                arr[idx] += Number(i.amount || 0);
            });
            return arr.map((v, idx) => v + (idx > 0 ? arr[idx - 1] : 0));
        };
        return { income: map("income"), expenses: map("expense"), savings: map("savings") };
    }, [items, labels]);

    const submitTx = async (e) => {
        e.preventDefault();
        if (!user || !amount || !category) return;
        await addTransaction(user.uid, { type, category, amount: Number(amount), date: new Date().toISOString() });
        setAmount(""); setCategory("");
    };

    if (!user) return null;

    return (
        <div className="min-h-screen text-[#1a1a1a]">
            <header className="w-full bg-transparent px-4 sm:px-8 py-4 flex items-center justify-between">
                <div>
                    <h2 className="font-display font-bold text-3xl text-white">Hii {user.displayName?.split(' ')[0] || "User"}</h2>
                    <p className="font-sans text-white/80">Trace your all expenses and transactions</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white/10 rounded-full p-2 pr-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:block text-white font-sans">{user.displayName}</span>
                    </div>
                    <Button variant="secondary" onClick={logout} className="font-display font-semibold">
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                </div>
            </header>

            <section className="px-4 sm:px-8 grid gap-6">
                <Card className="p-4 sm:p-6 bg-white/90 rounded-xl2">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="font-sans text-gray-600">Your Balance</p><p className="font-display font-bold text-2xl">₹ {totals.balance.toLocaleString()}</p></div>
                        <div><p className="font-sans text-gray-600">Total Income</p><p className="font-display font-bold text-2xl">₹ {totals.income.toLocaleString()}</p></div>
                        <div><p className="font-sans text-gray-600">Total Expenses</p><p className="font-display font-bold text-2xl">₹ {totals.expenses.toLocaleString()}</p></div>
                    </div>
                    <div className="mt-6 rounded-xl2 overflow-hidden card-gradient">
                        <LineChart labels={labels} income={grouped.income} expenses={grouped.expenses} savings={grouped.savings} />
                    </div>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-[var(--panel)] rounded-xl2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-display font-bold text-xl">Type of Savings</h3>
                            <span className="font-display font-bold text-xl">Amount</span>
                        </div>

                        <div className="mb-4">
                            <LineChart labels={labels} income={grouped.income} expenses={grouped.expenses} savings={grouped.savings} />
                        </div>

                        <form onSubmit={submitTx} className="mt-4 grid sm:grid-cols-5 gap-3">
                            <select value={type} onChange={e => setType(e.target.value)} className="sm:col-span-1 rounded-md border p-2">
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                                <option value="savings">Savings</option>
                            </select>
                            <Input placeholder="Category e.g. Haircut" value={category} onChange={e => setCategory(e.target.value)} className="sm:col-span-2" />
                            <div className="relative sm:col-span-1">
                                <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="pl-7" />
                            </div>
                            <Button type="submit" className="sm:col-span-1 font-display font-semibold">
                                <Plus className="h-4 w-4 mr-2" /> Add Transaction
                            </Button>
                        </form>

                        <div className="mt-4 text-sm text-gray-600">
                            <p>Peak expense: {peakExpense ? `${peakExpense.category} ₹${peakExpense.amount}` : "—"}</p>
                            <p>Lowest expense: {lowExpense ? `${lowExpense.category} ₹${lowExpense.amount}` : "—"}</p>
                            <p>Overall savings this month: ₹ {(totals.income - totals.expenses).toLocaleString()}</p>
                        </div>
                    </Card>

                    <Card className="p-6 bg-white rounded-xl2">
                        <h3 className="font-display font-bold text-2xl mb-2">Transaction History</h3>
                        <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-md p-3 text-sm">
                            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-700" /> Income ₹ {totals.income.toLocaleString()}</div>
                            <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /> Expenses ₹ {totals.expenses.toLocaleString()}</div>
                            <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-blue-600" /> Savings ₹ {totals.savings.toLocaleString()}</div>
                        </div>

                        <ul className="mt-4 space-y-3 max-h-80 overflow-auto pr-2">
                            {items.slice().reverse().map(tx => (
                                <li key={tx.id} className="flex items-center justify-between rounded-md border p-3 hover:shadow-soft transition-all">
                                    <div className="flex items-center gap-3">
                                        <span className={`h-2.5 w-2.5 rounded-full ${tx.type === "income" ? "bg-green-600" : tx.type === "expense" ? "bg-red-600" : "bg-blue-600"}`} />
                                        <div>
                                            <p className="font-display font-semibold">{tx.category}</p>
                                            <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="font-display font-semibold">
                                        {tx.type === "expense" ? "-" : "+"}₹{Number(tx.amount).toLocaleString()}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </section>
        </div>
    );
}