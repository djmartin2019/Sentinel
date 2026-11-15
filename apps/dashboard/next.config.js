const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../.."),
    async headers() {
        return [
            {
                // Service worker must never be served stale, or updates won't ship.
                source: "/sw.js",
                headers: [
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
