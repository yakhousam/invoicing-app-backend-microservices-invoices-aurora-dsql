import { getDatabaseClient } from "@/db/databaseClient";
import { type APIGatewayProxyEvent, type Context } from "aws-lambda";
import { Client as PgClient } from "pg";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { handler as deleteInvoicedHandler } from "../../functions/deleteInvoice";
import { generateUserId } from "./generate";

vi.mock("@/db/databaseClient", () => {
  const mClient = {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  };
  return {
    getDatabaseClient: vi.fn(() => mClient),
  };
});

describe("Test deleteInvoice", () => {
  let dbClient: PgClient;

  const event = {
    httpMethod: "DELETE",
    headers: {
      "cache-control": "no-cache",
    },
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: "userId",
          },
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;

  const context = {
    getRemainingTimeInMillis: false,
  } as unknown as Context;

  beforeEach(async () => {
    dbClient = await getDatabaseClient();
  });

  it("should delete a invoice by id", async () => {
    const userId = generateUserId();
    const invoiceId = "invoiceId";

    (dbClient.query as Mock).mockResolvedValue({});

    const deleteInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId,
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId,
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const response = await deleteInvoicedHandler(deleteInvoiceEvent, context);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe(JSON.stringify({}));
  });

  it("should return 400 if invoiceId is not provided", async () => {
    const deleteInvoiceEvent = {
      ...event,
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await deleteInvoicedHandler(deleteInvoiceEvent, context);
    expect(result.statusCode).toBe(400);
  });
});
