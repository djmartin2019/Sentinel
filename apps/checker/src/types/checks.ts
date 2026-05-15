export type CheckResult = {
    status: "UP" | "DOWN";

    statusCode?: number;

    latencyMs?: number;

    errorMessage?: string;
};
