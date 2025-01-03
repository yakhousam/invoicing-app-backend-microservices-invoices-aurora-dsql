import { ddbDocClient, tableName } from '@/db/client'
import { invoiceSchema } from '@/validation'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult
} from 'aws-lambda'
import createError from 'http-errors'

const deleteInvoiceController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = invoiceSchema.shape.userId.parse(
    event.requestContext.authorizer?.jwt?.claims?.sub
  )
  const invoiceId = event.pathParameters?.invoiceId

  if (!invoiceId) {
    throw new createError.BadRequest('invoiceId is required')
  }

  const command = new DeleteCommand({
    TableName: tableName,
    Key: {
      invoiceId: invoiceId,
      userId
    },
    ConditionExpression:
      'attribute_exists(invoiceId) AND attribute_exists(userId)'
  })

  await ddbDocClient.send(command)

  return {
    statusCode: 204,
    body: JSON.stringify({})
  }
}

export default deleteInvoiceController
