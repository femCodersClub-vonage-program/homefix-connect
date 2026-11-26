import type { User, VideoSession, Visit } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from "../../src/repositories/incident.repo.js";

// E0-05 · Contrato de GET /api/incidents/:id: repo inyectado, 401/403/404.
// Spec: specs/features/E0-05-incidents-contract/02-specification.md

vi.mock("../../src/db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../../src/app.js");

const TENANT = { "X-User-Id": "usr_tenant_demo", "X-User-Role": "TENANT" };
const TECHNICIAN = { "X-User-Id": "usr_technician_demo", "X-User-Role": "TECHNICIAN" };
const MANAGER = { "X-User-Id": "usr_manager_demo", "X-User-Role": "MANAGER" };

const now = new Date("2026-11-20T10:00:00.000Z");

function user(id: string, name: string, phone: string, role: User["role"]): User {
  return { id, name, phone, email: `${id}@example.test`, role, createdAt: now, updatedAt: now };
}

// Igual que la incidencia del seed (inc_demo).
function makeIncident(
  overrides: { technician?: null; visit?: null; description?: null } = {},
): IncidentWithRelations {
  const videoSession: VideoSession = {
    id: "vs_demo",
    visitId: "visit_demo",
    vonageSessionId: "vonage-secreta",
    status: "PENDING",
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const visit: Visit & { videoSession: VideoSession | null } = {
    id: "visit_demo",
    incidentId: "inc_demo",
    scheduledAt: now,
    status: "CONFIRMED",
    createdAt: now,
    updatedAt: now,
    videoSession,
  };
  const technician = user("usr_technician_demo", "Técnica Demo", "+34600000002", "TECHNICIAN");

  return {
    id: "inc_demo",
    title: "Fuga de agua en el baño",
    description: "El grifo del lavabo pierde agua desde ayer.",
    status: "VISIT_ASSIGNED",
    tenantId: "usr_tenant_demo",
    technicianId: "usr_technician_demo",
    managerId: "usr_manager_demo",
    createdAt: now,
    updatedAt: now,
    tenant: user("usr_tenant_demo", "Inquilina Demo", "+34600000001", "TENANT"),
    manager: user("usr_manager_demo", "Gestora Demo", "+34600000003", "MANAGER"),
    technician,
    visit,
    ...overrides,
  };
}

function setup(incident: IncidentWithRelations = makeIncident()) {
  const incidentRepo = new InMemoryIncidentRepo([incident]);
  const findById = vi.spyOn(incidentRepo, "findById");
  const app = createApp({ incidentRepo });
  return { app, findById };
}

const get = (app: ReturnType<typeof createApp>, id = "inc_demo") =>
  request(app).get(`/api/incidents/${id}`);

const CONTRACT_BODY = {
  id: "inc_demo",
  title: "Fuga de agua en el baño",
  description: "El grifo del lavabo pierde agua desde ayer.",
  status: "VISIT_ASSIGNED",
  technician: { id: "usr_technician_demo", name: "Técnica Demo" },
  visit: {
    id: "visit_demo",
    status: "CONFIRMED",
    scheduledAt: "2026-11-20T10:00:00.000Z",
    videoSession: { id: "vs_demo", status: "PENDING" },
  },
};

const FORBIDDEN = [
  "tenant",
  "manager",
  "tenantId",
  "technicianId",
  "managerId",
  "createdAt",
  "updatedAt",
  "phone",
  "email",
  "vonageSessionId",
];

describe("GET /api/incidents/:id (contrato)", () => {
  it.each([
    ["inquilina", TENANT],
    ["técnica", TECHNICIAN],
    ["gestora", MANAGER],
  ])("IC-1 · la %s de la incidencia recibe 200 con la forma exacta del contrato", async (_, headers) => {
    const { app } = setup();

    const res = await get(app).set(headers);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(CONTRACT_BODY);
  });

  it("IC-2 · usa el IncidentRepo inyectado (no Prisma directo)", async () => {
    const { app, findById } = setup();

    await get(app).set(TENANT);

    expect(findById).toHaveBeenCalledWith("inc_demo");
  });

  it("IC-3 · no expone datos personales ni campos internos", async () => {
    const { app } = setup();

    const res = await get(app).set(MANAGER);
    const json = JSON.stringify(res.body);

    for (const field of FORBIDDEN) {
      expect(json).not.toContain(`"${field}"`);
    }
    expect(json).not.toContain("+3460000000");
    expect(json).not.toContain("vonage-secreta");
  });

  it("IC-4 · technician, visit y description pueden ser null", async () => {
    const { app } = setup(makeIncident({ technician: null, visit: null, description: null }));

    const res = await get(app).set(TENANT);

    expect(res.status).toBe(200);
    expect(res.body.technician).toBeNull();
    expect(res.body.visit).toBeNull();
    expect(res.body.description).toBeNull();
  });

  it("IC-5 · sin cabeceras → 401 { error } sin consultar el repo", async () => {
    const { app, findById } = setup();

    const res = await get(app);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(findById).not.toHaveBeenCalled();
  });

  it.each([
    ["solo X-User-Id", { "X-User-Id": "usr_tenant_demo" }],
    ["solo X-User-Role", { "X-User-Role": "TENANT" }],
    ["X-User-Id vacío", { "X-User-Id": "  ", "X-User-Role": "TENANT" }],
    ["rol que no existe", { "X-User-Id": "usr_tenant_demo", "X-User-Role": "ADMIN" }],
  ])("IC-6 · %s → 401", async (_, headers) => {
    const { app } = setup();

    const res = await get(app).set(headers);

    expect(res.status).toBe(401);
  });

  it("IC-7 · incidencia que no existe → 404 { error }", async () => {
    const { app } = setup();

    const res = await get(app, "no-existe").set(TENANT);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Incident not found" });
  });

  it.each([
    ["usuario que no participa", { "X-User-Id": "usr_otra", "X-User-Role": "TENANT" }],
    ["la inquilina con rol de técnica", { "X-User-Id": "usr_tenant_demo", "X-User-Role": "TECHNICIAN" }],
    ["la técnica con rol de gestora", { "X-User-Id": "usr_technician_demo", "X-User-Role": "MANAGER" }],
  ])("IC-8 · %s → 403 { error }", async (_, headers) => {
    const { app } = setup();

    const res = await get(app).set(headers);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("IC-9 · sin técnica asignada, nadie entra como técnica (403)", async () => {
    const incident = makeIncident({ technician: null });
    incident.technicianId = null;
    const { app } = setup(incident);

    const res = await get(app).set(TECHNICIAN);

    expect(res.status).toBe(403);
  });
});
