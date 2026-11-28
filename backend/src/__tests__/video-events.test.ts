import type {
  IncidentStatus,
  User,
  VideoSession,
  VideoSessionStatus,
  Visit,
  VisitStatus,
} from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from "../repositories/incident.repo.js";
import { InMemoryVideoSessionRepo } from "../repositories/video-session.repo.js";
import type {
  PostVisitNotifier,
  PostVisitResult,
} from "../services/messaging.service.js";
import { InMemoryVideoService } from "../services/video.service.js";
import { signVonageJwt, TEST_SECRET } from "./helpers/vonageJwt.js";

// A4 · POST /api/webhooks/video-events — tests (fase roja).
// Spec: specs/features/A4-video-webhook/02-specification.md (CA-1 a CA-9).
// Repos en memoria, notifier falso y firma real (X3): sin Postgres ni Vonage.

vi.mock("../db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../app.js");
const { logger } = await import("../lib/logger.js");

// Espías sobre el logger real (pino-http necesita un pino de verdad).
const logInfo = vi.spyOn(logger, "info");
const logWarn = vi.spyOn(logger, "warn");
const logError = vi.spyOn(logger, "error");

const URL = "/api/webhooks/video-events";
const VONAGE_SESSION_ID = "vonage-session-demo";

const SENT_RESULT: PostVisitResult = {
  sent: [
    { recipientId: "usr_manager_demo", role: "MANAGER", providerMessageId: "msg-1" },
    { recipientId: "usr_tenant_demo", role: "TENANT", providerMessageId: "msg-2" },
  ],
  failed: [],
  skipped: [],
};

type FixtureOptions = {
  incidentStatus?: IncidentStatus;
  sessionStatus?: VideoSessionStatus;
  visitStatus?: VisitStatus;
};

