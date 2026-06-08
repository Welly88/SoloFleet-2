// theme.ts
import { vars } from "nativewind";

export interface ThemeFonts {
  heading: {
    family: string;
    weights: Record<string, string>;
  };
  body: {
    family: string;
    weights: Record<string, string>;
  };
  mono: {
    family: string;
    weights: Record<string, string>;
  };
}

export const themeFonts: ThemeFonts = {
  heading: {
    family: 'Inter',
    weights: {
      normal: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
  },
  body: {
    family: 'Inter',
    weights: {
      normal: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
    },
  },
  mono: {
    family: 'JetBrainsMono',
    weights: {
      normal: 'JetBrainsMono_400Regular',
      medium: 'JetBrainsMono_500Medium',
    },
  },
};

// Red, Yellow, Green theme for Solo System vehicle tracking
export const lightTheme = vars({
  "--radius": "12",

  "--background": "255 255 255",
  "--foreground": "23 23 23",

  "--card": "255 255 255",
  "--card-foreground": "23 23 23",

  "--popover": "255 255 255",
  "--popover-foreground": "23 23 23",

  "--primary": "239 68 68", // Red (#EF4444)
  "--primary-foreground": "255 255 255",

  "--secondary": "251 191 36", // Yellow (#FBBF24)
  "--secondary-foreground": "120 53 15",

  "--muted": "251 251 251",
  "--muted-foreground": "113 113 122",

  "--accent": "16 185 129", // Green (#10B981)
  "--accent-foreground": "6 78 59",

  "--destructive": "220 38 38",

  "--border": "229 231 235",
  "--input": "243 244 246",
  "--ring": "239 68 68",

  "--chart-1": "239 68 68", // Red
  "--chart-2": "251 191 36", // Yellow
  "--chart-3": "16 185 129", // Green
  "--chart-4": "59 130 246",
  "--chart-5": "139 92 246",

  "--sidebar": "250 250 250",
  "--sidebar-foreground": "23 23 23",
  "--sidebar-primary": "239 68 68",
  "--sidebar-primary-foreground": "255 255 255",
  "--sidebar-accent": "251 191 36",
  "--sidebar-accent-foreground": "120 53 15",
  "--sidebar-border": "229 231 235",
  "--sidebar-ring": "239 68 68",
});

export const darkTheme = vars({
  "--radius": "12",

  "--background": "17 24 39",
  "--foreground": "243 244 246",

  "--card": "31 41 55",
  "--card-foreground": "243 244 246",

  "--popover": "31 41 55",
  "--popover-foreground": "243 244 246",

  "--primary": "248 113 113", // Lighter red for dark mode
  "--primary-foreground": "17 24 39",

  "--secondary": "253 186 116", // Lighter yellow
  "--secondary-foreground": "120 53 15",

  "--muted": "31 41 55",
  "--muted-foreground": "156 163 175",

  "--accent": "52 211 153", // Lighter green
  "--accent-foreground": "6 78 59",

  "--destructive": "248 113 113",

  "--border": "55 65 81",
  "--input": "55 65 81",
  "--ring": "248 113 113",

  "--chart-1": "248 113 113",
  "--chart-2": "253 186 116",
  "--chart-3": "52 211 153",
  "--chart-4": "96 165 250",
  "--chart-5": "167 139 250",

  "--sidebar": "31 41 55",
  "--sidebar-foreground": "243 244 246",
  "--sidebar-primary": "248 113 113",
  "--sidebar-primary-foreground": "17 24 39",
  "--sidebar-accent": "55 65 81",
  "--sidebar-accent-foreground": "243 244 246",
  "--sidebar-border": "55 65 81",
  "--sidebar-ring": "248 113 113",
});