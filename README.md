# Sentinel — Distributed Observability Platform

Sentinel is a lightweight distributed observability and uptime monitoring platform designed for self-hosted infrastructure, cloud deployments, and modern web applications.

The platform provides centralized visibility into:

- Website uptime
- API health
- VPS/server metrics
- Container health
- Application telemetry
- Incident tracking

Sentinel is designed to monitor infrastructure distributed across multiple providers including:

- Vercel
- Cloudflare
- VPS providers
- Local Docker environments
- Raspberry Pi devices
- Custom backend services

---

# Overview

Sentinel combines:

- External HTTP health checks
- Internal telemetry collection
- gRPC-based agent communication
- REST APIs
- Real-time dashboards

into a unified observability platform focused on infrastructure visibility and operational awareness.

The project is built to explore and demonstrate real-world platform engineering concepts including distributed systems, telemetry pipelines, backend architecture, infrastructure monitoring, and service orchestration.

---

# Core Features

## Uptime & API Monitoring

Monitor websites and APIs for:

- Availability
- Latency
- SSL validity
- DNS issues
- Unexpected responses
- Misconfigurations

Example failures Sentinel can detect:

- Apache reverse proxy failures
- Docker container crashes
- Cloudflare routing issues
- Vercel deployment failures

---

## Infrastructure Telemetry

Sentinel agents collect and report:

- CPU usage
- Memory usage
- Disk usage
- Service uptime
- Container health
- Request metrics
- Error counts

Telemetry is streamed to a central collector using gRPC.

---

## Incident Tracking

Sentinel stores historical infrastructure events including:

- Outages
- Latency spikes
- Downtime history
- Service degradation
- Active incidents
- Resolved incidents

---

## Real-Time Dashboard

The Next.js dashboard provides visibility into:

- Live service status
- Active incidents
- Historical uptime
- Infrastructure health
- Telemetry metrics
- Response time trends

---

# Architecture

```text
                   +----------------------+
                   |  Next.js Dashboard   |
                   +----------+-----------+
                              |
                              | REST / SSE
                              v
                   +----------------------+
                   |  Express API Server  |
                   +----------+-----------+
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
+----------------------+           +----------------------+
| HTTP Health Checker  |           | gRPC Collector       |
| External Monitoring  |           | Internal Telemetry   |
+----------+-----------+           +----------+-----------+
           |                                  ^
           | HTTP                             |
           v                                  | gRPC
   Websites / APIs                   Sentinel Agents
                                     VPS Services
                                     Docker Hosts
```

---

# Technology Stack

## Backend API

- Node.js
- TypeScript
- Express

Responsibilities:

- REST endpoints
- Dashboard data
- Incident management
- Target management
- Real-time updates

---

## Internal Communication

- gRPC
- Protocol Buffers

Used for:

- Telemetry ingestion
- Heartbeats
- Internal service communication
- Metric streaming

---

## Database

- PostgreSQL
- Prisma ORM

Stores:

- Monitored targets
- Health checks
- Incidents
- Telemetry metrics
- Service state

---

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

Provides:

- Infrastructure dashboards
- Metrics visualization
- Incident history
- Service monitoring

---

## Infrastructure

- Docker
- Docker Compose

Containerized services include:

- API
- Checker
- Collector
- Dashboard
- Agents
- PostgreSQL

---

# Core Services

## API Service

The central REST API responsible for:

- Target CRUD operations
- Dashboard aggregation
- Incident APIs
- Metrics APIs
- Real-time streaming

---

## Checker Service

Background worker responsible for:

- Scheduled health checks
- HTTP monitoring
- SSL validation
- Incident generation
- Uptime tracking

---

## Collector Service

gRPC ingestion service responsible for:

- Receiving telemetry
- Receiving heartbeats
- Streaming metrics
- Tracking service state

---

## Sentinel Agent

Lightweight distributed agent responsible for:

- Collecting system metrics
- Monitoring local services
- Reporting telemetry
- Sending heartbeats

Deployment targets include:

- VPS infrastructure
- Raspberry Pi devices
- Docker hosts
- Cloud VMs
- Local development environments

---

# Database Design

## monitored_targets

Stores monitored websites and APIs.

## health_checks

Stores individual health check results.

## incidents

Tracks outages and service degradation.

## telemetry_metrics

Stores historical telemetry data.

## service_instances

Tracks connected agents and services.

---

# Planned Features

## MVP

- Add/remove monitored targets
- Scheduled uptime checks
- Historical uptime storage
- Incident tracking
- Basic dashboard
- VPS telemetry reporting
- Discord/email alerts

---

## Future Features

- Distributed agents
- Docker monitoring
- Apache/Nginx monitoring
- Cloudflare analytics integration
- Vercel deployment monitoring
- SFTP health checks
- SSO validation flows
- Log aggregation
- Tracing
- Alert escalation rules
- Multi-region monitoring
- Role-based access control

---

# Project Goals

Sentinel is designed to explore and demonstrate:

- Distributed systems architecture
- Observability engineering
- Telemetry pipelines
- Backend API design
- gRPC communication
- Infrastructure monitoring
- Scheduling systems
- Docker orchestration
- Real-time data streaming
- Platform engineering concepts

The project intentionally focuses on infrastructure tooling and systems architecture rather than traditional CRUD application development.

---

# Repository Structure

```text
sentinel/
├── apps/
│   ├── api/
│   ├── checker/
│   ├── collector/
│   ├── dashboard/
│   └── agent/
│
├── packages/
│   ├── shared/
│   ├── db/
│   └── proto/
│
├── prisma/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

# Status

Sentinel is currently under active development.

Initial development is focused on:

1. External uptime monitoring
2. Incident lifecycle management
3. Telemetry ingestion
4. Distributed agent communication
5. Infrastructure visualization

---

# Inspiration

Sentinel draws inspiration from modern observability and infrastructure platforms including:

- Prometheus
- Grafana
- Datadog
- OpenTelemetry
- Uptime Kuma
- New Relic

The goal is not to replicate these platforms entirely, but to better understand the architecture and engineering patterns behind modern infrastructure tooling.

---

# Author

Built by David Martin.

Focused on backend engineering, infrastructure tooling, distributed systems, and platform architecture.
