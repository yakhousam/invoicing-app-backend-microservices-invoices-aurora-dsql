import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice } from "@/utils";
import { createInvoiceSchema, Invoice } from "@/validation";
import { type APIGatewayProxyEvent, type Context } from "aws-lambda";
import { Client as PgClient } from "pg";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { type ZodIssue } from "zod";
import { handler as postClientHandler } from "../../functions/postInvoice";
import {
  generateCreateInvoice,
  generateInvoices,
  generateName,
  generateUserId,
} from "./generate";

vi.mock("@/controllers/getUser", () => {
  return {
    default: vi.fn().mockResolvedValue({
      companyName: "Test Company",
    }),
  };
});

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

describe("Test postInvoice", () => {
  let dbClient: PgClient;

  const event = {
    httpMethod: "POST",
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/json",
    },
  } as unknown as APIGatewayProxyEvent;

  const context = {
    getRemainingTimeInMillis: false,
  } as unknown as Context;

  beforeEach(async () => {
    dbClient = await getDatabaseClient();
  });

  it("should create an invoice", async () => {
    const userId = generateUserId();
    const expectedInvoice = addStatusToInvoice(
      generateInvoices(1, userId)[0] as unknown as Invoice
    );

    const createInvoiceData = createInvoiceSchema.parse({
      ...expectedInvoice,
      invoiceDate: expectedInvoice.invoiceDate.toISOString(),
      taxPercentage: Number(expectedInvoice.taxPercentage),
    });

    const { items, ...invoice } = expectedInvoice;

    // query client if exist
    (dbClient.query as Mock).mockResolvedValueOnce({
      rowCount: 1,
    });
    // begin transaction
    (dbClient.query as Mock).mockResolvedValueOnce({});
    // query invoices
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [invoice],
    });

    // query items
    for (const item of items) {
      (dbClient.query as Mock).mockResolvedValueOnce({
        rows: [item],
      });
    }
    // end transaction
    (dbClient.query as Mock).mockResolvedValueOnce({});

    const putEvent = {
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
      body: JSON.stringify(createInvoiceData),
    } as unknown as APIGatewayProxyEvent;

    const result = await postClientHandler(putEvent, context);
    expect(result.statusCode).toBe(201);

    const returnedBody = JSON.parse(result.body) as Invoice;

    expect(returnedBody.clientId).toBe(createInvoiceData.clientId);
    expect(returnedBody.userId).toBe(userId);
    expect(returnedBody.currency).toBe(createInvoiceData.currency || "USD");
    expect(returnedBody.taxPercentage).toBe(
      createInvoiceData.taxPercentage || 0
    );
    expect(returnedBody.paid).toBe(false);
    expect(returnedBody.invoiceDueDays).toBe(
      createInvoiceData.invoiceDueDays || 7
    );
    expect(returnedBody.items.length).toBe(createInvoiceData.items.length);
    expect(returnedBody.createdAt).toBeDefined();
    expect(returnedBody.updatedAt).toBeDefined();
    expect(returnedBody.subTotal).toBeDefined();
    expect(returnedBody.taxAmount).toBeDefined();
    expect(returnedBody.totalAmount).toBeDefined();
  });

  describe("Validations", () => {
    it("should throw an error when clientId is not provided", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientId, ...createInvoiceData } = generateCreateInvoice();

      const userId = generateUserId();

      const putEvent = {
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
        body: JSON.stringify(createInvoiceData),
      } as unknown as APIGatewayProxyEvent;

      const result = await postClientHandler(putEvent, context);
      expect(result.statusCode).toBe(400);
      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("clientId");
    });

    it("should throw an error when items is not provided", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { items, ...createInvoiceData } = generateCreateInvoice();

      const userId = generateUserId();

      const putEvent = {
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
        body: JSON.stringify(createInvoiceData),
      } as unknown as APIGatewayProxyEvent;

      const result = await postClientHandler(putEvent, context);
      expect(result.statusCode).toBe(400);
      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("items");
    });

    it("should throw an error when items is empty", async () => {
      const createInvoiceData = generateCreateInvoice();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { items, ...body } = createInvoiceData;

      const userId = generateUserId();

      const putEvent = {
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
        body: JSON.stringify({ ...body, items: [] }),
      } as unknown as APIGatewayProxyEvent;

      const result = await postClientHandler(putEvent, context);
      expect(result.statusCode).toBe(400);
      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("items");
    });

    it("should throw an error when itemPrice is not a number", async () => {
      const createInvoiceData = generateCreateInvoice();
      createInvoiceData.items[0].itemPrice =
        "not a number" as unknown as number;

      const userId = generateUserId();
      const userName = generateName();

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId,
                name: userName,
              },
            },
          },
        },
        body: JSON.stringify(createInvoiceData),
      } as unknown as APIGatewayProxyEvent;

      const result = await postClientHandler(putEvent, context);
      expect(result.statusCode).toBe(400);

      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("itemPrice");
    });

    it("should throw an error when invoiceDate is invalid", async () => {
      const createInvoiceData = generateCreateInvoice();
      createInvoiceData.invoiceDate = "invalid date" as unknown as Date;

      const userId = generateUserId();

      const putEvent = {
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
        body: JSON.stringify(createInvoiceData),
      } as unknown as APIGatewayProxyEvent;

      const result = await postClientHandler(putEvent, context);
      expect(result.statusCode).toBe(400);

      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("invoiceDate");
    });
  });
});
