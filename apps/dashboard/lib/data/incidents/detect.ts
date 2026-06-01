import { prisma } from "../../db";
import type { Incident, IncidentSeverity } from "../../types";
import { THIRTY_DAYS_MS } from "../shared/constants";

type IncidentRow = {
    id: string;
    title: string;
    severity: string;
    targetId: string;
    target: { name: string };
    startedAt: Date;
    resolvedAt: Date | null;
    description: string;
};

function mapRowToIncident(row: IncidentRow): Incident {
    const resolved = row.resolvedAt !== null;
    return {
        id: row.id,
        title: row.title,
        severity: row.severity as IncidentSeverity,
        targetId: row.targetId,
        targetName: row.target.name,
        startedAt: row.startedAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString(),
        resolved,
        description: row.description,
    };
}

const incidentSelect = {
    id: true,
    title: true,
    severity: true,
    targetId: true,
    startedAt: true,
    resolvedAt: true,
    description: true,
    target: { select: { name: true } },
} as const;

export async function getActiveIncidents(): Promise<Incident[]> {
    const rows = await prisma.incident.findMany({
        where: { resolvedAt: null },
        orderBy: { startedAt: "desc" },
        select: incidentSelect,
    });

    return rows.map(mapRowToIncident);
}

export async function getRecentIncidents(): Promise<Incident[]> {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const rows = await prisma.incident.findMany({
        where: {
            resolvedAt: { not: null, gte: since },
        },
        orderBy: { resolvedAt: "desc" },
        select: incidentSelect,
    });

    return rows.map(mapRowToIncident);
}
