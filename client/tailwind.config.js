/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec8ff',
          400: '#59aaff',
          500: '#3389ff',
          600: '#1d6af5',
          700: '#1553e1',
          800: '#1745b6',
          900: '#193e90',
          950: '#142757'
        },
        positive: '#16a34a',
        caution: '#d97706',
        severe: '#dc2626'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,42,90,0.04), 0 8px 24px -12px rgba(16,42,90,0.12)',
        'card-hover': '0 2px 4px rgba(16,42,90,0.06), 0 16px 40px -16px rgba(16,42,90,0.22)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'sans-serif']
      }
    }
  },
  plugins: []
};