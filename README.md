# Invoices Microservice

This project is an AWS Lambda-based microservice for managing invoices. It uses AWS DynamoDB as the database and is built using Node.js and TypeScript. The project includes several Lambda functions for creating, updating, retrieving, and deleting invoices.

## Prerequisites

- Node.js
- AWS CLI
- Docker (for local DynamoDB)

## Setup

1. **Install dependencies:**

   ```sh
   npm install
   ```
2. **Start DynamoDB Local in a Docker container:**

    ```sh
    docker run --rm -p 8000:8000 -v /tmp:/data amazon/dynamodb-local
    ```

3. **Retrieve the ip address of your docker container running dynamodb local:**

    ```sh
    docker inspect <container_name_or_id> -f  '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
    ```

4. **Create the DynamoDB table:**

    ```sh
    aws dynamodb create-table   --table-name invoices   --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=invoiceId,AttributeType=S   --key-schema AttributeName=userId,KeyType=HASH AttributeName=invoiceId,KeyType=RANGE   --billing-mode PAY_PER_REQUEST   --endpoint-url http://localhost:8000
    ```

5. **Update env.json with the IP of your Docker container for the endpoint override:**

    ```sh
    {
        "getAllInvoicesFunction": {
        "ENDPOINT_OVERRIDE": "http://172.17.0.2:8000",
        "TABLE_NAME": "invoices",
        "userId": "123456",
        "userName": "admin"
    },
    "postInvoiceFunction": {
        "ENDPOINT_OVERRIDE": "http://172.17.0.2:8000",
        "TABLE_NAME": "invoices",
        "userId": "123456",
        "userName": "admin"
    }
    }
    ```

6. **run the following commands to start the sam local api:**

    ```sh
    sam build
    sam local start-api --env-vars env.json --host 0.0.0.0 --port 3002 --debug
    ```
## Running Tests

* **To run the tests, use the following command:**

    ```sh
    npm run test
    ```
## Deployment

* **Deploy the application using the AWS SAM CLI:**

    ```sh
    sam deploy --guided
    ```