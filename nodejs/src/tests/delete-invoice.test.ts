import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { type APIGatewayProxyEvent, type Context } from 'aws-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { handler as deleteInvoicedHandler } from '../../functions/deleteInvoice'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'

describe('Test deleteInvoice', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient)

  const event = {
    httpMethod: 'DELETE',
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

  it('should delete a invoice by id', async () => {
    const userId = 'userId'
    const invoiceId = 'invoiceId'

    ddbMock
      .on(DeleteCommand, {
        TableName: 'invoices',
        Key: {
          invoiceId: invoiceId,
          userId
        }
      })
      .resolves({})

    const deleteInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId
      }
    } as unknown as APIGatewayProxyEvent

    const response = await deleteInvoicedHandler(deleteInvoiceEvent, context)

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe(JSON.stringify({}))
  })

  it('should return 404 if invoice not found', async () => {
    const userId = 'userId'
    const invoiceId = 'invoiceId'

    ddbMock
      .on(DeleteCommand, {
        TableName: 'invoices',
        Key: {
          invoiceId: invoiceId,
          userId
        }
      })
      .rejects(
        new ConditionalCheckFailedException({
          message: 'Invoice not found',
          $metadata: {}
        })
      )

    const deleteInvoiceEvent = {
      ...event,
      pathParameters: {
        invoiceId
      }
    } as unknown as APIGatewayProxyEvent

    const result = await deleteInvoicedHandler(deleteInvoiceEvent, context)
    expect(result.statusCode).toBe(404)
  })
  it('should return 400 if invoiceId is not provided', async () => {
    const deleteInvoiceEvent = {
      ...event,
      pathParameters: {}
    } as unknown as APIGatewayProxyEvent

    const result = await deleteInvoicedHandler(deleteInvoiceEvent, context)
    expect(result.statusCode).toBe(400)
    expect(result.body).toBe('invoiceId is required')
  })
})
