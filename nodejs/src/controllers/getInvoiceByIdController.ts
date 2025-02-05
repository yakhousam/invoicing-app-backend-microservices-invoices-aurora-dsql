import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice, getUserId } from "@/utils";
import { invoiceSchema, type Invoice } from "@/validation";
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";
import createError from "http-errors";

const getInvoiceByIdController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  const invoiceId = event.pathParameters?.invoiceId;

  if (!invoiceId) {
    throw new createError.BadRequest("invoiceId is required");
  }

  const dbClient = await getDatabaseClient();

  const result = await dbClient.query(
    ` SELECT 
        i.*,
        c."clientName"
      FROM invoicing_app.invoices i
      JOIN invoicing_app.clients c ON i."clientId" = c."clientId"
      WHERE i."invoiceId" = $1 AND i."userId" = $2
`,
    [invoiceId, userId]
  );

  const invoice = result.rows?.[0];

  if (!invoice) {
    throw new createError.NotFound(
      `Invoice with invoiceId "${invoiceId}" not found`
    );
  }

  const itemsResult = await dbClient.query(
    `SELECT * FROM invoicing_app.items WHERE "invoiceId" = $1`,
    [invoiceId]
  );

  const items = itemsResult.rows;

  const invoiceWithStatus = addStatusToInvoice({
    ...invoice,
    items,
  } as Invoice);

  const parsedInvoice = invoiceSchema.parse(invoiceWithStatus);

  return {
    statusCode: 200,
    body: JSON.stringify(parsedInvoice),
  };
};

export default getInvoiceByIdController;
