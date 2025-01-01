import authorizeUserMiddleware from '@/custom-middlewares/authorizeUserMiddleware'
import middy from '@middy/core'
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda'
import { describe, expect, it } from 'vitest'
import httpErrorHandlerMiddleware from '@middy/http-error-handler'
import { generateName, generateUserId } from './generate'

describe('Test authorizeUserMiddleware', () => {
  const event = {
    httpMethod: 'GET',
    requestContext: {
      authorizer: {}
    }
  } as unknown as APIGatewayProxyEvent

  const context = {
    getRemainingTimeInMillis: false
  } as unknown as Context

  it('should throw an authorizer error', async () => {
    const handler = middy()
      .use(httpErrorHandlerMiddleware())
      .use(authorizeUserMiddleware())
    const result = await handler(event, context)
    expect(result.statusCode).toBe(401)
  })

  it('should not throw an authorizer error', async () => {
    const userId = generateUserId()
    const userName = generateName()
    const handler = middy()
      .use(httpErrorHandlerMiddleware())
      .use(authorizeUserMiddleware())
    const authEvent = {
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
      }
    } as unknown as APIGatewayProxyEvent
    const result = await handler(authEvent, context)
    expect(result).toBeUndefined()
  })

  it('should populate the authorizer with the userId from the environment variable', async () => {
    const userId = generateUserId()
    process.env.userId = userId
    const handler = middy()
      .use(httpErrorHandlerMiddleware())
      .use(authorizeUserMiddleware())
    const result = await handler(event, context)
    expect(result).toBeUndefined()
    expect(event.requestContext.authorizer).toEqual({
      jwt: {
        claims: {
          sub: userId
        }
      }
    })
  })
})
