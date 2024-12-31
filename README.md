## Test locally with dynamodb:
1. Start DynamoDB Local in a Docker container (this example works on codespace) 
```
docker run --rm -p 8000:8000 -v /tmp:/data amazon/dynamodb-local
```

2. Retrieve the ip address of your docker container running dynamodb local:
```
docker inspect <container_name_or_id> -f  '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 
```

3. Create the DynamoDB table (sample command below): 
```
aws dynamodb create-table --table-name clients --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=clientId,AttributeType=S AttributeName=clientName,AttributeType=S AttributeName=email,AttributeType=S --key-schema AttributeName=userId,KeyType=HASH AttributeName=clientId,KeyType=RANGE --local-secondary-indexes "[{\"IndexName\": \"clientNameIndex\",\"KeySchema\": [{\"AttributeName\": \"userId\", \"KeyType\": \"HASH\"},{\"AttributeName\": \"clientName\", \"KeyType\": \"RANGE\"}],\"Projection\": {\"ProjectionType\": \"ALL\"}},{\"IndexName\": \"emailIndex\",\"KeySchema\": [{\"AttributeName\": \"userId\", \"KeyType\": \"HASH\"},{\"AttributeName\": \"email\", \"KeyType\": \"RANGE\"}],\"Projection\": {\"ProjectionType\": \"ALL\"}}]" --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000
```

4. Update env.json with the IP of your docker container for the endpoint override - see here for example:
```
{
    "getByIdFunction": {
        "ENDPOINT_OVERRIDE": "http://172.17.0.2:8000",
        "SAMPLE_TABLE": "Table"
    },
    "putItemFunction": {
        "ENDPOINT_OVERRIDE": "http://172.17.0.2:8000",
        "SAMPLE_TABLE": "Table"
    }
}
```
5. run the following commands to start the sam local api:
```
sam local start-api --env-vars env.json --host 0.0.0.0 --debug
```

6. How to scan your table for items
```
aws dynamodb scan --table-name Table --endpoint-url http://127.0.0.1:8000
```