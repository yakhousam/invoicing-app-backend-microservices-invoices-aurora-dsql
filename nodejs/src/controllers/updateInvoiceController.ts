import { ddbDocClient, tableName } from "@/db/client";
import {
  addStatusToInvoice,
  createExpressionAttributeValues,
  createUpdateExpression,
} from "@/utils";
import { updateInvoiceSchema, invoiceSchema, Invoice } from "@/validation";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";

const updateInvoiceController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = invoiceSchema.shape.userId.parse(
    event.requestContext.authorizer?.jwt?.claims?.sub
  );

  const invoiceId = event.pathParameters?.invoiceId;

  const updates = {
    ...updateInvoiceSchema.parse(event.body),
    updatedAt: new Date().toISOString(),
  };

  const updateExpression = createUpdateExpression(updates);
  const expressionAttributeValues = createExpressionAttributeValues(updates);

  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      invoiceId,
      userId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression:
      "attribute_exists(invoiceId) AND attribute_exists(userId)",
    ReturnValues: "ALL_NEW",
  });

  const result = await ddbDocClient.send(command);

  const returnInvoice = addStatusToInvoice(result.Attributes as Invoice);

  return {
    statusCode: 200,
    body: JSON.stringify(returnInvoice),
  };
};

export default updateInvoiceController;
