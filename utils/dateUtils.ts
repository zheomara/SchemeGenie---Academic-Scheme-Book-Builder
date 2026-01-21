
export const getWeekEndingDate = (startDateStr: string, weekIndex: number): string => {
  const date = new Date(startDateStr);
  if (isNaN(date.getTime())) return "TBD";

  // Find the Monday of the week for the provided date
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));

  // Calculate the Friday of the target week (Monday + 4 days + (weekIndex-1) weeks)
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4 + (weekIndex - 1) * 7);

  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  return friday.toLocaleDateString('en-US', options);
};

export const getAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  return [
    `${currentYear}/${currentYear + 1}`,
    `${currentYear - 1}/${currentYear}`,
    `${currentYear + 1}/${currentYear + 2}`
  ];
};
