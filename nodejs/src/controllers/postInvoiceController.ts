import { getDatabaseClient } from "@/db/databaseClient";
import { addStatusToInvoice, getAuthToken, getUserId } from "@/utils";
import {
  createInvoiceSchema,
  invoiceSchema,
  Item,
  type Invoice,
} from "@/validation";
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";
import createError from "http-errors";
import getUser from "./getUser";

const postClientController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const databaseClient = await getDatabaseClient();
  try {
    const userId = getUserId(event);
    const authToken = getAuthToken(event);
    const user = await getUser(authToken);

    const { items: newItems, ...newInvoiceData } = createInvoiceSchema.parse(
      event.body
    );

    // check if client exists
    const clientResult = await databaseClient.query(
      `SELECT "clientId" FROM invoicing_app.clients WHERE "clientId" = $1`,
      [newInvoiceData.clientId]
    );

    if (clientResult.rowCount === 0) {
      throw createError.NotFound(
        `Client with clientId "${newInvoiceData.clientId}" not found`
      );
    }

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

    const newInvoice = {
      // status should be returned by the API but not saved in the database
      ...newInvoiceData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      taxAmount,
      subTotal,
      totalAmount,
      userCompanyName: user.userCompanyName,
    };

    databaseClient.query("BEGIN");

    const createdInvoiceResult = await databaseClient.query(
      `INSERT INTO invoicing_app.invoices ("invoiceDate", "invoiceDueDays", "userId", "clientId", "paid", "currency", "taxPercentage", "subTotal",
       "taxAmount", "totalAmount", "createdAt", "updatedAt", "userCompanyName") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
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
        newInvoice.userCompanyName,
      ]
    );

    const createdInvoice = createdInvoiceResult.rows[0] as Invoice;

    const itemsInsertPromises = newItems.map((item) =>
      databaseClient.query(
        `INSERT INTO invoicing_app.items ( "invoiceId", "itemName", "itemPrice", "itemQuantity") VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          createdInvoice.invoiceId,
          item.itemName,
          item.itemPrice,
          item.itemQuantity,
        ]
      )
    );

    const returnedItemsResult = await Promise.all(itemsInsertPromises);

    databaseClient.query("COMMIT");

    const itemsResult = returnedItemsResult.map(
      (result) => result.rows[0] as Item
    );

    const getNewInvoice = await databaseClient.query(
      `SELECT 
        i.*,
        c."clientName"
      FROM invoicing_app.invoices i
      JOIN invoicing_app.clients c ON i."clientId" = c."clientId"
      WHERE i."invoiceId" = $1 AND i."userId" = $2
  `,
      [createdInvoice.invoiceId, userId]
    );

    const returnInvoice = invoiceSchema.parse({
      ...addStatusToInvoice(getNewInvoice.rows[0]),
      items: itemsResult,
    });

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
