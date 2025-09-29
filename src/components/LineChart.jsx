import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const formatINR = (n) =>
    typeof n === "number"
        ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
        : n;

export default function LineChart({
    labels = [],
    income = [],
    expenses = [],
    savings = [],
}) {
    // Ensure arrays; never let datasets be undefined
    const safeLabels = Array.isArray(labels) ? labels : [];
    const sIncome = Array.isArray(income) ? income : [];
    const sExpenses = Array.isArray(expenses) ? expenses : [];
    const sSavings = Array.isArray(savings) ? savings : [];

    const data = {
        labels: safeLabels,
        datasets: [
            {
                label: "Income",
                data: sIncome,
                borderColor: "#1F7A33",
                backgroundColor: "rgba(31,122,51,0.15)",
                borderWidth: 2.25,
                tension: 0.35,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
            {
                label: "Expenses",
                data: sExpenses,
                borderColor: "#D14D3A",
                backgroundColor: "rgba(209,77,58,0.12)",
                borderWidth: 2.25,
                tension: 0.35,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
            {
                label: "Savings",
                data: sSavings,
                borderColor: "#2C6CF6",
                backgroundColor: "rgba(44,108,246,0.12)",
                borderWidth: 2.25,
                tension: 0.35,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
        ],
    }; // Always includes datasets array even if empty [web:134][web:132]

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        elements: { line: { borderCapStyle: "round", borderJoinStyle: "round" } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#4B5563", maxTicksLimit: 8 } },
            y: {
                grid: { color: "rgba(17,24,39,0.06)", drawBorder: false },
                ticks: {
                    color: "#4B5563",
                    callback: (v, _i, _a) => formatINR(Number(v) || 0),
                },
            },
        },
        plugins: {
            legend: { position: "top", labels: { color: "#111827", usePointStyle: true, pointStyle: "line" } },
            tooltip: {
                intersect: false,
                mode: "index",
                padding: 10,
                backgroundColor: "rgba(17,24,39,0.95)",
                titleColor: "#F9FAFB",
                bodyColor: "#E5E7EB",
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.parsed.y ?? 0)}`,
                },
            },
        },
    }; // Modern styling with safe callbacks [web:110][web:100]

    // Optional: render nothing until initial labels are available
    if (!safeLabels.length) return <div className="h-56 sm:h-64" />; // prevents early mount errors [web:132]

    return (
        <div className="h-56 sm:h-64">
            <Line data={data} options={options} />
        </div>
    );
}