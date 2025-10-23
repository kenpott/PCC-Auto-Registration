import { chromium } from "patchright";
import path from "path";
import fs from "fs";

const TRACKING_INTERVAL = 5; // minutes (ensure its less than 15-20 minutes so it doesn't timeout)

// does support multiple users
const accounts = {
  user1: {
    u: "",
    p: "",
    term: "",
    crns: [],
    registrationDate: null, // new Date("2025-11-07T08:00:00-07:00")
  },
};

const webhookURL = "https://discord.com/api/webhooks/"; // if you don't want to send a webhook just leave it blank ""

let cachedClasses = {};

async function sendWebhook(message) {
  if (!webhookURL) return;
  try {
    const payload = {
      username: "Kewl",
      content: `<@489547245021298700>`,
      embeds: [
        {
          description: message,
        },
      ],
    };

    const response = await fetch(webhookURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook failed with status: ${response.status}`);
    }
  } catch (err) {
    console.error("Error sending webhook:", err.message);
  }
}

async function sendClassInfo(course) {
  try {
    const seatsTaken = Number(course.maxEnrl) - Number(course.seatsAvail);

    const payload = {
      username: "Kewl",
      content: `<@489547245021298700>`,
      embeds: [
        {
          title: `${course.subjCode} ${course.courseNumbDisplay} - ${course.courseTitle}`,
          description: course.sectionNote.replace(/<\/?[^>]+(>|$)/g, ""),
          fields: [
            { name: "CRN", value: course.crn, inline: true },
            { name: "Professor", value: course.pfaName || "TBA", inline: true },
            { name: "Seats Taken", value: `${seatsTaken}`, inline: true },
            {
              name: "Seats Available",
              value: `${course.seatsAvail}`,
              inline: true,
            },
            { name: "Total Seats", value: `${course.maxEnrl}`, inline: true },
            {
              name: "Waitlist Available",
              value: `${course.waitAvail}`,
              inline: true,
            },
            { name: "Term", value: course.termCode, inline: true },
            {
              name: "Schedule",
              value: `${course.beginTime}-${course.endTime} (${course.schdDesc})`,
              inline: true,
            },
            {
              name: "Room",
              value: `${course.bldgDesc} ${course.roomCode}`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook failed with status: ${response.status}`);
    }
  } catch (err) {
    console.error("Error sending class info webhook:", err.message);
  }
}

async function login(page, user) {
  console.log(`[INFO][${user.u}] Logging in...`);
  await page.fill('input[name="usernameUserInput"]', user.u);
  await page.fill('input[name="password"]', user.p);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log(`[INFO][${user.u}] Logged in`);
}

async function selectTerm(page, user) {
  console.log(`[${user.u}] Selecting term ${user.term}...`);
  await page.goto(
    "https://ssb-prod.ec.pasadena.edu/ssomanager/saml/login?relayState=/c/auth/SSB?pkg=bwskfreg.P_AltPin"
  );
  await page.evaluate(async (term) => {
    await fetch("https://ssb-prod.ec.pasadena.edu/PROD/bwskfreg.P_AltPin", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ term_in: term }),
      credentials: "include",
    });
  }, user.term);
  await page.reload();
  console.log(`[${user.u}] Term selected`);
}

async function addClasses(page, user) {
  for (let i = 0; i < user.crns.length; i++) {
    const crnInput = page.locator(`#crn_id${i + 1}`);
    await crnInput.fill(String(user.crns[i]));
  }

  await page.waitForNavigation({ waitUntil: "networkidle" }),
    await page.locator('input[value="Submit Changes"]').click(),
    await sendWebhook(
      `[${user.u}] Attempted to add classes: ${user.crns.join(", ")}`
    );
  console.log(`[${user.u}] Classes submitted`);
  // send a ss
}

async function init(key, user) {
  const profilePath = path.resolve(`./profiles/${key}`);
  fs.mkdirSync(profilePath, { recursive: true });

  cachedClasses[user.u] = {};

  const browser = await chromium.launchPersistentContext(profilePath, {
    channel: "chrome",
    headless: false,
    viewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://lancerpoint.pasadena.edu");

  const title = await page.title();
  if (title.includes("Login")) await login(page, user);

  await page.waitForURL("https://experience.elluciancloud.com/paccd/**", {
    timeout: 15000,
    waitUntil: "domcontentloaded",
  });

  await selectTerm(page, user);

  setInterval(async () => {
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      console.log(`[${user.u}] Session refreshed`);
    } catch (e) {
      console.warn(`[${user.u}] Refresh failed: ${e.message}`);
    }
  }, 60000); // prevents session timeout

  while (true) {
    try {
      const response = await fetch(
        `https://prod-apiweb.pasadena.edu/api/classSchedule/${user.term}`
      );
      const data = await response.json();
      const matches = data.filter((course) => user.crns.includes(course.crn));

      for (const course of matches) {
        const cached = cachedClasses[user.u][course.crn];

        if (!cached) {
          cachedClasses[user.u][course.crn] = { ...course };
          console.log(
            `[${user.u}] ${course.courseTitle}: ${course.seatsAvail} seats available`
          );
          continue;
        }

        const cachedSeatsAvail = cached.seatsAvail;
        const seatsAvail = Number(course.seatsAvail);

        console.log("Cache Seats: ", cachedSeatsAvail);

        if (cachedSeatsAvail !== seatsAvail) {
          console.log(
            `[${user.u}] Slot change for ${course.courseTitle}: ${seatsAvail} seats available`
          );
          await sendClassInfo(course);
        }

        if (seatsAvail > 0 && new Date() >= user.registrationDate) {
          console.log(`[${user.u}] Attempting to add ${course.courseTitle}`);
          await sendClassInfo(course);
          await page.reload({ waitUntil: "domcontentloaded" });
          await addClasses(page, user);
        }
        cachedClasses[user.u][course.crn] = { ...course, seatsAvail };
      }
    } catch (e) {
      console.error(`[${user.u}] Tracking error: ${e.message}`);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, TRACKING_INTERVAL * 60000)
    );
  }
}

(async () => {
  console.log(`Initializing script...`);
  await Promise.all(
    Object.entries(accounts).map(([key, user]) => init(key, user))
  );
  await new Promise(() => {});
})();
