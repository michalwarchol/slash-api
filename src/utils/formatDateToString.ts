const formatDateToString = (date: Date): string => {
  // Get the timezone offset in minutes and convert it to milliseconds
  const timezoneOffset = date.getTimezoneOffset() * 60000;

  // Adjust the date by adding the timezone offset
  const localDate = new Date(date.getTime() - timezoneOffset);

  // Format the adjusted date to the "YYYY-MM-DD hh:mm:ss" format
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hour = String(localDate.getUTCHours()).padStart(2, '0');
  const minute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const second = String(localDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export default formatDateToString;