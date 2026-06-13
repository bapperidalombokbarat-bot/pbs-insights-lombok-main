import { createContext, useContext, useState, ReactNode } from "react";

const YearContext = createContext<{
  selectedYear: string;
  setSelectedYear: (y: string) => void;
}>({ selectedYear: "2026", setSelectedYear: () => {} });

export function YearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState("2026");
  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  return useContext(YearContext);
}
