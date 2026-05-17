import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const rootEnv = resolve(__dirname, "../../../.env");
if (existsSync(rootEnv)) {
    config({ path: rootEnv });
}

import { startScheduler } from "./scheduler/scheduler";

startScheduler();
