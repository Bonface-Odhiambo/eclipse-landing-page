import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",         // Scans only the pages folder
    "./components/**/*.{js,ts,jsx,tsx,mdx}",    // Scans only the components folder
    "./app/**/*.{js,ts,jsx,tsx,mdx}",           // Scans only the app folder
    "!./node_modules",                          // Excludes node_modules entirely
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary-color)",
        secondary: "var(--secondary-color)",
        'text-primary': "var(--text-color)",
        'card-bg': "var(--card-bg)",
        'hover': "var(--hover-color)",
        success: "var(--success-color)",
        warning: "var(--warning-color)",
        danger: "var(--danger-color)",
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      },
      height: {
        header: 'var(--header-height)',
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        header: 'var(--header-height)',
      },
    },
  },
  plugins: [],
};

export default config;
