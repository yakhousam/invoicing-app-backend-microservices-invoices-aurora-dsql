import { ddbDocClient, tableName } from '@/db/client'
import {
  createExpressionAttributeValues,
  createUpdateExpression
} from '@/utils'
import { updateInvoiceSchema, invoiceSchema } from '@/validation'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult
} from 'aws-lambda'
import createError from 'http-errors'
import { ZodError } from 'zod'

const updateInvoiceController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = invoiceSchema.shape.userId.parse(
      event.requestContext.authorizer?.jwt?.claims?.sub
    )

    const invoiceId = event.pathParameters?.invoiceId

    const updates = {
      ...updateInvoiceSchema.parse(event.body),
      updatedAt: new Date().toISOString()
    }

    const updateExpression = createUpdateExpression(updates)
    const expressionAttributeValues = createExpressionAttributeValues(updates)

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        invoiceId,
        userId
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression:
        'attribute_exists(invoiceId) AND attribute_exists(userId)',
      ReturnValues: 'ALL_NEW'
    })

    const result = await ddbDocClient.send(command)

    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes)
    }
  } catch (error) {
    if (error instanceof ZodError) {
      throw createError.BadRequest(error.message)
    }
    if (error instanceof ConditionalCheckFailedException) {
      throw createError.NotFound('Invoice not found')
    }

    console.error('Error instance:', error)
    throw error
  }
}

export default updateInvoiceController
