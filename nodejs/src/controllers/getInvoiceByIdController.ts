import { getDatabaseClient } from "@/db/client";
import { addStatusToInvoice, getUserId } from "@/utils";
import { type Invoice } from "@/validation";
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
    'SELECT * FROM invoicing_app.invoices WHERE "invoiceId" = $1 AND "userId" = $2',
    [invoiceId, userId]
  );

  const invoice = result.rows?.[0];

  if (!invoice) {
    throw new createError.NotFound(
      `Invoice with invoiceId "${invoiceId}" not found`
    );
  }
  const itemWithStatus = addStatusToInvoice(invoice as Invoice);

  // const parsedItem = invoiceSchema.parse(itemWithStatus);

  return {
    statusCode: 200,
    body: JSON.stringify(itemWithStatus),
  };
};

export default getInvoiceByIdController;
