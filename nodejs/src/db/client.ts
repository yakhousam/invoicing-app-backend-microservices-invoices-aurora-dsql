import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const ENDPOINT_OVERRIDE = process.env.ENDPOINT_OVERRIDE
let ddbClient = undefined

if (ENDPOINT_OVERRIDE) {
  ddbClient = new DynamoDBClient({ endpoint: ENDPOINT_OVERRIDE })
} else {
  ddbClient = new DynamoDBClient({}) // Use default values for DynamoDB endpoint
}

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient)

// Get the DynamoDB table name from environment variables
const tableName = process.env.TABLE_NAME || 'invoices'
console.log(`Table name: ${tableName}`)
console.log(`Endpoint override: ${ENDPOINT_OVERRIDE}`)

export { ddbDocClient, tableName }
