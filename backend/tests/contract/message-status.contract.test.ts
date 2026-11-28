import { readFileSync } from "node:fs";

import type { Notification } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { signVonageJwt, TEST_SECRET } from "../../src/__tests__/helpers/vonageJwt.js";
import { InMemoryNotificationRepo } from "../../src/repositories/notification.repo.js";

// E2-01 · Contrato de POST /api/webhooks/message-status (B4).
// Spec: specs/features/E2-01-message-status/02-specification.md

vi.mock("../../src/db/client.js", () => ({ prisma: {} }));

const { createApp } = await import("../../src/app.js");

const ENDPOINT = "/api/webhooks/message-status";
const UUID = "aaaaaaaa-bbbb-cccc-dddd-0123456789ab";
const sentAt = new Date("2026-11-25T20:00:00.000Z");

// Estructura de los callbacks de Vonage Messages (tests/fixtures/vonage-messages).
function fixture(name: "delivered" | "rejected", overrides: Record<string, unknown> = {}) {
  const raw = readFileSync(
    new URL(`../fixtures/vonage-messages/message-status-${name}.json`, import.meta.url),
    "utf8",
  );
  return JSON.stringify({ ...(JSON.parse(raw) as Record<string, unknown>), ...overrides });
}

function setup(status: Notification["status"] = "QUEUED") {
  const notificationRepo = new InMemoryNotificationRepo([
    {
      id: "ntf_tenant",
      incidentId: "inc_demo",
      recipientId: "usr_tenant_demo",
      channel: "SMS",
      status,
      template: "post_visit",
      providerMessageId: UUID,
      error: null,
      sentAt,
      deliveredAt: null,
      createdAt: sentAt,
      updatedAt: sentAt,
    },
  ]);
  const app = createApp({ notificationRepo, getSignatureSecret: () => TEST_SECRET });
  return { app, notificationRepo, current: () => notificationRepo.items[0]! };
}

function post(app: ReturnType<typeof createApp>, body: string, token = signVonageJwt(body)) {
  return request(app)
    .post(ENDPOINT)
    .set("Content-Type", "application/json")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

describe("POST /api/webhooks/message-status (contrato)", () => {
  it("MS-1 · sin firma → 401 y no toca nada", async () => {
    const { app, current } = setup();

    const res = await request(app)
      .post(ENDPOINT)
      .set("Content-Type", "application/json")
      .send(fixture("delivered"));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid signature" });
    expect(current().status).toBe("QUEUED");
  });

  it("MS-1 · firma con otro secreto → 401", async () => {
    const { app } = setup();
    const body = fixture("delivered");

    const res = await post(app, body, signVonageJwt(body, { secret: "otro-secreto" }));

    expect(res.status).toBe(401);
  });

  it("MS-2 · delivered → 200 processed, DELIVERED y deliveredAt = timestamp", async () => {
    const { app, current } = setup("SUBMITTED");

    const res = await post(app, fixture("delivered"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "processed" });
    expect(current().status).toBe("DELIVERED");
    expect(current().deliveredAt).toEqual(new Date("2026-11-25T20:00:05.000Z"));
  });

  it("MS-3 · rejected (title numérico) → FAILED con el error de Vonage", async () => {
    const { app, current } = setup("SUBMITTED");

    const res = await post(app, fixture("rejected"));

    expect(res.body).toEqual({ status: "processed" });
    expect(current().status).toBe("FAILED");
    expect(current().error).toBe("1340: Outbound message rejected");
  });

  it("MS-4 · el mismo evento dos veces → la segunda already_processed", async () => {
    const { app } = setup();

    await post(app, fixture("delivered"));
    const second = await post(app, fixture("delivered"));

    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: "already_processed" });
  });

  it("MS-5 · fuera de orden: submitted después de delivered no retrocede", async () => {
    const { app, current } = setup();

    await post(app, fixture("delivered"));
    const late = await post(app, fixture("delivered", { status: "submitted" }));

    expect(late.body).toEqual({ status: "already_processed" });
    expect(current().status).toBe("DELIVERED");
  });

  it("MS-6 · message_uuid desconocido → 200 ignored", async () => {
    const { app, current } = setup();

    const res = await post(app, fixture("delivered", { message_uuid: "no-existe" }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ignored" });
    expect(current().status).toBe("QUEUED");
  });

  it.each(["message_uuid", "status", "timestamp"])(
    "MS-7 · sin %s → 400 Invalid payload",
    async (field) => {
      const { app } = setup();
      const payload = JSON.parse(fixture("delivered")) as Record<string, unknown>;
      delete payload[field];

      const res = await post(app, JSON.stringify(payload));

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid payload" });
    },
  );

  it("MS-8 · error de base de datos → 500 (Vonage reintenta)", async () => {
    const { app, notificationRepo } = setup();
    vi.spyOn(notificationRepo, "findByProviderMessageId").mockRejectedValueOnce(
      new Error("db down"),
    );

    const res = await post(app, fixture("delivered"));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("MS-9 · secreto de firma no configurado → 500", async () => {
    const notificationRepo = new InMemoryNotificationRepo();
    const app = createApp({ notificationRepo, getSignatureSecret: () => undefined });

    const res = await post(app, fixture("delivered"));

    expect(res.status).toBe(500);
  });
});