function makeIncident(options: FixtureOptions = {}): IncidentWithRelations {
  const now = new Date();
  const user = (id: string, name: string, phone: string, role: User["role"]): User => ({
    id,
    name,
    phone,
    email: null,
    role,
    createdAt: now,
    updatedAt: now,
  });

  const videoSession: VideoSession = {
    id: "vs_demo",
    visitId: "visit_demo",
    vonageSessionId: VONAGE_SESSION_ID,
    status: options.sessionStatus ?? "ACTIVE",
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const visit: Visit & { videoSession: VideoSession | null } = {
    id: "visit_demo",
    incidentId: "inc_demo",
    scheduledAt: now,
    status: options.visitStatus ?? "CONFIRMED",
    completedAt: null,
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
    technicianId: "usr_technician_demo",
    managerId: "usr_manager_demo",
    createdAt: now,
    updatedAt: now,
    technician: user("usr_technician_demo", "Técnica Demo", "+34600000002", "TECHNICIAN"),
    tenant: user("usr_tenant_demo", "Inquilina Demo", "+34600000001", "TENANT"),
    manager: user("usr_manager_demo", "Gestora Demo", "+34600000003", "MANAGER"),
    visit,
  };
}

function setup(options: FixtureOptions = {}) {
  const incident = makeIncident(options);
  const incidentRepo = new InMemoryIncidentRepo([incident]);
  const { videoSession, ...visit } = incident.visit!;
  const videoSessionRepo = new InMemoryVideoSessionRepo([{ ...videoSession!, visit }]);
  const postVisitNotifier: PostVisitNotifier & {
    sendPostVisit: ReturnType<typeof vi.fn>;
  } = { sendPostVisit: vi.fn().mockResolvedValue(SENT_RESULT) };

  const app = createApp({
    incidentRepo,
    videoSessionRepo,
    videoService: new InMemoryVideoService(),
    applicationId: "test-app-id",
    postVisitNotifier,
    getSignatureSecret: () => TEST_SECRET,
  });
  return { app, incidentRepo, videoSessionRepo, postVisitNotifier };
}

function event(payload: Record<string, unknown>): string {
  return JSON.stringify({
    projectId: "123456",
    timestamp: 1_700_000_000_000,
    ...payload,
  });
}

const SESSION_DESTROYED = event({
  sessionId: VONAGE_SESSION_ID,
  event: "sessionDestroyed",
  reason: "clientDisconnected",
});

function post(app: ReturnType<typeof createApp>, body: string, token = signVonageJwt(body)) {
  return request(app)
    .post(URL)
    .set("Content-Type", "application/json")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

beforeEach(() => {
  logInfo.mockClear();
  logWarn.mockClear();
  logError.mockClear();
});

describe("POST /api/webhooks/video-events", () => {
  it("CA-1 · sin firma → 401 y no toca nada", async () => {
    const { app, videoSessionRepo, postVisitNotifier } = setup();

    const res = await request(app)
      .post(URL)
      .set("Content-Type", "application/json")
      .send(SESSION_DESTROYED);

    expect(res.status).toBe(401);
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ACTIVE",
    );
  });

  it("CA-1 · firma inválida → 401", async () => {
    const { app, postVisitNotifier } = setup();

    const res = await post(
      app,
      SESSION_DESTROYED,
      signVonageJwt(SESSION_DESTROYED, { secret: "otro-secreto" }),
    );

    expect(res.status).toBe(401);
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it("CA-2 · otro evento (connectionDestroyed) → 200 ignored sin cambios", async () => {
    const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup();

    const res = await post(
      app,
      event({ sessionId: VONAGE_SESSION_ID, event: "connectionDestroyed", reason: "clientDisconnected" }),
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ignored" });
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ACTIVE",
    );
    expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VISIT_ASSIGNED");
  });

  it("CA-3 · sin event → 400", async () => {
    const { app } = setup();

    const res = await post(app, event({ sessionId: VONAGE_SESSION_ID }));

    expect(res.status).toBe(400);
  });

  it("CA-3 · sessionDestroyed sin sessionId → 400", async () => {
    const { app, postVisitNotifier } = setup();

    const res = await post(app, event({ event: "sessionDestroyed" }));

    expect(res.status).toBe(400);
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it("CA-4 · sesión desconocida → 200 ignored (E0-02: antes 400)", async () => {
    const { app, postVisitNotifier } = setup();

    const res = await post(
      app,
      event({ sessionId: "no-existe", event: "sessionDestroyed", reason: "clientDisconnected" }),
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ignored" });
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it("CA-5 · cierre correcto: ENDED + endedAt, VIDEO_COMPLETED y sendPostVisit una vez", async () => {
    const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup();

    const res = await post(app, SESSION_DESTROYED);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "processed" });
    const session = await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID);
    expect(session?.status).toBe("ENDED");
    expect(session?.endedAt).toBeInstanceOf(Date);
    expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VIDEO_COMPLETED");
    expect(postVisitNotifier.sendPostVisit).toHaveBeenCalledTimes(1);
    expect(postVisitNotifier.sendPostVisit).toHaveBeenCalledWith("inc_demo", "");
  });

  it("CA-5 · también cierra con reason distinto (mediaIdle)", async () => {
    const { app, postVisitNotifier } = setup();

    const res = await post(
      app,
      event({ sessionId: VONAGE_SESSION_ID, event: "sessionDestroyed", reason: "mediaIdle" }),
    );

    expect(res.body).toEqual({ status: "processed" });
    expect(postVisitNotifier.sendPostVisit).toHaveBeenCalledTimes(1);
  });

  it("CA-6 · el mismo sessionDestroyed dos veces: la segunda already_processed y 1 sola llamada", async () => {
    const { app, postVisitNotifier } = setup();

    await post(app, SESSION_DESTROYED);
    const second = await post(app, SESSION_DESTROYED);

    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: "already_processed" });
    expect(postVisitNotifier.sendPostVisit).toHaveBeenCalledTimes(1);
  });

  it("CA-6 · sesión ya ENDED → already_processed sin SMS", async () => {
    const { app, postVisitNotifier } = setup({ sessionStatus: "ENDED" });

    const res = await post(app, SESSION_DESTROYED);

    expect(res.body).toEqual({ status: "already_processed" });
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it("CA-7 · incidencia ya VIDEO_COMPLETED → already_processed, cierra la sesión (E0-02) y sin SMS", async () => {
    const { app, videoSessionRepo, postVisitNotifier } = setup({
      incidentStatus: "VIDEO_COMPLETED",
    });

    const res = await post(app, SESSION_DESTROYED);

    expect(res.body).toEqual({ status: "already_processed" });
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ENDED",
    );
  });

  it("CA-8 · si sendPostVisit lanza → 200 processed, estados cerrados y log error", async () => {
    const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup();
    postVisitNotifier.sendPostVisit.mockRejectedValue(new Error("db down"));

    const res = await post(app, SESSION_DESTROYED);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "processed" });
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ENDED",
    );
    expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VIDEO_COMPLETED");
    expect(logError).toHaveBeenCalled();
  });

  it("CA-9 · los logs no llevan teléfonos ni el texto del SMS", async () => {
    const { app } = setup();

    await post(app, SESSION_DESTROYED);

    const logged = JSON.stringify([
      ...logInfo.mock.calls,
      ...logWarn.mock.calls,
      ...logError.mock.calls,
    ]);
    expect(logInfo).toHaveBeenCalled();
    expect(logged).not.toContain("60000000");
    expect(logged).not.toContain("Visita realizada");
  });

  // ── E0-02 · endurecer sessionDestroyed ─────────────────────────────────

  it("E0-02 · reason serverRotation → 200 ignored, no toca sesión, incidencia ni SMS", async () => {
    const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup();

    const res = await post(
      app,
      event({ sessionId: VONAGE_SESSION_ID, event: "sessionDestroyed", reason: "serverRotation" }),
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ignored" });
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ACTIVE",
    );
    expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VISIT_ASSIGNED");
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it.each(["COMPLETED", "CANCELLED"] as const)(
    "E0-02 · visita ya %s → cierra la sesión, sin tocar la incidencia ni SMS",
    async (visitStatus) => {
      const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup({ visitStatus });

      const res = await post(app, SESSION_DESTROYED);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "already_processed" });
      const session = await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID);
      expect(session?.status).toBe("ENDED");
      expect(session?.endedAt).toBeInstanceOf(Date);
      expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VISIT_ASSIGNED");
      expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
    },
  );

  it("E0-02 · incidencia CLOSED → cierra la sesión sin SMS", async () => {
    const { app, videoSessionRepo, postVisitNotifier } = setup({ incidentStatus: "CLOSED" });

    const res = await post(app, SESSION_DESTROYED);

    expect(res.body).toEqual({ status: "already_processed" });
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ENDED",
    );
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it("E0-02 · sesión que nunca llegó a ACTIVE (PENDING) → se cierra sin cerrar la visita ni SMS", async () => {
    const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup({
      sessionStatus: "PENDING",
    });

    const res = await post(app, SESSION_DESTROYED);

    expect(res.body).toEqual({ status: "already_processed" });
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe(
      "ENDED",
    );
    expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VISIT_ASSIGNED");
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
  });

  // E1-04 · Fallback: la visita también queda COMPLETED (no solo la incidencia).
  // Spec: specs/features/E1-04-webhook-fallback/02-specification.md
  it("E1-04 CA-1 · fallback: visita COMPLETED + completedAt e incidencia VIDEO_COMPLETED", async () => {
    const { app, incidentRepo, postVisitNotifier } = setup();
    const update = vi.spyOn(incidentRepo, "updateVisitOutcome");

    const res = await post(app, SESSION_DESTROYED);

    expect(res.body).toEqual({ status: "processed" });
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith("inc_demo", {
      visitStatus: "COMPLETED",
      completedAt: expect.any(Date),
      incidentStatus: "VIDEO_COMPLETED",
    });
    const incident = await incidentRepo.findById("inc_demo");
    expect(incident?.status).toBe("VIDEO_COMPLETED");
    expect(incident?.visit?.status).toBe("COMPLETED");
    expect(incident?.visit?.completedAt).toBeInstanceOf(Date);
    expect(postVisitNotifier.sendPostVisit).toHaveBeenCalledOnce();
  });

  it("E1-04 CA-2 · si falla guardar la visita → 500, sin SMS y la sesión sigue abierta para el reintento", async () => {
    const { app, incidentRepo, videoSessionRepo, postVisitNotifier } = setup();
    vi.spyOn(incidentRepo, "updateVisitOutcome").mockRejectedValueOnce(new Error("BD caída"));

    const res = await post(app, SESSION_DESTROYED);

    expect(res.status).toBe(500);
    expect(postVisitNotifier.sendPostVisit).not.toHaveBeenCalled();
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe("ACTIVE");

    // Reintento de Vonage: ahora sí cierra la visita, avisa y cierra la sesión.
    const retry = await post(app, SESSION_DESTROYED);
    expect(retry.body).toEqual({ status: "processed" });
    expect((await incidentRepo.findById("inc_demo"))?.status).toBe("VIDEO_COMPLETED");
    expect(postVisitNotifier.sendPostVisit).toHaveBeenCalledOnce();
    expect((await videoSessionRepo.findByVonageSessionId(VONAGE_SESSION_ID))?.status).toBe("ENDED");
  });
});
