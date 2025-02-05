import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice } from "@/utils";
import { Invoice, updateInvoiceSchema } from "@/validation";
import { type APIGatewayProxyEvent, type Context } from "aws-lambda";
import { Client as PgClient } from "pg";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { type ZodIssue } from "zod";
import { handler as updateInvoiceHandler } from "../../functions/updateInvoice";
import {
  generateCreateInvoice,
  generateInvoices,
  generateName,
  generateUpdateInvoice,
  generateUserId,
} from "./generate";

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

describe("Test updateInvoice", () => {
  let dbClient: PgClient;

  const event = {
    httpMethod: "PATCH",
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

  it("should update an invoice", async () => {
    const userId = generateUserId();

    const expectedInvoice = addStatusToInvoice(
      generateInvoices(1, userId)[0] as unknown as Invoice
    );

    const updates = updateInvoiceSchema.parse({
      ...expectedInvoice,
      invoiceDate: new Date(expectedInvoice.invoiceDate).toISOString(),
      taxPercentage: Number(expectedInvoice.taxPercentage),
    });

    const { items, ...invoice } = expectedInvoice;

    // begin transaction
    (dbClient.query as Mock).mockResolvedValueOnce({});
    // update invoice
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [invoice],
    });

    // delete items
    (dbClient.query as Mock).mockResolvedValueOnce({});

    // insert items
    for (const item of items) {
      (dbClient.query as Mock).mockResolvedValueOnce({
        rows: [item],
      });
    }

    // get items
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: items,
    });

    // commit transaction
    (dbClient.query as Mock).mockResolvedValueOnce({});

    const updateClientEvent = {
      ...event,
      body: JSON.stringify(updates),
      pathParameters: {
        invoiceId: invoice.invoiceId,
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

    const result = await updateInvoiceHandler(updateClientEvent, context);

    expect(result.statusCode).toBe(200);

    const returnedInvoice = JSON.parse(result.body) as Invoice;

    expect(returnedInvoice).toEqual(
      JSON.parse(JSON.stringify(expectedInvoice))
    );
  });

  it("should return 404 if invoice not found", async () => {
    const userId = generateUserId();

    const updates = generateUpdateInvoice();

    // begin transaction
    (dbClient.query as Mock).mockResolvedValueOnce({});
    // update invoice
    (dbClient.query as Mock).mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    });

    const updateClientEvent = {
      ...event,
      body: JSON.stringify(updates),
      pathParameters: {
        invoiceId: "not found",
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

    const result = await updateInvoiceHandler(updateClientEvent, context);

    expect(result.statusCode).toBe(404);
  });

  describe.skip("Validation", () => {
    it("should throw an error when update object is empty", async () => {
      const userId = generateUserId();
      const userName = generateName();

      const updateEvent = {
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
        body: JSON.stringify({}),
      } as unknown as APIGatewayProxyEvent;

      const result = await updateInvoiceHandler(updateEvent, context);
      expect(result.statusCode).toBe(400);

      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("updates");
    });
    it("should throw an error when items is empty", async () => {
      const createInvoiceData = generateCreateInvoice();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { items, ...body } = createInvoiceData;

      const userId = generateUserId();
      const userName = generateName();

      const updateEvent = {
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
        body: JSON.stringify({ ...body, items: [] }),
      } as unknown as APIGatewayProxyEvent;

      const result = await updateInvoiceHandler(updateEvent, context);
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

      const updateEvent = {
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

      const result = await updateInvoiceHandler(updateEvent, context);
      expect(result.statusCode).toBe(400);

      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("itemPrice");
    });

    it("should throw an error when invoiceDate is invalid", async () => {
      const createInvoiceData = generateCreateInvoice();
      createInvoiceData.invoiceDate = "invalid date" as unknown as Date;

      const userId = generateUserId();
      const userName = generateName();

      const updateEvent = {
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

      const result = await updateInvoiceHandler(updateEvent, context);
      expect(result.statusCode).toBe(400);

      const returnedBody = JSON.parse(result.body) as ZodIssue[];
      expect(returnedBody[0].path).toContain("invoiceDate");
    });
  });
});
