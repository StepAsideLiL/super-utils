console.log(
  new Intl.DateTimeFormat("bn-BD", {
    dateStyle: "full",
    timeStyle: "full",
    timeZone: "Asia/Dhaka",
  }).format(new Date())
);
