"use client";

import { useEffect } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;

    if (initialTheme) {
      document.documentElement.dataset.theme = initialTheme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, []);

  function toggleTheme() {
    const currentTheme =
      document.documentElement.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("theme", nextTheme);
  }

  return (
    <button
      aria-label="Toggle light and dark mode"
      className="icon-button"
      onClick={toggleTheme}
      type="button"
    >
      ◐
    </button>
  );
}
