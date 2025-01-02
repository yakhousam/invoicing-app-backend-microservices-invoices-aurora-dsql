import { updateInvoiceSchema } from '@/validation'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { type ZodIssue } from 'zod'
import { handler as updateInvoiceHandler } from '../../functions/updateInvoice'
import {
  generateCreateInvoice,
  generateInvoices,
  generateName,
  generateUserId
} from './generate'

describe('Test updateInvoice', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient)
  const event = {
    httpMethod: 'PATCH',
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

  it('should update an invoice', async () => {
    const userId = generateUserId()
    const userName = generateName()

    const invoice = generateInvoices(1, userId, userName)[0]

    const updates = updateInvoiceSchema.parse(invoice)

    ddbMock
      .on(UpdateCommand, {
        Key: {
          userId: userId,
          invoiceId: invoice.invoiceId
        }
      })
      .resolves({
        Attributes: invoice
      })

    const updateClientEvent = {
      ...event,
      body: JSON.stringify(updates),
      pathParameters: {
        invoiceId: invoice.invoiceId
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId,
              name: userName
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await updateInvoiceHandler(updateClientEvent, context)

    expect(result.statusCode).toBe(200)
    expect(result.body).toBe(JSON.stringify(invoice))
  })

  it('should return 404 if invoice not found', async () => {
    const userId = generateUserId()
    const userName = generateName()

    const invoice = generateInvoices(1, userId, userName)[0]

    const updates = updateInvoiceSchema.parse(invoice)

    ddbMock
      .on(UpdateCommand, {
        Key: {
          userId: userId,
          invoiceId: invoice.invoiceId
        }
      })
      .rejects(
        new ConditionalCheckFailedException({
          message: 'Invoice not found',
          $metadata: {}
        })
      )

    const updateClientEvent = {
      ...event,
      body: JSON.stringify(updates),
      pathParameters: {
        invoiceId: invoice.invoiceId
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId,
              name: userName
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await updateInvoiceHandler(updateClientEvent, context)

    expect(result.statusCode).toBe(404)
    expect(result.body).toBe('Invoice not found')
  })

  describe('Validation', () => {
    it.only('should throw an error when update object is empty', async () => {
      const userId = generateUserId()
      const userName = generateName()

      const updateEvent = {
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
        body: JSON.stringify({})
      } as unknown as APIGatewayProxyEvent

      const result = await updateInvoiceHandler(updateEvent, context)
      expect(result.statusCode).toBe(400)

      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('updates')
    })
    it('should throw an error when items is empty', async () => {
      const createInvoiceData = generateCreateInvoice()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { items, ...body } = createInvoiceData

      const userId = generateUserId()
      const userName = generateName()

      const updateEvent = {
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
        body: JSON.stringify({ ...body, items: [] })
      } as unknown as APIGatewayProxyEvent

      const result = await updateInvoiceHandler(updateEvent, context)
      expect(result.statusCode).toBe(400)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('items')
    })

    it('should throw an error when itemPrice is not a number', async () => {
      const createInvoiceData = generateCreateInvoice()
      createInvoiceData.items[0].itemPrice = 'not a number' as unknown as number

      const userId = generateUserId()
      const userName = generateName()

      const updateEvent = {
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

      const result = await updateInvoiceHandler(updateEvent, context)
      expect(result.statusCode).toBe(400)

      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('itemPrice')
    })

    it('should throw an error when invoiceDate is invalid', async () => {
      const createInvoiceData = generateCreateInvoice()
      createInvoiceData.invoiceDate = 'invalid date'

      const userId = generateUserId()
      const userName = generateName()

      const updateEvent = {
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

      const result = await updateInvoiceHandler(updateEvent, context)
      expect(result.statusCode).toBe(400)

      const returnedBody = JSON.parse(result.body) as ZodIssue[]
      expect(returnedBody[0].path).toContain('invoiceDate')
    })
  })
})
