import { ddbDocClient, tableName } from '@/db/client'
import { createInvoiceSchema, invoiceSchema, type Invoice } from '@/validation'
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult
} from 'aws-lambda'
import dayjs from 'dayjs'
import createError from 'http-errors'
import { z, ZodError } from 'zod'

const postClientController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = invoiceSchema.shape.userId.parse(
      event.requestContext.authorizer?.jwt?.claims?.sub
    )
    const userName = invoiceSchema.shape.userName.parse(
      event.requestContext.authorizer?.jwt?.claims?.name
    )
    const validateBody = createInvoiceSchema.parse(event.body)

    const currentYear = dayjs().year()

    // Increment the invoice number for the current year
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { userId, invoiceId: `counter-${currentYear}` },
      UpdateExpression:
        'SET invoiceNumber = if_not_exists(invoiceNumber, :start) + :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':start': 0
      },
      ReturnValues: 'UPDATED_NEW'
    })

    const counterResult = await ddbDocClient.send(updateCommand)
    const incrementalNumber = z
      .number()
      .parse(counterResult.Attributes?.invoiceNumber)

    // Format the invoice number as "currentYear-incNumber"
    const newInvoiceNumber = `${currentYear}-${incrementalNumber}`

    const subTotal = validateBody.items.reduce((acc, item) => {
      return parseFloat((acc + item.itemPrice * item.itemQuantity).toFixed(2))
    }, 0)

    const taxAmount =
      validateBody.taxPercentage > 0
        ? parseFloat((subTotal * (validateBody.taxPercentage / 100)).toFixed(2))
        : 0
    const totalAmount = parseFloat((subTotal + taxAmount).toFixed(2))

    const newInvoice: Omit<Invoice, 'status'> = {
      // status should be returned by the API but not saved in the database
      ...validateBody,
      invoiceId: newInvoiceNumber,
      userId,
      userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: validateBody.items.map((item) => ({
        ...item,
        itemId: crypto.randomUUID()
      })),
      taxAmount,
      subTotal,
      totalAmount
    }

    const command = new PutCommand({
      TableName: tableName,
      Item: newInvoice
    })

    await ddbDocClient.send(command)

    return {
      statusCode: 201,
      body: JSON.stringify(newInvoice)
    }
  } catch (error) {
    if (error instanceof ZodError) {
      throw createError.BadRequest(error.message)
    }
    throw error
  }
}

export default postClientController
