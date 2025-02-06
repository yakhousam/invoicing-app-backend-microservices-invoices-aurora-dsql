import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice } from "@/utils";
import { Invoice, invoiceSchema } from "@/validation";
import { type APIGatewayProxyEvent, type Context } from "aws-lambda";
import { Client as PgClient } from "pg";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { handler as getInvoiceByIdHandler } from "../../functions/getInvoiceById";
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

describe("Test getinvoiceById", () => {
  let dbClient: PgClient;

  const event = {
    httpMethod: "GET",
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

  it("should return a invoice by id", async () => {
    const userId = generateUserId();
    const expectedInvoice = generateInvoices(1, userId)[0];
    expectedInvoice.invoiceDate = new Date();

    const { items, ...invoice } = expectedInvoice;

    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [invoice],
    });
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: items,
    });

    const getInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId: invoice.invoiceId,
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: invoice.userId,
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context);
    expect(result.statusCode).toBe(200);

    const returnedInvoice = JSON.parse(result.body) as Invoice;
    const expected = JSON.parse(
      JSON.stringify(invoiceSchema.parse(expectedInvoice))
    );

    expect(returnedInvoice).toEqual(expected);
  });

  it("should set the correct status for the invoice", async () => {
    const userId = generateUserId();
    const expectedInvoice = addStatusToInvoice(
      generateInvoices(1, userId)[0] as unknown as Invoice
    );

    const { items, status: expectedStatus, ...invoice } = expectedInvoice;

    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [invoice],
    });
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: items,
    });

    const getInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId: invoice.invoiceId,
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: invoice.userId,
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context);

    const returnedInvoice = JSON.parse(result.body) as Invoice;
    expect(returnedInvoice.status).toBe(expectedStatus);
  });

  it("should return 400 if invoiceId is missing", async () => {
    const getInvoiceEvent = {
      ...event,
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context);

    expect(result.statusCode).toBe(400);
  });

  it("should return 404 if invoice is not found", async () => {
    const invoice = generateInvoices(1, "123")[0];

    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    });

    const getInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId: "nonExistentinvoiceId",
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: invoice.userId,
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context);
    expect(result.statusCode).toBe(404);
  });
});
