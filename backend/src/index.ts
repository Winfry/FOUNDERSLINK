import { app } from "./app.js";
import { env } from "./config/env.js";
import { attachRealtime } from "./realtime.js";

const server = app.listen(env.PORT, () => {
  console.log(`FounderLink API listening on http://localhost:${env.PORT}`);
});

attachRealtime(server);
