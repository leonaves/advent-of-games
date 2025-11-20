/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,astro}',
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
    '../../apps/*/src/**/*.{astro,html,js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        christmas: {
          red: '#FF003C',
          green: '#00F3FF',
          gold: '#F8B229',
          midnight: '#050B14',
        },
        neon: {
          blue: '#00F3FF',
          pink: '#FF003C',
          purple: '#BC13FE',
          green: '#00FF9D',
        },
        glass: {
          border: 'rgba(255, 255, 255, 0.1)',
          surface: 'rgba(255, 255, 255, 0.05)',
          highlight: 'rgba(255, 255, 255, 0.2)',
        }
      },
      fontFamily: {
        sans: ['VT323', 'monospace'],
        display: ['"Press Start 2P"', 'monospace'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    }
  },
  plugins: []
}
