/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                // design palette derived from screenshots
                charcoal: "#2F2F36",
                panel: "#F5F1EC",
                greenLine: "#1F7A33",
                redLine: "#D14D3A",
                blueLine: "#2C6CF6",
                accent: "#2E7D32",
            },
            fontFamily: {
                display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
                sans: ['Inter', "system-ui", "sans-serif"],
            },
            boxShadow: {
                soft: "0 10px 20px rgba(0,0,0,0.08)",
            },
            borderRadius: {
                xl2: "1.25rem",
            },
        },
    },
    plugins: [],
}