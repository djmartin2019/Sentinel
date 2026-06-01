import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const rootEnv = resolve(__dirname, "../../../../.env");
if (existsSync(rootEnv)) {
    config({ path: rootEnv });
}

import { prisma } from "../db/prisma";
import { replayIncidentsFromChecks } from "../incidents/replay";

const force = process.argv.includes("--force");

async function backfillTarget(
    targetId: string,
    targetName: string,
): Promise<number> {
    const existing = await prisma.incident.count({ where: { targetId } });
    if (existing > 0 && !force) {
        console.log(`Skipping ${targetName}: ${existing} incident(s) already exist (use --force to rebuild)`);
        return 0;
    }

    if (existing > 0 && force) {
        await prisma.incident.deleteMany({ where: { targetId } });
    }

    const checks = await prisma.healthCheck.findMany({
        where: { targetId },
        orderBy: { checkedAt: "asc" },
        select: { status: true, checkedAt: true },
    });

    if (checks.length === 0) {
        console.log(`Skipping ${targetName}: no health checks`);
        return 0;
    }

    const drafts = replayIncidentsFromChecks(targetId, targetName, checks);

    if (drafts.length === 0) {
        console.log(`No incidents to backfill for ${targetName}`);
        return 0;
    }

    await prisma.incident.createMany({ data: drafts });
    console.log(`Backfilled ${drafts.length} incident(s) for ${targetName}`);
    return drafts.length;
}

async function main() {
    const targets = await prisma.monitoredTarget.findMany({
        select: { id: true, name: true },
    });

    let total = 0;
    for (const target of targets) {
        total += await backfillTarget(target.id, target.name);
    }

    console.log(`Done. Created ${total} incident(s) across ${targets.length} target(s).`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
