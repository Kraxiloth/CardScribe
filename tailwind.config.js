/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        crimson: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono: ['"Courier New"', 'monospace'],
      },
      colors: {
        bg: {
          deepest: '#0a0908',
          dark:    '#110f0d',
          surface: '#1a1612',
          raised:  '#221e19',
          hover:   '#2a2520',
        },
        border: {
          DEFAULT: '#3a3028',
          bright:  '#5a4a38',
        },
        gold: {
          DEFAULT: '#c9a84c',
          bright:  '#e8c96a',
          dim:     '#7a6030',
        },
        amber:   '#d4771a',
        text: {
          primary:   '#e8e0d0',
          secondary: '#9a8878',
          dim:       '#5a4e42',
        },
        rarity: {
          ordinary:    '#8a9aaa',
          exceptional: '#6aaa6a',
          elite:       '#9a6aee',
          unique:      '#e8a040',
        },
        finish: {
          foil:    '#7adde8',
          rainbow: '#e87ad8',
        },
        danger:  '#cc4444',
        success: '#4a9a5a',
      },
    },
  },
  plugins: [],
}
