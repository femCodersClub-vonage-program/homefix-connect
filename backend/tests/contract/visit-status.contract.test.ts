import type { User, VideoSession, Visit, VisitStatus } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from "../../src/repositories/incident.repo.js";
import type { PostVisitNotifier } from "../../src/services/messaging.service.js";

// E1-02 · Contrato de POST /api/incidents/{id}/visit-status (VC-1 a VC-8).
// Spec: specs/features/E1-02-visit-status/02-specification.md · openapi.yaml (E1-01)

vi.mock("../../src/db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../../src/app.js");

const TECHNICIAN = { "X-User-Id": "usr_technician_demo", "X-User-Role": "TECHNICIAN" };
const TENANT = { "X-User-Id": "usr_tenant_demo", "X-User-Role": "TENANT" };

function makeIncident(visitStatus: VisitStatus = "CONFIRMED"): IncidentWithRelations {
  const now = new Date();
  const u = (id: string, role: User["role"]): User => ({
    id, name: `${role} Demo`, phone: "+34600000000", email: null, role, createdAt: now, updatedAt: now,
  });
  const videoSession: VideoSession = {
    id: "vs_demo", visitId: "visit_demo", vonageSessionId: "vonage-demo", status: "ACTIVE",
    startedAt: now, endedAt: null, createdAt: now, updatedAt: now,
  };
  const visit: Visit & { videoSession: VideoSession } = {
    id: "visit_demo", incidentId: "inc_demo", scheduledAt: now, status: visitStatus,
    completedAt: null, createdAt: now, updatedAt: now, videoSession,
  };
  return {
    id: "inc_demo", title: "Fuga de agua en el baño", description: null, status: "VISIT_ASSIGNED",
    tenantId: "usr_tenant_demo", technicianId: "usr_technician_demo", managerId: "usr_manager_demo",
    createdAt: now, updatedAt: now,
    technician: u("usr_technician_demo", "TECHNICIAN"), tenant: u("usr_tenant_demo", "TENANT"),
    manager: u("usr_manager_demo", "MANAGER"), visit,
  };
}

function setup(visitStatus?: VisitStatus) {
  const postVisitNotifier: PostVisitNotifier = {
    sendPostVisit: vi.fn().mockResolvedValue({
      sent: [{ recipientId: "usr_manager_demo", role: "MANAGER", providerMessageId: "m1" }],
      failed: [],
      skipped: [{ role: "TENANT", reason: "ALREADY_SENT" }],
    }),
  };
  const app = createApp({
    incidentRepo: new InMemoryIncidentRepo([makeIncident(visitStatus)]),
    postVisitNotifier,
  });
  return { app };
}

function post(app: ReturnType<typeof setup>["app"], id = "inc_demo") {
  return request(app).post(`/api/incidents/${id}/visit-status`);
}

describe("POST /api/incidents/{id}/visit-status", () => {
  it("VC-1 · 200 completed con el resumen { sent, failed, skipped } en números", async () => {
    const { app } = setup();

    const res = await post(app).set(TECHNICIAN).send({ status: "COMPLETED" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "completed",
      notifications: { sent: 1, failed: 0, skipped: 1 },
    });
  });

  it("VC-2 · 200 not_completed sin notifications", async () => {
    const { app } = setup();

    const res = await post(app).set(TECHNICIAN).send({ status: "CANCELLED" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "not_completed" });
  });

  it("VC-3 · 200 unchanged si ya estaba en ese estado", async () => {
    const { app } = setup("CANCELLED");

    const res = await post(app).set(TECHNICIAN).send({ status: "CANCELLED" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "unchanged" });
  });

  it.each([
    ["sin cabeceras", {}, { status: "COMPLETED" }],
    ["rol inválido", { "X-User-Id": "usr_technician_demo", "X-User-Role": "ADMIN" }, { status: "COMPLETED" }],
    ["status desconocido", TECHNICIAN, { status: "DONE" }],
    ["sin body", TECHNICIAN, {}],
  ])("VC-4 · 400 { error } %s", async (_name, headers, body) => {
    const { app } = setup();

    const res = await post(app).set(headers).send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("VC-5 · 403 { error } si no es la técnica asignada", async () => {
    const { app } = setup();

    const res = await post(app).set(TENANT).send({ status: "COMPLETED" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("VC-6 · 404 { error } si la incidencia no existe", async () => {
    const { app } = setup();

    const res = await post(app, "inc_x").set(TECHNICIAN).send({ status: "COMPLETED" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Incident not found" });
  });

  it("VC-7 · 409 { error } si la visita no está confirmada", async () => {
    const { app } = setup("PENDING");

    const res = await post(app).set(TECHNICIAN).send({ status: "COMPLETED" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("VC-8 · 500 { error } si falla el repo", async () => {
    const repo = new InMemoryIncidentRepo([]);
    vi.spyOn(repo, "findById").mockRejectedValue(new Error("BD caída"));
    const broken = createApp({ incidentRepo: repo, postVisitNotifier: { sendPostVisit: vi.fn() } });

    const res = await post(broken).set(TECHNICIAN).send({ status: "COMPLETED" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
