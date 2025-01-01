import { ddbDocClient, tableName } from '@/db/client'
import { invoiceSchema } from '@/validation'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult
} from 'aws-lambda'
import createError from 'http-errors'

const getInvoiceByIdController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = invoiceSchema.shape.userId.parse(
    event.requestContext.authorizer?.jwt?.claims?.sub
  )

  const invoiceId = event.pathParameters?.invoiceId

  if (!invoiceId) {
    throw new createError.BadRequest('invoiceId is required')
  }

  const command = new GetCommand({
    TableName: tableName,
    Key: {
      invoiceId: invoiceId,
      userId
    }
  })

  const data = await ddbDocClient.send(command)
  const item = data.Item

  if (!item) {
    throw new createError.NotFound(
      `Invoice with invoiceId "${invoiceId}" not found`
    )
  }

  return {
    statusCode: 200,
    body: JSON.stringify(item)
  }
}

export default getInvoiceByIdController
