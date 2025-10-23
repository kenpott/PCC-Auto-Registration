export const TRACKING_INTERVAL = 5; // minutes (ensure its less than 15-20 minutes so it doesn't timeout)

// does support multiple users
export const accounts = {
  user1: {
    u: "",
    p: "",
    term: "",
    crns: [],
    registrationDate: null, // new Date("2025-11-07T08:00:00-07:00")
  },
};

export const webhookURL = ""; // if you don't want to send a webhook just leave it blank ""