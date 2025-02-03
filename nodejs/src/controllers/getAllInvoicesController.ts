import { getDatabaseClient } from "@/db/client";
import { addStatusToInvoice, getUserId } from "@/utils";
import { Invoice, invoiceSchema, invoicesQuerySchema } from "@/validation";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";

const getAllInvoicesController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  if (!userId) {
    throw new createError.Unauthorized("Unauthorized");
  }

  const { limit, offset } = invoicesQuerySchema.parse(
    event.queryStringParameters
  );

  const databaseClient = await getDatabaseClient();

  const countResult = await databaseClient.query(
    'SELECT COUNT(*) FROM invoicing_app.invoices WHERE "userId" = $1',
    [userId]
  );

  const totalCount = parseInt(countResult.rows[0].count, 10);

  const invoicesData = await databaseClient.query(
    'SELECT * FROM invoicing_app.invoices WHERE "userId" = $1 LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );

  const invoices = invoicesData.rows.map((invoice) =>
    addStatusToInvoice(invoice as Invoice)
  );

  const parsedInvoices = invoiceSchema.array().parse(invoices);

  const response = {
    invoices: parsedInvoices,
    count: totalCount,
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

export default getAllInvoicesController;
