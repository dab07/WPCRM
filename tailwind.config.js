/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:        '#3B5BAD',
          yellow:      '#F7C31A',
          navy:        '#1A2847',
          offwhite:    '#F4F6FB',
          slate:       '#2C3A5C',
          muted:       '#8A96B0',
          border:      'rgba(59,91,173,0.18)',
          'yellow-glow': 'rgba(247,195,26,0.12)',
          'navy-dark':   '#0F1A30',
        },
      },
      fontFamily: {
        display:  ['Syne', 'sans-serif'],
        heading:  ['Manrope', 'sans-serif'],
        body:     ['Inter', 'DM Sans', 'sans-serif'],
        mono:     ['Space Mono', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm:      '2px',
        md:      '4px',
        lg:      '4px',
        xl:      '4px',
        '2xl':   '4px',
        full:    '9999px',
      },
      boxShadow: {
        'yellow-glow': '0 0 0 3px rgba(247,195,26,0.25)',
        'card-hover':  '0 4px 24px rgba(26,40,71,0.4)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.02em',
        label:    '0.12em',
        widest:   '0.2em',
      },
      backgroundImage: {
        'diagonal-slash': 'linear-gradient(15deg, transparent 48%, rgba(247,195,26,0.20) 50%, rgba(247,195,26,0.20) 52%, transparent 54%)',
        'pixel-texture':  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%233B5BAD' fill-opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
