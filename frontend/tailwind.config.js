module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "gray-750": "#1e2533",
        "gray-850": "#141a24",
      },
      typography: (theme) => ({
        invert: {
          css: {
            color: theme("colors.gray.200"),
            a: {
              color: theme("colors.blue.400"),
              "&:hover": {
                color: theme("colors.blue.300"),
              },
            },
            strong: { color: theme("colors.gray.100") },
            "ol > li::before": { color: theme("colors.gray.400") },
            "ul > li::before": { backgroundColor: theme("colors.gray.600") },
            hr: { borderColor: theme("colors.gray.700") },
            blockquote: {
              color: theme("colors.gray.200"),
              borderLeftColor: theme("colors.gray.600"),
            },
            h1: { color: theme("colors.gray.100") },
            h2: { color: theme("colors.gray.100") },
            h3: { color: theme("colors.gray.100") },
            h4: { color: theme("colors.gray.100") },
            "figure figcaption": { color: theme("colors.gray.400") },
            code: { color: theme("colors.gray.100") },
            "a code": { color: theme("colors.blue.400") },
            pre: {
              color: theme("colors.gray.200"),
              backgroundColor: theme("colors.gray.800"),
            },
            thead: {
              color: theme("colors.gray.100"),
              borderBottomColor: theme("colors.gray.600"),
            },
            "tbody tr": { borderBottomColor: theme("colors.gray.700") },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
