/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inventory: {
          dark: '#0f172a',      // slate-900 (deep navy)
          darker: '#020617',    // slate-950
          sidebar: '#1e293b',   // slate-800
          card: '#ffffff',
          border: '#e2e8f0',    // slate-200
          surface: '#f8fafc',   // slate-50
          muted: '#64748b',     // slate-500
          primary: '#2563eb',   // blue-600
          primaryHover: '#1d4ed8',
          success: '#10b981',   // emerald-500
          warning: '#f59e0b',   // amber-500
          danger: '#ef4444',    // red-500
          accent: '#6366f1',    // indigo-500
        }
      }
    },
  },
  plugins: [],
}
