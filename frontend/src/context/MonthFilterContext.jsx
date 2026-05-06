import React, { createContext, useContext, useState, useEffect } from 'react';

const MonthFilterContext = createContext();

export const MonthFilterProvider = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isFilterActive, setIsFilterActive] = useState(true);

  // Sync with local storage if needed
  useEffect(() => {
    const saved = localStorage.getItem('kt_month_filter');
    if (saved) {
      const { month, year, active } = JSON.parse(saved);
      setSelectedMonth(month);
      setSelectedYear(year);
      setIsFilterActive(active);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kt_month_filter', JSON.stringify({ 
      month: selectedMonth, 
      year: selectedYear, 
      active: isFilterActive 
    }));
  }, [selectedMonth, selectedYear, isFilterActive]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i);
  }

  return (
    <MonthFilterContext.Provider value={{ 
      selectedMonth, setSelectedMonth, 
      selectedYear, setSelectedYear,
      isFilterActive, setIsFilterActive,
      months, years
    }}>
      {children}
    </MonthFilterContext.Provider>
  );
};

export const useMonthFilter = () => {
  const context = useContext(MonthFilterContext);
  if (!context) throw new Error('useMonthFilter must be used within MonthFilterProvider');
  
  const monthName = context.months[context.selectedMonth];
  const monthYear = `${monthName} ${context.selectedYear}`;
  
  return { ...context, monthName, monthYear };
};

export const filterByMonth = (data, dateKey, month, year, active) => {
  if (!active) return data;
  return data.filter(item => {
    const d = new Date(item[dateKey]);
    return d.getMonth() === month && d.getFullYear() === year;
  });
};
