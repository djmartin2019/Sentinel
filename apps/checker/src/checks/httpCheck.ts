import axios from "axios";

import type { CheckResult } from "../types/checks";

export async function httpCheck(url: string): Promise<CheckResult> {
    const startedAt = Date.now();

    try {
        const response = await axios.get(url, {
            timeout: 5000,
        });

        const latencyMs = Date.now() - startedAt;

        return {
            status: response.status >= 200 && response.status < 400
                ? "UP"
                : "DOWN",

            statusCode: response.status,

            latencyMs,
        };
    } catch(error) {
        const latencyMs = Date.now() - startedAt;

        return {
            status: "DOWN",

            latencyMs,

            errorMessage:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        };
    }
}
