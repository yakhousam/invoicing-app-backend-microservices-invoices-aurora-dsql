import { getDatabaseClient } from "@/db/client";
import { addStatusToInvoice, getUserId } from "@/utils";
import { createInvoiceSchema, Item, type Invoice } from "@/validation";
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";

const postClientController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const databaseClient = await getDatabaseClient();
  try {
    const userId = getUserId(event);

    const { items: newItems, ...newInvoiceData } = createInvoiceSchema.parse(
      event.body
    );

    const subTotal = newItems.reduce((acc, item) => {
      return parseFloat((acc + item.itemPrice * item.itemQuantity).toFixed(2));
    }, 0);

    const taxAmount =
      newInvoiceData.taxPercentage > 0
        ? parseFloat(
            (subTotal * (newInvoiceData.taxPercentage / 100)).toFixed(2)
          )
        : 0;
    const totalAmount = parseFloat((subTotal + taxAmount).toFixed(2));

    const newInvoice: Omit<Invoice, "status" | "invoiceId" | "items"> = {
      // status should be returned by the API but not saved in the database
      ...newInvoiceData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taxAmount,
      subTotal,
      totalAmount,
    };

    databaseClient.query("BEGIN");

    const createdInvoiceResult = await databaseClient.query(
      `INSERT INTO invoicing_app.invoices ("invoiceDate", "invoiceDueDays", "userId", "clientId", "paid", "currency", "taxPercentage", "subTotal",
       "taxAmount", "totalAmount", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        newInvoice.invoiceDate,
        newInvoice.invoiceDueDays,
        newInvoice.userId,
        newInvoice.clientId,
        newInvoice.paid,
        newInvoice.currency,
        newInvoice.taxPercentage,
        newInvoice.subTotal,
        newInvoice.taxAmount,
        newInvoice.totalAmount,
        newInvoice.createdAt,
        newInvoice.updatedAt,
      ]
    );

    const createdInvoice = createdInvoiceResult.rows[0] as Invoice;

    const items: Omit<Item, "itemId">[] = newItems.map((item) => ({
      ...item,
      invoiceId: createdInvoice.invoiceId,
    }));

    const itemsInsertPromises = items.map((item) =>
      databaseClient.query(
        `INSERT INTO invoicing_app.items ( "invoiceId", "itemName", "itemPrice", "itemQuantity") VALUES ($1, $2, $3, $4) RETURNING *`,
        [item.invoiceId, item.itemName, item.itemPrice, item.itemQuantity]
      )
    );

    const returnedItemsResult = await Promise.all(itemsInsertPromises);

    databaseClient.query("COMMIT");

    const itemsResult = returnedItemsResult.map(
      (result) => result.rows[0] as Item
    );

    const returnInvoice = {
      ...addStatusToInvoice(createdInvoice),
      items: itemsResult,
    };

    return {
      statusCode: 201,
      body: JSON.stringify(returnInvoice),
    };
  } catch (error) {
    databaseClient.query("ROLLBACK");
    throw error;
  }
};

export default postClientController;
