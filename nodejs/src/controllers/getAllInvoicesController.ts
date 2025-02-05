import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice, getUserId } from "@/utils";
import {
  getAllInvoicesResponse,
  Invoice,
  getAllInvoicesQuery,
} from "@/validation";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";

const getAllInvoicesController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  if (!userId) {
    throw new createError.Unauthorized("Unauthorized");
  }

  const { limit, offset } = getAllInvoicesQuery.parse(
    event.queryStringParameters
  );

  const databaseClient = await getDatabaseClient();

  const countResult = await databaseClient.query(
    'SELECT COUNT(*) FROM invoicing_app.invoices WHERE "userId" = $1',
    [userId]
  );

  const totalCount = parseInt(countResult.rows[0].count, 10);

  const invoicesData = await databaseClient.query(
    `SELECT I."invoiceId", I."invoiceDate", I."totalAmount", I."paid", I."invoiceDueDays", C."clientName" 
     FROM invoicing_app.invoices As I, invoicing_app.clients AS C 
     WHERE I."userId" = $1 AND I."clientId" = C."clientId" 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const invoices = invoicesData.rows.map((invoice) =>
    addStatusToInvoice(invoice as Invoice)
  );

  const parsedInvoices = getAllInvoicesResponse.parse(invoices);

  const response = {
    invoices: parsedInvoices,
    count: totalCount,
    limit,
    offset,
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

export default getAllInvoicesController;
