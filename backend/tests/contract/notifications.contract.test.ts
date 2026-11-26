import type { Notification, User } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from "../../src/repositories/incident.repo.js";
import { InMemoryNotificationRepo } from "../../src/repositories/notification.repo.js";

// E3-01 · Contrato de GET /api/incidents/{id}/notifications (NC-1 a NC-8).
// Spec: specs/features/E3-01-notifications-endpoint/02-specification.md · openapi.yaml (E1-01)

vi.mock("../../src/db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../../src/app.js");

const T0 = new Date("2026-12-01T11:00:00Z");
const T1 = new Date("2026-12-01T11:00:05Z");

const u = (id: string, role: User["role"]): User => ({
  id, name: `${role} Demo`, phone: "+34600000000", email: "x@example.com", role, createdAt: T0, updatedAt: T0,
});
const TENANT = u("usr_tenant_demo", "TENANT");
const TECH = u("usr_technician_demo", "TECHNICIAN");
const MANAGER = u("usr_manager_demo", "MANAGER");

function makeIncident(): IncidentWithRelations {
  return {
    id: "inc_demo", title: "Fuga de agua en el baño", description: null, status: "VIDEO_COMPLETED",
    tenantId: TENANT.id, technicianId: TECH.id, managerId: MANAGER.id, createdAt: T0, updatedAt: T0,
    technician: TECH, tenant: TENANT, manager: MANAGER, visit: null,
  };
}

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: "ntf_1", incidentId: "inc_demo", recipientId: MANAGER.id, channel: "SMS", status: "DELIVERED",
    template: "post_visit", providerMessageId: "msg-secreto", error: null, sentAt: T0, deliveredAt: T1,
    createdAt: T0, updatedAt: T1, ...overrides,
  };
}

function setup(notifications: Notification[] = [
  makeNotification({}),
  makeNotification({
    id: "ntf_2", recipientId: TENANT.id, status: "FAILED", providerMessageId: null,
    sentAt: null, deliveredAt: null, error: "VonageNetworkError", createdAt: T1,
  }),
]) {
  const app = createApp({
    incidentRepo: new InMemoryIncidentRepo([makeIncident()]),
    notificationRepo: new InMemoryNotificationRepo(notifications, [TENANT, TECH, MANAGER]),
  });
  return { app };
}

const as = (user: User) => ({ "X-User-Id": user.id, "X-User-Role": user.role });

describe("GET /api/incidents/{id}/notifications", () => {
  it("NC-1 · 200 con la forma exacta del schema Notification, en orden de creación", async () => {
    const { app } = setup();

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(as(MANAGER));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      notifications: [
        {
          id: "ntf_1",
          recipient: { id: MANAGER.id, name: "MANAGER Demo", role: "MANAGER" },
          channel: "SMS",
          status: "DELIVERED",
          template: "post_visit",
          sentAt: T0.toISOString(),
          deliveredAt: T1.toISOString(),
          error: null,
        },
        {
          id: "ntf_2",
          recipient: { id: TENANT.id, name: "TENANT Demo", role: "TENANT" },
          channel: "SMS",
          status: "FAILED",
          template: "post_visit",
          sentAt: null,
          deliveredAt: null,
          error: "VonageNetworkError",
        },
      ],
    });
  });

  it("NC-2 · sin teléfonos, emails ni providerMessageId en la respuesta", async () => {
    const { app } = setup();

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(as(TENANT));
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain("+34600000000");
    expect(raw).not.toContain("example.com");
    expect(raw).not.toContain("msg-secreto");
    expect(raw).not.toContain("providerMessageId");
  });

  it.each([TENANT, TECH, MANAGER])("NC-3 · 200 para cada participante (%s.role)", async (user) => {
    const { app } = setup();

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(as(user));

    expect(res.status).toBe(200);
  });

  it("NC-4 · 200 con lista vacía si no hay notificaciones", async () => {
    const { app } = setup([]);

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(as(MANAGER));

    expect(res.body).toEqual({ notifications: [] });
  });

  it.each([
    ["sin cabeceras", {}],
    ["rol inválido", { "X-User-Id": MANAGER.id, "X-User-Role": "ADMIN" }],
  ])("NC-5 · 400 { error } %s", async (_name, headers) => {
    const { app } = setup();

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(headers);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it.each([
    ["otra persona", { "X-User-Id": "usr_otra", "X-User-Role": "MANAGER" }],
    ["participante con el rol cambiado", { "X-User-Id": TENANT.id, "X-User-Role": "MANAGER" }],
  ])("NC-6 · 403 { error } %s", async (_name, headers) => {
    const { app } = setup();

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(headers);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("NC-7 · 404 { error } si la incidencia no existe (antes que el 403)", async () => {
    const { app } = setup();

    const res = await request(app)
      .get("/api/incidents/inc_x/notifications")
      .set({ "X-User-Id": "usr_otra", "X-User-Role": "MANAGER" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Incident not found" });
  });

  it("NC-8 · 500 { error } si falla el repo", async () => {
    const notificationRepo = new InMemoryNotificationRepo();
    vi.spyOn(notificationRepo, "findByIncidentId").mockRejectedValue(new Error("BD caída"));
    const app = createApp({
      incidentRepo: new InMemoryIncidentRepo([makeIncident()]),
      notificationRepo,
    });

    const res = await request(app).get("/api/incidents/inc_demo/notifications").set(as(MANAGER));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
