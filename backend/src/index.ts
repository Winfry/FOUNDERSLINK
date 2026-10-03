import { app } from "./app.js";
import { env } from "./config/env.js";
import { sendDeadlineReminders } from "./modules/notifications/notifications.service.js";
import { attachRealtime } from "./realtime.js";

const server = app.listen(env.PORT, () => {
  console.log(`FounderLink API listening on http://localhost:${env.PORT}`);
});

attachRealtime(server);

// Deadline reminders, checked once an hour while the server is up. Each
// deadline is reminded once, so a restart never sends duplicates.
const HOUR = 60 * 60 * 1000;
setInterval(() => {
  sendDeadlineReminders().catch((err) => console.warn("Deadline reminders failed:", err));
}, HOUR);
