import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        dotgothic: ['DotGothic16', 'sans-serif'],
      },
      colors: {
        'phosphor': {
          DEFAULT: '#33ff00',
          dim: '#005500',
          bright: '#66ff33',
        },
        'terminal': {
          bg: '#050505',
          dark: '#020a02',
        },
      },
      animation: {
        'flicker': 'flicker 0.15s infinite',
        'glitch': 'glitch 0.3s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '0.97' },
          '10%': { opacity: '0.9' },
          '30%': { opacity: '0.95' },
          '50%': { opacity: '0.99' },
          '70%': { opacity: '0.93' },
          '90%': { opacity: '0.96' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
