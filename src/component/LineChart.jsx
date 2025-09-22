import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler
} from "chart.js";
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

export default function LineChart({ labels, income = [], expenses = [], savings = [] }) {
    const data = {
        labels,
        datasets: [
            { label: "Income", data: income, borderColor: "#1F7A33", backgroundColor: "rgba(31,122,51,0.15)", tension: 0.35, fill: true },
            { label: "Expenses", data: expenses, borderColor: "#D14D3A", backgroundColor: "rgba(209,77,58,0.12)", tension: 0.35, fill: true },
            { label: "Savings", data: savings, borderColor: "#2C6CF6", backgroundColor: "rgba(44,108,246,0.12)", tension: 0.35, fill: true },
        ]
    };
    const options = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeInOutQuart" },
        interaction: { intersect: false, mode: "index" },
        scales: { y: { grid: { color: "rgba(0,0,0,0.06)" } }, x: { grid: { display: false } } },
        plugins: { legend: { labels: { color: "#111" } }, tooltip: { mode: "index", intersect: false } }
    };
    return <div className="h-56 sm:h-64"><Line data={data} options={options} /></div>;
}