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

export const toHoursAndMins = (minutes) => {
  const hours = Math.round(minutes / 60);
  const mins = minutes % 60;

  return { hours, mins };
};

export const calcDailySalary = (hours, minutes, salaryForHours) => {
  return (hours * salaryForHours + (minutes * salaryForHours) / 60).toFixed(2);
};

export const format24h = (time) => {
  return moment(time).format("HH:mm");
};

export const isEmptyObj = (obj) => {
  return Object.keys(obj).length === 0;
};
