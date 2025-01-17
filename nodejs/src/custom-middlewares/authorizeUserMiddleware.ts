import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";

const authorizeUserMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  return {
    before: async (request): Promise<void> => {
      const userId = process.env.userId
        ? process.env.userId
        : request.event.requestContext.authorizer?.jwt?.claims?.sub;
      if (userId === undefined) {
        throw new createError.Unauthorized();
      }
      if (!request.event.requestContext.authorizer?.jwt?.claims?.sub) {
        // it means  that userId is coming from the environment variable (local development)
        request.event.requestContext.authorizer = {
          jwt: { claims: { sub: userId } },
        };
      }
    },
  };
};

export default authorizeUserMiddleware;
