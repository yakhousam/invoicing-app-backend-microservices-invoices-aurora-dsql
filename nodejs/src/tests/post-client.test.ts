import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb'
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { type ZodIssue } from 'zod'
import { handler as postClientHandler } from '../../functions/postInvoice'
import { generateName, generateCreateInvoice, generateUserId } from './generate'
import { Invoice } from '@/validation'
import dayjs from 'dayjs'

describe('Test postInvoice', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient)

  const event = {
    httpMethod: 'POST',
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json'
    }
  } as unknown as APIGatewayProxyEvent

  const context = {
    getRemainingTimeInMillis: false
  } as unknown as Context

  beforeEach(() => {
    ddbMock.reset()
  })

  it('should create an invoice', async () => {
    const userId = generateUserId()
    const userName = generateName()

    const createInvoiceData = generateCreateInvoice()
    const expectedInvoiceId = `${dayjs().year()}-1`

    ddbMock
      .on(UpdateCommand)
      .resolves({ Attributes: { invoiceNumber: 1 } })
      .on(PutCommand)
      .resolves({})

    const putEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId,
              name: userName
            }
          }
        }
      },
      body: JSON.stringify(createInvoiceData)
    } as unknown as APIGatewayProxyEvent

    const result = await postClientHandler(putEvent, context)
    expect(result.statusCode).toBe(201)

    const returnedBody = JSON.parse(result.body) as Invoice

    expect(returnedBody.invoiceId).toBe(expectedInvoiceId)
    expect(returnedBody.clientId).toBe(createInvoiceData.clientId)
    expect(returnedBody.clientName).toBe(createInvoiceData.clientName)
    expect(returnedBody.userId).toBe(userId)
    expect(returnedBody.userName).toBe(userName)
    expect(returnedBody.currency).toBe(createInvoiceData.currency || 'USD')
    expect(returnedBody.taxPercentage).toBe(
      createInvoiceData.taxPercentage || 0
    )
    expect(returnedBody.paid).toBe(false)
    expect(returnedBody.invoiceDueDays).toBe(
      createInvoiceData.invoiceDueDays || 7
    )
    expect(returnedBody.items.length).toBe(createInvoiceData.items.length)
    expect(returnedBody.createdAt).toBeDefined()
    expect(returnedBody.updatedAt).toBeDefined()

    const expectedInvoiceDate = createInvoiceData.invoiceDate
      ? dayjs(createInvoiceData.invoiceDate).startOf('day').toISOString()
      : dayjs().startOf('day').toISOString()

    expect(dayjs(returnedBody.invoiceDate).startOf('day').toISOString()).toBe(
      expectedInvoiceDate
    )

    expect(
      returnedBody.items[Math.floor(Math.random() * returnedBody.items.length)]
        .itemId
    ).toBeDefined()

    const expectedSubTotal = returnedBody.items.reduce(
      (acc, item) =>
        parseFloat((acc + item.itemPrice * item.itemQuantity).toFixed(2)),
      0
    )
    expect(returnedBody.subTotal).toBe(expectedSubTotal)
    expect(returnedBody.taxAmount).toBe(
      parseFloat(
        (
          (expectedSubTotal * (createInvoiceData.taxPercentage || 0)) /
          100
        ).toFixed(2)
      )
    )
    expect(returnedBody.totalAmount).toBe(
      parseFloat((expectedSubTotal + returnedBody.taxAmount).toFixed(2))
    )
  })

  describe('Validations', () => {
    it('should throw an error when clientId is not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientId, ...createInvoiceData } = generateCreateInvoice()

      const userId = generateUserId()
      const userName = generateName()

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId,
                name: userName
              }
            }
          }
        },
        body: JSON.stringify(createInvoiceData)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      expect(result.statusCode).toBe(400)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('clientId')
    })

    it('should throw an error when clientName is not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientName, ...createInvoiceData } = generateCreateInvoice()

      const userId = generateUserId()
      const userName = generateName()

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId,
                name: userName
              }
            }
          }
        },
        body: JSON.stringify(createInvoiceData)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      expect(result.statusCode).toBe(400)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('clientName')
    })

    it('should throw an error when items is not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { items, ...createInvoiceData } = generateCreateInvoice()

      const userId = generateUserId()
      const userName = generateName()

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId,
                name: userName
              }
            }
          }
        },
        body: JSON.stringify(createInvoiceData)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      expect(result.statusCode).toBe(400)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('items')
    })
  })
})
