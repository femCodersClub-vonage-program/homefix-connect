import type { IncidentStatus, User, Visit, VisitStatus } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from "../../src/repositories/incident.repo.js";

// E3-02 · Contrato de POST /api/incidents/{id}/close (CC-1 a CC-7).
// Spec: specs/features/E3-02-close-incident/02-specification.md · openapi.yaml (E1-01)

vi.mock("../../src/db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../../src/app.js");

const NOW = new Date();
const MANAGER = { "X-User-Id": "usr_manager_demo", "X-User-Role": "MANAGER" };

function makeIncident(status: IncidentStatus, visitStatus: VisitStatus): IncidentWithRelations {
  const u = (id: string, role: User["role"]): User => ({
    id, name: `${role} Demo`, phone: "+34600000000", email: null, role, createdAt: NOW, updatedAt: NOW,
  });
  const visit: Visit & { videoSession: null } = {
    id: "visit_demo", incidentId: "inc_demo", scheduledAt: NOW, status: visitStatus,
    completedAt: null, createdAt: NOW, updatedAt: NOW, videoSession: null,
  };
  return {
    id: "inc_demo", title: "Fuga", description: null, status,
    tenantId: "usr_tenant_demo", technicianId: "usr_technician_demo", managerId: "usr_manager_demo",
    createdAt: NOW, updatedAt: NOW,
    technician: u("usr_technician_demo", "TECHNICIAN"), tenant: u("usr_tenant_demo", "TENANT"),
    manager: u("usr_manager_demo", "MANAGER"), visit,
  };
}

function setup(status: IncidentStatus = "VIDEO_COMPLETED", visitStatus: VisitStatus = "COMPLETED") {
  const incidentRepo = new InMemoryIncidentRepo([makeIncident(status, visitStatus)]);
  return { app: createApp({ incidentRepo }), incidentRepo };
}

const close = (app: ReturnType<typeof setup>["app"], id = "inc_demo") =>
  request(app).post(`/api/incidents/${id}/close`);

describe("POST /api/incidents/{id}/close", () => {
  it("CC-1 · 200 { status: closed }", async () => {
    const { app } = setup();

    const res = await close(app).set(MANAGER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "closed" });
  });

  it("CC-2 · 200 { status: already_closed } la segunda vez", async () => {
    const { app } = setup();

    await close(app).set(MANAGER);
    const res = await close(app).set(MANAGER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "already_closed" });
  });

  it.each([
    ["sin cabeceras", {}],
    ["rol inválido", { "X-User-Id": "usr_manager_demo", "X-User-Role": "ADMIN" }],
  ])("CC-3 · 400 { error } %s", async (_name, headers) => {
    const { app } = setup();

    const res = await close(app).set(headers);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("CC-4 · 403 { error } para la técnica", async () => {
    const { app } = setup();

    const res = await close(app).set({ "X-User-Id": "usr_technician_demo", "X-User-Role": "TECHNICIAN" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("CC-5 · 404 { error: Incident not found }", async () => {
    const { app } = setup();

    const res = await close(app, "inc_x").set(MANAGER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Incident not found" });
  });

  it("CC-6 · 409 { error: Report not ready } con la visita No completada", async () => {
    const { app } = setup("VISIT_ASSIGNED", "CANCELLED");

    const res = await close(app).set(MANAGER);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Report not ready" });
  });

  it("CC-7 · 500 { error } si falla el repo", async () => {
    const { app, incidentRepo } = setup();
    vi.spyOn(incidentRepo, "closeIfReportReady").mockRejectedValue(new Error("BD caída"));

    const res = await close(app).set(MANAGER);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
