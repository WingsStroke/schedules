let holidayCache = {};

function getEasterDate(year){
  const f = Math.floor, G = year % 19, C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function moveToMonday(date){
  const day = date.getDay();
  if(day === 1) return date;
  date.setDate(date.getDate() + ((8 - day) % 7));
  return date;
}

function generateColombianHolidays(year){
  const holidays = [
    new Date(year, 4, 1), new Date(year, 6, 20), new Date(year, 7, 7),
    new Date(year, 11, 8), new Date(year, 11, 25), new Date(year, 0, 1),
    moveToMonday(new Date(year, 0, 6)), moveToMonday(new Date(year, 2, 19)),
    moveToMonday(new Date(year, 5, 29)), moveToMonday(new Date(year, 7, 15)),
    moveToMonday(new Date(year, 9, 12)), moveToMonday(new Date(year, 10, 1)),
    moveToMonday(new Date(year, 10, 11))
  ];
  const easter = getEasterDate(year);
  for (let i = 6; i >= 1; i--) { const d = new Date(easter); d.setDate(easter.getDate() - i); holidays.push(d); }
  holidays.push(moveToMonday(new Date(easter.getTime() + 43 * 86400000)));
  holidays.push(moveToMonday(new Date(easter.getTime() + 64 * 86400000)));
  holidays.push(moveToMonday(new Date(easter.getTime() + 71 * 86400000)));
  return holidays;
}

function isHoliday(date){
  const year = date.getFullYear();
  if(!holidayCache[year]) holidayCache[year] = generateColombianHolidays(year);
  return holidayCache[year].some(h => h.toDateString() === date.toDateString());
}

function isHolyWeek(date) {
  const year = date.getFullYear();
  const easter = getEasterDate(year);
  for (let i = 6; i >= 1; i--) {
    const d = new Date(easter); d.setDate(easter.getDate() - i);
    if (d.toDateString() === date.toDateString()) return true;
  }
  return false;
}

function buildDailySubjects(subjects) {
  const map = {};
  subjects.forEach(s => {
    if (!map[s.day]) map[s.day] = [];
    map[s.day].push({ startMinutes: s.startMinutes, endMinutes: s.endMinutes, jornada: s.jornada });
  });
  Object.values(map).forEach(list => list.sort((a, b) => a.startMinutes - b.startMinutes));
  return map;
}

function calculateTripsForDay(subjectsOfDay, minGapMinutes) {
  if (!subjectsOfDay || subjectsOfDay.length === 0) return 0;
  let trips = 1;
  if (minGapMinutes <= 0) return trips;
  for (let i = 0; i < subjectsOfDay.length - 1; i++) {
    if (subjectsOfDay[i].jornada === "nocturna" && subjectsOfDay[i+1].jornada === "nocturna") continue;
    if (subjectsOfDay[i+1].startMinutes - subjectsOfDay[i].endMinutes >= minGapMinutes) trips++;
  }
  return trips;
}

function calculateMonthlyCost(subjects, config, excludedDaysSet) {
  const dailyMap = buildDailySubjects(subjects);
  let totalTrips = 0, totalSnackDays = 0;
  const dailyDetails = [];
  const date = new Date(config.year, config.month, 1);

  while (date.getMonth() === config.month) {
    const dayIndex = date.getDay() - 1;
    if (dayIndex >= 0 && dayIndex <= 5 && !isHoliday(date)) {
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!excludedDaysSet.has(dateString)) {
        const subjectsToday = dailyMap[dayIndex];
        if (subjectsToday && subjectsToday.length > 0) {
          const trips = calculateTripsForDay(subjectsToday, config.minGapMinutes);
          const hasGaps = config.minGapMinutes > 0 && ScheduleTimeModel.calculateGaps(subjectsToday, config.minGapMinutes) > 0;
          totalTrips += trips; totalSnackDays++;
          dailyDetails.push({ date: new Date(date), dayName: diasSemana[dayIndex], trips, hasGaps });
        }
      }
    }
    date.setDate(date.getDate() + 1);
  }
  return { totalTrips, totalSnackDays, totalCost: (totalTrips * config.transportCost) + (totalSnackDays * config.snackCost), dailyDetails };
}