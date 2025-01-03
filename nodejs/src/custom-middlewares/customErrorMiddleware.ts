import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import middy from '@middy/core'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import createError from 'http-errors'
import { ZodError } from 'zod'

const customErrorMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  return {
    onError: async (request) => {
      if (request.error instanceof ZodError) {
        request.error = createError.BadRequest(request.error.message)
      }

      if (request.error instanceof ConditionalCheckFailedException) {
        request.error = createError.NotFound()
      }
    }
  }
}

export default customErrorMiddleware
