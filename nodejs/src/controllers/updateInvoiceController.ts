import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice, createUpdateExpression, getUserId } from "@/utils";
import { invoiceSchema, Item, updateInvoiceSchema } from "@/validation";
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";
import createError from "http-errors";

const updateInvoiceController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const databaseClient = await getDatabaseClient();
  try {
    const userId = getUserId(event);

    const invoiceId = event.pathParameters?.invoiceId;

    const updates = {
      ...updateInvoiceSchema.parse(event.body),
      updatedAt: new Date().toISOString(),
    };

    const { items, ...invoice } = updates;

    const subTotal = items?.reduce((acc, item) => {
      return parseFloat((acc + item.itemPrice * item.itemQuantity).toFixed(2));
    }, 0);

    const taxAmount =
      subTotal && invoice.taxPercentage && invoice.taxPercentage > 0
        ? parseFloat((subTotal * (invoice.taxPercentage / 100)).toFixed(2))
        : undefined;

    const totalAmount =
      subTotal && taxAmount
        ? parseFloat((subTotal + taxAmount).toFixed(2))
        : undefined;

    const updateExpression = createUpdateExpression({
      ...invoice,
      taxAmount,
      subTotal,
      totalAmount,
    });

    await databaseClient.query("BEGIN");

    const updateInvoiceResult = await databaseClient.query(
      `UPDATE invoicing_app.invoices SET ${updateExpression} WHERE "invoiceId" = $1 AND "userId" = $2 RETURNING *`,
      [invoiceId, userId]
    );

    if (updateInvoiceResult.rowCount === 0) {
      throw createError.NotFound(
        `Invoice with invoiceId "${invoiceId}" not found`
      );
    }

    if (items?.length) {
      await databaseClient.query(
        'DELETE FROM invoicing_app.items WHERE "invoiceId" = $1',
        [invoiceId]
      );
      const itemsInsertPromises = items.map((item) =>
        databaseClient.query(
          `INSERT INTO invoicing_app.items ( "invoiceId", "itemName", "itemPrice", "itemQuantity") VALUES ($1, $2, $3, $4) RETURNING *`,
          [invoiceId, item.itemName, item.itemPrice, item.itemQuantity]
        )
      );
      await Promise.all(itemsInsertPromises);
    }

    const itemsResult = await databaseClient.query(
      `SELECT * FROM invoicing_app.items WHERE "invoiceId" = $1`,
      [invoiceId]
    );
    await databaseClient.query("COMMIT");

    const returnInvoice = invoiceSchema.parse({
      ...addStatusToInvoice(updateInvoiceResult.rows?.[0]),
      items: itemsResult.rows as Item[],
    });

    return {
      statusCode: 200,
      body: JSON.stringify(returnInvoice),
    };
  } catch (error) {
    await databaseClient.query("ROLLBACK");
    throw error;
  }
};

export default updateInvoiceController;
