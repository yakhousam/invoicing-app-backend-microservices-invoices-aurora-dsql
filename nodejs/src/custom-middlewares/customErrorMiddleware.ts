import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import createError from "http-errors";
import { ZodError } from "zod";

const customErrorMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  return {
    onError: async (request) => {
      if (request.error instanceof ZodError) {
        request.error = createError.BadRequest(request.error.message);
      }
    },
  };
};

export default customErrorMiddleware;
