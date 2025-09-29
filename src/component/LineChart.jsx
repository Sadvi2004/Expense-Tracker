import { useMemo, useRef } from "react";
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

const rupee = (n) =>
    typeof n === "number"
        ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
        : n; // ₹ formatting

const compact = (n) =>
    typeof n === "number"
        ? n.toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })
        : n; // compact for small screens

export default function LineChart({ labels, income = [], expenses = [], savings = [] }) {
    const canvasRef = useRef(null);

    // Build gradients once per size using chart area dimensions
    const datasets = useMemo(() => {
        const build = (ctx, chartArea, color) => {
            if (!ctx || !chartArea) return color;
            const { top, bottom } = chartArea;
            const grad = ctx.createLinearGradient(0, top, 0, bottom);
            grad.addColorStop(0, `${color}1A`); // ~10% opacity
            grad.addColorStop(1, `${color}00`); // transparent
            return grad;
        };
        return { build };
    }, []); // gradient builder

    const data = (canvas) => {
        const chart = canvas?.chart || {};
        const ctx = canvas?.getContext?.("2d");
        const area = chart.chartArea;

        // Define palette (hex without alpha) and compute gradients per dataset
        const pal = {
            income: "#1F7A33",
            expenses: "#D14D3A",
            savings: "#2C6CF6",
        }; // palette

        const gIncome = datasets.build(ctx, area, pal.income.replace("#", "#"));
        const gExpenses = datasets.build(ctx, area, pal.expenses.replace("#", "#"));
        const gSavings = datasets.build(ctx, area, pal.savings.replace("#", "#"));

        return {
            labels,
            datasets: [
                {
                    label: "Income",
                    data: income,
                    borderColor: pal.income,
                    backgroundColor: gIncome || "rgba(31,122,51,0.12)",
                    pointBackgroundColor: "#fff",
                    pointBorderColor: pal.income,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2.25,
                },
                {
                    label: "Expenses",
                    data: expenses,
                    borderColor: pal.expenses,
                    backgroundColor: gExpenses || "rgba(209,77,58,0.10)",
                    pointBackgroundColor: "#fff",
                    pointBorderColor: pal.expenses,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2.25,
                },
                {
                    label: "Savings",
                    data: savings,
                    borderColor: pal.savings,
                    backgroundColor: gSavings || "rgba(44,108,246,0.10)",
                    pointBackgroundColor: "#fff",
                    pointBorderColor: pal.savings,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2.25,
                },
            ],
        };
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animations: {
            tension: { duration: 800, easing: "easeInOutQuad", from: 0.2, to: 0.35, loop: false },
        },
        interaction: { intersect: false, mode: "index" },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: "#4B5563", maxTicksLimit: 8 },
            },
            y: {
                grid: { color: "rgba(17,24,39,0.06)", drawBorder: false },
                ticks: {
                    color: "#4B5563",
                    callback: function (val) {
                        return this.chart.width < 420 ? compact(val) : rupee(val);
                    },
                },
            },
        },
        plugins: {
            legend: {
                position: "top",
                labels: {
                    color: "#111827",
                    usePointStyle: true,
                    pointStyle: "line",
                    padding: 16,
                },
            },
            tooltip: {
                intersect: false,
                mode: "index",
                padding: 10,
                backgroundColor: "rgba(17,24,39,0.95)",
                titleColor: "#F9FAFB",
                bodyColor: "#E5E7EB",
                callbacks: {
                    label: (ctx) => {
                        const v = ctx.parsed.y ?? 0;
                        return `${ctx.dataset.label}: ${rupee(v)}`;
                    },
                },
            },
        },
        elements: {
            line: {
                borderCapStyle: "round",
                borderJoinStyle: "round",
            },
            point: { hitRadius: 10, hoverBorderWidth: 2 },
        },
    };
    return (
        <div ref={canvasRef} className="h-64 sm:h-72 lg:h-80">
            <Line data={data} options={options} />
        </div>
    );
}