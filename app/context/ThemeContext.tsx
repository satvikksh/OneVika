'use client';

import { createContext, useContext } from "react";

export const ThemeContext = createContext<any>(null);

export const useTheme = () => useContext(ThemeContext);
