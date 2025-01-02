import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { handler as getAllInvoicesHandler } from '../../functions/getAllInvoices'
import { generateUserId, generateInvoices } from './generate'
import { Invoice } from '@/validation'

describe('Test getAllInvoices', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient)

  const event = {
    httpMethod: 'GET',
    headers: {
      'cache-control': 'no-cache'
    }
  } as unknown as APIGatewayProxyEvent

  const context = {
    getRemainingTimeInMillis: false
  } as unknown as Context

  beforeEach(() => {
    ddbMock.reset()
  })

  it('should return all invoices for the authenticated user', async () => {
    const userId = generateUserId()
    const userName = 'Test User'
    const invoices = generateInvoices(10, userId, userName)

    ddbMock
      .on(QueryCommand)
      .resolves({
        Items: undefined
      })
      .on(QueryCommand, {
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .resolves({
        Items: invoices
      })

    const getAllInvoicesEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context)

    expect(result.statusCode).toBe(200)
    const returnedBody = JSON.parse(result.body) as {
      invoices: Invoice[]
      count: number
    }
    expect(returnedBody.count).toEqual(invoices.length)
  })

  it('should return 404 if no invoices are found', async () => {
    const userId = generateUserId()

    ddbMock
      .on(QueryCommand, {
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .resolves({
        Items: undefined
      })

    const getAllInvoicesEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context)

    expect(result.statusCode).toBe(404)
  })

  it('should handle pagination correctly', async () => {
    const userId = generateUserId()
    const userName = 'Test User'
    const invoices = generateInvoices(20, userId, userName)
    const firstPage = invoices.slice(0, 10)
    const secondPage = invoices.slice(10)
    const lastEvaluatedKey = { userId: '10' }

    ddbMock
      .on(QueryCommand)
      .resolves({ Items: undefined })
      .on(QueryCommand, {
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .resolves({ Items: firstPage, LastEvaluatedKey: lastEvaluatedKey })
      .on(QueryCommand, {
        ExclusiveStartKey: lastEvaluatedKey,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .resolves({ Items: secondPage })

    const getAllInvoicesEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context)
    expect(result.statusCode).toBe(200)
    const returnedBody = JSON.parse(result.body) as {
      invoices: Invoice[]
      count: number
    }
    expect(returnedBody.count).toEqual(invoices.length)
  })

  it('should add the invoice status to the response', async () => {
    const userId = generateUserId()
    const userName = 'Test User'
    const invoices = generateInvoices(10, userId, userName)

    ddbMock
      .on(QueryCommand)
      .resolves({ Items: undefined })
      .on(QueryCommand, {
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .resolves({ Items: invoices })

    const getAllInvoicesEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context)

    expect(result.statusCode).toBe(200)
    const returnedBody = JSON.parse(result.body) as {
      invoices: Invoice[]
      count: number
    }
    expect(returnedBody.invoices[0].status).toBeDefined()
  })

  it('should return 500 on DynamoDB error', async () => {
    const userId = generateUserId()
    ddbMock
      .on(QueryCommand, {
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .rejects(new Error('DynamoDB error'))

    const getAllInvoicesEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      }
    } as unknown as APIGatewayProxyEvent

    const result = await getAllInvoicesHandler(getAllInvoicesEvent, context)

    expect(result.statusCode).toBe(500)
  })
})
