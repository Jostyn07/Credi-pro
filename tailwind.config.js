/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B1F33', // Primario
          active: '#2879AD',  // Azul activo
        },
        accent: '#1D5F8C',    // Azul principal
        surface: {
          DEFAULT: '#F8FAFC', // Fondo
          card: '#FFFFFF',    // Cards
          dark: '#0B1220',    // Dark mode
        },
        status: {
          success: '#16A34A',
          warning: '#EAB308',
          danger: '#DC2626',
          info: '#2879AD',
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
