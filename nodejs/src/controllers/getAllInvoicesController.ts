import { ddbDocClient, tableName } from '@/db/client'
import { invoiceSchema } from '@/validation'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import createError from 'http-errors'

const getAllInvoicesController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = invoiceSchema.shape.userId.parse(
    event.requestContext.authorizer?.jwt?.claims?.sub
  )

  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined
  const invoices: Record<string, unknown>[] = []

  do {
    const command: QueryCommand = new QueryCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
    const data = await ddbDocClient.send(command)
    if (data.Items) {
      const filteredItems = data.Items.filter(
        (item) => !item.invoiceId.startsWith('counter')
      )
      invoices.push(...filteredItems)
    }
    lastEvaluatedKey = data.LastEvaluatedKey
  } while (lastEvaluatedKey)

  if (invoices.length === 0) {
    throw new createError.NotFound('No invoice found')
  }

  const response = {
    invoices: invoices,
    count: invoices.length
  }
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
}

export default getAllInvoicesController
