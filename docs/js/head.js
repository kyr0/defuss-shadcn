(() => {
  // src/documentation/runtime/themes.ts
  (function() {
    var docs = {};
    document.addEventListener("DOMContentLoaded", function() {
      var ns = globalThis.df$ && globalThis.df$.shadcn;
      if (!ns)
        return;
      var live = ns.docs = ns.docs || {};
      for (var k in docs)
        if (!(k in live))
          live[k] = docs[k];
      docs = live;
    });
    docs.THEMES = [
      {
        id: "default",
        label: "Default"
      },
      {
        id: "claude",
        label: "Claude",
        styles: {
          light: {
            background: "#faf9f5",
            foreground: "#3d3929",
            card: "#faf9f5",
            "card-foreground": "#141413",
            popover: "#ffffff",
            "popover-foreground": "#28261b",
            primary: "#c96442",
            "primary-foreground": "#ffffff",
            secondary: "#e9e6dc",
            "secondary-foreground": "#535146",
            muted: "#ede9de",
            "muted-foreground": "#83827d",
            accent: "#e9e6dc",
            "accent-foreground": "#28261b",
            destructive: "#141413",
            "destructive-foreground": "#ffffff",
            border: "#dad9d4",
            input: "#b4b2a7",
            ring: "#c96442",
            "chart-1": "#b05730",
            "chart-2": "#9c87f5",
            "chart-3": "#ded8c4",
            "chart-4": "#dbd3f0",
            "chart-5": "#b4552d",
            sidebar: "#f5f4ee",
            "sidebar-foreground": "#3d3d3a",
            "sidebar-primary": "#c96442",
            "sidebar-primary-foreground": "#fbfbfb",
            "sidebar-accent": "#e9e6dc",
            "sidebar-accent-foreground": "#343434",
            "sidebar-border": "#ebebeb",
            "sidebar-ring": "#b5b5b5",
            radius: "0.5rem"
          },
          dark: {
            background: "#262624",
            foreground: "#c3c0b6",
            card: "#262624",
            "card-foreground": "#faf9f5",
            popover: "#30302e",
            "popover-foreground": "#e5e5e2",
            primary: "#d97757",
            "primary-foreground": "#ffffff",
            secondary: "#faf9f5",
            "secondary-foreground": "#30302e",
            muted: "#1b1b19",
            "muted-foreground": "#b7b5a9",
            accent: "#1a1915",
            "accent-foreground": "#f5f4ee",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#3e3e38",
            input: "#52514a",
            ring: "#d97757",
            "chart-1": "#b05730",
            "chart-2": "#9c87f5",
            "chart-3": "#1a1915",
            "chart-4": "#2f2b48",
            "chart-5": "#b4552d",
            sidebar: "#1f1e1d",
            "sidebar-foreground": "#c3c0b6",
            "sidebar-primary": "#343434",
            "sidebar-primary-foreground": "#fbfbfb",
            "sidebar-accent": "#0f0f0e",
            "sidebar-accent-foreground": "#c3c0b6",
            "sidebar-border": "#ebebeb",
            "sidebar-ring": "#b5b5b5",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "vercel",
        label: "Vercel",
        styles: {
          light: {
            background: "oklch(0.99 0 0)",
            foreground: "oklch(0 0 0)",
            card: "oklch(1.00 0 0)",
            "card-foreground": "oklch(0 0 0)",
            popover: "oklch(0.99 0 0)",
            "popover-foreground": "oklch(0 0 0)",
            primary: "oklch(0 0 0)",
            "primary-foreground": "oklch(1.00 0 0)",
            secondary: "oklch(0.94 0 0)",
            "secondary-foreground": "oklch(0 0 0)",
            muted: "oklch(0.97 0 0)",
            "muted-foreground": "oklch(0.44 0 0)",
            accent: "oklch(0.94 0 0)",
            "accent-foreground": "oklch(0 0 0)",
            destructive: "oklch(0.63 0.19 23.03)",
            "destructive-foreground": "oklch(1.00 0 0)",
            border: "oklch(0.92 0 0)",
            input: "oklch(0.94 0 0)",
            ring: "oklch(0 0 0)",
            "chart-1": "oklch(0.81 0.17 75.35)",
            "chart-2": "oklch(0.55 0.22 264.53)",
            "chart-3": "oklch(0.72 0 0)",
            "chart-4": "oklch(0.92 0 0)",
            "chart-5": "oklch(0.56 0 0)",
            sidebar: "oklch(0.99 0 0)",
            "sidebar-foreground": "oklch(0 0 0)",
            "sidebar-primary": "oklch(0 0 0)",
            "sidebar-primary-foreground": "oklch(1.00 0 0)",
            "sidebar-accent": "oklch(0.94 0 0)",
            "sidebar-accent-foreground": "oklch(0 0 0)",
            "sidebar-border": "oklch(0.94 0 0)",
            "sidebar-ring": "oklch(0 0 0)",
            radius: "0.5rem"
          },
          dark: {
            background: "oklch(0 0 0)",
            foreground: "oklch(1.00 0 0)",
            card: "oklch(0.14 0 0)",
            "card-foreground": "oklch(1.00 0 0)",
            popover: "oklch(0.18 0 0)",
            "popover-foreground": "oklch(1.00 0 0)",
            primary: "oklch(1.00 0 0)",
            "primary-foreground": "oklch(0 0 0)",
            secondary: "oklch(0.25 0 0)",
            "secondary-foreground": "oklch(1.00 0 0)",
            muted: "oklch(0.23 0 0)",
            "muted-foreground": "oklch(0.72 0 0)",
            accent: "oklch(0.32 0 0)",
            "accent-foreground": "oklch(1.00 0 0)",
            destructive: "oklch(0.69 0.20 23.91)",
            "destructive-foreground": "oklch(0 0 0)",
            border: "oklch(0.26 0 0)",
            input: "oklch(0.32 0 0)",
            ring: "oklch(0.72 0 0)",
            "chart-1": "oklch(0.81 0.17 75.35)",
            "chart-2": "oklch(0.58 0.21 260.84)",
            "chart-3": "oklch(0.56 0 0)",
            "chart-4": "oklch(0.44 0 0)",
            "chart-5": "oklch(0.92 0 0)",
            sidebar: "oklch(0.18 0 0)",
            "sidebar-foreground": "oklch(1.00 0 0)",
            "sidebar-primary": "oklch(1.00 0 0)",
            "sidebar-primary-foreground": "oklch(0 0 0)",
            "sidebar-accent": "oklch(0.32 0 0)",
            "sidebar-accent-foreground": "oklch(1.00 0 0)",
            "sidebar-border": "oklch(0.32 0 0)",
            "sidebar-ring": "oklch(0.72 0 0)",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "violet-bloom",
        label: "Violet Bloom",
        styles: {
          light: {
            background: "#fdfdfd",
            foreground: "#000000",
            card: "#fdfdfd",
            "card-foreground": "#000000",
            popover: "#fcfcfc",
            "popover-foreground": "#000000",
            primary: "#7033ff",
            "primary-foreground": "#ffffff",
            secondary: "#edf0f4",
            "secondary-foreground": "#080808",
            muted: "#f5f5f5",
            "muted-foreground": "#525252",
            accent: "#e2ebff",
            "accent-foreground": "#1e69dc",
            destructive: "#e54b4f",
            "destructive-foreground": "#ffffff",
            border: "#e7e7ee",
            input: "#ebebeb",
            ring: "#000000",
            "chart-1": "#4ac885",
            "chart-2": "#7033ff",
            "chart-3": "#fd822b",
            "chart-4": "#3276e4",
            "chart-5": "#747474",
            sidebar: "#f5f8fb",
            "sidebar-foreground": "#000000",
            "sidebar-primary": "#000000",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#ebebeb",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#ebebeb",
            "sidebar-ring": "#000000",
            radius: "1.4rem"
          },
          dark: {
            background: "#1a1b1e",
            foreground: "#f0f0f0",
            card: "#222327",
            "card-foreground": "#f0f0f0",
            popover: "#222327",
            "popover-foreground": "#f0f0f0",
            primary: "#8c5cff",
            "primary-foreground": "#ffffff",
            secondary: "#2a2c33",
            "secondary-foreground": "#f0f0f0",
            muted: "#2a2c33",
            "muted-foreground": "#a0a0a0",
            accent: "#1e293b",
            "accent-foreground": "#79c0ff",
            destructive: "#f87171",
            "destructive-foreground": "#ffffff",
            border: "#33353a",
            input: "#33353a",
            ring: "#8c5cff",
            "chart-1": "#4ade80",
            "chart-2": "#8c5cff",
            "chart-3": "#fca5a5",
            "chart-4": "#5993f4",
            "chart-5": "#a0a0a0",
            sidebar: "#161618",
            "sidebar-foreground": "#f0f0f0",
            "sidebar-primary": "#8c5cff",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#2a2c33",
            "sidebar-accent-foreground": "#a78bff",
            "sidebar-border": "#33353a",
            "sidebar-ring": "#8c5cff",
            radius: "1.4rem"
          }
        }
      },
      {
        id: "catppuccin",
        label: "Catppuccin",
        styles: {
          light: {
            background: "#eff1f5",
            foreground: "#4c4f69",
            card: "#ffffff",
            "card-foreground": "#4c4f69",
            popover: "#ccd0da",
            "popover-foreground": "#4c4f69",
            primary: "#8839ef",
            "primary-foreground": "#ffffff",
            secondary: "#ccd0da",
            "secondary-foreground": "#4c4f69",
            muted: "#dce0e8",
            "muted-foreground": "#6c6f85",
            accent: "#04a5e5",
            "accent-foreground": "#ffffff",
            destructive: "#d20f39",
            "destructive-foreground": "#ffffff",
            border: "#bcc0cc",
            input: "#ccd0da",
            ring: "#8839ef",
            "chart-1": "#8839ef",
            "chart-2": "#04a5e5",
            "chart-3": "#40a02b",
            "chart-4": "#fe640b",
            "chart-5": "#dc8a78",
            sidebar: "#e6e9ef",
            "sidebar-foreground": "#4c4f69",
            "sidebar-primary": "#8839ef",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#0e6da3",
            "sidebar-accent-foreground": "#fdf2f8",
            "sidebar-border": "#bcc0cc",
            "sidebar-ring": "#8839ef",
            radius: "0.35rem"
          },
          dark: {
            background: "#181825",
            foreground: "#cdd6f4",
            card: "#1e1e2e",
            "card-foreground": "#cdd6f4",
            popover: "#45475a",
            "popover-foreground": "#cdd6f4",
            primary: "#cba6f7",
            "primary-foreground": "#1e1e2e",
            secondary: "#585b70",
            "secondary-foreground": "#cdd6f4",
            muted: "#292c3c",
            "muted-foreground": "#a6adc8",
            accent: "#89dceb",
            "accent-foreground": "#1e1e2e",
            destructive: "#f38ba8",
            "destructive-foreground": "#1e1e2e",
            border: "#313244",
            input: "#313244",
            ring: "#cba6f7",
            "chart-1": "#cba6f7",
            "chart-2": "#89dceb",
            "chart-3": "#a6e3a1",
            "chart-4": "#fab387",
            "chart-5": "#f5e0dc",
            sidebar: "#11111b",
            "sidebar-foreground": "#cdd6f4",
            "sidebar-primary": "#cba6f7",
            "sidebar-primary-foreground": "#1e1e2e",
            "sidebar-accent": "#89dceb",
            "sidebar-accent-foreground": "#1e1e2e",
            "sidebar-border": "#45475a",
            "sidebar-ring": "#cba6f7",
            radius: "0.35rem"
          }
        }
      },
      {
        id: "twitter",
        label: "Twitter",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#0f1419",
            card: "#f7f8f8",
            "card-foreground": "#0f1419",
            popover: "#ffffff",
            "popover-foreground": "#0f1419",
            primary: "#1e9df1",
            "primary-foreground": "#ffffff",
            secondary: "#0f1419",
            "secondary-foreground": "#ffffff",
            muted: "#E5E5E6",
            "muted-foreground": "#0f1419",
            accent: "#E3ECF6",
            "accent-foreground": "#1e9df1",
            destructive: "#f4212e",
            "destructive-foreground": "#ffffff",
            border: "#e1eaef",
            input: "#f7f9fa",
            ring: "#1da1f2",
            "chart-1": "#1e9df1",
            "chart-2": "#00b87a",
            "chart-3": "#f7b928",
            "chart-4": "#17bf63",
            "chart-5": "#e0245e",
            sidebar: "#f7f8f8",
            "sidebar-foreground": "#0f1419",
            "sidebar-primary": "#1e9df1",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#E3ECF6",
            "sidebar-accent-foreground": "#0b5f96",
            "sidebar-border": "#e1e8ed",
            "sidebar-ring": "#1da1f2",
            radius: "1.3rem"
          },
          dark: {
            background: "#000000",
            foreground: "#e7e9ea",
            card: "#17181c",
            "card-foreground": "#d9d9d9",
            popover: "#000000",
            "popover-foreground": "#e7e9ea",
            primary: "#1c9cf0",
            "primary-foreground": "#ffffff",
            secondary: "#f0f3f4",
            "secondary-foreground": "#0f1419",
            muted: "#181818",
            "muted-foreground": "#72767a",
            accent: "#061622",
            "accent-foreground": "#1c9cf0",
            destructive: "#f4212e",
            "destructive-foreground": "#ffffff",
            border: "#242628",
            input: "#22303c",
            ring: "#1da1f2",
            "chart-1": "#1e9df1",
            "chart-2": "#00b87a",
            "chart-3": "#f7b928",
            "chart-4": "#17bf63",
            "chart-5": "#e0245e",
            sidebar: "#17181c",
            "sidebar-foreground": "#d9d9d9",
            "sidebar-primary": "#1da1f2",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#061622",
            "sidebar-accent-foreground": "#1c9cf0",
            "sidebar-border": "#38444d",
            "sidebar-ring": "#1da1f2",
            radius: "1.3rem"
          }
        }
      },
      {
        id: "t3-chat",
        label: "T3 Chat",
        styles: {
          light: {
            background: "#faf5fa",
            foreground: "#501854",
            card: "#faf5fa",
            "card-foreground": "#501854",
            popover: "#ffffff",
            "popover-foreground": "#501854",
            primary: "#a84370",
            "primary-foreground": "#ffffff",
            secondary: "#f1c4e6",
            "secondary-foreground": "#77347c",
            muted: "#f6e5f3",
            "muted-foreground": "#834588",
            accent: "#f1c4e6",
            "accent-foreground": "#77347c",
            destructive: "#ab4347",
            "destructive-foreground": "#ffffff",
            border: "#efbdeb",
            input: "#e7c1dc",
            ring: "#db2777",
            "chart-1": "#d926a2",
            "chart-2": "#6c12b9",
            "chart-3": "#274754",
            "chart-4": "#e8c468",
            "chart-5": "#f4a462",
            sidebar: "#f3e4f6",
            "sidebar-foreground": "#ac1668",
            "sidebar-primary": "#454554",
            "sidebar-primary-foreground": "#faf1f7",
            "sidebar-accent": "#f8f8f7",
            "sidebar-accent-foreground": "#454554",
            "sidebar-border": "#eceae9",
            "sidebar-ring": "#db2777",
            radius: "0.5rem"
          },
          dark: {
            background: "#221d27",
            foreground: "#d2c4de",
            card: "#2c2632",
            "card-foreground": "#dbc5d2",
            popover: "#100a0e",
            "popover-foreground": "#f8f1f5",
            primary: "#a3004c",
            "primary-foreground": "#efc0d8",
            secondary: "#362d3d",
            "secondary-foreground": "#d4c7e1",
            muted: "#28222d",
            "muted-foreground": "#c2b6cf",
            accent: "#463753",
            "accent-foreground": "#f8f1f5",
            destructive: "#301015",
            "destructive-foreground": "#ffffff",
            border: "#3b3237",
            input: "#3e343c",
            ring: "#db2777",
            "chart-1": "#a84370",
            "chart-2": "#934dcb",
            "chart-3": "#e88c30",
            "chart-4": "#af57db",
            "chart-5": "#e23670",
            sidebar: "#181117",
            "sidebar-foreground": "#e0cad6",
            "sidebar-primary": "#1d4ed8",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#261922",
            "sidebar-accent-foreground": "#f4f4f5",
            "sidebar-border": "#000000",
            "sidebar-ring": "#db2777",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "supabase",
        label: "Supabase",
        styles: {
          light: {
            background: "#fcfcfc",
            foreground: "#171717",
            card: "#fcfcfc",
            "card-foreground": "#171717",
            popover: "#fcfcfc",
            "popover-foreground": "#525252",
            primary: "#72e3ad",
            "primary-foreground": "#1e2723",
            secondary: "#fdfdfd",
            "secondary-foreground": "#171717",
            muted: "#ededed",
            "muted-foreground": "#202020",
            accent: "#ededed",
            "accent-foreground": "#202020",
            destructive: "#ca3214",
            "destructive-foreground": "#fffcfc",
            border: "#dfdfdf",
            input: "#f6f6f6",
            ring: "#72e3ad",
            "chart-1": "#72e3ad",
            "chart-2": "#3b82f6",
            "chart-3": "#8b5cf6",
            "chart-4": "#f59e0b",
            "chart-5": "#10b981",
            sidebar: "#fcfcfc",
            "sidebar-foreground": "#707070",
            "sidebar-primary": "#72e3ad",
            "sidebar-primary-foreground": "#1e2723",
            "sidebar-accent": "#ededed",
            "sidebar-accent-foreground": "#202020",
            "sidebar-border": "#dfdfdf",
            "sidebar-ring": "#72e3ad",
            radius: "0.5rem"
          },
          dark: {
            background: "#121212",
            foreground: "#e2e8f0",
            card: "#171717",
            "card-foreground": "#e2e8f0",
            popover: "#242424",
            "popover-foreground": "#a9a9a9",
            primary: "#006239",
            "primary-foreground": "#dde8e3",
            secondary: "#242424",
            "secondary-foreground": "#fafafa",
            muted: "#1f1f1f",
            "muted-foreground": "#a2a2a2",
            accent: "#313131",
            "accent-foreground": "#fafafa",
            destructive: "#541c15",
            "destructive-foreground": "#ede9e8",
            border: "#292929",
            input: "#242424",
            ring: "#4ade80",
            "chart-1": "#4ade80",
            "chart-2": "#60a5fa",
            "chart-3": "#a78bfa",
            "chart-4": "#fbbf24",
            "chart-5": "#2dd4bf",
            sidebar: "#121212",
            "sidebar-foreground": "#898989",
            "sidebar-primary": "#006239",
            "sidebar-primary-foreground": "#dde8e3",
            "sidebar-accent": "#313131",
            "sidebar-accent-foreground": "#fafafa",
            "sidebar-border": "#292929",
            "sidebar-ring": "#4ade80",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "mocha-mousse",
        label: "Mocha Mousse",
        styles: {
          light: {
            background: "#F1F0E5",
            foreground: "#56453F",
            card: "#F1F0E5",
            "card-foreground": "#56453F",
            popover: "#FFFFFF",
            "popover-foreground": "#56453F",
            primary: "#A37764",
            "primary-foreground": "#FFFFFF",
            secondary: "#BAAB92",
            "secondary-foreground": "#ffffff",
            muted: "#E4C7B8",
            "muted-foreground": "#8A655A",
            accent: "#E4C7B8",
            "accent-foreground": "#56453F",
            destructive: "#1f1a17",
            "destructive-foreground": "#FFFFFF",
            border: "#BAAB92",
            input: "#BAAB92",
            ring: "#A37764",
            "chart-1": "#A37764",
            "chart-2": "#8A655A",
            "chart-3": "#C39E88",
            "chart-4": "#BAAB92",
            "chart-5": "#A28777",
            sidebar: "#ebd6cb",
            "sidebar-foreground": "#56453F",
            "sidebar-primary": "#A37764",
            "sidebar-primary-foreground": "#FFFFFF",
            "sidebar-accent": "#C39E88",
            "sidebar-accent-foreground": "#3a2a1e",
            "sidebar-border": "#A28777",
            "sidebar-ring": "#A37764",
            radius: "0.5rem"
          },
          dark: {
            background: "#2d2521",
            foreground: "#F1F0E5",
            card: "#3c332e",
            "card-foreground": "#F1F0E5",
            popover: "#3c332e",
            "popover-foreground": "#F1F0E5",
            primary: "#C39E88",
            "primary-foreground": "#2d2521",
            secondary: "#8A655A",
            "secondary-foreground": "#F1F0E5",
            muted: "#56453F",
            "muted-foreground": "#c5aa9b",
            accent: "#BAAB92",
            "accent-foreground": "#2d2521",
            destructive: "#E57373",
            "destructive-foreground": "#2d2521",
            border: "#56453F",
            input: "#56453F",
            ring: "#C39E88",
            "chart-1": "#C39E88",
            "chart-2": "#BAAB92",
            "chart-3": "#A37764",
            "chart-4": "#8A655A",
            "chart-5": "#A28777",
            sidebar: "#1f1a17",
            "sidebar-foreground": "#F1F0E5",
            "sidebar-primary": "#C39E88",
            "sidebar-primary-foreground": "#1f1a17",
            "sidebar-accent": "#BAAB92",
            "sidebar-accent-foreground": "#1f1a17",
            "sidebar-border": "#56453F",
            "sidebar-ring": "#C39E88",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "graphite",
        label: "Graphite",
        styles: {
          light: {
            background: "#f0f0f0",
            foreground: "#333333",
            card: "#f5f5f5",
            "card-foreground": "#333333",
            popover: "#f5f5f5",
            "popover-foreground": "#333333",
            primary: "#606060",
            "primary-foreground": "#ffffff",
            secondary: "#e0e0e0",
            "secondary-foreground": "#333333",
            muted: "#d9d9d9",
            "muted-foreground": "#666666",
            accent: "#c0c0c0",
            "accent-foreground": "#333333",
            destructive: "#cc3333",
            "destructive-foreground": "#ffffff",
            border: "#d0d0d0",
            input: "#e0e0e0",
            ring: "#606060",
            "chart-1": "#606060",
            "chart-2": "#476666",
            "chart-3": "#909090",
            "chart-4": "#a8a8a8",
            "chart-5": "#c0c0c0",
            sidebar: "#eaeaea",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#606060",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#c0c0c0",
            "sidebar-accent-foreground": "#333333",
            "sidebar-border": "#d0d0d0",
            "sidebar-ring": "#606060",
            radius: "0.35rem"
          },
          dark: {
            background: "#1a1a1a",
            foreground: "#d9d9d9",
            card: "#202020",
            "card-foreground": "#d9d9d9",
            popover: "#202020",
            "popover-foreground": "#d9d9d9",
            primary: "#a0a0a0",
            "primary-foreground": "#1a1a1a",
            secondary: "#303030",
            "secondary-foreground": "#d9d9d9",
            muted: "#2a2a2a",
            "muted-foreground": "#808080",
            accent: "#404040",
            "accent-foreground": "#d9d9d9",
            destructive: "#e06666",
            "destructive-foreground": "#ffffff",
            border: "#353535",
            input: "#303030",
            ring: "#a0a0a0",
            "chart-1": "#a0a0a0",
            "chart-2": "#7e9ca0",
            "chart-3": "#707070",
            "chart-4": "#585858",
            "chart-5": "#404040",
            sidebar: "#1f1f1f",
            "sidebar-foreground": "#d9d9d9",
            "sidebar-primary": "#a0a0a0",
            "sidebar-primary-foreground": "#1a1a1a",
            "sidebar-accent": "#404040",
            "sidebar-accent-foreground": "#d9d9d9",
            "sidebar-border": "#353535",
            "sidebar-ring": "#a0a0a0",
            radius: "0.35rem"
          }
        }
      },
      {
        id: "cosmic-night",
        label: "Cosmic Night",
        styles: {
          light: {
            background: "#f5f5ff",
            foreground: "#2a2a4a",
            card: "#ffffff",
            "card-foreground": "#2a2a4a",
            popover: "#ffffff",
            "popover-foreground": "#2a2a4a",
            primary: "#6e56cf",
            "primary-foreground": "#ffffff",
            secondary: "#e4dfff",
            "secondary-foreground": "#4a4080",
            muted: "#f0f0fa",
            "muted-foreground": "#6c6c8a",
            accent: "#d8e6ff",
            "accent-foreground": "#2a2a4a",
            destructive: "#ff5470",
            "destructive-foreground": "#ffffff",
            border: "#e0e0f0",
            input: "#e0e0f0",
            ring: "#6e56cf",
            "chart-1": "#6e56cf",
            "chart-2": "#9e8cfc",
            "chart-3": "#5d5fef",
            "chart-4": "#7c75fa",
            "chart-5": "#4740b3",
            sidebar: "#f0f0fa",
            "sidebar-foreground": "#2a2a4a",
            "sidebar-primary": "#6e56cf",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#d8e6ff",
            "sidebar-accent-foreground": "#2a2a4a",
            "sidebar-border": "#e0e0f0",
            "sidebar-ring": "#6e56cf",
            radius: "0.5rem"
          },
          dark: {
            background: "#0f0f1a",
            foreground: "#e2e2f5",
            card: "#1a1a2e",
            "card-foreground": "#e2e2f5",
            popover: "#1a1a2e",
            "popover-foreground": "#e2e2f5",
            primary: "#a48fff",
            "primary-foreground": "#0f0f1a",
            secondary: "#2d2b55",
            "secondary-foreground": "#c4c2ff",
            muted: "#222244",
            "muted-foreground": "#a0a0c0",
            accent: "#303060",
            "accent-foreground": "#e2e2f5",
            destructive: "#ff5470",
            "destructive-foreground": "#ffffff",
            border: "#303052",
            input: "#303052",
            ring: "#a48fff",
            "chart-1": "#a48fff",
            "chart-2": "#7986cb",
            "chart-3": "#64b5f6",
            "chart-4": "#4db6ac",
            "chart-5": "#ff79c6",
            sidebar: "#1a1a2e",
            "sidebar-foreground": "#e2e2f5",
            "sidebar-primary": "#a48fff",
            "sidebar-primary-foreground": "#0f0f1a",
            "sidebar-accent": "#303060",
            "sidebar-accent-foreground": "#e2e2f5",
            "sidebar-border": "#303052",
            "sidebar-ring": "#a48fff",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "tangerine",
        label: "Tangerine",
        styles: {
          light: {
            background: "#e8ebed",
            foreground: "#333333",
            card: "#ffffff",
            "card-foreground": "#333333",
            popover: "#ffffff",
            "popover-foreground": "#333333",
            primary: "#e05d38",
            "primary-foreground": "#ffffff",
            secondary: "#f3f4f6",
            "secondary-foreground": "#4b5563",
            muted: "#f9fafb",
            "muted-foreground": "#6b7280",
            accent: "#d6e4f0",
            "accent-foreground": "#1e3a8a",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#dcdfe2",
            input: "#f4f5f7",
            ring: "#e05d38",
            "chart-1": "#86a7c8",
            "chart-2": "#eea591",
            "chart-3": "#5a7ca6",
            "chart-4": "#466494",
            "chart-5": "#334c82",
            sidebar: "#dddfe2",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#e05d38",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#adc4da",
            "sidebar-accent-foreground": "#1e3a8a",
            "sidebar-border": "#e5e7eb",
            "sidebar-ring": "#e05d38",
            radius: "0.75rem"
          },
          dark: {
            background: "#1c2433",
            foreground: "#e5e5e5",
            card: "#2a3040",
            "card-foreground": "#e5e5e5",
            popover: "#262b38",
            "popover-foreground": "#e5e5e5",
            primary: "#e05d38",
            "primary-foreground": "#ffffff",
            secondary: "#2a303e",
            "secondary-foreground": "#e5e5e5",
            muted: "#2a303e",
            "muted-foreground": "#a3a3a3",
            accent: "#2a3656",
            "accent-foreground": "#bfdbfe",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#3d4354",
            input: "#3d4354",
            ring: "#e05d38",
            "chart-1": "#86a7c8",
            "chart-2": "#e6a08f",
            "chart-3": "#5a7ca6",
            "chart-4": "#466494",
            "chart-5": "#334c82",
            sidebar: "#2a303f",
            "sidebar-foreground": "#e5e5e5",
            "sidebar-primary": "#e05d38",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#2a3656",
            "sidebar-accent-foreground": "#bfdbfe",
            "sidebar-border": "#3d4354",
            "sidebar-ring": "#e05d38",
            radius: "0.75rem"
          }
        }
      },
      {
        id: "nature",
        label: "Nature",
        styles: {
          light: {
            background: "#f8f5f0",
            foreground: "#3e2723",
            card: "#f8f5f0",
            "card-foreground": "#3e2723",
            popover: "#f8f5f0",
            "popover-foreground": "#3e2723",
            primary: "#2e7d32",
            "primary-foreground": "#ffffff",
            secondary: "#e8f5e9",
            "secondary-foreground": "#1b5e20",
            muted: "#f0e9e0",
            "muted-foreground": "#6d4c41",
            accent: "#c8e6c9",
            "accent-foreground": "#1b5e20",
            destructive: "#c62828",
            "destructive-foreground": "#ffffff",
            border: "#e0d6c9",
            input: "#e0d6c9",
            ring: "#2e7d32",
            "chart-1": "#4caf50",
            "chart-2": "#388e3c",
            "chart-3": "#2e7d32",
            "chart-4": "#1b5e20",
            "chart-5": "#0a1f0c",
            sidebar: "#f0e9e0",
            "sidebar-foreground": "#3e2723",
            "sidebar-primary": "#2e7d32",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#c8e6c9",
            "sidebar-accent-foreground": "#1b5e20",
            "sidebar-border": "#e0d6c9",
            "sidebar-ring": "#2e7d32",
            radius: "0.5rem"
          },
          dark: {
            background: "#1c2a1f",
            foreground: "#f0ebe5",
            card: "#2d3a2e",
            "card-foreground": "#f0ebe5",
            popover: "#2d3a2e",
            "popover-foreground": "#f0ebe5",
            primary: "#4caf50",
            "primary-foreground": "#0a1f0c",
            secondary: "#3e4a3d",
            "secondary-foreground": "#d7e0d6",
            muted: "#252f26",
            "muted-foreground": "#d7cfc4",
            accent: "#388e3c",
            "accent-foreground": "#f0ebe5",
            destructive: "#c62828",
            "destructive-foreground": "#f0ebe5",
            border: "#3e4a3d",
            input: "#3e4a3d",
            ring: "#4caf50",
            "chart-1": "#81c784",
            "chart-2": "#66bb6a",
            "chart-3": "#4caf50",
            "chart-4": "#43a047",
            "chart-5": "#388e3c",
            sidebar: "#1c2a1f",
            "sidebar-foreground": "#f0ebe5",
            "sidebar-primary": "#4caf50",
            "sidebar-primary-foreground": "#0a1f0c",
            "sidebar-accent": "#1b5e20",
            "sidebar-accent-foreground": "#f0ebe5",
            "sidebar-border": "#3e4a3d",
            "sidebar-ring": "#4caf50",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "perpetuity",
        label: "Perpetuity",
        styles: {
          light: {
            background: "#e8f0f0",
            foreground: "#0a4a55",
            card: "#f2f7f7",
            "card-foreground": "#0a4a55",
            popover: "#f2f7f7",
            "popover-foreground": "#0a4a55",
            primary: "#06858e",
            "primary-foreground": "#ffffff",
            secondary: "#d9eaea",
            "secondary-foreground": "#0a4a55",
            muted: "#e0eaea",
            "muted-foreground": "#427a7e",
            accent: "#c9e5e7",
            "accent-foreground": "#0a4a55",
            destructive: "#d13838",
            "destructive-foreground": "#ffffff",
            border: "#cde0e2",
            input: "#d9eaea",
            ring: "#06858e",
            "chart-1": "#06858e",
            "chart-2": "#1e9ea6",
            "chart-3": "#37b6be",
            "chart-4": "#5dc7ce",
            "chart-5": "#8ad8dd",
            sidebar: "#daebed",
            "sidebar-foreground": "#0a4a55",
            "sidebar-primary": "#06858e",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#c9e5e7",
            "sidebar-accent-foreground": "#0a4a55",
            "sidebar-border": "#cde0e2",
            "sidebar-ring": "#06858e",
            radius: "0.125rem"
          },
          dark: {
            background: "#0a1a20",
            foreground: "#4de8e8",
            card: "#0c2025",
            "card-foreground": "#4de8e8",
            popover: "#0c2025",
            "popover-foreground": "#4de8e8",
            primary: "#4de8e8",
            "primary-foreground": "#0a1a20",
            secondary: "#164955",
            "secondary-foreground": "#4de8e8",
            muted: "#0f3039",
            "muted-foreground": "#36a5a5",
            accent: "#164955",
            "accent-foreground": "#4de8e8",
            destructive: "#e83c3c",
            "destructive-foreground": "#f2f2f2",
            border: "#164955",
            input: "#164955",
            ring: "#4de8e8",
            "chart-1": "#4de8e8",
            "chart-2": "#36a5a5",
            "chart-3": "#2d8a8a",
            "chart-4": "#19595e",
            "chart-5": "#0e383c",
            sidebar: "#0a1a20",
            "sidebar-foreground": "#4de8e8",
            "sidebar-primary": "#4de8e8",
            "sidebar-primary-foreground": "#0a1a20",
            "sidebar-accent": "#164955",
            "sidebar-accent-foreground": "#4de8e8",
            "sidebar-border": "#164955",
            "sidebar-ring": "#4de8e8",
            radius: "0.125rem"
          }
        }
      },
      {
        id: "neo-brutalism",
        label: "Neo Brutalism",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#000000",
            card: "#ffffff",
            "card-foreground": "#000000",
            popover: "#ffffff",
            "popover-foreground": "#000000",
            primary: "#ff3333",
            "primary-foreground": "#ffffff",
            secondary: "#ffff00",
            "secondary-foreground": "#000000",
            muted: "#f0f0f0",
            "muted-foreground": "#333333",
            accent: "#0066ff",
            "accent-foreground": "#ffffff",
            destructive: "#000000",
            "destructive-foreground": "#ffffff",
            border: "#000000",
            input: "#000000",
            ring: "#ff3333",
            "chart-1": "#ff3333",
            "chart-2": "#ffff00",
            "chart-3": "#0066ff",
            "chart-4": "#00cc00",
            "chart-5": "#cc00cc",
            sidebar: "#f0f0f0",
            "sidebar-foreground": "#000000",
            "sidebar-primary": "#ff3333",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#0066ff",
            "sidebar-accent-foreground": "#ffffff",
            "sidebar-border": "#000000",
            "sidebar-ring": "#ff3333",
            radius: "0px"
          },
          dark: {
            background: "#000000",
            foreground: "#ffffff",
            card: "#333333",
            "card-foreground": "#ffffff",
            popover: "#333333",
            "popover-foreground": "#ffffff",
            primary: "#ff6666",
            "primary-foreground": "#000000",
            secondary: "#ffff33",
            "secondary-foreground": "#000000",
            muted: "#1a1a1a",
            "muted-foreground": "#cccccc",
            accent: "#3399ff",
            "accent-foreground": "#000000",
            destructive: "#ffffff",
            "destructive-foreground": "#000000",
            border: "#ffffff",
            input: "#ffffff",
            ring: "#ff6666",
            "chart-1": "#ff6666",
            "chart-2": "#ffff33",
            "chart-3": "#3399ff",
            "chart-4": "#33cc33",
            "chart-5": "#cc33cc",
            sidebar: "#000000",
            "sidebar-foreground": "#ffffff",
            "sidebar-primary": "#ff6666",
            "sidebar-primary-foreground": "#000000",
            "sidebar-accent": "#3399ff",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#ffffff",
            "sidebar-ring": "#ff6666",
            radius: "0px"
          }
        }
      },
      {
        id: "cyberpunk",
        label: "Cyberpunk",
        styles: {
          light: {
            background: "#f8f9fa",
            foreground: "#0c0c1d",
            card: "#ffffff",
            "card-foreground": "#0c0c1d",
            popover: "#ffffff",
            "popover-foreground": "#0c0c1d",
            primary: "#ff00c8",
            "primary-foreground": "#ffffff",
            secondary: "#f0f0ff",
            "secondary-foreground": "#0c0c1d",
            muted: "#f0f0ff",
            "muted-foreground": "#0c0c1d",
            accent: "#00ffcc",
            "accent-foreground": "#0c0c1d",
            destructive: "#ff3d00",
            "destructive-foreground": "#ffffff",
            border: "#dfe6e9",
            input: "#dfe6e9",
            ring: "#ff00c8",
            "chart-1": "#ff00c8",
            "chart-2": "#9000ff",
            "chart-3": "#00e5ff",
            "chart-4": "#00ffcc",
            "chart-5": "#ffe600",
            sidebar: "#f0f0ff",
            "sidebar-foreground": "#0c0c1d",
            "sidebar-primary": "#ff00c8",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#00ffcc",
            "sidebar-accent-foreground": "#0c0c1d",
            "sidebar-border": "#dfe6e9",
            "sidebar-ring": "#ff00c8",
            radius: "0.5rem"
          },
          dark: {
            background: "#0c0c1d",
            foreground: "#eceff4",
            card: "#1e1e3f",
            "card-foreground": "#eceff4",
            popover: "#1e1e3f",
            "popover-foreground": "#eceff4",
            primary: "#ff00c8",
            "primary-foreground": "#ffffff",
            secondary: "#1e1e3f",
            "secondary-foreground": "#eceff4",
            muted: "#151530",
            "muted-foreground": "#8085a6",
            accent: "#00ffcc",
            "accent-foreground": "#0c0c1d",
            destructive: "#ff3d00",
            "destructive-foreground": "#ffffff",
            border: "#2e2e5e",
            input: "#2e2e5e",
            ring: "#ff00c8",
            "chart-1": "#ff00c8",
            "chart-2": "#9000ff",
            "chart-3": "#00e5ff",
            "chart-4": "#00ffcc",
            "chart-5": "#ffe600",
            sidebar: "#0c0c1d",
            "sidebar-foreground": "#eceff4",
            "sidebar-primary": "#ff00c8",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#00ffcc",
            "sidebar-accent-foreground": "#0c0c1d",
            "sidebar-border": "#2e2e5e",
            "sidebar-ring": "#ff00c8",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "amethyst-haze",
        label: "Amethyst Haze",
        styles: {
          light: {
            background: "#f8f7fa",
            foreground: "#3d3c4f",
            card: "#ffffff",
            "card-foreground": "#3d3c4f",
            popover: "#ffffff",
            "popover-foreground": "#3d3c4f",
            primary: "#8a79ab",
            "primary-foreground": "#f8f7fa",
            secondary: "#dfd9ec",
            "secondary-foreground": "#3d3c4f",
            muted: "#dcd9e3",
            "muted-foreground": "#6b6880",
            accent: "#e6a5b8",
            "accent-foreground": "#4b2e36",
            destructive: "#d95c5c",
            "destructive-foreground": "#f8f7fa",
            border: "#cec9d9",
            input: "#eae7f0",
            ring: "#8a79ab",
            "chart-1": "#8a79ab",
            "chart-2": "#e6a5b8",
            "chart-3": "#77b8a1",
            "chart-4": "#f0c88d",
            "chart-5": "#a0bbe3",
            sidebar: "#f1eff5",
            "sidebar-foreground": "#3d3c4f",
            "sidebar-primary": "#8a79ab",
            "sidebar-primary-foreground": "#f8f7fa",
            "sidebar-accent": "#e6a5b8",
            "sidebar-accent-foreground": "#4b2e36",
            "sidebar-border": "#d7d2e0",
            "sidebar-ring": "#8a79ab",
            radius: "0.5rem"
          },
          dark: {
            background: "#1a1823",
            foreground: "#e0ddef",
            card: "#232030",
            "card-foreground": "#e0ddef",
            popover: "#232030",
            "popover-foreground": "#e0ddef",
            primary: "#a995c9",
            "primary-foreground": "#1a1823",
            secondary: "#5a5370",
            "secondary-foreground": "#e0ddef",
            muted: "#242031",
            "muted-foreground": "#a09aad",
            accent: "#372e3f",
            "accent-foreground": "#f2b8c6",
            destructive: "#e57373",
            "destructive-foreground": "#1a1823",
            border: "#302c40",
            input: "#2a273a",
            ring: "#a995c9",
            "chart-1": "#a995c9",
            "chart-2": "#f2b8c6",
            "chart-3": "#77b8a1",
            "chart-4": "#f0c88d",
            "chart-5": "#a0bbe3",
            sidebar: "#16141e",
            "sidebar-foreground": "#e0ddef",
            "sidebar-primary": "#a995c9",
            "sidebar-primary-foreground": "#1a1823",
            "sidebar-accent": "#372e3f",
            "sidebar-accent-foreground": "#f2b8c6",
            "sidebar-border": "#2a273a",
            "sidebar-ring": "#a995c9",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "caffeine",
        label: "Caffeine",
        styles: {
          light: {
            background: "#f9f9f9",
            foreground: "#202020",
            card: "#fcfcfc",
            "card-foreground": "#202020",
            popover: "#fcfcfc",
            "popover-foreground": "#202020",
            primary: "#644a40",
            "primary-foreground": "#ffffff",
            secondary: "#ffdfb5",
            "secondary-foreground": "#582d1d",
            muted: "#efefef",
            "muted-foreground": "#646464",
            accent: "#e8e8e8",
            "accent-foreground": "#202020",
            destructive: "#e54d2e",
            "destructive-foreground": "#ffffff",
            border: "#d8d8d8",
            input: "#d8d8d8",
            ring: "#644a40",
            "chart-1": "#644a40",
            "chart-2": "#ffdfb5",
            "chart-3": "#e8e8e8",
            "chart-4": "#ffe6c4",
            "chart-5": "#66493e",
            sidebar: "#fbfbfb",
            "sidebar-foreground": "#252525",
            "sidebar-primary": "#343434",
            "sidebar-primary-foreground": "#fbfbfb",
            "sidebar-accent": "#f7f7f7",
            "sidebar-accent-foreground": "#343434",
            "sidebar-border": "#ebebeb",
            "sidebar-ring": "#b5b5b5",
            radius: "0.5rem"
          },
          dark: {
            background: "#111111",
            foreground: "#eeeeee",
            card: "#191919",
            "card-foreground": "#eeeeee",
            popover: "#191919",
            "popover-foreground": "#eeeeee",
            primary: "#ffe0c2",
            "primary-foreground": "#081a1b",
            secondary: "#393028",
            "secondary-foreground": "#ffe0c2",
            muted: "#222222",
            "muted-foreground": "#b4b4b4",
            accent: "#2a2a2a",
            "accent-foreground": "#eeeeee",
            destructive: "#e54d2e",
            "destructive-foreground": "#ffffff",
            border: "#201e18",
            input: "#484848",
            ring: "#ffe0c2",
            "chart-1": "#ffe0c2",
            "chart-2": "#393028",
            "chart-3": "#2a2a2a",
            "chart-4": "#42382e",
            "chart-5": "#ffe0c1",
            sidebar: "#18181b",
            "sidebar-foreground": "#f4f4f5",
            "sidebar-primary": "#1d4ed8",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#27272a",
            "sidebar-accent-foreground": "#f4f4f5",
            "sidebar-border": "#27272a",
            "sidebar-ring": "#d4d4d8",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "kodama-grove",
        label: "Kodama Grove",
        styles: {
          light: {
            background: "#e4d7b0",
            foreground: "#5c4b3e",
            card: "#e7dbbf",
            "card-foreground": "#5c4b3e",
            popover: "#f3ead2",
            "popover-foreground": "#5c4b3e",
            primary: "#8d9d4f",
            "primary-foreground": "#fdfbf6",
            secondary: "#decea0",
            "secondary-foreground": "#5c4b3e",
            muted: "#decea0",
            "muted-foreground": "#85766a",
            accent: "#dbc894",
            "accent-foreground": "#5c4b3e",
            destructive: "#d98b7e",
            "destructive-foreground": "#faf8f2",
            border: "#b19681",
            input: "#dbc894",
            ring: "#9db18c",
            "chart-1": "#9db18c",
            "chart-2": "#8a9f7b",
            "chart-3": "#bac9b4",
            "chart-4": "#71856a",
            "chart-5": "#5e6e58",
            sidebar: "#e2d1a2",
            "sidebar-foreground": "#5c4b3e",
            "sidebar-primary": "#9db18c",
            "sidebar-primary-foreground": "#fdfbf6",
            "sidebar-accent": "#eae5d9",
            "sidebar-accent-foreground": "#5c4b3e",
            "sidebar-border": "#e5e0d4",
            "sidebar-ring": "#9db18c",
            radius: "0.425rem",
            "font-sans": "Merriweather, serif",
            "font-serif": "'Source Serif 4', serif",
            "font-mono": "JetBrains Mono, monospace"
          },
          dark: {
            background: "#3a3529",
            foreground: "#ede4d4",
            card: "#413c33",
            "card-foreground": "#ede4d4",
            popover: "#413c33",
            "popover-foreground": "#ede4d4",
            primary: "#8a9f7b",
            "primary-foreground": "#2a2521",
            secondary: "#5a5345",
            "secondary-foreground": "#ede4d4",
            muted: "#4a4439",
            "muted-foreground": "#a8a096",
            accent: "#a18f5c",
            "accent-foreground": "#2a2521",
            destructive: "#b5766a",
            "destructive-foreground": "#f0e9db",
            border: "#5a5345",
            input: "#5a5345",
            ring: "#8a9f7b",
            "chart-1": "#8a9f7b",
            "chart-2": "#9db18c",
            "chart-3": "#71856a",
            "chart-4": "#a18f5c",
            "chart-5": "#5e6e58",
            sidebar: "#3a3529",
            "sidebar-foreground": "#ede4d4",
            "sidebar-primary": "#8a9f7b",
            "sidebar-primary-foreground": "#2a2521",
            "sidebar-accent": "#a18f5c",
            "sidebar-accent-foreground": "#2a2521",
            "sidebar-border": "#5a5345",
            "sidebar-ring": "#8a9f7b",
            radius: "0.425rem",
            "font-sans": "Merriweather, serif",
            "font-serif": "'Source Serif 4', serif",
            "font-mono": "JetBrains Mono, monospace"
          }
        },
        links: [
          { type: "link", attributes: { rel: "preconnect", href: "https://fonts.googleapis.com" } },
          { type: "link", attributes: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" } },
          { type: "link", attributes: { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap" } },
          { type: "link", attributes: { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&display=swap" } },
          { type: "link", attributes: { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap" } }
        ]
      },
      {
        id: "solar-dusk",
        label: "Solar Dusk",
        styles: {
          light: {
            background: "#FDFBF7",
            foreground: "#4A3B33",
            card: "#F8F4EE",
            "card-foreground": "#4A3B33",
            popover: "#F8F4EE",
            "popover-foreground": "#4A3B33",
            primary: "#B45309",
            "primary-foreground": "#FFFFFF",
            secondary: "#E4C090",
            "secondary-foreground": "#57534E",
            muted: "#F1E9DA",
            "muted-foreground": "#78716C",
            accent: "#f2daba",
            "accent-foreground": "#57534E",
            destructive: "#991B1B",
            "destructive-foreground": "#FFFFFF",
            border: "#E4D9BC",
            input: "#E4D9BC",
            ring: "#B45309",
            "chart-1": "#B45309",
            "chart-2": "#78716C",
            "chart-3": "#A16207",
            "chart-4": "#78716C",
            "chart-5": "#CA8A04",
            sidebar: "#F1E9DA",
            "sidebar-foreground": "#4A3B33",
            "sidebar-primary": "#B45309",
            "sidebar-primary-foreground": "#FFFFFF",
            "sidebar-accent": "#A16207",
            "sidebar-accent-foreground": "#FFFFFF",
            "sidebar-border": "#E4D9BC",
            "sidebar-ring": "#B45309",
            radius: "0.3rem"
          },
          dark: {
            background: "#1C1917",
            foreground: "#F5F5F4",
            card: "#292524",
            "card-foreground": "#F5F5F4",
            popover: "#292524",
            "popover-foreground": "#F5F5F4",
            primary: "#F97316",
            "primary-foreground": "#FFFFFF",
            secondary: "#57534E",
            "secondary-foreground": "#E7E5E4",
            muted: "#201d1a",
            "muted-foreground": "#A8A29E",
            accent: "#1e4252",
            "accent-foreground": "#E7E5E4",
            destructive: "#DC2626",
            "destructive-foreground": "#FFFFFF",
            border: "#44403C",
            input: "#44403C",
            ring: "#F97316",
            "chart-1": "#F97316",
            "chart-2": "#0EA5E9",
            "chart-3": "#EAB308",
            "chart-4": "#A8A29E",
            "chart-5": "#78716C",
            sidebar: "#292524",
            "sidebar-foreground": "#F5F5F4",
            "sidebar-primary": "#F97316",
            "sidebar-primary-foreground": "#FFFFFF",
            "sidebar-accent": "#0EA5E9",
            "sidebar-accent-foreground": "#0C2A4D",
            "sidebar-border": "#44403C",
            "sidebar-ring": "#F97316",
            radius: "0.3rem"
          }
        }
      },
      {
        id: "mono",
        label: "Mono",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#0a0a0a",
            card: "#ffffff",
            "card-foreground": "#0a0a0a",
            popover: "#ffffff",
            "popover-foreground": "#0a0a0a",
            primary: "#737373",
            "primary-foreground": "#fafafa",
            secondary: "#f5f5f5",
            "secondary-foreground": "#171717",
            muted: "#f5f5f5",
            "muted-foreground": "#717171",
            accent: "#f5f5f5",
            "accent-foreground": "#171717",
            destructive: "#e7000b",
            "destructive-foreground": "#f5f5f5",
            border: "#e5e5e5",
            input: "#e5e5e5",
            ring: "#a1a1a1",
            "chart-1": "#737373",
            "chart-2": "#737373",
            "chart-3": "#737373",
            "chart-4": "#737373",
            "chart-5": "#737373",
            sidebar: "#fafafa",
            "sidebar-foreground": "#0a0a0a",
            "sidebar-primary": "#171717",
            "sidebar-primary-foreground": "#fafafa",
            "sidebar-accent": "#f5f5f5",
            "sidebar-accent-foreground": "#171717",
            "sidebar-border": "#e5e5e5",
            "sidebar-ring": "#a1a1a1",
            radius: "0rem"
          },
          dark: {
            background: "#0a0a0a",
            foreground: "#fafafa",
            card: "#191919",
            "card-foreground": "#fafafa",
            popover: "#262626",
            "popover-foreground": "#fafafa",
            primary: "#737373",
            "primary-foreground": "#fafafa",
            secondary: "#262626",
            "secondary-foreground": "#fafafa",
            muted: "#262626",
            "muted-foreground": "#a1a1a1",
            accent: "#404040",
            "accent-foreground": "#fafafa",
            destructive: "#ff6467",
            "destructive-foreground": "#262626",
            border: "#383838",
            input: "#525252",
            ring: "#737373",
            "chart-1": "#737373",
            "chart-2": "#737373",
            "chart-3": "#737373",
            "chart-4": "#737373",
            "chart-5": "#737373",
            sidebar: "#171717",
            "sidebar-foreground": "#fafafa",
            "sidebar-primary": "#fafafa",
            "sidebar-primary-foreground": "#171717",
            "sidebar-accent": "#262626",
            "sidebar-accent-foreground": "#fafafa",
            "sidebar-border": "#ffffff",
            "sidebar-ring": "#525252",
            radius: "0rem"
          }
        }
      },
      {
        id: "modern-minimal",
        label: "Modern Minimal",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#333333",
            card: "#ffffff",
            "card-foreground": "#333333",
            popover: "#ffffff",
            "popover-foreground": "#333333",
            primary: "#3b82f6",
            "primary-foreground": "#ffffff",
            secondary: "#f3f4f6",
            "secondary-foreground": "#4b5563",
            muted: "#f9fafb",
            "muted-foreground": "#6b7280",
            accent: "#e0f2fe",
            "accent-foreground": "#1e3a8a",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#e5e7eb",
            input: "#e5e7eb",
            ring: "#3b82f6",
            "chart-1": "#3b82f6",
            "chart-2": "#2563eb",
            "chart-3": "#1d4ed8",
            "chart-4": "#1e40af",
            "chart-5": "#1e3a8a",
            sidebar: "#f9fafb",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#3b82f6",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#e0f2fe",
            "sidebar-accent-foreground": "#1e3a8a",
            "sidebar-border": "#e5e7eb",
            "sidebar-ring": "#3b82f6",
            radius: "0.375rem"
          },
          dark: {
            background: "#171717",
            foreground: "#e5e5e5",
            card: "#262626",
            "card-foreground": "#e5e5e5",
            popover: "#262626",
            "popover-foreground": "#e5e5e5",
            primary: "#3b82f6",
            "primary-foreground": "#ffffff",
            secondary: "#262626",
            "secondary-foreground": "#e5e5e5",
            muted: "#1f1f1f",
            "muted-foreground": "#a3a3a3",
            accent: "#1e3a8a",
            "accent-foreground": "#bfdbfe",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#404040",
            input: "#404040",
            ring: "#3b82f6",
            "chart-1": "#60a5fa",
            "chart-2": "#3b82f6",
            "chart-3": "#2563eb",
            "chart-4": "#1d4ed8",
            "chart-5": "#1e40af",
            sidebar: "#171717",
            "sidebar-foreground": "#e5e5e5",
            "sidebar-primary": "#3b82f6",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#1e3a8a",
            "sidebar-accent-foreground": "#bfdbfe",
            "sidebar-border": "#404040",
            "sidebar-ring": "#3b82f6",
            radius: "0.375rem"
          }
        }
      },
      {
        id: "bubblegum",
        label: "Bubblegum",
        styles: {
          light: {
            background: "#f6e6ee",
            foreground: "#5b5b5b",
            card: "#fdedc9",
            "card-foreground": "#5b5b5b",
            popover: "#ffffff",
            "popover-foreground": "#5b5b5b",
            primary: "#d04f99",
            "primary-foreground": "#ffffff",
            secondary: "#8acfd1",
            "secondary-foreground": "#333333",
            muted: "#b2e1eb",
            "muted-foreground": "#7a7a7a",
            accent: "#fbe2a7",
            "accent-foreground": "#333333",
            destructive: "#f96f70",
            "destructive-foreground": "#ffffff",
            border: "#d04f99",
            input: "#e4e4e4",
            ring: "#e670ab",
            "chart-1": "#e670ab",
            "chart-2": "#84d2e2",
            "chart-3": "#fbe2a7",
            "chart-4": "#f3a0ca",
            "chart-5": "#d7488e",
            sidebar: "#f8d8ea",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#ec4899",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#f9a8d4",
            "sidebar-accent-foreground": "#333333",
            "sidebar-border": "#f3e8ff",
            "sidebar-ring": "#ec4899",
            radius: "0.4rem"
          },
          dark: {
            background: "#12242e",
            foreground: "#f3e3ea",
            card: "#1c2e38",
            "card-foreground": "#f3e3ea",
            popover: "#1c2e38",
            "popover-foreground": "#f3e3ea",
            primary: "#fbe2a7",
            "primary-foreground": "#12242e",
            secondary: "#e4a2b1",
            "secondary-foreground": "#12242e",
            muted: "#24272b",
            "muted-foreground": "#e4a2b1",
            accent: "#c67b96",
            "accent-foreground": "#f3e3ea",
            destructive: "#e35ea4",
            "destructive-foreground": "#12242e",
            border: "#324859",
            input: "#20333d",
            ring: "#50afb6",
            "chart-1": "#50afb6",
            "chart-2": "#e4a2b1",
            "chart-3": "#c67b96",
            "chart-4": "#175c6c",
            "chart-5": "#24272b",
            sidebar: "#101f28",
            "sidebar-foreground": "#f3f4f6",
            "sidebar-primary": "#ec4899",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#f9a8d4",
            "sidebar-accent-foreground": "#1f2937",
            "sidebar-border": "#374151",
            "sidebar-ring": "#ec4899",
            radius: "0.4rem"
          }
        }
      },
      {
        id: "notebook",
        label: "Notebook",
        styles: {
          light: {
            background: "#f9f9f9",
            foreground: "#3a3a3a",
            card: "#ffffff",
            "card-foreground": "#3a3a3a",
            popover: "#ffffff",
            "popover-foreground": "#3a3a3a",
            primary: "#606060",
            "primary-foreground": "#f0f0f0",
            secondary: "#dedede",
            "secondary-foreground": "#3a3a3a",
            muted: "#e3e3e3",
            "muted-foreground": "#505050",
            accent: "#f3eac8",
            "accent-foreground": "#5d4037",
            destructive: "#c87a7a",
            "destructive-foreground": "#ffffff",
            border: "#747272",
            input: "#ffffff",
            ring: "#a0a0a0",
            "chart-1": "#333333",
            "chart-2": "#555555",
            "chart-3": "#777777",
            "chart-4": "#999999",
            "chart-5": "#bbbbbb",
            sidebar: "#f0f0f0",
            "sidebar-foreground": "#3a3a3a",
            "sidebar-primary": "#606060",
            "sidebar-primary-foreground": "#f0f0f0",
            "sidebar-accent": "#f3eac8",
            "sidebar-accent-foreground": "#5d4037",
            "sidebar-border": "#c0c0c0",
            "sidebar-ring": "#a0a0a0",
            radius: "0.625rem"
          },
          dark: {
            background: "#2b2b2b",
            foreground: "#dcdcdc",
            card: "#333333",
            "card-foreground": "#dcdcdc",
            popover: "#333333",
            "popover-foreground": "#dcdcdc",
            primary: "#b0b0b0",
            "primary-foreground": "#2b2b2b",
            secondary: "#5a5a5a",
            "secondary-foreground": "#c0c0c0",
            muted: "#454545",
            "muted-foreground": "#a0a0a0",
            accent: "#e0e0e0",
            "accent-foreground": "#333333",
            destructive: "#d9afaf",
            "destructive-foreground": "#2b2b2b",
            border: "#4f4f4f",
            input: "#333333",
            ring: "#c0c0c0",
            "chart-1": "#efefef",
            "chart-2": "#d0d0d0",
            "chart-3": "#b0b0b0",
            "chart-4": "#909090",
            "chart-5": "#707070",
            sidebar: "#212121",
            "sidebar-foreground": "#dcdcdc",
            "sidebar-primary": "#b0b0b0",
            "sidebar-primary-foreground": "#212121",
            "sidebar-accent": "#e0e0e0",
            "sidebar-accent-foreground": "#333333",
            "sidebar-border": "#4f4f4f",
            "sidebar-ring": "#c0c0c0",
            radius: "0.625rem"
          }
        }
      },
      {
        id: "doom-64",
        label: "Doom 64",
        styles: {
          light: {
            background: "#cccccc",
            foreground: "#1f1f1f",
            card: "#b0b0b0",
            "card-foreground": "#1f1f1f",
            popover: "#b0b0b0",
            "popover-foreground": "#1f1f1f",
            primary: "#b71c1c",
            "primary-foreground": "#ffffff",
            secondary: "#556b2f",
            "secondary-foreground": "#ffffff",
            muted: "#b8b8b8",
            "muted-foreground": "#4a4a4a",
            accent: "#4682b4",
            "accent-foreground": "#ffffff",
            destructive: "#ff6f00",
            "destructive-foreground": "#000000",
            border: "#505050",
            input: "#505050",
            ring: "#b71c1c",
            "chart-1": "#b71c1c",
            "chart-2": "#556b2f",
            "chart-3": "#4682b4",
            "chart-4": "#ff6f00",
            "chart-5": "#8d6e63",
            sidebar: "#b0b0b0",
            "sidebar-foreground": "#1f1f1f",
            "sidebar-primary": "#b71c1c",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#2f5f85",
            "sidebar-accent-foreground": "#ffffff",
            "sidebar-border": "#505050",
            "sidebar-ring": "#b71c1c",
            radius: "0px"
          },
          dark: {
            background: "#1a1a1a",
            foreground: "#e0e0e0",
            card: "#2a2a2a",
            "card-foreground": "#e0e0e0",
            popover: "#2a2a2a",
            "popover-foreground": "#e0e0e0",
            primary: "#e53935",
            "primary-foreground": "#ffffff",
            secondary: "#689f38",
            "secondary-foreground": "#000000",
            muted: "#252525",
            "muted-foreground": "#a0a0a0",
            accent: "#64b5f6",
            "accent-foreground": "#000000",
            destructive: "#ffa000",
            "destructive-foreground": "#000000",
            border: "#4a4a4a",
            input: "#4a4a4a",
            ring: "#e53935",
            "chart-1": "#e53935",
            "chart-2": "#689f38",
            "chart-3": "#64b5f6",
            "chart-4": "#ffa000",
            "chart-5": "#a1887f",
            sidebar: "#141414",
            "sidebar-foreground": "#e0e0e0",
            "sidebar-primary": "#e53935",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#64b5f6",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#4a4a4a",
            "sidebar-ring": "#e53935",
            radius: "0px"
          }
        }
      },
      {
        id: "quantum-rose",
        label: "Quantum Rose",
        styles: {
          light: {
            background: "#fff0f8",
            foreground: "#91185c",
            card: "#fff7fc",
            "card-foreground": "#91185c",
            popover: "#fff7fc",
            "popover-foreground": "#91185c",
            primary: "#e6067a",
            "primary-foreground": "#ffffff",
            secondary: "#ffd6ff",
            "secondary-foreground": "#91185c",
            muted: "#ffe3f2",
            "muted-foreground": "#c04283",
            accent: "#ffc1e3",
            "accent-foreground": "#91185c",
            destructive: "#d13869",
            "destructive-foreground": "#ffffff",
            border: "#ffc7e6",
            input: "#ffd6ff",
            ring: "#e6067a",
            "chart-1": "#e6067a",
            "chart-2": "#c44b97",
            "chart-3": "#9969b6",
            "chart-4": "#7371bf",
            "chart-5": "#5e84ff",
            sidebar: "#ffedf6",
            "sidebar-foreground": "#91185c",
            "sidebar-primary": "#e6067a",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#ffc1e3",
            "sidebar-accent-foreground": "#91185c",
            "sidebar-border": "#ffddf0",
            "sidebar-ring": "#e6067a",
            radius: "0.5rem"
          },
          dark: {
            background: "#1a0922",
            foreground: "#ffb3ff",
            card: "#2a1435",
            "card-foreground": "#ffb3ff",
            popover: "#2a1435",
            "popover-foreground": "#ffb3ff",
            primary: "#ff6bef",
            "primary-foreground": "#180518",
            secondary: "#46204f",
            "secondary-foreground": "#ffb3ff",
            muted: "#331941",
            "muted-foreground": "#d67ad6",
            accent: "#5a1f5d",
            "accent-foreground": "#ffb3ff",
            destructive: "#ff2876",
            "destructive-foreground": "#f9f9f9",
            border: "#4a1b5f",
            input: "#46204f",
            ring: "#ff6bef",
            "chart-1": "#ff6bef",
            "chart-2": "#c359e3",
            "chart-3": "#9161ff",
            "chart-4": "#6f73e2",
            "chart-5": "#547aff",
            sidebar: "#1c0d25",
            "sidebar-foreground": "#ffb3ff",
            "sidebar-primary": "#ff6bef",
            "sidebar-primary-foreground": "#180518",
            "sidebar-accent": "#5a1f5d",
            "sidebar-accent-foreground": "#ffb3ff",
            "sidebar-border": "#4a1b5f",
            "sidebar-ring": "#ff6bef",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "bold-tech",
        label: "Bold Tech",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#312e81",
            card: "#ffffff",
            "card-foreground": "#312e81",
            popover: "#ffffff",
            "popover-foreground": "#312e81",
            primary: "#8b5cf6",
            "primary-foreground": "#ffffff",
            secondary: "#f3f0ff",
            "secondary-foreground": "#4338ca",
            muted: "#f5f3ff",
            "muted-foreground": "#7c3aed",
            accent: "#dbeafe",
            "accent-foreground": "#1e40af",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#e0e7ff",
            input: "#e0e7ff",
            ring: "#8b5cf6",
            "chart-1": "#8b5cf6",
            "chart-2": "#7c3aed",
            "chart-3": "#6d28d9",
            "chart-4": "#5b21b6",
            "chart-5": "#4c1d95",
            sidebar: "#f5f3ff",
            "sidebar-foreground": "#312e81",
            "sidebar-primary": "#8b5cf6",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#dbeafe",
            "sidebar-accent-foreground": "#1e40af",
            "sidebar-border": "#e0e7ff",
            "sidebar-ring": "#8b5cf6",
            radius: "0.625rem"
          },
          dark: {
            background: "#0f172a",
            foreground: "#e0e7ff",
            card: "#1e1b4b",
            "card-foreground": "#e0e7ff",
            popover: "#1e1b4b",
            "popover-foreground": "#e0e7ff",
            primary: "#8b5cf6",
            "primary-foreground": "#ffffff",
            secondary: "#1e1b4b",
            "secondary-foreground": "#e0e7ff",
            muted: "#171447",
            "muted-foreground": "#c4b5fd",
            accent: "#4338ca",
            "accent-foreground": "#e0e7ff",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#2e1065",
            input: "#2e1065",
            ring: "#8b5cf6",
            "chart-1": "#a78bfa",
            "chart-2": "#8b5cf6",
            "chart-3": "#7c3aed",
            "chart-4": "#6d28d9",
            "chart-5": "#5b21b6",
            sidebar: "#0f172a",
            "sidebar-foreground": "#e0e7ff",
            "sidebar-primary": "#8b5cf6",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#4338ca",
            "sidebar-accent-foreground": "#e0e7ff",
            "sidebar-border": "#2e1065",
            "sidebar-ring": "#8b5cf6",
            radius: "0.625rem"
          }
        }
      },
      {
        id: "elegant-luxury",
        label: "Elegant Luxury",
        styles: {
          light: {
            background: "#faf7f5",
            foreground: "#1a1a1a",
            card: "#faf7f5",
            "card-foreground": "#1a1a1a",
            popover: "#faf7f5",
            "popover-foreground": "#1a1a1a",
            primary: "#9b2c2c",
            "primary-foreground": "#ffffff",
            secondary: "#fdf2d6",
            "secondary-foreground": "#805500",
            muted: "#f0ebe8",
            "muted-foreground": "#57534e",
            accent: "#fef3c7",
            "accent-foreground": "#7f1d1d",
            destructive: "#991b1b",
            "destructive-foreground": "#ffffff",
            border: "#f5e8d2",
            input: "#f5e8d2",
            ring: "#9b2c2c",
            "chart-1": "#b91c1c",
            "chart-2": "#9b2c2c",
            "chart-3": "#7f1d1d",
            "chart-4": "#b45309",
            "chart-5": "#92400e",
            sidebar: "#f0ebe8",
            "sidebar-foreground": "#1a1a1a",
            "sidebar-primary": "#9b2c2c",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#fef3c7",
            "sidebar-accent-foreground": "#7f1d1d",
            "sidebar-border": "#f5e8d2",
            "sidebar-ring": "#9b2c2c",
            radius: "0.375rem"
          },
          dark: {
            background: "#1c1917",
            foreground: "#f5f5f4",
            card: "#292524",
            "card-foreground": "#f5f5f4",
            popover: "#292524",
            "popover-foreground": "#f5f5f4",
            primary: "#b91c1c",
            "primary-foreground": "#faf7f5",
            secondary: "#92400e",
            "secondary-foreground": "#fef3c7",
            muted: "#1f1c1a",
            "muted-foreground": "#d6d3d1",
            accent: "#b45309",
            "accent-foreground": "#fef3c7",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#44403c",
            input: "#44403c",
            ring: "#b91c1c",
            "chart-1": "#f87171",
            "chart-2": "#ef4444",
            "chart-3": "#dc2626",
            "chart-4": "#fbbf24",
            "chart-5": "#f59e0b",
            sidebar: "#1c1917",
            "sidebar-foreground": "#f5f5f4",
            "sidebar-primary": "#b91c1c",
            "sidebar-primary-foreground": "#faf7f5",
            "sidebar-accent": "#b45309",
            "sidebar-accent-foreground": "#fef3c7",
            "sidebar-border": "#44403c",
            "sidebar-ring": "#b91c1c",
            radius: "0.375rem"
          }
        }
      },
      {
        id: "amber-minimal",
        label: "Amber Minimal",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#262626",
            card: "#ffffff",
            "card-foreground": "#262626",
            popover: "#ffffff",
            "popover-foreground": "#262626",
            primary: "#f59e0b",
            "primary-foreground": "#000000",
            secondary: "#f3f4f6",
            "secondary-foreground": "#4b5563",
            muted: "#f9fafb",
            "muted-foreground": "#6b7280",
            accent: "#fffbeb",
            "accent-foreground": "#92400e",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#e5e7eb",
            input: "#e5e7eb",
            ring: "#f59e0b",
            "chart-1": "#f59e0b",
            "chart-2": "#d97706",
            "chart-3": "#b45309",
            "chart-4": "#92400e",
            "chart-5": "#78350f",
            sidebar: "#f9fafb",
            "sidebar-foreground": "#262626",
            "sidebar-primary": "#f59e0b",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#fffbeb",
            "sidebar-accent-foreground": "#92400e",
            "sidebar-border": "#e5e7eb",
            "sidebar-ring": "#f59e0b",
            radius: "0.375rem"
          },
          dark: {
            background: "#171717",
            foreground: "#e5e5e5",
            card: "#262626",
            "card-foreground": "#e5e5e5",
            popover: "#262626",
            "popover-foreground": "#e5e5e5",
            primary: "#f59e0b",
            "primary-foreground": "#000000",
            secondary: "#262626",
            "secondary-foreground": "#e5e5e5",
            muted: "#1f1f1f",
            "muted-foreground": "#a3a3a3",
            accent: "#92400e",
            "accent-foreground": "#fde68a",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#404040",
            input: "#404040",
            ring: "#f59e0b",
            "chart-1": "#fbbf24",
            "chart-2": "#d97706",
            "chart-3": "#92400e",
            "chart-4": "#b45309",
            "chart-5": "#92400e",
            sidebar: "#0f0f0f",
            "sidebar-foreground": "#e5e5e5",
            "sidebar-primary": "#f59e0b",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#92400e",
            "sidebar-accent-foreground": "#fde68a",
            "sidebar-border": "#404040",
            "sidebar-ring": "#f59e0b",
            radius: "0.375rem"
          }
        }
      },
      {
        id: "claymorphism",
        label: "Claymorphism",
        styles: {
          light: {
            background: "#e7e5e4",
            foreground: "#1e293b",
            card: "#f5f5f4",
            "card-foreground": "#1e293b",
            popover: "#f5f5f4",
            "popover-foreground": "#1e293b",
            primary: "#6366f1",
            "primary-foreground": "#ffffff",
            secondary: "#d6d3d1",
            "secondary-foreground": "#4b5563",
            muted: "#e7e5e4",
            "muted-foreground": "#6b7280",
            accent: "#f3e5f5",
            "accent-foreground": "#374151",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#d6d3d1",
            input: "#d6d3d1",
            ring: "#6366f1",
            "chart-1": "#6366f1",
            "chart-2": "#4f46e5",
            "chart-3": "#4338ca",
            "chart-4": "#3730a3",
            "chart-5": "#312e81",
            sidebar: "#d6d3d1",
            "sidebar-foreground": "#1e293b",
            "sidebar-primary": "#6366f1",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#f3e5f5",
            "sidebar-accent-foreground": "#374151",
            "sidebar-border": "#d6d3d1",
            "sidebar-ring": "#6366f1",
            radius: "1.25rem"
          },
          dark: {
            background: "#1e1b18",
            foreground: "#e2e8f0",
            card: "#2c2825",
            "card-foreground": "#e2e8f0",
            popover: "#2c2825",
            "popover-foreground": "#e2e8f0",
            primary: "#818cf8",
            "primary-foreground": "#1e1b18",
            secondary: "#3a3633",
            "secondary-foreground": "#d1d5db",
            muted: "#1f1c19",
            "muted-foreground": "#9ca3af",
            accent: "#484441",
            "accent-foreground": "#d1d5db",
            destructive: "#ef4444",
            "destructive-foreground": "#1e1b18",
            border: "#3a3633",
            input: "#3a3633",
            ring: "#818cf8",
            "chart-1": "#818cf8",
            "chart-2": "#6366f1",
            "chart-3": "#4f46e5",
            "chart-4": "#4338ca",
            "chart-5": "#3730a3",
            sidebar: "#3a3633",
            "sidebar-foreground": "#e2e8f0",
            "sidebar-primary": "#818cf8",
            "sidebar-primary-foreground": "#1e1b18",
            "sidebar-accent": "#484441",
            "sidebar-accent-foreground": "#d1d5db",
            "sidebar-border": "#3a3633",
            "sidebar-ring": "#818cf8",
            radius: "1.25rem"
          }
        }
      },
      {
        id: "pastel-dreams",
        label: "Pastel Dreams",
        styles: {
          light: {
            background: "#f7f3f9",
            foreground: "#374151",
            card: "#ffffff",
            "card-foreground": "#374151",
            popover: "#ffffff",
            "popover-foreground": "#374151",
            primary: "#a78bfa",
            "primary-foreground": "#ffffff",
            secondary: "#e9d8fd",
            "secondary-foreground": "#4b5563",
            muted: "#f3e8ff",
            "muted-foreground": "#6b7280",
            accent: "#f3e5f5",
            "accent-foreground": "#374151",
            destructive: "#fca5a5",
            "destructive-foreground": "#ffffff",
            border: "#e9d8fd",
            input: "#e9d8fd",
            ring: "#a78bfa",
            "chart-1": "#a78bfa",
            "chart-2": "#8b5cf6",
            "chart-3": "#7c3aed",
            "chart-4": "#6d28d9",
            "chart-5": "#5b21b6",
            sidebar: "#e9d8fd",
            "sidebar-foreground": "#374151",
            "sidebar-primary": "#a78bfa",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#f3e5f5",
            "sidebar-accent-foreground": "#374151",
            "sidebar-border": "#e9d8fd",
            "sidebar-ring": "#a78bfa",
            radius: "1.5rem"
          },
          dark: {
            background: "#1c1917",
            foreground: "#e0e7ff",
            card: "#2d2535",
            "card-foreground": "#e0e7ff",
            popover: "#2d2535",
            "popover-foreground": "#e0e7ff",
            primary: "#c0aafd",
            "primary-foreground": "#1c1917",
            secondary: "#3f324a",
            "secondary-foreground": "#d1d5db",
            muted: "#20182b",
            "muted-foreground": "#9ca3af",
            accent: "#4a3d5a",
            "accent-foreground": "#d1d5db",
            destructive: "#fca5a5",
            "destructive-foreground": "#1c1917",
            border: "#3f324a",
            input: "#3f324a",
            ring: "#c0aafd",
            "chart-1": "#c0aafd",
            "chart-2": "#a78bfa",
            "chart-3": "#8b5cf6",
            "chart-4": "#7c3aed",
            "chart-5": "#6d28d9",
            sidebar: "#3f324a",
            "sidebar-foreground": "#e0e7ff",
            "sidebar-primary": "#c0aafd",
            "sidebar-primary-foreground": "#1c1917",
            "sidebar-accent": "#4a3d5a",
            "sidebar-accent-foreground": "#d1d5db",
            "sidebar-border": "#3f324a",
            "sidebar-ring": "#c0aafd",
            radius: "1.5rem"
          }
        }
      },
      {
        id: "clean-slate",
        label: "Clean Slate",
        styles: {
          light: {
            background: "#f8fafc",
            foreground: "#1e293b",
            card: "#ffffff",
            "card-foreground": "#1e293b",
            popover: "#ffffff",
            "popover-foreground": "#1e293b",
            primary: "#6366f1",
            "primary-foreground": "#ffffff",
            secondary: "#e5e7eb",
            "secondary-foreground": "#374151",
            muted: "#f3f4f6",
            "muted-foreground": "#6b7280",
            accent: "#e0e7ff",
            "accent-foreground": "#374151",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#d1d5db",
            input: "#d1d5db",
            ring: "#6366f1",
            "chart-1": "#6366f1",
            "chart-2": "#4f46e5",
            "chart-3": "#4338ca",
            "chart-4": "#3730a3",
            "chart-5": "#312e81",
            sidebar: "#f3f4f6",
            "sidebar-foreground": "#1e293b",
            "sidebar-primary": "#6366f1",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#e0e7ff",
            "sidebar-accent-foreground": "#374151",
            "sidebar-border": "#d1d5db",
            "sidebar-ring": "#6366f1",
            radius: "0.5rem"
          },
          dark: {
            background: "#0f172a",
            foreground: "#e2e8f0",
            card: "#1e293b",
            "card-foreground": "#e2e8f0",
            popover: "#1e293b",
            "popover-foreground": "#e2e8f0",
            primary: "#818cf8",
            "primary-foreground": "#0f172a",
            secondary: "#2d3748",
            "secondary-foreground": "#d1d5db",
            muted: "#152032",
            "muted-foreground": "#9ca3af",
            accent: "#374151",
            "accent-foreground": "#d1d5db",
            destructive: "#ef4444",
            "destructive-foreground": "#0f172a",
            border: "#4b5563",
            input: "#4b5563",
            ring: "#818cf8",
            "chart-1": "#818cf8",
            "chart-2": "#6366f1",
            "chart-3": "#4f46e5",
            "chart-4": "#4338ca",
            "chart-5": "#3730a3",
            sidebar: "#1e293b",
            "sidebar-foreground": "#e2e8f0",
            "sidebar-primary": "#818cf8",
            "sidebar-primary-foreground": "#0f172a",
            "sidebar-accent": "#374151",
            "sidebar-accent-foreground": "#d1d5db",
            "sidebar-border": "#4b5563",
            "sidebar-ring": "#818cf8",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "ocean-breeze",
        label: "Ocean Breeze",
        styles: {
          light: {
            background: "#f0f8ff",
            foreground: "#374151",
            card: "#ffffff",
            "card-foreground": "#374151",
            popover: "#ffffff",
            "popover-foreground": "#374151",
            primary: "#22c55e",
            "primary-foreground": "#ffffff",
            secondary: "#e0f2fe",
            "secondary-foreground": "#4b5563",
            muted: "#f3f4f6",
            "muted-foreground": "#6b7280",
            accent: "#d1fae5",
            "accent-foreground": "#374151",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#e5e7eb",
            input: "#e5e7eb",
            ring: "#22c55e",
            "chart-1": "#22c55e",
            "chart-2": "#10b981",
            "chart-3": "#059669",
            "chart-4": "#047857",
            "chart-5": "#065f46",
            sidebar: "#e0f2fe",
            "sidebar-foreground": "#374151",
            "sidebar-primary": "#22c55e",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#d1fae5",
            "sidebar-accent-foreground": "#374151",
            "sidebar-border": "#e5e7eb",
            "sidebar-ring": "#22c55e",
            radius: "0.5rem"
          },
          dark: {
            background: "#0f172a",
            foreground: "#d1d5db",
            card: "#1e293b",
            "card-foreground": "#d1d5db",
            popover: "#1e293b",
            "popover-foreground": "#d1d5db",
            primary: "#34d399",
            "primary-foreground": "#0f172a",
            secondary: "#2d3748",
            "secondary-foreground": "#a1a1aa",
            muted: "#19212e",
            "muted-foreground": "#6b7280",
            accent: "#374151",
            "accent-foreground": "#a1a1aa",
            destructive: "#ef4444",
            "destructive-foreground": "#0f172a",
            border: "#4b5563",
            input: "#4b5563",
            ring: "#34d399",
            "chart-1": "#34d399",
            "chart-2": "#2dd4bf",
            "chart-3": "#22c55e",
            "chart-4": "#10b981",
            "chart-5": "#059669",
            sidebar: "#1e293b",
            "sidebar-foreground": "#d1d5db",
            "sidebar-primary": "#34d399",
            "sidebar-primary-foreground": "#0f172a",
            "sidebar-accent": "#374151",
            "sidebar-accent-foreground": "#c7c9cf",
            "sidebar-border": "#4b5563",
            "sidebar-ring": "#34d399",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "retro-arcade",
        label: "Retro Arcade",
        styles: {
          light: {
            background: "#fdf6e3",
            foreground: "#073642",
            card: "#eee8d5",
            "card-foreground": "#073642",
            popover: "#eee8d5",
            "popover-foreground": "#073642",
            primary: "#d33682",
            "primary-foreground": "#ffffff",
            secondary: "#2aa198",
            "secondary-foreground": "#ffffff",
            muted: "#93a1a1",
            "muted-foreground": "#073642",
            accent: "#cb4b16",
            "accent-foreground": "#ffffff",
            destructive: "#dc322f",
            "destructive-foreground": "#ffffff",
            border: "#839496",
            input: "#839496",
            ring: "#d33682",
            "chart-1": "#268bd2",
            "chart-2": "#2aa198",
            "chart-3": "#d33682",
            "chart-4": "#cb4b16",
            "chart-5": "#dc322f",
            sidebar: "#fdf6e3",
            "sidebar-foreground": "#073642",
            "sidebar-primary": "#d33682",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#177f78",
            "sidebar-accent-foreground": "#ffffff",
            "sidebar-border": "#839496",
            "sidebar-ring": "#d33682",
            radius: "0px"
          },
          dark: {
            background: "#002b36",
            foreground: "#93a1a1",
            card: "#073642",
            "card-foreground": "#93a1a1",
            popover: "#073642",
            "popover-foreground": "#93a1a1",
            primary: "#d33682",
            "primary-foreground": "#ffffff",
            secondary: "#2aa198",
            "secondary-foreground": "#ffffff",
            muted: "#586e75",
            "muted-foreground": "#93a1a1",
            accent: "#cb4b16",
            "accent-foreground": "#ffffff",
            destructive: "#dc322f",
            "destructive-foreground": "#ffffff",
            border: "#586e75",
            input: "#586e75",
            ring: "#d33682",
            "chart-1": "#268bd2",
            "chart-2": "#2aa198",
            "chart-3": "#d33682",
            "chart-4": "#cb4b16",
            "chart-5": "#dc322f",
            sidebar: "#002b36",
            "sidebar-foreground": "#93a1a1",
            "sidebar-primary": "#d33682",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#177f78",
            "sidebar-accent-foreground": "#ffffff",
            "sidebar-border": "#586e75",
            "sidebar-ring": "#d33682",
            radius: "0px"
          }
        }
      },
      {
        id: "midnight-bloom",
        label: "Midnight Bloom",
        styles: {
          light: {
            background: "#f9f9f9",
            foreground: "#333333",
            card: "#ffffff",
            "card-foreground": "#333333",
            popover: "#ffffff",
            "popover-foreground": "#333333",
            primary: "#6c5ce7",
            "primary-foreground": "#ffffff",
            secondary: "#a1c9f2",
            "secondary-foreground": "#333333",
            muted: "#c9c4b5",
            "muted-foreground": "#6e6e6e",
            accent: "#8b9467",
            "accent-foreground": "#ffffff",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#d4d4d4",
            input: "#d4d4d4",
            ring: "#6c5ce7",
            "chart-1": "#6c5ce7",
            "chart-2": "#8e44ad",
            "chart-3": "#4b0082",
            "chart-4": "#6495ed",
            "chart-5": "#4682b4",
            sidebar: "#f9f9f9",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#6c5ce7",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#8b9467",
            "sidebar-accent-foreground": "#1f2114",
            "sidebar-border": "#d4d4d4",
            "sidebar-ring": "#6c5ce7",
            radius: "0.5rem"
          },
          dark: {
            background: "#1a1d23",
            foreground: "#e5e5e5",
            card: "#2f3436",
            "card-foreground": "#e5e5e5",
            popover: "#2f3436",
            "popover-foreground": "#e5e5e5",
            primary: "#6c5ce7",
            "primary-foreground": "#ffffff",
            secondary: "#4b0082",
            "secondary-foreground": "#e5e5e5",
            muted: "#444444",
            "muted-foreground": "#a3a3a3",
            accent: "#6495ed",
            "accent-foreground": "#e5e5e5",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#444444",
            input: "#444444",
            ring: "#6c5ce7",
            "chart-1": "#6c5ce7",
            "chart-2": "#8e44ad",
            "chart-3": "#4b0082",
            "chart-4": "#6495ed",
            "chart-5": "#4682b4",
            sidebar: "#1a1d23",
            "sidebar-foreground": "#e5e5e5",
            "sidebar-primary": "#6c5ce7",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#31527f",
            "sidebar-accent-foreground": "#e5e5e5",
            "sidebar-border": "#444444",
            "sidebar-ring": "#6c5ce7",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "candyland",
        label: "Candyland",
        styles: {
          light: {
            background: "#f7f9fa",
            foreground: "#333333",
            card: "#ffffff",
            "card-foreground": "#333333",
            popover: "#ffffff",
            "popover-foreground": "#333333",
            primary: "#ffc0cb",
            "primary-foreground": "#000000",
            secondary: "#87ceeb",
            "secondary-foreground": "#000000",
            muted: "#ddd9c4",
            "muted-foreground": "#6e6e6e",
            accent: "#ffff00",
            "accent-foreground": "#000000",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#d4d4d4",
            input: "#d4d4d4",
            ring: "#ffc0cb",
            "chart-1": "#ffc0cb",
            "chart-2": "#87ceeb",
            "chart-3": "#ffff00",
            "chart-4": "#ff99cc",
            "chart-5": "#33cc33",
            sidebar: "#f7f9fa",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#ffc0cb",
            "sidebar-primary-foreground": "#000000",
            "sidebar-accent": "#f0b429",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#d4d4d4",
            "sidebar-ring": "#ffc0cb",
            radius: "0.5rem"
          },
          dark: {
            background: "#1a1d23",
            foreground: "#e5e5e5",
            card: "#2f3436",
            "card-foreground": "#e5e5e5",
            popover: "#2f3436",
            "popover-foreground": "#e5e5e5",
            primary: "#ff99cc",
            "primary-foreground": "#000000",
            secondary: "#33cc33",
            "secondary-foreground": "#000000",
            muted: "#444444",
            "muted-foreground": "#a3a3a3",
            accent: "#87ceeb",
            "accent-foreground": "#000000",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#444444",
            input: "#444444",
            ring: "#ff99cc",
            "chart-1": "#ff99cc",
            "chart-2": "#33cc33",
            "chart-3": "#87ceeb",
            "chart-4": "#ffff00",
            "chart-5": "#ffcc00",
            sidebar: "#1a1d23",
            "sidebar-foreground": "#e5e5e5",
            "sidebar-primary": "#ff99cc",
            "sidebar-primary-foreground": "#000000",
            "sidebar-accent": "#87ceeb",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#444444",
            "sidebar-ring": "#ff99cc",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "northern-lights",
        label: "Northern Lights",
        styles: {
          light: {
            background: "#f9f9fa",
            foreground: "#333333",
            card: "#ffffff",
            "card-foreground": "#333333",
            popover: "#ffffff",
            "popover-foreground": "#333333",
            primary: "#34a85a",
            "primary-foreground": "#ffffff",
            secondary: "#6495ed",
            "secondary-foreground": "#ffffff",
            muted: "#ddd9c4",
            "muted-foreground": "#6e6e6e",
            accent: "#66d9ef",
            "accent-foreground": "#333333",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#d4d4d4",
            input: "#d4d4d4",
            ring: "#34a85a",
            "chart-1": "#34a85a",
            "chart-2": "#6495ed",
            "chart-3": "#66d9ef",
            "chart-4": "#4682b4",
            "chart-5": "#1a9641",
            sidebar: "#f9f9fa",
            "sidebar-foreground": "#333333",
            "sidebar-primary": "#34a85a",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#66d9ef",
            "sidebar-accent-foreground": "#333333",
            "sidebar-border": "#d4d4d4",
            "sidebar-ring": "#34a85a",
            radius: "0.5rem"
          },
          dark: {
            background: "#1a1d23",
            foreground: "#e5e5e5",
            card: "#2f3436",
            "card-foreground": "#e5e5e5",
            popover: "#2f3436",
            "popover-foreground": "#e5e5e5",
            primary: "#34a85a",
            "primary-foreground": "#ffffff",
            secondary: "#4682b4",
            "secondary-foreground": "#e5e5e5",
            muted: "#444444",
            "muted-foreground": "#a3a3a3",
            accent: "#6495ed",
            "accent-foreground": "#e5e5e5",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#444444",
            input: "#444444",
            ring: "#34a85a",
            "chart-1": "#34a85a",
            "chart-2": "#4682b4",
            "chart-3": "#6495ed",
            "chart-4": "#66d9ef",
            "chart-5": "#1a9641",
            sidebar: "#1a1d23",
            "sidebar-foreground": "#e5e5e5",
            "sidebar-primary": "#34a85a",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#31527f",
            "sidebar-accent-foreground": "#e5e5e5",
            "sidebar-border": "#444444",
            "sidebar-ring": "#34a85a",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "vintage-paper",
        label: "Vintage Paper",
        styles: {
          light: {
            background: "#f5f1e6",
            foreground: "#4a3f35",
            card: "#fffcf5",
            "card-foreground": "#4a3f35",
            popover: "#fffcf5",
            "popover-foreground": "#4a3f35",
            primary: "#a67c52",
            "primary-foreground": "#ffffff",
            secondary: "#e2d8c3",
            "secondary-foreground": "#5c4d3f",
            muted: "#ece5d8",
            "muted-foreground": "#7d6b56",
            accent: "#d4c8aa",
            "accent-foreground": "#4a3f35",
            destructive: "#b54a35",
            "destructive-foreground": "#ffffff",
            border: "#dbd0ba",
            input: "#dbd0ba",
            ring: "#a67c52",
            "chart-1": "#a67c52",
            "chart-2": "#8d6e4c",
            "chart-3": "#735a3a",
            "chart-4": "#b3906f",
            "chart-5": "#c0a080",
            sidebar: "#ece5d8",
            "sidebar-foreground": "#4a3f35",
            "sidebar-primary": "#a67c52",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#d4c8aa",
            "sidebar-accent-foreground": "#4a3f35",
            "sidebar-border": "#dbd0ba",
            "sidebar-ring": "#a67c52",
            radius: "0.25rem"
          },
          dark: {
            background: "#2d2621",
            foreground: "#ece5d8",
            card: "#3a322c",
            "card-foreground": "#ece5d8",
            popover: "#3a322c",
            "popover-foreground": "#ece5d8",
            primary: "#c0a080",
            "primary-foreground": "#2d2621",
            secondary: "#4a4039",
            "secondary-foreground": "#ece5d8",
            muted: "#312b26",
            "muted-foreground": "#c5bcac",
            accent: "#59493e",
            "accent-foreground": "#ece5d8",
            destructive: "#b54a35",
            "destructive-foreground": "#ffffff",
            border: "#4a4039",
            input: "#4a4039",
            ring: "#c0a080",
            "chart-1": "#c0a080",
            "chart-2": "#b3906f",
            "chart-3": "#a67c52",
            "chart-4": "#8d6e4c",
            "chart-5": "#735a3a",
            sidebar: "#2d2621",
            "sidebar-foreground": "#ece5d8",
            "sidebar-primary": "#c0a080",
            "sidebar-primary-foreground": "#2d2621",
            "sidebar-accent": "#59493e",
            "sidebar-accent-foreground": "#ece5d8",
            "sidebar-border": "#4a4039",
            "sidebar-ring": "#c0a080",
            radius: "0.25rem"
          }
        }
      },
      {
        id: "sunset-horizon",
        label: "Sunset Horizon",
        styles: {
          light: {
            background: "#fff9f5",
            foreground: "#3d3436",
            card: "#ffffff",
            "card-foreground": "#3d3436",
            popover: "#ffffff",
            "popover-foreground": "#3d3436",
            primary: "#ff7e5f",
            "primary-foreground": "#ffffff",
            secondary: "#ffedea",
            "secondary-foreground": "#b35340",
            muted: "#fff0eb",
            "muted-foreground": "#78716C",
            accent: "#feb47b",
            "accent-foreground": "#3d3436",
            destructive: "#e63946",
            "destructive-foreground": "#ffffff",
            border: "#ffe0d6",
            input: "#ffe0d6",
            ring: "#ff7e5f",
            "chart-1": "#ff7e5f",
            "chart-2": "#feb47b",
            "chart-3": "#ffcaa7",
            "chart-4": "#ffad8f",
            "chart-5": "#ce6a57",
            sidebar: "#fff0eb",
            "sidebar-foreground": "#3d3436",
            "sidebar-primary": "#ff7e5f",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#feb47b",
            "sidebar-accent-foreground": "#3d3436",
            "sidebar-border": "#ffe0d6",
            "sidebar-ring": "#ff7e5f",
            radius: "0.625rem"
          },
          dark: {
            background: "#2a2024",
            foreground: "#f2e9e4",
            card: "#392f35",
            "card-foreground": "#f2e9e4",
            popover: "#392f35",
            "popover-foreground": "#f2e9e4",
            primary: "#ff7e5f",
            "primary-foreground": "#ffffff",
            secondary: "#463a41",
            "secondary-foreground": "#f2e9e4",
            muted: "#30272c",
            "muted-foreground": "#d7c6bc",
            accent: "#feb47b",
            "accent-foreground": "#2a2024",
            destructive: "#e63946",
            "destructive-foreground": "#ffffff",
            border: "#463a41",
            input: "#463a41",
            ring: "#ff7e5f",
            "chart-1": "#ff7e5f",
            "chart-2": "#feb47b",
            "chart-3": "#ffcaa7",
            "chart-4": "#ffad8f",
            "chart-5": "#ce6a57",
            sidebar: "#2a2024",
            "sidebar-foreground": "#f2e9e4",
            "sidebar-primary": "#ff7e5f",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#feb47b",
            "sidebar-accent-foreground": "#2a2024",
            "sidebar-border": "#463a41",
            "sidebar-ring": "#ff7e5f",
            radius: "0.625rem"
          }
        }
      },
      {
        id: "starry-night",
        label: "Starry Night",
        styles: {
          light: {
            background: "#f5f7fa",
            foreground: "#1a2238",
            card: "#e3eaf2",
            "card-foreground": "#1a2238",
            popover: "#fffbe6",
            "popover-foreground": "#1a2238",
            primary: "#3a5ba0",
            "primary-foreground": "#fffbe6",
            secondary: "#f7c873",
            "secondary-foreground": "#1a2238",
            muted: "#e5e5df",
            "muted-foreground": "#3a5ba0",
            accent: "#6ea3c1",
            "accent-foreground": "#fffbe6",
            destructive: "#2d1e2f",
            "destructive-foreground": "#fffbe6",
            border: "#b0b8c1",
            input: "#6ea3c1",
            ring: "#f7c873",
            "chart-1": "#3a5ba0",
            "chart-2": "#f7c873",
            "chart-3": "#6ea3c1",
            "chart-4": "#b0b8c1",
            "chart-5": "#2d1e2f",
            sidebar: "#e3eaf2",
            "sidebar-foreground": "#1a2238",
            "sidebar-primary": "#3a5ba0",
            "sidebar-primary-foreground": "#fffbe6",
            "sidebar-accent": "#f7c873",
            "sidebar-accent-foreground": "#1a2238",
            "sidebar-border": "#b0b8c1",
            "sidebar-ring": "#f7c873",
            radius: "0.5rem"
          },
          dark: {
            background: "#181a24",
            foreground: "#e6eaf3",
            card: "#23243a",
            "card-foreground": "#e6eaf3",
            popover: "#23243a",
            "popover-foreground": "#ffe066",
            primary: "#3a5ba0",
            "primary-foreground": "#ffe066",
            secondary: "#ffe066",
            "secondary-foreground": "#23243a",
            muted: "#1d1e2f",
            "muted-foreground": "#7a88a1",
            accent: "#bccdf0",
            "accent-foreground": "#181a24",
            destructive: "#a04a6c",
            "destructive-foreground": "#ffe066",
            border: "#2d2e3e",
            input: "#3a5ba0",
            ring: "#ffe066",
            "chart-1": "#3a5ba0",
            "chart-2": "#ffe066",
            "chart-3": "#6ea3c1",
            "chart-4": "#7a88a1",
            "chart-5": "#a04a6c",
            sidebar: "#23243a",
            "sidebar-foreground": "#e6eaf3",
            "sidebar-primary": "#3a5ba0",
            "sidebar-primary-foreground": "#ffe066",
            "sidebar-accent": "#ffe066",
            "sidebar-accent-foreground": "#23243a",
            "sidebar-border": "#2d2e3e",
            "sidebar-ring": "#ffe066",
            radius: "0.5rem"
          }
        }
      },
      {
        id: "darkmatter",
        label: "Darkmatter",
        styles: {
          light: {
            background: "#ffffff",
            foreground: "#111827",
            card: "#ffffff",
            "card-foreground": "#111827",
            popover: "#ffffff",
            "popover-foreground": "#111827",
            primary: "#d87943",
            "primary-foreground": "#ffffff",
            secondary: "#527575",
            "secondary-foreground": "#ffffff",
            muted: "#f3f4f6",
            "muted-foreground": "#6b7280",
            accent: "#eeeeee",
            "accent-foreground": "#111827",
            destructive: "#ef4444",
            "destructive-foreground": "#fafafa",
            border: "#e5e7eb",
            input: "#e5e7eb",
            ring: "#d87943",
            "chart-1": "#5f8787",
            "chart-2": "#e78a53",
            "chart-3": "#fbcb97",
            "chart-4": "#888888",
            "chart-5": "#999999",
            sidebar: "#f3f4f6",
            "sidebar-foreground": "#111827",
            "sidebar-primary": "#d87943",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#ffffff",
            "sidebar-accent-foreground": "#111827",
            "sidebar-border": "#e5e7eb",
            "sidebar-ring": "#d87943",
            radius: "0.75rem"
          },
          dark: {
            background: "#121113",
            foreground: "#c1c1c1",
            card: "#121212",
            "card-foreground": "#c1c1c1",
            popover: "#121113",
            "popover-foreground": "#c1c1c1",
            primary: "#e78a53",
            "primary-foreground": "#121113",
            secondary: "#5f8787",
            "secondary-foreground": "#121113",
            muted: "#222222",
            "muted-foreground": "#888888",
            accent: "#333333",
            "accent-foreground": "#c1c1c1",
            destructive: "#5f8787",
            "destructive-foreground": "#121113",
            border: "#222222",
            input: "#222222",
            ring: "#e78a53",
            "chart-1": "#5f8787",
            "chart-2": "#e78a53",
            "chart-3": "#fbcb97",
            "chart-4": "#888888",
            "chart-5": "#999999",
            sidebar: "#121212",
            "sidebar-foreground": "#c1c1c1",
            "sidebar-primary": "#e78a53",
            "sidebar-primary-foreground": "#121113",
            "sidebar-accent": "#333333",
            "sidebar-accent-foreground": "#c1c1c1",
            "sidebar-border": "#222222",
            "sidebar-ring": "#e78a53",
            radius: "0.75rem"
          }
        }
      },
      {
        id: "soft-pop",
        label: "Soft Pop",
        styles: {
          light: {
            background: "#f7f9f3",
            foreground: "#000000",
            card: "#ffffff",
            "card-foreground": "#000000",
            popover: "#ffffff",
            "popover-foreground": "#000000",
            primary: "#4f46e5",
            "primary-foreground": "#ffffff",
            secondary: "#14b8a6",
            "secondary-foreground": "#ffffff",
            muted: "#f0f0f0",
            "muted-foreground": "#333333",
            accent: "#f59e0b",
            "accent-foreground": "#000000",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#000000",
            input: "#737373",
            ring: "#a5b4fc",
            "chart-1": "#4f46e5",
            "chart-2": "#14b8a6",
            "chart-3": "#f59e0b",
            "chart-4": "#ec4899",
            "chart-5": "#22c55e",
            sidebar: "#f7f9f3",
            "sidebar-foreground": "#000000",
            "sidebar-primary": "#4f46e5",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#f59e0b",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#000000",
            "sidebar-ring": "#a5b4fc",
            radius: "1rem"
          },
          dark: {
            background: "#000000",
            foreground: "#ffffff",
            card: "#1a212b",
            "card-foreground": "#ffffff",
            popover: "#1a212b",
            "popover-foreground": "#ffffff",
            primary: "#818cf8",
            "primary-foreground": "#000000",
            secondary: "#2dd4bf",
            "secondary-foreground": "#000000",
            muted: "#333333",
            "muted-foreground": "#cccccc",
            accent: "#fcd34d",
            "accent-foreground": "#000000",
            destructive: "#f87171",
            "destructive-foreground": "#000000",
            border: "#545454",
            input: "#ffffff",
            ring: "#818cf8",
            "chart-1": "#818cf8",
            "chart-2": "#2dd4bf",
            "chart-3": "#fcd34d",
            "chart-4": "#f472b6",
            "chart-5": "#4ade80",
            sidebar: "#000000",
            "sidebar-foreground": "#ffffff",
            "sidebar-primary": "#818cf8",
            "sidebar-primary-foreground": "#000000",
            "sidebar-accent": "#fcd34d",
            "sidebar-accent-foreground": "#000000",
            "sidebar-border": "#ffffff",
            "sidebar-ring": "#818cf8",
            radius: "1rem"
          }
        }
      },
      {
        id: "sage-garden",
        label: "Sage Garden",
        styles: {
          light: {
            background: "#f8f7f4",
            foreground: "#1a1f2e",
            card: "#ffffff",
            "card-foreground": "#1a1f2e",
            popover: "#ffffff",
            "popover-foreground": "#1a1f2e",
            primary: "#7c9082",
            "primary-foreground": "#ffffff",
            secondary: "#ced4bf",
            "secondary-foreground": "#1a1f2e",
            muted: "#e8e6e1",
            "muted-foreground": "#6b7280",
            accent: "#bfc9bb",
            "accent-foreground": "#1a1f2e",
            destructive: "#c73e3a",
            "destructive-foreground": "#ffffff",
            border: "#e8e6e1",
            input: "#ffffff",
            ring: "#7c9082",
            "chart-1": "#7c9082",
            "chart-2": "#a0aa88",
            "chart-3": "#8b9d83",
            "chart-4": "#6b7280",
            "chart-5": "#e8e6e1",
            sidebar: "#fafaf8",
            "sidebar-foreground": "#1a1f2e",
            "sidebar-primary": "#7c9082",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#e8e6e1",
            "sidebar-accent-foreground": "#1a1f2e",
            "sidebar-border": "#e8e6e1",
            "sidebar-ring": "#7c9082",
            radius: "0.35rem"
          },
          dark: {
            background: "#0a0a0a",
            foreground: "#f5f5f5",
            card: "#121212",
            "card-foreground": "#f5f5f5",
            popover: "#121212",
            "popover-foreground": "#f5f5f5",
            primary: "#7c9082",
            "primary-foreground": "#000000",
            secondary: "#1a1a1a",
            "secondary-foreground": "#f5f5f5",
            muted: "#1a1a1a",
            "muted-foreground": "#a0a0a0",
            accent: "#36443a",
            "accent-foreground": "#f5f5f5",
            destructive: "#ef4444",
            "destructive-foreground": "#ffffff",
            border: "#2a2a2a",
            input: "#121212",
            ring: "#7c9082",
            "chart-1": "#7c9082",
            "chart-2": "#a0aa88",
            "chart-3": "#8b9d83",
            "chart-4": "#6b7280",
            "chart-5": "#5a6b5e",
            sidebar: "#0f0f0f",
            "sidebar-foreground": "#f5f5f5",
            "sidebar-primary": "#7c9082",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#1a1a1a",
            "sidebar-accent-foreground": "#f5f5f5",
            "sidebar-border": "#2a2a2a",
            "sidebar-ring": "#7c9082",
            radius: "0.35rem"
          }
        }
      },
      {
        id: "openai",
        label: "OpenAI",
        styles: {
          light: {
            background: "#f7f7f7",
            foreground: "#0d0d0d",
            card: "#ffffff",
            "card-foreground": "#0d0d0d",
            popover: "#ffffff",
            "popover-foreground": "#0d0d0d",
            primary: "#0d0d0d",
            "primary-foreground": "#ffffff",
            secondary: "#ececec",
            "secondary-foreground": "#0d0d0d",
            muted: "#ececec",
            "muted-foreground": "#6e6e6e",
            accent: "#efefef",
            "accent-foreground": "#0d0d0d",
            destructive: "#e02e2a",
            "destructive-foreground": "#ffffff",
            border: "#e5e5e5",
            input: "#e5e5e5",
            ring: "#0d0d0d",
            "chart-1": "#10a37f",
            "chart-2": "#0d0d0d",
            "chart-3": "#efefef",
            "chart-4": "#19c37d",
            "chart-5": "#8f8f8f",
            sidebar: "#fcfcfc",
            "sidebar-foreground": "#0d0d0d",
            "sidebar-primary": "#0d0d0d",
            "sidebar-primary-foreground": "#ffffff",
            "sidebar-accent": "#efefef",
            "sidebar-accent-foreground": "#0d0d0d",
            "sidebar-border": "#ececec",
            "sidebar-ring": "#c7c7c7",
            radius: "1.5rem"
          },
          dark: {
            background: "#2f2f2f",
            foreground: "#ffffff",
            card: "#2a2a2a",
            "card-foreground": "#ffffff",
            popover: "#404040",
            "popover-foreground": "#ffffff",
            primary: "#ffffff",
            "primary-foreground": "#0d0d0d",
            secondary: "#2a2a2a",
            "secondary-foreground": "#ffffff",
            muted: "#2a2a2a",
            "muted-foreground": "#afafaf",
            accent: "#1a1a1a",
            "accent-foreground": "#ffffff",
            destructive: "#ff6b6b",
            "destructive-foreground": "#000000",
            border: "#383838",
            input: "#383838",
            ring: "#9b9b9b",
            "chart-1": "#19c37d",
            "chart-2": "#ffffff",
            "chart-3": "#1a1a1a",
            "chart-4": "#10a37f",
            "chart-5": "#8f8f8f",
            sidebar: "#000000",
            "sidebar-foreground": "#ffffff",
            "sidebar-primary": "#ffffff",
            "sidebar-primary-foreground": "#000000",
            "sidebar-accent": "#1a1a1a",
            "sidebar-accent-foreground": "#ffffff",
            "sidebar-border": "#1f1f1f",
            "sidebar-ring": "#9b9b9b",
            radius: "1.5rem"
          }
        }
      }
    ];
  })();

  // node_modules/defuss-store/dist/internal-C4BA7RyW.js
  var INTERNAL = /* @__PURE__ */ Symbol.for("defuss-store.internal.v1");
  function installInternal(store, api) {
    Object.defineProperty(store, INTERNAL, { value: api });
  }
  function internalOf(store) {
    const api = store[INTERNAL];
    if (!api)
      throw new TypeError("Expected a defuss-store v1 protocol store");
    return api;
  }
  function reportError(error) {
    try {
      console.error(error);
    } catch {}
  }
  function isContainer(value) {
    return typeof value === "object" && value !== null && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  }

  // node_modules/defuss-store/dist/index.js
  var own = (value, key) => Object.hasOwn(value, key);
  function parsePath(path) {
    if (typeof path !== "string" || !path)
      throw new TypeError("A nonempty path is required");
    const invalid = () => new TypeError(`Invalid path: ${path}`);
    const keys = [];
    for (let i = 0;i < path.length; ) {
      const bracket = path[i] === "[";
      const start = bracket ? ++i : i;
      let index = 0;
      let canonical = true;
      for (let code;i < path.length && (code = path.charCodeAt(i)) !== 46 && code !== 91 && code !== 93; i++) {
        canonical &&= code > 47 && code < 58 && (i === start || index > 0);
        index = index * 10 + code - 48;
      }
      if (i === start || bracket && (!canonical || path[i++] !== "]"))
        throw invalid();
      if (canonical) {
        if (index > 4294967294)
          throw new RangeError("Array index out of range");
        keys.push(index);
      } else {
        const key = path.slice(start, i);
        if (key === "__proto__" || key === "prototype" || key === "constructor")
          throw new TypeError(`Unsafe path segment: ${key}`);
        keys.push(key);
      }
      if (path[i] === ".") {
        if (++i === path.length || path[i] === "[")
          throw invalid();
      } else if (i < path.length && path[i] !== "[")
        throw invalid();
    }
    return keys;
  }
  function getByPath(value, path) {
    for (const key of parsePath(path)) {
      if (Object(value) !== value || !own(value, key))
        return;
      value = value[key];
    }
    return value;
  }
  function setByPath(root, path, next) {
    const keys = parsePath(path);
    const deleting = next === undefined;
    function visit(current, depth) {
      const key = keys[depth];
      if (!isContainer(current)) {
        if (current != null)
          throw new TypeError("Path updates require plain objects or arrays");
        if (deleting)
          return current;
        current = typeof key === "number" ? [] : {};
      }
      const source = current;
      const array = Array.isArray(source);
      if (array && typeof key !== "number")
        throw new TypeError("Array paths require nonnegative indices");
      const exists = own(source, key);
      if (!exists && deleting)
        return current;
      const old = exists ? source[key] : undefined;
      const leaf = depth === keys.length - 1;
      const updated = leaf ? next : visit(old, depth + 1);
      if (Object.is(old, updated) && (!deleting || !leaf))
        return current;
      const copy = array ? source.slice() : { ...source, [key]: updated };
      if (leaf && deleting) {
        if (array)
          copy.splice(key, 1);
        else
          delete copy[key];
      } else if (array) {
        if (exists)
          copy[key] = updated;
        else
          Object.defineProperty(copy, key, { value: updated, enumerable: true, configurable: true, writable: true });
      }
      return copy;
    }
    return visit(root, 0);
  }
  function createStore(initial, options = {}) {
    const equals = options.equals ?? Object.is;
    let value = initial;
    let destroyed = false;
    let revision = 0;
    let draining = false;
    const listeners = /* @__PURE__ */ new Set;
    let snapshot;
    const cleanups = /* @__PURE__ */ new Set;
    const queue = [];
    function alive() {
      if (destroyed)
        throw new Error("Store is destroyed");
    }
    function observe(listener) {
      alive();
      const registration = { listener, active: true };
      listeners.add(registration);
      snapshot = undefined;
      return () => {
        registration.active = false;
        if (listeners.delete(registration))
          snapshot = undefined;
      };
    }
    function commit(next, path, origin) {
      alive();
      if (equals(value, next))
        return;
      const previous = value;
      value = next;
      ++revision;
      if (!listeners.size)
        return;
      queue.push({ value, previous, path, origin, revision, listeners: snapshot ??= [...listeners] });
      if (draining)
        return;
      draining = true;
      const errors = [];
      try {
        for (let index = 0;index < queue.length; index++) {
          const entry = queue[index];
          for (const registration of entry.listeners) {
            if (!registration.active)
              continue;
            try {
              registration.listener(entry);
            } catch (error) {
              errors.push(error);
            }
          }
        }
      } finally {
        queue.length = 0;
        draining = false;
      }
      if (errors.length)
        throw new AggregateError(errors, "Store listeners failed after state committed");
    }
    function subscribe(select, listener, options2 = {}) {
      alive();
      if (typeof listener !== "function") {
        options2 = listener ?? {};
        listener = select;
        select = undefined;
      }
      const notify = listener;
      const compare = options2.equals ?? Object.is;
      let selected = select?.(value);
      const off = observe((change) => {
        let next = change.value;
        let old = change.previous;
        if (select) {
          next = select(change.value);
          if (compare(selected, next))
            return;
          old = selected;
          selected = next;
        }
        notify(next, old, change.path);
      });
      try {
        if (options2.immediate)
          notify(select ? selected : value, undefined, undefined);
      } catch (error) {
        off();
        throw error;
      }
      return off;
    }
    const store = {
      get value() {
        return value;
      },
      get destroyed() {
        return destroyed;
      },
      get: (path) => path ? getByPath(value, path) : value,
      getRaw: () => value,
      set(pathOrValue, next) {
        alive();
        if (arguments.length === 1)
          commit(pathOrValue);
        else if (arguments.length === 2 && typeof pathOrValue === "string")
          commit(setByPath(value, pathOrValue, next), pathOrValue);
        else
          throw new TypeError("set expects a value or a string path and value");
      },
      setRaw: (next) => commit(next),
      update(updater) {
        alive();
        commit(updater(value));
      },
      remove(path) {
        alive();
        commit(setByPath(value, path, undefined), path);
      },
      reset(next) {
        commit(arguments.length ? next : initial);
      },
      subscribe,
      onDestroy(cleanup) {
        alive();
        cleanups.add(cleanup);
        return () => {
          cleanups.delete(cleanup);
        };
      },
      destroy() {
        if (destroyed)
          return;
        destroyed = true;
        for (const registration of listeners)
          registration.active = false;
        listeners.clear();
        snapshot = undefined;
        const errors = [];
        for (const cleanup of cleanups) {
          cleanups.delete(cleanup);
          try {
            cleanup();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length)
          throw new AggregateError(errors, "Store cleanup failed");
      }
    };
    installInternal(store, { set: (next, origin) => commit(next, undefined, origin), observe, revision: () => revision });
    return store;
  }
  var jsonEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // node_modules/defuss-store/dist/codec-CUhpHYA_.js
  function assertJsonValue(value) {
    const active = [];
    function visit(item) {
      if (item === null || typeof item === "string" || typeof item === "boolean")
        return;
      if (typeof item === "number" && Number.isFinite(item) && !Object.is(item, -0))
        return;
      if (typeof item !== "object")
        throw new TypeError("Value is not lossless JSON data");
      if (active.includes(item))
        throw new TypeError("Cyclic values cannot be persisted as JSON");
      if (!isContainer(item))
        throw new TypeError("JSON persistence requires plain objects or arrays");
      const array = Array.isArray(item);
      const keys = Reflect.ownKeys(item);
      if (array && keys.length !== item.length + 1)
        throw new TypeError("Sparse or extended arrays are not JSON data");
      let extra = false;
      active.push(item);
      for (const key of keys) {
        if (array && key === "length") {
          extra = true;
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (typeof key === "symbol" || !descriptor.enumerable || !("value" in descriptor)) {
          throw new TypeError("JSON data cannot contain symbols, accessors or hidden properties");
        }
        if (extra)
          throw new TypeError("Extended arrays are not JSON data");
        visit(descriptor.value);
      }
      active.pop();
    }
    visit(value);
  }
  var jsonCodec = {
    encode(value) {
      assertJsonValue(value);
      return JSON.stringify(value);
    },
    decode(serialized) {
      const value = JSON.parse(serialized);
      assertJsonValue(value);
      return value;
    }
  };

  // node_modules/defuss-store/dist/storage/index.js
  function createMemoryStorage() {
    const cache = /* @__PURE__ */ new Map;
    return {
      get length() {
        return cache.size;
      },
      key(index) {
        return Number.isInteger(index) && index >= 0 ? [...cache.keys()][index] ?? null : null;
      },
      getItem: (key) => cache.get(String(key)) ?? null,
      setItem: (key, value) => {
        cache.set(String(key), String(value));
      },
      removeItem: (key) => {
        cache.delete(String(key));
      },
      clear: () => {
        cache.clear();
      }
    };
  }
  function createWebStorage(area, options = {}) {
    if (area !== "local" && area !== "session")
      throw new TypeError("Storage area must be local or session");
    let backend;
    let host;
    function resolve() {
      if (backend)
        return backend;
      try {
        const browser = globalThis.window;
        const storage = browser?.document && browser[`${area}Storage`];
        if (!storage)
          throw new Error("Browser Web Storage is unavailable");
        host = browser;
        backend = storage;
      } catch (error) {
        if (!options.fallback)
          throw error;
        backend = options.fallback;
        try {
          options.onUnavailable?.(error);
        } catch (reportingError) {
          reportError(reportingError);
        }
      }
      return backend;
    }
    return {
      getItem: (key) => resolve().getItem(key),
      setItem: (key, value) => resolve().setItem(key, value),
      removeItem: (key) => resolve().removeItem(key),
      subscribe(listener) {
        const storage = resolve();
        const browser = host;
        if (!browser) {
          if (!storage.subscribe)
            throw new Error("Selected fallback does not support storage synchronization");
          return storage.subscribe(listener);
        }
        const handle = (event) => {
          if (event.storageArea === storage)
            listener({ key: event.key });
        };
        browser.addEventListener("storage", handle);
        return () => browser.removeEventListener("storage", handle);
      }
    };
  }

  // node_modules/defuss-store/dist/persist/index.js
  var format = "defuss-store";
  var validVersion = (value) => Number.isSafeInteger(value) && value >= 0;
  function attachPersistence(store, options) {
    const api = internalOf(store);
    if (store.destroyed)
      throw new Error("Store is destroyed");
    if (api.persistence)
      throw new Error("Store already has an attached persistence controller");
    if (typeof options.key !== "string" || !validVersion(options.version) || typeof options.validate !== "function") {
      throw new TypeError("Persistence requires a string key, nonnegative schema version and validator");
    }
    if (options.legacyVersion !== undefined && !validVersion(options.legacyVersion))
      throw new TypeError("Invalid legacyVersion");
    const mode = options.hydrate ?? "immediate";
    if (!["immediate", "manual", "skip"].includes(mode))
      throw new TypeError("Invalid hydration mode");
    if (options.sync && !options.storage.subscribe)
      throw new TypeError("Storage backend does not support synchronization");
    const codec = options.codec ?? jsonCodec;
    const origin = {};
    let phase = mode === "skip" ? "active" : "paused";
    let dirty = true;
    let hasStoredValue = false;
    let lastError;
    let acceptedBytes;
    const releases = [];
    const dead = () => phase === "destroyed";
    function alive() {
      if (dead())
        throw new Error("Persistence controller is destroyed");
    }
    function fail(operation, error, pause = false) {
      if (dead())
        return false;
      lastError = { operation, key: options.key, error };
      dirty = true;
      if (pause)
        phase = "paused";
      try {
        if (options.onError)
          options.onError(lastError);
        else
          reportError(lastError);
      } catch (reportingError) {
        reportError(reportingError);
      }
      return false;
    }
    function settle(bytes, stale) {
      acceptedBytes = bytes;
      hasStoredValue = bytes !== null;
      dirty = stale;
      lastError = undefined;
      phase = "active";
      return true;
    }
    function write() {
      alive();
      const value = store.value;
      const revision = api.revision();
      let step = "validate";
      let bytes;
      try {
        if (!options.validate(value))
          throw new TypeError("Current state failed persistence validation");
        step = "encode";
        const envelope = { format, formatVersion: 1, version: options.version, value };
        bytes = codec.encode(envelope);
        if (typeof bytes !== "string")
          throw new TypeError("Codec must encode to a string");
        if (api.revision() !== revision || dead())
          return false;
        step = "write";
        options.storage.setItem(options.key, bytes);
      } catch (error) {
        return fail(step, error);
      }
      return dead() || settle(bytes, api.revision() !== revision);
    }
    function read(remote = false) {
      alive();
      let step = "read";
      let raw;
      let value;
      let stale = false;
      try {
        raw = options.storage.getItem(options.key);
        if (dead())
          return false;
        if (raw === null)
          return settle(null, true);
        if (typeof raw !== "string")
          throw new TypeError("Storage getItem must return string or null");
        hasStoredValue = true;
        if (remote && raw === acceptedBytes && !dirty && phase === "active")
          return true;
        step = "decode";
        const decoded = codec.decode(raw);
        step = "version";
        let version;
        if (typeof decoded === "object" && decoded?.format === format && !Array.isArray(decoded)) {
          if (decoded.formatVersion !== 1 || !validVersion(decoded.version) || !Object.hasOwn(decoded, "value")) {
            throw new TypeError("Unsupported or malformed persistence envelope");
          }
          version = decoded.version;
          value = decoded.value;
        } else if (options.legacyVersion !== undefined) {
          stale = true;
          version = options.legacyVersion;
          value = decoded;
        } else
          throw new TypeError("Expected a defuss-store envelope; raw data needs legacyVersion");
        if (version > options.version)
          throw new Error("Stored schema is newer than this application");
        if (version !== options.version) {
          stale = true;
          step = "migrate";
          if (!options.migrate)
            throw new Error("Schema migration is required");
          value = options.migrate(value, version);
        }
        step = "validate";
        if (!options.validate(value))
          throw new TypeError("Stored state failed validation");
      } catch (error) {
        return fail(step, error, true);
      }
      if (dead())
        return false;
      const revision = api.revision();
      settle(raw, stale);
      try {
        api.set(value, origin);
      } catch (error) {
        return fail("notify", error);
      }
      if (acceptedBytes === raw && api.revision() <= revision + 1 && !Object.is(store.value, value))
        dirty = true;
      return true;
    }
    const controller = {
      rehydrate: () => read(),
      flush: () => write(),
      clear() {
        alive();
        try {
          options.storage.removeItem(options.key);
        } catch (error) {
          return fail("remove", error);
        }
        return dead() || settle(null, true);
      },
      status: () => ({ phase, dirty, hasStoredValue, ...lastError ? { lastError } : {} }),
      destroy() {
        if (dead())
          return;
        phase = "destroyed";
        if (api.persistence === controller)
          delete api.persistence;
        const errors = [];
        for (const release of releases.splice(0)) {
          try {
            release();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length)
          throw new AggregateError(errors, "Persistence cleanup failed");
      }
    };
    api.persistence = controller;
    try {
      releases.push(api.observe((change) => {
        if (change.origin === origin)
          return;
        dirty = true;
        if (phase === "active" && change.revision === api.revision())
          write();
      }));
      releases.push(store.onDestroy(() => controller.destroy()));
      if (options.sync)
        releases.push(options.storage.subscribe((change) => {
          if (!dead() && (mode !== "manual" || acceptedBytes !== undefined) && (change.key === null || change.key === options.key))
            read(true);
        }));
      if (mode === "immediate")
        read();
    } catch (error) {
      controller.destroy();
      throw error;
    }
    return controller;
  }

  // src/shared/store.ts
  var areas = {};
  var inMemory = new Set;
  function storageOf(area) {
    return areas[area] ??= createWebStorage(area, { fallback: createMemoryStorage(), onUnavailable: () => inMemory.add(area) });
  }
  function storageAvailable(area = "local") {
    try {
      storageOf(area).getItem("defuss-store:probe");
    } catch {
      return false;
    }
    return !inMemory.has(area);
  }
  function sameShape(initial) {
    const check = (model, value) => {
      if (model === null)
        return value === null;
      if (Array.isArray(model))
        return Array.isArray(value);
      if (typeof model === "object") {
        if (typeof value !== "object" || value === null || Array.isArray(value))
          return false;
        return Object.keys(model).every((k) => (k in value) && check(model[k], value[k]));
      }
      return typeof value === typeof model;
    };
    return (value) => check(initial, value);
  }
  function adoptingCodec(legacyVersion) {
    return {
      encode: (value) => jsonCodec.encode(value),
      decode: (serialized) => {
        let parsed;
        try {
          parsed = jsonCodec.decode(serialized);
        } catch {
          return { format: "defuss-store", formatVersion: 1, version: legacyVersion, value: serialized };
        }
        const isEnvelope = typeof parsed === "object" && parsed !== null && parsed.format === "defuss-store";
        return isEnvelope ? parsed : { format: "defuss-store", formatVersion: 1, version: legacyVersion, value: parsed };
      }
    };
  }
  var WRITE_EVENT = "defuss-store-write";
  var peerSeq = 0;
  var controllers = new WeakMap;
  function persisted(key, initial, options = {}) {
    const store = createStore(initial, { equals: jsonEquals });
    const area = options.storage ? null : options.area ?? "local";
    const controller = attachPersistence(store, {
      key,
      storage: options.storage ?? storageOf(area),
      version: options.version ?? 1,
      validate: options.validate ?? sameShape(initial),
      sync: options.sync ?? false,
      codec: adoptingCodec(options.migrate ? 0 : options.version ?? 1),
      ...options.migrate ? { migrate: (old, from) => from === 0 ? options.migrate(old) : old } : {},
      onError: options.onError ?? (() => {})
    });
    controllers.set(store, controller);
    store.subscribe(() => {
      if (controller.status().phase === "paused")
        controller.flush();
    });
    const doc = globalThis.document;
    if (doc && area) {
      const id = ++peerSeq + ":" + Math.random();
      let reading = false;
      store.subscribe(() => {
        if (!reading)
          doc.dispatchEvent(new CustomEvent(WRITE_EVENT, { detail: { area, key, id } }));
      });
      const onPeerWrite = (e) => {
        const d = e.detail;
        if (!d || d.id === id || d.area !== area || d.key !== key || store.destroyed)
          return;
        reading = true;
        try {
          controller.rehydrate();
        } finally {
          reading = false;
        }
      };
      doc.addEventListener(WRITE_EVENT, onPeerWrite);
      store.onDestroy(() => doc.removeEventListener(WRITE_EVENT, onPeerWrite));
    }
    return store;
  }

  // src/documentation/runtime/prefs.ts
  var refused = false;
  var oneOf = (...values) => (v) => values.includes(v);
  var prefs = {
    colorScheme: persisted("defuss-shadcn-theme", "", { validate: oneOf("", "light", "dark") }),
    colorTheme: persisted("defuss-shadcn-color-theme", "default"),
    customThemes: persisted("defuss-shadcn-custom-themes", [], { onError: () => {
      refused = true;
    } }),
    themeDraft: persisted("defuss-shadcn-theme-draft", null, {
      validate: (v) => v === null || typeof v === "object" && !Array.isArray(v)
    }),
    navDocked: persisted("defuss-shadcn-nav-docked", false, { migrate: (old) => old === 1 || old === "1" || old === true }),
    navCollapsed: persisted("defuss-shadcn-nav-collapsed", {}),
    ghStars: persisted("gh-stars", "", { area: "session", migrate: (old) => String(old) }),
    navScroll: persisted("shadcn-nav-scroll", -1, { area: "session", migrate: (old) => Number(old) || 0 })
  };
  var prefsPersist = () => storageAvailable("local");
  function saveCustomThemes(list) {
    refused = false;
    prefs.customThemes.set(list);
    return !refused && prefsPersist();
  }

  // src/documentation/runtime/theme-switcher.ts
  (function() {
    var docs = {};
    document.addEventListener("DOMContentLoaded", function() {
      var ns = globalThis.df$ && globalThis.df$.shadcn;
      if (!ns)
        return;
      var live = ns.docs = ns.docs || {};
      for (var k in docs)
        if (!(k in live))
          live[k] = docs[k];
      docs = live;
    });
    var THEME_LINK_ID = "theme-css";
    var THEME_LINKS_ATTR = "data-df-theme-link";
    var CUSTOM_PREFIX = "custom-";
    var TOKEN_RE = /^(background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring|chart-[1-5]|sidebar|sidebar-foreground|sidebar-primary|sidebar-primary-foreground|sidebar-accent|sidebar-accent-foreground|sidebar-border|sidebar-ring|font-sans|font-serif|font-mono|radius|shadow-2xs|shadow-xs|shadow-sm|shadow|shadow-md|shadow-lg|shadow-xl|shadow-2xl|spacing|tracking-normal)$/;
    function isCustomId(id) {
      return typeof id === "string" && id.indexOf(CUSTOM_PREFIX) === 0;
    }
    function readCustomThemes() {
      return prefs.customThemes.value.filter(function(t) {
        return t && isCustomId(t.id) && typeof t.label === "string" && t.styles && typeof t.styles === "object";
      });
    }
    function writeCustomThemes(list) {
      var kept = saveCustomThemes(list);
      document.dispatchEvent(new CustomEvent("defuss-custom-themes-change"));
      return kept;
    }
    function getThemeById(id) {
      if (isCustomId(id)) {
        var custom = readCustomThemes();
        for (var c = 0;c < custom.length; c++)
          if (custom[c].id === id)
            return custom[c];
        return null;
      }
      if (!docs.THEMES)
        return null;
      for (var i = 0;i < docs.THEMES.length; i++) {
        if (docs.THEMES[i].id === id)
          return docs.THEMES[i];
      }
      return null;
    }
    function cleanValue(v) {
      return String(v).replace(/[;{}<>]/g, "").trim();
    }
    function themeCss(theme) {
      var out = [];
      [[":root", "light"], [".dark", "dark"]].forEach(function(pair) {
        var tokens = theme.styles && theme.styles[pair[1]];
        if (!tokens)
          return;
        var lines = [];
        for (var k in tokens) {
          if (TOKEN_RE.test(k) && tokens[k] != null && cleanValue(tokens[k]))
            lines.push("  --" + k + ": " + cleanValue(tokens[k]) + ";");
        }
        if (lines.length)
          out.push(pair[0] + ` {
` + lines.join(`
`) + `
}`);
      });
      return out.join(`

`) + `
`;
    }
    function mountCustomLinks(theme) {
      var wanted = {};
      (theme.links || []).forEach(function(node) {
        if (!node || node.type !== "link" || !node.attributes)
          return;
        var href = String(node.attributes.href || "");
        if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(href))
          return;
        wanted[(node.attributes.rel || "") + " " + href] = node;
      });
      var mounted = document.querySelectorAll("link[" + THEME_LINKS_ATTR + "]");
      for (var i = 0;i < mounted.length; i++) {
        var key = mounted[i].getAttribute("rel") + " " + mounted[i].getAttribute("href");
        if (wanted[key]) {
          mounted[i].setAttribute(THEME_LINKS_ATTR, theme.id);
          delete wanted[key];
        } else
          mounted[i].remove();
      }
      for (var k in wanted) {
        var link = document.createElement("link");
        for (var name in wanted[k].attributes)
          link.setAttribute(name, String(wanted[k].attributes[name]));
        link.setAttribute(THEME_LINKS_ATTR, theme.id);
        document.head.appendChild(link);
      }
    }
    function mountThemeStyle(theme, slotId) {
      var old = document.getElementById(THEME_LINK_ID);
      if (old)
        old.remove();
      var style = document.createElement("style");
      style.id = THEME_LINK_ID;
      style.dataset.themeId = slotId;
      style.textContent = themeCss(theme);
      var tokens = document.getElementById("tokens-css");
      if (tokens)
        tokens.insertAdjacentElement("afterend", style);
      else
        document.head.appendChild(style);
      mountCustomLinks(theme);
    }
    function clearThemeLinks() {
      var stale = document.querySelectorAll("link[" + THEME_LINKS_ATTR + "]");
      for (var i = 0;i < stale.length; i++)
        stale[i].remove();
    }
    function mountThemeLinks(id) {
      var shared = globalThis.df$ && globalThis.df$.shadcn && globalThis.df$.shadcn.shared;
      if (shared && typeof shared.loadTheme === "function") {
        Promise.resolve(shared.loadTheme(id)).catch(function(e) {
          console.warn("theme-switcher: theme resources failed —", e);
        });
        return;
      }
      if (!id || id === "default") {
        clearThemeLinks();
        return;
      }
      var tokens = document.getElementById("tokens-css");
      var url = tokens ? new URL("../" + id + ".json", tokens.href).href : id + ".json";
      fetch(url).then(function(res) {
        return res.ok ? res.json() : null;
      }).then(function(file) {
        var ns = globalThis.df$ && globalThis.df$.shadcn && globalThis.df$.shadcn.shared;
        if (ns && typeof ns.loadTheme === "function")
          return;
        clearThemeLinks();
        if (!file || file.schema !== "v1" || !file.links)
          return;
        file.links.forEach(function(node) {
          if (!node || node.type !== "link" || !node.attributes)
            return;
          var link = document.createElement("link");
          for (var name in node.attributes)
            link.setAttribute(name, String(node.attributes[name]));
          link.setAttribute(THEME_LINKS_ATTR, id);
          document.head.appendChild(link);
        });
      }).catch(function() {});
    }
    function themeHref(id) {
      var tokens = document.getElementById("tokens-css");
      if (!tokens)
        return id + ".css";
      return new URL("../" + id + ".css", tokens.href).href;
    }
    function applyTheme(themeId) {
      var link = document.getElementById(THEME_LINK_ID);
      if (!themeId || themeId === "default" || docs.THEMES && !getThemeById(themeId)) {
        if (link)
          link.remove();
        prefs.colorTheme.set("default");
        docs.__activeColorTheme = "default";
        mountThemeLinks("default");
        updateActiveState();
        updateFavicon();
        document.dispatchEvent(new CustomEvent("defuss-theme-change", { detail: { id: "default" } }));
        return;
      }
      prefs.colorTheme.set(themeId);
      docs.__activeColorTheme = themeId;
      if (isCustomId(themeId)) {
        var custom = getThemeById(themeId);
        if (!custom)
          return applyTheme("default");
        mountThemeStyle(custom, themeId);
        mirrorThemeFonts(themeId);
        updateActiveState();
        updateFavicon();
        document.dispatchEvent(new CustomEvent("defuss-theme-change", { detail: { id: themeId } }));
        return;
      }
      if (link && link.dataset.themeId === themeId) {
        updateActiveState();
        return;
      }
      if (link)
        link.remove();
      link = document.createElement("link");
      link.id = THEME_LINK_ID;
      link.rel = "stylesheet";
      link.dataset.themeId = themeId;
      link.href = themeHref(themeId);
      var tokens = document.getElementById("tokens-css");
      if (tokens)
        tokens.insertAdjacentElement("afterend", link);
      else
        document.head.appendChild(link);
      mountThemeLinks(themeId);
      updateActiveState();
      updateFavicon();
      document.dispatchEvent(new CustomEvent("defuss-theme-change", { detail: { id: themeId } }));
    }
    function updateActiveState(activeId) {
      var swatches = document.querySelectorAll(".theme-swatch");
      var active = document.documentElement.hasAttribute("data-theme-draft") ? "__draft" : activeId || docs.__activeColorTheme || "default";
      for (var i = 0;i < swatches.length; i++) {
        var id = swatches[i].getAttribute("data-theme-id");
        swatches[i].classList.toggle("active", id === active);
      }
    }
    var FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' + '<rect width="32" height="32" rx="6" fill="{{BG}}"/>' + '<path fill="{{FG}}" d="M11 8h2.8v7.1c.5-.7 1.1-1.2 1.8-1.5.7-.3 1.4-.5 2.1-.5 1.2 0 2.1.4 2.8 1.1.7.8 1 1.8 1 3.1V24h-2.8v-6.3c0-.8-.2-1.4-.6-1.8-.4-.4-.9-.6-1.6-.6-.8 0-1.4.3-1.9.8-.5.5-.8 1.2-.8 2V24H11V8z"/>' + "</svg>";
    function updateFavicon() {
      setTimeout(function() {
        var style = getComputedStyle(document.documentElement);
        var bg = style.getPropertyValue("--primary").trim();
        var fg = style.getPropertyValue("--primary-foreground").trim();
        if (!bg || !fg)
          return;
        var svg = FAVICON_SVG.replace("{{BG}}", bg).replace("{{FG}}", fg);
        var link = document.querySelector('link[rel="icon"]');
        if (link)
          link.href = "data:image/svg+xml," + encodeURIComponent(svg);
      }, 0);
    }
    var saved = prefs.colorTheme.value;
    if (saved && saved !== "default") {
      applyTheme(saved);
    } else {
      docs.__activeColorTheme = "default";
    }
    function mirrorThemeFonts(themeId, themeObject) {
      var theme = themeObject || getThemeById(themeId);
      var tokens = theme && theme.styles && theme.styles.light || null;
      ["font-sans", "font-serif", "font-mono"].forEach(function(token) {
        var value = tokens && tokens[token];
        if (value)
          document.documentElement.style.setProperty("--" + token, value);
        else
          document.documentElement.style.removeProperty("--" + token);
      });
    }
    document.addEventListener("defuss-theme-change", function(e) {
      var id = e.detail && e.detail.id || "default";
      var stored = prefs.colorTheme.value || "default";
      docs.__activeColorTheme = stored === id ? id : stored;
      if (!isPreviewing())
        mirrorThemeFonts(docs.__activeColorTheme);
      updateActiveState(docs.__activeColorTheme);
      updateFavicon();
    });
    function previewTheme(theme) {
      mountThemeStyle({ id: "__preview", styles: theme.styles, links: theme.links }, "__preview");
      mirrorThemeFonts("__preview", theme);
      updateActiveState();
      updateFavicon();
    }
    function isPreviewing() {
      var slot = document.getElementById(THEME_LINK_ID);
      return !!slot && slot.dataset.themeId === "__preview";
    }
    function endThemePreview() {
      if (!isPreviewing())
        return;
      document.getElementById(THEME_LINK_ID).remove();
      applyTheme(prefs.colorTheme.value || "default");
    }
    function readDraft() {
      var r = prefs.themeDraft.value;
      return r && r.theme && r.theme.styles && r.state ? structuredClone(r) : null;
    }
    function liveDraft() {
      var r = readDraft();
      return r && r.live !== false ? r : null;
    }
    function writeDraft(r) {
      prefs.themeDraft.set(r || null);
      document.documentElement.toggleAttribute("data-theme-draft", !!(r && r.live !== false));
      updateActiveState();
      document.dispatchEvent(new CustomEvent("defuss-theme-draft-change"));
    }
    function pauseDraft() {
      var r = liveDraft();
      if (!r)
        return;
      r.live = false;
      writeDraft(r);
    }
    docs.themeDraft = {
      get: readDraft,
      isLive: function() {
        return !!liveDraft();
      },
      set: function(state, theme) {
        writeDraft({ state, theme: { styles: theme.styles, links: theme.links }, live: true, updated: new Date().toISOString() });
      },
      clear: function() {
        if (readDraft())
          writeDraft(null);
      },
      resume: function() {
        var r = readDraft();
        if (!r)
          return;
        r.live = true;
        writeDraft(r);
        previewTheme(r.theme);
        document.dispatchEvent(new CustomEvent("defuss-theme-change", { detail: { id: "__preview" } }));
      },
      discard: function() {
        writeDraft(null);
        endThemePreview();
      }
    };
    (function() {
      var r = liveDraft();
      if (r)
        previewTheme(r.theme);
      document.documentElement.toggleAttribute("data-theme-draft", !!r);
    })();
    function slugify(label) {
      return String(label).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "theme";
    }
    docs.customThemes = {
      list: readCustomThemes,
      get: function(id) {
        return isCustomId(id) ? getThemeById(id) : null;
      },
      idFor: function(label) {
        return CUSTOM_PREFIX + slugify(label);
      },
      save: function(theme) {
        var list = readCustomThemes().filter(function(t) {
          return t.id !== theme.id;
        });
        list.unshift(theme);
        return writeCustomThemes(list);
      },
      remove: function(id) {
        var ok = writeCustomThemes(readCustomThemes().filter(function(t) {
          return t.id !== id;
        }));
        if (ok && docs.__activeColorTheme === id) {
          applyTheme("default");
          var r = liveDraft();
          if (r)
            previewTheme(r.theme);
        }
        return ok;
      },
      css: themeCss,
      tokenPattern: TOKEN_RE
    };
    docs.previewTheme = previewTheme;
    docs.endThemePreview = endThemePreview;
    docs.applyTheme = function(themeId) {
      pauseDraft();
      applyTheme(themeId);
    };
    docs.updateThemeActiveState = updateActiveState;
    docs.updateFavicon = updateFavicon;
  })();

  // src/documentation/runtime/layout.ts
  (function() {
    var docs = {};
    document.addEventListener("DOMContentLoaded", function() {
      var ns = globalThis.df$ && globalThis.df$.shadcn;
      if (!ns)
        return;
      var live = ns.docs = ns.docs || {};
      for (var k in docs)
        if (!(k in live))
          live[k] = docs[k];
      docs = live;
    });
    docs.prefs = prefs;
    var rootEl = document.documentElement;
    rootEl.toggleAttribute("data-nav-docked", prefs.navDocked.value);
    var closedSections = Object.keys(prefs.navCollapsed.value).filter(function(k) {
      return prefs.navCollapsed.value[k] === "0";
    });
    if (closedSections.length)
      rootEl.dataset.navClosed = closedSections.join(" ");
    var saved = prefs.colorScheme.value;
    var darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
    var prefersDark = darkMQ.matches;
    if (saved === "dark" || !saved && prefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
    darkMQ.addEventListener("change", function(e) {
      if (prefs.colorScheme.value)
        return;
      document.documentElement.classList.toggle("dark", e.matches);
      document.documentElement.style.colorScheme = e.matches ? "dark" : "light";
      var sun = document.getElementById("icon-sun");
      var moon = document.getElementById("icon-moon");
      if (sun)
        sun.style.display = e.matches ? "none" : "block";
      if (moon)
        moon.style.display = e.matches ? "block" : "none";
      if (docs.updateFavicon)
        docs.updateFavicon();
    });
    var domReady = false;
    document.addEventListener("DOMContentLoaded", function() {
      domReady = true;
    });
    docs.onPageReady = function(fn) {
      if (domReady) {
        fn();
      } else {
        document.addEventListener("DOMContentLoaded", fn);
      }
      (docs.__spaInits = docs.__spaInits || []).push(fn);
    };
    var currentPage = location.pathname.split("/").pop() || "index.html";
    function typeBadge(type) {
      return ' <span class="type-badge" data-type="' + type + '" title="' + type + '">' + type + "</span>";
    }
    function scrollToWhenReady(id, attempt) {
      var el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: "start" });
        if (docs.realignWhenSettled)
          docs.realignWhenSettled(id);
        return;
      }
      if (attempt > 20)
        return;
      setTimeout(function() {
        scrollToWhenReady(id, attempt + 1);
      }, 100);
    }
    function initChrome() {
      var grid = document.getElementById("theme-grid");
      var DEFAULT_DOTS = {
        light: { primary: "oklch(0.205 0.005 285)", secondary: "oklch(0.94 0.003 247)", accent: "oklch(0.94 0.003 247)", destructive: "oklch(0.577 0.245 27.325)", muted: "oklch(0.94 0.003 247)" },
        dark: { primary: "oklch(0.985 0.002 247)", secondary: "oklch(0.22 0.006 285)", accent: "oklch(0.22 0.006 285)", destructive: "oklch(0.396 0.141 25.723)", muted: "oklch(0.22 0.006 285)" }
      };
      var swatch = function(t, activeId, mode) {
        var btn = document.createElement("button");
        btn.className = "theme-swatch" + (t.id === activeId ? " active" : "");
        btn.setAttribute("data-theme-id", t.id);
        var label = document.createElement("span");
        label.className = "theme-swatch-label";
        label.textContent = t.label;
        btn.appendChild(label);
        var colors = document.createElement("div");
        colors.className = "theme-swatch-colors";
        ["primary", "secondary", "accent", "destructive", "muted"].forEach(function(key) {
          var dot = document.createElement("span");
          dot.className = "theme-swatch-dot";
          var color = t.styles && t.styles[mode] && t.styles[mode][key] || (t.id === "default" ? DEFAULT_DOTS[mode][key] : null);
          if (color)
            dot.style.background = color;
          colors.appendChild(dot);
        });
        btn.appendChild(colors);
        btn.addEventListener("click", function() {
          if (t.id === "__draft") {
            if (docs.themeDraft)
              docs.themeDraft.resume();
          } else if (docs.applyTheme)
            docs.applyTheme(t.id);
          var popover = document.getElementById("theme-popover");
          if (popover)
            popover.hidePopover();
        });
        return btn;
      };
      var heading = function(text) {
        var h = document.createElement("p");
        h.className = "theme-grid-heading";
        h.textContent = text;
        return h;
      };
      var draftBlock = function(draft, mode) {
        var live = draft.live !== false;
        var btn = swatch({ id: "__draft", label: live ? "Unsaved draft" : "Unsaved draft · paused", styles: draft.theme.styles }, live ? "__draft" : "", mode);
        btn.title = live ? "Your draft is on - save it in the Theme Designer" : "Show your draft again";
        var row = document.createElement("div");
        row.className = "theme-draft-actions";
        var go = document.createElement("a");
        go.className = "btn nav-link";
        go.setAttribute("data-variant", "outline");
        go.setAttribute("data-size", "sm");
        go.href = "theme-designer.html";
        go.textContent = "Continue designing";
        var drop = document.createElement("button");
        drop.className = "btn";
        drop.type = "button";
        drop.setAttribute("data-variant", "ghost");
        drop.setAttribute("data-size", "sm");
        drop.textContent = "Discard";
        var close = function() {
          var popover = document.getElementById("theme-popover");
          if (popover && popover.matches(":popover-open"))
            popover.hidePopover();
        };
        go.addEventListener("click", close);
        drop.addEventListener("click", function() {
          if (docs.themeDraft)
            docs.themeDraft.discard();
        });
        row.append(go, drop);
        return [btn, row];
      };
      var buildThemeGrid = function() {
        if (!grid || !docs.THEMES)
          return;
        var activeId = docs.__activeColorTheme || "default";
        var mode = document.documentElement.classList.contains("dark") ? "dark" : "light";
        var mine = docs.customThemes ? docs.customThemes.list() : [];
        var draft = docs.themeDraft ? docs.themeDraft.get() : null;
        if (draft && draft.live !== false)
          activeId = "__draft";
        var menuBtn = document.getElementById("theme-selector-btn");
        if (menuBtn)
          menuBtn.setAttribute("aria-label", activeId === "__draft" ? "Change color theme (unsaved draft on)" : "Change color theme");
        grid.replaceChildren();
        if (draft) {
          grid.appendChild(heading("Theme Designer"));
          grid.append.apply(grid, draftBlock(draft, mode));
          if (!mine.length)
            grid.appendChild(heading("Presets"));
        }
        if (mine.length) {
          grid.appendChild(heading("Your themes"));
          mine.forEach(function(t) {
            grid.appendChild(swatch(t, activeId, mode));
          });
          grid.appendChild(heading("Presets"));
        }
        docs.THEMES.forEach(function(t) {
          grid.appendChild(swatch(t, activeId, mode));
        });
      };
      buildThemeGrid();
      docs.buildThemeGrid = buildThemeGrid;
      document.addEventListener("defuss-custom-themes-change", buildThemeGrid);
      document.addEventListener("defuss-theme-draft-change", buildThemeGrid);
      new MutationObserver(buildThemeGrid).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      var designBtn = document.querySelector(".theme-design-btn");
      if (designBtn)
        designBtn.addEventListener("click", function() {
          var popover = document.getElementById("theme-popover");
          if (popover && popover.matches(":popover-open"))
            popover.hidePopover();
        });
      var resetBtn = document.getElementById("theme-reset-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", function() {
          if (docs.applyTheme)
            docs.applyTheme("default");
        });
      }
      var list = document.getElementById("docs-palette-list");
      var dialog = document.getElementById("docs-palette");
      var trigger = document.querySelector(".header-search-input");
      var searchWrap = document.querySelector(".header-search");
      if (list && dialog && trigger && searchWrap && !list.hasChildNodes()) {
        var esc = function(s) {
          return s.replace(/&/g, "&").replace(/</g, "<").replace(/"/g, '"');
        };
        var buildList = function() {
          if (list.hasChildNodes())
            return;
          var index = docs.searchIndex || [];
          var html = "";
          var group = null;
          index.forEach(function(e) {
            if (e.s !== group) {
              if (group !== null)
                html += "</div>";
              group = e.s;
              html += '<div class="command-group"><p class="command-group-heading">' + esc(group) + "</p>";
            }
            html += '<button class="command-item" type="button" data-href="' + esc(e.h) + '">' + esc(e.t) + (e.d ? typeBadge(e.d) : "") + "</button>";
          });
          if (group !== null)
            html += "</div>";
          list.innerHTML = html;
        };
        var openPalette = function() {
          if (dialog.open)
            return;
          buildList();
          dialog.showModal();
          var cmdInput = dialog.querySelector(".command-input");
          if (cmdInput)
            cmdInput.focus();
        };
        searchWrap.addEventListener("click", openPalette);
        trigger.addEventListener("keydown", function(e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPalette();
          }
        });
        dialog.addEventListener("click", function(e) {
          var item = e.target.closest(".command-item");
          if (!item)
            return;
          var href = item.getAttribute("data-href") || "";
          var hashAt = href.indexOf("#");
          var page = hashAt === -1 ? href : href.slice(0, hashAt);
          var id = hashAt === -1 ? "" : href.slice(hashAt + 1);
          if (page === currentPage) {
            if (id) {
              var el = document.getElementById(id);
              if (el) {
                el.scrollIntoView({ block: "start" });
                if (docs.realignWhenSettled)
                  docs.realignWhenSettled(id);
              }
            } else
              window.scrollTo(0, 0);
          } else {
            navigateTo(page, true);
            if (id)
              scrollToWhenReady(id, 0);
          }
        });
      }
      var syncDockState = function() {
        var sidebar = document.querySelector(".site-sidebar");
        var toggle = document.getElementById("sidebar-toggle");
        if (!sidebar || !toggle)
          return;
        var collapsed = sidebar.dataset.state === "collapsed";
        toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
        prefs.navDocked.set(collapsed);
      };
      syncDockState();
      (function initSidebarToggle() {
        var toggle = document.getElementById("sidebar-toggle");
        var sidebar = document.querySelector(".site-sidebar");
        if (!toggle || !sidebar)
          return;
        var isDrawerMode = function() {
          return window.matchMedia("(max-width: 64rem)").matches;
        };
        var backdrop = document.querySelector(".sidebar-backdrop");
        if (!backdrop) {
          backdrop = document.createElement("div");
          backdrop.className = "sidebar-backdrop";
          sidebar.insertAdjacentElement("afterend", backdrop);
        }
        function closeSidebar() {
          sidebar.classList.remove("open");
          backdrop.classList.remove("open");
        }
        function openSidebar() {
          sidebar.classList.add("open");
          backdrop.classList.add("open");
          sidebar.removeAttribute("data-state");
          syncDockState();
        }
        toggle.addEventListener("click", function() {
          if (!isDrawerMode()) {
            var collapsed = sidebar.dataset.state !== "collapsed";
            if (sidebar.api)
              sidebar.api.setState(collapsed ? "collapsed" : "default");
            else
              sidebar.dataset.state = collapsed ? "collapsed" : "expanded";
            syncDockState();
            return;
          }
          if (sidebar.classList.contains("open")) {
            closeSidebar();
          } else {
            openSidebar();
          }
        });
        backdrop.addEventListener("click", closeSidebar);
        sidebar.addEventListener("click", function(e) {
          if (e.target.closest("a.nav-link")) {
            closeSidebar();
          }
        });
        document.addEventListener("keydown", function(e) {
          if (e.key === "Escape" && sidebar.classList.contains("open")) {
            closeSidebar();
          }
        });
      })();
      document.querySelectorAll("details[data-nav-always-open]").forEach(function(d) {
        d.addEventListener("toggle", function() {
          var map = {};
          map[d.dataset.navSection] = d.open ? "1" : "0";
          prefs.navCollapsed.set(map);
        });
      });
      document.addEventListener("keydown", function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === "b")
          setTimeout(syncDockState, 0);
      });
      var updateStarCount = function(count) {
        var el = document.querySelector(".github-stars");
        if (el)
          el.textContent = count;
      };
      var cachedStars = prefs.ghStars.value;
      if (cachedStars) {
        updateStarCount(cachedStars);
      } else {
        fetch("https://api.github.com/repos/kyr0/defuss-shadcn").then(function(r) {
          return r.json();
        }).then(function(data) {
          if (data.stargazers_count != null) {
            var count = String(data.stargazers_count);
            prefs.ghStars.set(count);
            updateStarCount(count);
          }
        }).catch(function() {});
      }
    }
    document.addEventListener("DOMContentLoaded", initChrome);
    document.addEventListener("click", function(e) {
      var link = e.target.closest('a.nav-link, .site-header a[href="index.html"]');
      if (!link)
        return;
      var sidebar = document.querySelector(".site-sidebar .sidebar-content");
      if (sidebar)
        prefs.navScroll.set(sidebar.scrollTop);
    });
    document.addEventListener("DOMContentLoaded", function() {
      var sidebar = document.querySelector(".site-sidebar .sidebar-content");
      if (!sidebar)
        return;
      var saved = prefs.navScroll.value;
      if (saved >= 0) {
        sidebar.scrollTop = saved;
        prefs.navScroll.set(-1);
      } else {
        var active = sidebar.querySelector(".nav-link.active");
        if (active)
          active.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    });
    var prefetched = {};
    document.addEventListener("mouseover", function(e) {
      var link = e.target.closest("a.nav-link:not(.disabled)");
      if (!link)
        return;
      var href = link.getAttribute("href");
      if (href && !prefetched[href] && href !== currentPage && !href.startsWith("http")) {
        prefetched[href] = true;
        var l = document.createElement("link");
        l.rel = "prefetch";
        l.href = href;
        document.head.appendChild(l);
      }
    });
    var navigating = false;
    function navigateTo(href, pushState) {
      if (navigating)
        return;
      if (href === currentPage && pushState !== false)
        return;
      navigating = true;
      fetch(href).then(function(r) {
        if (!r.ok)
          throw new Error(r.status);
        return r.text();
      }).then(function(html) {
        var parser = new DOMParser;
        var doc = parser.parseFromString(html, "text/html");
        var newMain = doc.querySelector("main");
        var oldMain = document.querySelector("main");
        if (!newMain || !oldMain) {
          location.href = href;
          return;
        }
        var swap = function() {
          oldMain.innerHTML = newMain.innerHTML;
          var newMainStyle = newMain.getAttribute("style");
          if (newMainStyle)
            oldMain.setAttribute("style", newMainStyle);
          else
            oldMain.removeAttribute("style");
          var oldToc = document.querySelector(".site-toc");
          var newToc = doc.querySelector(".site-toc");
          if (oldToc && newToc)
            oldToc.replaceWith(document.importNode(newToc, true));
          var oldAside = document.querySelector(".site-aside");
          var newAside = doc.querySelector(".site-aside");
          if (oldAside)
            oldAside.remove();
          if (newAside) {
            var toc = document.querySelector(".site-toc");
            if (toc)
              toc.before(document.importNode(newAside, true));
          }
          document.querySelectorAll("body > dialog, body > [popover]").forEach(function(el) {
            if (el.id === "docs-palette" || el.id === "theme-popover")
              return;
            el.remove();
          });
          doc.querySelectorAll("body > dialog, body > [popover]").forEach(function(el) {
            if (el.id === "docs-palette" || el.id === "theme-popover")
              return;
            document.body.appendChild(document.importNode(el, true));
          });
          document.title = doc.title;
          currentPage = href;
          document.querySelectorAll(".nav-link").forEach(function(link) {
            var isActive = link.getAttribute("href") === currentPage;
            link.classList.toggle("active", isActive);
            if (isActive)
              link.setAttribute("aria-current", "page");
            else
              link.removeAttribute("aria-current");
          });
          var active = document.querySelector(".nav-link.active");
          for (var d = active && active.closest("details");d; d = d.parentElement && d.parentElement.closest("details")) {
            if (!d.open)
              d.open = true;
          }
          document.querySelectorAll("details[data-nav-section]:not([data-nav-always-open])").forEach(function(s) {
            if (s.open && !(active && s.contains(active)))
              s.open = false;
          });
          if (pushState !== false) {
            history.pushState({ page: href }, "", href);
          }
          window.scrollTo(0, 0);
          (docs.__spaInits || []).forEach(function(fn) {
            fn();
          });
          navigating = false;
        };
        if (document.startViewTransition && !docs.__vtActive) {
          var vt = document.startViewTransition(swap);
          docs.__vtActive = true;
          vt.finished.finally(function() {
            docs.__vtActive = false;
          });
        } else {
          swap();
        }
      }).catch(function() {
        location.href = href;
        navigating = false;
      });
    }
    document.addEventListener("click", function(e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      if (e.defaultPrevented)
        return;
      var link = e.target.closest('a.nav-link:not(.disabled), .site-header a[href="index.html"], a.page-nav-link');
      if (!link)
        return;
      var href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:"))
        return;
      e.preventDefault();
      navigateTo(href, true);
    });
    window.addEventListener("popstate", function() {
      var page = location.pathname.split("/").pop() || "index.html";
      navigateTo(page, false);
    });
    function updateAnchorPad() {
      var hdr = document.querySelector(".site-header");
      var ph = document.querySelector(".page-header");
      var phSticky = ph && getComputedStyle(ph).position === "sticky";
      var h = (hdr ? hdr.getBoundingClientRect().height : 0) + (phSticky ? ph.getBoundingClientRect().height : 0) + 8;
      document.documentElement.style.setProperty("--anchor-pad", Math.round(h) + "px");
    }
    var padObserver = null;
    function observeAnchorPad() {
      if (padObserver)
        padObserver.disconnect();
      padObserver = new ResizeObserver(updateAnchorPad);
      [".site-header", ".page-header"].forEach(function(sel) {
        var el = document.querySelector(sel);
        if (el)
          padObserver.observe(el);
      });
    }
    var tocObserver = null;
    function initTocTracking() {
      var tocContent = document.querySelector(".site-toc-content");
      if (!tocContent)
        return;
      if (tocObserver) {
        tocObserver.disconnect();
        tocObserver = null;
      }
      var tocLinks = tocContent.querySelectorAll(".toc-link");
      if (!tocLinks.length)
        return;
      var headings = [];
      tocLinks.forEach(function(l) {
        var id = (l.getAttribute("href") || "").slice(1);
        var el = document.getElementById(id);
        if (el)
          headings.push(el);
      });
      tocObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            tocLinks.forEach(function(l) {
              l.removeAttribute("aria-current");
            });
            var active = tocContent.querySelector('.toc-link[href="#' + entry.target.id + '"]');
            if (active)
              active.setAttribute("aria-current", "location");
          }
        });
      }, {
        rootMargin: "-" + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80) + "px 0px -60% 0px"
      });
      headings.forEach(function(el) {
        tocObserver.observe(el);
      });
    }
    docs.onPageReady(function() {
      initTocTracking();
      updateAnchorPad();
      observeAnchorPad();
      if (location.hash.length > 1 && docs.realignWhenSettled) {
        docs.realignWhenSettled(decodeURIComponent(location.hash.slice(1)));
      }
    });
  })();
})();
