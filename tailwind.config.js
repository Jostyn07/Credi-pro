/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#0B1F33',
          800: '#12304A',
          700: '#17496B',
          600: '#1D5F8C',
          500: '#2879AD',
          400: '#4B97C5',
          300: '#7DB5D6',
          200: '#B6D5E7',
          100: '#E5F1F7',
          DEFAULT: '#0B1F33',
          active: '#2879AD',
        },
        accent: '#1D5F8C',
        success: {
          700: '#166534',
          600: '#16803C',
          500: '#22A05A',
          100: '#DCFCE7',
        },
        warning: {
          700: '#92400E',
          600: '#B45309',
          500: '#D97706',
          100: '#FEF3C7',
        },
        danger: {
          700: '#991B1B',
          600: '#DC2626',
          500: '#EF4444',
          100: '#FEE2E2',
        },
        info: {
          700: '#075985',
          500: '#0284C7',
          100: '#E0F2FE',
        },
        neutral: {
          950: '#0F172A',
          900: '#172033',
          800: '#253044',
          700: '#344054',
          600: '#475467',
          500: '#667085',
          400: '#98A2B3',
          300: '#D0D5DD',
          200: '#E4E7EC',
          100: '#F2F4F7',
          50: '#F8FAFC',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          card: '#FFFFFF',
          secondary: '#F2F4F7',
          dark: '#0B1220',
        },
        status: {
          success: '#22A05A',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#0284C7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      spacing: {
        sidebar: '248px',
      },
      gridTemplateColumns: {
        12: 'repeat(12, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}