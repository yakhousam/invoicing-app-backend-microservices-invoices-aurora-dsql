import { ddbDocClient, tableName } from '@/db/client'
import { addStatusToInvoice } from '@/utils'
import { Invoice, invoiceSchema } from '@/validation'
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
  const invoices: Invoice[] = []

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
    const items = data.Items as Omit<Invoice, 'status'>[]
    if (items) {
      const filteredItems: Invoice[] = items
        .filter((item) => !item.invoiceId.startsWith('counter'))
        .map(addStatusToInvoice)

      invoices.push(...filteredItems)
    }
    lastEvaluatedKey = data.LastEvaluatedKey
  } while (lastEvaluatedKey)

  if (invoices.length === 0) {
    throw new createError.NotFound('No invoice found')
  }

  const parsedInvoices = invoiceSchema.array().parse(invoices)

  const response = {
    invoices: parsedInvoices,
    count: invoices.length
  }
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
}

export default getAllInvoicesController
