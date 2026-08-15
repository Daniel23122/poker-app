/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0D1210',
        surface: '#141B18',
        panel: '#1B2420',
        felt: '#0F3D2E',
        feltdark: '#0A2A20',
        rail: '#241A12',
        brass: '#C9A15F',
        brasslight: '#E4C88A',
        cream: '#EDE6D6',
        muted: '#8A9690',
        danger: '#C25B4A',
        okgreen: '#5FA37A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        felt: 'inset 0 0 120px rgba(0,0,0,0.55), inset 0 0 0 14px rgba(36,26,18,0.9)',
        card: '0 4px 20px rgba(0,0,0,0.35)',
      },
      keyframes: {
        chipPop: {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        potPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
      },
      animation: {
        chipPop: 'chipPop 0.2s ease-out',
        potPulse: 'potPulse 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
