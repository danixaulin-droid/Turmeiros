import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#FF6B00',
          600: '#E65100',
        },
        grass: {
          500: '#2E7D32',
          600: '#1B5E20',
        }
      },
    },
  },
  plugins: [],
};
export default config;