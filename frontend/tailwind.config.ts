import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - primary Confident Maroon and Brilliant Gold accent
        brand: {
          primary: {
            DEFAULT: 'rgb(97, 34, 59)',     // Main Confident Maroon #61223B
            50: 'rgb(248, 242, 244)',        // Lightest tint
            100: 'rgb(240, 228, 233)',
            200: 'rgb(224, 201, 211)',
            300: 'rgb(207, 173, 188)',
            400: 'rgb(152, 104, 124)',
            500: 'rgb(97, 34, 59)',          // Base color
            600: 'rgb(87, 31, 53)',
            700: 'rgb(73, 26, 45)',
            800: 'rgb(58, 20, 36)',
            900: 'rgb(49, 17, 30)',          // Darkest shade
          },
          accent: {
            DEFAULT: 'rgb(183, 153, 98)',    // Brilliant Gold accent #B79962
            50: 'rgb(250, 247, 241)',        // Lightest tint
            100: 'rgb(244, 239, 227)',
            200: 'rgb(234, 223, 199)',
            300: 'rgb(223, 206, 170)',
            400: 'rgb(203, 180, 134)',
            500: 'rgb(183, 153, 98)',        // Base color
            600: 'rgb(165, 138, 88)',
            700: 'rgb(138, 115, 73)',
            800: 'rgb(110, 92, 59)',
            900: 'rgb(92, 77, 49)',          // Darkest shade
          },
        },
      },
      fontFamily: {
        raleway: ['SU-raleway', 'sans-serif'],
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        'xs': '20rem',
      },
      maxHeight: {
        '1/3': '33.333333%',
        '1/2': '50%',
        '2/3': '66.666667%',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
