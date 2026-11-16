import type {
    IncidentStatus,
    User,
    VideoSession,
    VideoSessionStatus,
    Visit,
    VisitStatus,
} from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
    InMemoryIncidentRepo,
    type IncidentWithRelations,
} from "../repositories/incident.repo.js";
import { InMemoryVideoSessionRepo } from "../repositories/video-session.repo.js";
import { InMemoryVideoService } from "../services/video.service.js";

vi.mock("../db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../app.js");

const APP_ID = "test-app-id";

const TENANT = { "X-User-Id": "usr_tenant_demo", "X-User-Role": "TENANT" };
const TECHNICIAN = {
  "X-User-Id": "usr_technician_demo",
  "X-User-Role": "TECHNICIAN",
};
const MANAGER = { "X-User-Id": "usr_manager_demo", "X-User-Role": "MANAGER" };

type FixtureOptions = {
  incidentStatus?: IncidentStatus;
  visitStatus?: VisitStatus;
  sessionStatus?: VideoSessionStatus;
  vonageSessionId?: string | null;
};

// Incidencia igual que la del seed (inc_demo), con estados configurables.
function makeIncident(options: FixtureOptions = {}): IncidentWithRelations {
  const now = new Date();

  const technician: User = {
    id: "usr_technician_demo",
    name: "Técnica Demo",
    phone: "+34600000002",
    email: null,
    role: "TECHNICIAN",
    createdAt: now,
    updatedAt: now,
  };

  const videoSession: VideoSession = {
    id: "vs_demo",
    visitId: "visit_demo",
    vonageSessionId: options.vonageSessionId ?? null,
    status: options.sessionStatus ?? "PENDING",
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const visit: Visit & { videoSession: VideoSession | null } = {
    id: "visit_demo",
    incidentId: "inc_demo",
    scheduledAt: now,
    status: options.visitStatus ?? "CONFIRMED",
    createdAt: now,
    updatedAt: now,
    videoSession,
  };

  return {
    id: "inc_demo",
    title: "Fuga de agua en el baño",
    description: null,
    status: options.incidentStatus ?? "VISIT_ASSIGNED",
    tenantId: "usr_tenant_demo",
    technicianId: technician.id,
    managerId: "usr_manager_demo",
    createdAt: now,
    updatedAt: now,
    technician,
    visit,
  };
}

// Cada test crea su propia app con stubs: sin Postgres ni Vonage.
function setup(options: FixtureOptions = {}) {
  const incident = makeIncident(options);
  const incidentRepo = new InMemoryIncidentRepo([incident]);

  // La VideoSession vive en su propio repo (VideoSessionRepo), con su visita.
  const { videoSession, ...visit } = incident.visit!;
  const videoSessionRepo = new InMemoryVideoSessionRepo([
    { ...videoSession!, visit },
  ]);

  const videoService = new InMemoryVideoService();
  const app = createApp({
    incidentRepo,
    videoSessionRepo,
    videoService,
    applicationId: APP_ID,
  });
  return { app, incidentRepo, videoSessionRepo, videoService };
}

describe("POST /api/video-tokens", () => {
  it("CA-01 · la inquilina entra: crea la sesión, devuelve token y la pasa a ACTIVE", async () => {
    const { app, videoSessionRepo } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      applicationId: APP_ID,
      sessionId: "stub-session-visit_demo",
      token: "stub-token-TENANT-stub-session-visit_demo",
    });

    const session = await videoSessionRepo.findByVisitId("visit_demo");
    expect(session?.status).toBe("ACTIVE");
    expect(session?.vonageSessionId).toBe("stub-session-visit_demo");
  });

  it("CA-09 · dos peticiones simultáneas solo crean una sesión de Vonage", async () => {
    const { app, videoService } = setup();
    const createSession = vi.spyOn(videoService, "createSession");

    const [tenantRes, technicianRes] = await Promise.all([
      request(app)
        .post("/api/video-tokens")
        .set(TENANT)
        .send({ incidentId: "inc_demo" }),
      request(app)
        .post("/api/video-tokens")
        .set(TECHNICIAN)
        .send({ incidentId: "inc_demo" }),
    ]);

    expect(tenantRes.status).toBe(200);
    expect(technicianRes.status).toBe(200);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(tenantRes.body.sessionId).toBe(technicianRes.body.sessionId);
  });

  it("CA-02 · si ya hay vonageSessionId no se crea otra sesión", async () => {
    const { app, videoService } = setup({
      sessionStatus: "ACTIVE",
      vonageSessionId: "vonage_existente",
    });
    const createSession = vi.spyOn(videoService, "createSession");

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(200);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("CA-02 · la técnica entra a una sesión ya activa y recibe la misma sessionId", async () => {
    const { app } = setup({
      sessionStatus: "ACTIVE",
      vonageSessionId: "vonage_existente",
    });

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TECHNICIAN)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe("vonage_existente");
  });

  it("CA-03 · faltan las cabeceras → 400", async () => {
    const { app } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("CA-03 · rol que no existe en el enum → 400", async () => {
    const { app } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .set({ "X-User-Id": "usr_tenant_demo", "X-User-Role": "ADMIN" })
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(400);
  });

  it("CA-03 · falta incidentId → 400", async () => {
    const { app } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({});

    expect(res.status).toBe(400);
  });

  it("CA-04 · la incidencia no existe → 404", async () => {
    const { app } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({ incidentId: "no_existe" });

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });

  it("CA-05 · la gestora no puede entrar → 403", async () => {
    const { app } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .set(MANAGER)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(403);
  });

  it("CA-06 · el rol no coincide con el usuario → 403", async () => {
    const { app } = setup();

    const res = await request(app)
      .post("/api/video-tokens")
      .set({ "X-User-Id": "usr_tenant_demo", "X-User-Role": "TECHNICIAN" })
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(403);
  });

  it("CA-07 · la visita no está confirmada → 409", async () => {
    const { app } = setup({ visitStatus: "PENDING" });

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(409);
  });

  it("CA-07 · la incidencia no está en VISIT_ASSIGNED → 409", async () => {
    const { app } = setup({ incidentStatus: "REPORTED" });

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(409);
  });

  it("CA-08 · la sesión ya terminó → 409", async () => {
    const { app } = setup({
      sessionStatus: "ENDED",
      vonageSessionId: "vonage_terminada",
    });

    const res = await request(app)
      .post("/api/video-tokens")
      .set(TENANT)
      .send({ incidentId: "inc_demo" });

    expect(res.status).toBe(409);
  });
});
