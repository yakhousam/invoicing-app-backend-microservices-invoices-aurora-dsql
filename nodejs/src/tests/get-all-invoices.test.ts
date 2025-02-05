import { getDatabaseClient } from "@/db/databaseClient";
import { Invoice } from "@/validation";
import { type APIGatewayProxyEvent, type Context } from "aws-lambda";
import { Client as PgClient } from "pg";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { handler as getAllInvoicesHandler } from "../../functions/getAllInvoices";
import { generateInvoices, generateUserId } from "./generate";

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

describe("Test getAllInvoices", () => {
  let dbClient: PgClient;

  const event = {
    httpMethod: "GET",
    headers: {
      "cache-control": "no-cache",
    },
  } as unknown as APIGatewayProxyEvent;

  const context = {
    getRemainingTimeInMillis: false,
  } as unknown as Context;

  beforeEach(async () => {
    dbClient = await getDatabaseClient();
  });

  it("should return all invoices for the authenticated user", async () => {
    const userId = generateUserId();
    const invoices = generateInvoices(10, userId).map((invoice) => ({
      ...invoice,
      clientName: "Test Client",
    }));

    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [{ count: invoices.length }],
    });
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: invoices,
    });

    const getAllInvoicesEvent = {
      ...event,
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

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context);

    expect(result.statusCode).toBe(200);
    const returnedBody = JSON.parse(result.body) as {
      invoices: Invoice[];
      count: number;
      limit: number;
      offset: number;
    };
    expect(returnedBody.count).toEqual(invoices.length);
    expect(returnedBody.limit).toEqual(10);
    expect(returnedBody.offset).toEqual(0);
  });

  it("should add the invoice status to the response", async () => {
    const userId = generateUserId();
    const invoices = generateInvoices(10, userId).map((invoice) => ({
      ...invoice,
      clientName: "Test Client",
    }));

    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [{ count: invoices.length }],
    });
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: invoices,
    });

    const getAllInvoicesEvent = {
      ...event,
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

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context);

    expect(result.statusCode).toBe(200);
    const returnedBody = JSON.parse(result.body) as {
      invoices: Invoice[];
      count: number;
    };
    expect(returnedBody.invoices[0].status).toBeDefined();
  });
});
