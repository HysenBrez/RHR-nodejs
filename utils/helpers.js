import moment from "moment";

export const timeDiff = (endTime, startTime) => {
  const diff = moment(endTime).diff(moment(startTime), "minutes");
  const hours = Math.round(diff / 60);
  const minutes = diff % 60;

  return { hours, minutes };
};

export const diffInMins = (endTime, startTime) => {
  return moment(endTime).diff(moment(startTime), "minutes");
};

export const toHoursAndMins = (minutes, format = false) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (format) return `${hours}h ${mins}m`;

  return { hours, mins };
};

export const calcDailySalary = (minutes, hourlyPay) => {
  const { hours, mins } = toHoursAndMins(minutes);
  return (hours * hourlyPay + (mins * hourlyPay) / 60).toFixed(2);
};

export const format24h = (time) => {
  return moment(time).format("HH:mm");
};

export const addDays = (date, day = 1, format = false) => {
  if (format) return new Date(moment(date).add(day, "days").format("YYYY-MM-DD"));

  return new Date(moment(date).add(day, "days").format());
};

export const addMonths = (date, month = 1, format = true) => {
  if (format) return new Date(moment(date).add(month, "months").format("YYYY-MM-DD"));

  return new Date(moment(date).add(month, "months").format());
};

export const checkSuspect = (endTime) => {
  return moment(endTime).format("HH:mm") === "23:59" ? true : false;
};

export const equalDays = (day1, day2 = false) => {
  return moment(day1).format("YYYY-MM-DD") ===
    (day2 ? moment(day2).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"))
    ? true
    : false;
};

// export const returnZero = (value) => {
//   return value || 0;
// };
