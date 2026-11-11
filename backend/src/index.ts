import { app } from "./app.js";
import { env } from "./config/env.js";
import { sendDeadlineReminders } from "./modules/notifications/notifications.service.js";
import { purgeExpired } from "./modules/vetting/documents.js";
import { attachRealtime } from "./realtime.js";
import { warmUp as warmUpCopilot } from "./modules/copilot/llm.js";

const server = app.listen(env.PORT, () => {
  console.log(`FoundersLink API listening on http://localhost:${env.PORT}`);
});

attachRealtime(server);
// The Copilot's model address is looked up now, so the first question does not wait.
warmUpCopilot();

// Deadline reminders, checked once an hour while the server is up. Each
// deadline is reminded once, so a restart never sends duplicates.
const HOUR = 60 * 60 * 1000;
setInterval(() => {
  sendDeadlineReminders().catch((err) => console.warn("Deadline reminders failed:", err));
  // Uploaded vetting documents whose 30 days are up.
  purgeExpired().catch((err) => console.warn("Document clean-up failed:", err));
}, HOUR);
