import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { type Context, type APIGatewayProxyEvent } from 'aws-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { handler as getInvoiceByIdHandler } from '../../functions/getInvoiceById'
import { generateInvoices } from './generate'

describe('Test getinvoiceById', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient)

  const event = {
    httpMethod: 'GET',
    headers: {
      'cache-control': 'no-cache'
    },
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: 'userId'
          }
        }
      }
    }
  } as unknown as APIGatewayProxyEvent

  const context = {
    getRemainingTimeInMillis: false
  } as unknown as Context

  beforeEach(() => {
    ddbMock.reset()
  })

  it('should return a invoice by id', async () => {
    const invoice = generateInvoices(1, '123', 'Test user')[0]
    ddbMock
      .on(GetCommand)
      .resolves({
        Item: undefined
      })
      .on(GetCommand, {
        Key: {
          invoiceId: invoice.invoiceId,
          userId: invoice.userId
        }
      })
      .resolves({
        Item: invoice
      })
    const getInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId: invoice.invoiceId
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: invoice.userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context)

    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual(JSON.stringify(invoice))
  })

  it('should return 401 if user is not authorized', async () => {
    const invoice = generateInvoices(1, '123', 'Test user')[0]
    ddbMock
      .on(GetCommand)
      .resolves({
        Item: undefined
      })
      .on(GetCommand, {
        Key: {
          invoiceId: invoice.invoiceId,
          userId: invoice.userId
        }
      })
      .resolves({
        Item: invoice
      })

    const getInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId: invoice.invoiceId
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: undefined
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context)

    expect(result.statusCode).toBe(401)
  })

  it('should return 400 if invoiceId is missing', async () => {
    const getInvoiceEvent = {
      ...event,
      pathParameters: {}
    } as unknown as APIGatewayProxyEvent

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context)

    expect(result.statusCode).toBe(400)
  })

  it('should return 404 if invoice is not found', async () => {
    const invoice = generateInvoices(1, '123', 'Test user')[0]

    ddbMock
      .on(GetCommand)
      .resolves({
        Item: undefined
      })
      .on(GetCommand, {
        Key: { invoiceId: invoice.invoiceId, userId: invoice.userId }
      })
      .resolves({
        Item: undefined
      })
    const getInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId: 'nonExistentinvoiceId'
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: invoice.userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getInvoiceByIdHandler(getInvoiceEvent, context)
    expect(result.statusCode).toBe(404)
  })

  it('should return 500 on DynamoDB error', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'))

    const result = await getInvoiceByIdHandler(
      {
        ...event,
        pathParameters: {
          invoiceId: 'invoiceId'
        }
      },
      context
    )

    expect(result.statusCode).toBe(500)
  })
})
