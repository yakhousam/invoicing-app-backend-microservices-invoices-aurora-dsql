import { Client } from '@/validation'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb'
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { type ZodIssue } from 'zod'
import { handler as postClientHandler } from '../../functions/postClient'
import { generatePostClient, generateUserId } from './generate'

describe('Test postClient', () => {
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

  it('should post a client', async () => {
    const client = generatePostClient()
    const userId = generateUserId()

    ddbMock
      .on(QueryCommand, {
        TableName: 'clients',
        IndexName: 'emailIndex',
        KeyConditionExpression: 'email = :email AND userId = :userId',
        ExpressionAttributeValues: {
          ':email': client.email,
          ':userId': userId
        }
      })
      .resolves({ Count: 0 })
      .on(QueryCommand, {
        TableName: 'clients',
        IndexName: 'clientNameIndex',
        KeyConditionExpression: 'clientName = :clientName AND userId = :userId',
        ExpressionAttributeValues: {
          ':clientName': client.clientName,
          ':userId': userId
        }
      })
      .resolves({ Count: 0 })
      .on(PutCommand)
      .resolves({})

    const putEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      },
      body: JSON.stringify(client)
    } as unknown as APIGatewayProxyEvent

    const result = await postClientHandler(putEvent, context)
    const returnedBody = JSON.parse(result.body) as Client

    expect(result.statusCode).toBe(201)
    expect(returnedBody).contains(client)
    expect(returnedBody.clientId).toBeTruthy()
    expect(returnedBody.createdAt).toBeTruthy()
    expect(returnedBody.updatedAt).toBeTruthy()
    expect(returnedBody.userId).toBe(userId)
  })

  it('should return 409 if client name already exists', async () => {
    const client = generatePostClient()
    const userId = generateUserId()

    ddbMock
      .on(QueryCommand, {
        TableName: 'clients',
        IndexName: 'emailIndex',
        KeyConditionExpression: 'email = :email AND userId = :userId',
        ExpressionAttributeValues: {
          ':email': client.email,
          ':userId': userId
        }
      })
      .resolves({ Count: 0 })
      .on(QueryCommand, {
        TableName: 'clients',
        IndexName: 'clientNameIndex',
        KeyConditionExpression: 'clientName = :clientName AND userId = :userId',
        ExpressionAttributeValues: {
          ':clientName': client.clientName,
          ':userId': userId
        }
      })
      .resolves({ Count: 1 })

    const putEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      },
      body: JSON.stringify(client)
    } as unknown as APIGatewayProxyEvent

    const result = await postClientHandler(putEvent, context)

    expect(result.statusCode).toBe(409)
    expect(result.body).toBe('Client name already exists')
  })

  it('should return 409 if email already exists', async () => {
    const client = generatePostClient()
    const userId = generateUserId()

    ddbMock
      .on(QueryCommand, {
        TableName: 'clients',
        IndexName: 'emailIndex',
        KeyConditionExpression: 'email = :email AND userId = :userId',
        ExpressionAttributeValues: {
          ':email': client.email,
          ':userId': userId
        }
      })
      .resolves({ Count: 1 })

    const putEvent = {
      ...event,
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: userId
            }
          }
        }
      },
      body: JSON.stringify(client)
    } as unknown as APIGatewayProxyEvent

    const result = await postClientHandler(putEvent, context)

    expect(result.statusCode).toBe(409)
    expect(result.body).toBe('Email already exists')
  })

  describe('Validation', () => {
    beforeEach(() => {
      ddbMock
        .on(QueryCommand, {
          TableName: 'clients',
          IndexName: 'emailIndex'
        })
        .resolves({ Count: 0 })
        .on(QueryCommand, {
          TableName: 'clients',
          IndexName: 'clientNameIndex'
        })
        .resolves({ Count: 0 })
    })
    it('should return 400 if client name is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientName, ...client } = generatePostClient()
      const userId = generateUserId()

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId
              }
            }
          }
        },
        body: JSON.stringify(client)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]

      expect(result.statusCode).toBe(400)
      expect(returnedBody[0].path).toContain('clientName')
      expect(returnedBody[0].message).toBeTruthy()
    })

    it('should return 400 if client name is empty', async () => {
      const userId = generateUserId()
      const client = generatePostClient()
      client.clientName = ''

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId
              }
            }
          }
        },
        body: JSON.stringify(client)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]

      expect(result.statusCode).toBe(400)
      expect(returnedBody[0].path).toContain('clientName')
      expect(returnedBody[0].message).toBeTruthy()
    })

    it('should return 400 if email is invalid', async () => {
      const userId = generateUserId()
      const client = generatePostClient()
      client.email = 'invalid-email'

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId
              }
            }
          }
        },
        body: JSON.stringify(client)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]

      expect(result.statusCode).toBe(400)
      expect(returnedBody[0].path).toContain('email')
      expect(returnedBody[0].message).toBeTruthy()
    })

    it('should return 400 if phone is invalid', async () => {
      const userId = generateUserId()
      const client = generatePostClient()
      client.phone = '123'

      const putEvent = {
        ...event,
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: userId
              }
            }
          }
        },
        body: JSON.stringify(client)
      } as unknown as APIGatewayProxyEvent

      const result = await postClientHandler(putEvent, context)
      const returnedBody = JSON.parse(result.body) as ZodIssue[]

      expect(result.statusCode).toBe(400)
      expect(returnedBody[0].path).toContain('phone')
      expect(returnedBody[0].message).toBeTruthy()
    })
  })
})
