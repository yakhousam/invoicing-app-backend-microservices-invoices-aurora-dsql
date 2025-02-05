import { getDatabaseClient } from "@/db/databaseClient";
import { getUserId } from "@/utils";
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";
import createError from "http-errors";

const deleteInvoiceController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const databaseClient = await getDatabaseClient();
  try {
    const userId = getUserId(event);
    const invoiceId = event.pathParameters?.invoiceId;

    if (!invoiceId) {
      throw new createError.BadRequest("invoiceId is required");
    }

    await databaseClient.query("BEGIN");

    await databaseClient.query(
      `DELETE FROM invoicing_app.items WHERE "invoiceId" = $1`,
      [invoiceId]
    );
    await databaseClient.query(
      `DELETE FROM invoicing_app.invoices WHERE "invoiceId" = $1 AND "userId" = $2`,
      [invoiceId, userId]
    );

    await databaseClient.query("COMMIT");

    return {
      statusCode: 204,
      body: JSON.stringify({}),
    };
  } catch (error) {
    databaseClient.query("ROLLBACK");
    throw error;
  }
};

export default deleteInvoiceController;
