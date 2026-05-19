/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // M3-inspired dark theme tokens
        background: '#0f172a',
        'on-background': '#e2e8f0',
        surface: '#131b2e',
        'on-surface': '#e2e8f0',
        'on-surface-variant': '#94a3b8',
        'surface-container': '#1e293b',
        'surface-container-low': '#192337',
        'surface-container-lowest': '#0c1322',
        'surface-container-highest': '#273548',
        'surface-variant': '#334155',
        outline: '#475569',
        'outline-variant': '#334155',
        primary: '#3b82f6',
        'on-primary': '#ffffff',
        'primary-container': '#1e3a5f',
        'on-primary-container': '#93c5fd',
        secondary: '#10b981',
        'on-secondary': '#ffffff',
        'secondary-container': '#064e3b',
        'on-secondary-container': '#6ee7b7',
        tertiary: '#f59e0b',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#78350f',
        'on-tertiary-container': '#fde68a',
        error: '#ef4444',
        'on-error': '#ffffff',
        'error-container': '#450a0a',
        'on-error-container': '#fca5a5',
      },
      keyframes: {
        pulse_alert: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        pulse_alert: 'pulse_alert 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
