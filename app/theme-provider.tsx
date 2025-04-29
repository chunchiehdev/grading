import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const prefersDarkMQ = "(prefers-color-scheme: dark)";
const getPreferredTheme = (): Theme =>
  window.matchMedia(prefersDarkMQ).matches ? "dark" : "light";

export function ThemeProvider({
  children,
  specifiedTheme,
  ssrTheme,
}: {
  children: React.ReactNode;
  specifiedTheme: Theme | null;
  ssrTheme?: any; // Added to fix TypeScript error
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (specifiedTheme) {
      return specifiedTheme;
    }
    if (typeof window !== "object") {
      return "light";
    }
    return getPreferredTheme();
  });

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return [context.theme, context.setTheme];
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (value === "light" || value === "dark");
}

export function getThemeSession(request: Request): Theme | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  
  const match = cookieHeader.match(/theme=([^;]+)/);
  const themeValue = match?.[1];
  
  return isTheme(themeValue) ? themeValue : null;
}

export function setThemeCookie(theme: Theme): string {
  return `theme=${theme}; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax; Secure`;
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-md border border-gray-300 px-3 py-1 text-sm"
    >
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}

export function ThemeHead({ ssrTheme }: { ssrTheme: boolean }) {
  return (
    <>
      {ssrTheme ? null : (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const theme = localStorage.getItem('theme') || 'light';
              document.documentElement.classList.add(theme);
            `,
          }}
        />
      )}
    </>
  );
}

// Add the PreventFlashOnWrongTheme function
export function PreventFlashOnWrongTheme(initialTheme: Theme) {
  return `
    (function() {
      const theme = localStorage.getItem('theme') || '${initialTheme}';
      document.documentElement.classList.add(theme);
    })();
  `;
}

// Implementation of the missing createThemeAction function
export function createThemeAction(resolver: (request: Request) => Promise<any>) {
  return async function action({ request }: { request: Request }) {
    const formData = await request.formData();
    const theme = formData.get("theme");
    
    if (!isTheme(theme)) {
      return Response.json({ success: false, message: "Invalid theme" }, { status: 400 });
    }
    
    const themeSession = await resolver(request);
    themeSession.setTheme(theme);
    
    return Response.json(
      { success: true },
      { headers: { "Set-Cookie": await themeSession.commit() } }
    );
  };
} 