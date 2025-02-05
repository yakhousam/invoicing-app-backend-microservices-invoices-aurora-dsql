import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";

import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpContentEncodingMiddleware from "@middy/http-content-encoding";
import httpErrorHandlerMiddleware from "@middy/http-error-handler";
import httpEventNormalizerMiddleware from "@middy/http-event-normalizer";
import httpHeaderNormalizerMiddleware from "@middy/http-header-normalizer";
import httpJsonBodyParserMiddleware from "@middy/http-json-body-parser";
import httpSecurityHeadersMiddleware from "@middy/http-security-headers";

import postInvoiceController from "@/controllers/postInvoiceController";

import customErrorMiddleware from "@/custom-middlewares/customErrorMiddleware";

const postInvoiceHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return await postInvoiceController(event);
};

export const handler = middy({
  timeoutEarlyResponse: () => {
    return {
      statusCode: 408,
    };
  },
})
  .use(httpEventNormalizerMiddleware())
  .use(httpHeaderNormalizerMiddleware())
  .use(httpJsonBodyParserMiddleware())
  .use(httpSecurityHeadersMiddleware())
  .use(httpContentEncodingMiddleware())
  .use(httpErrorHandlerMiddleware())
  .use(customErrorMiddleware())
  .use(errorLogger())
  .handler(postInvoiceHandler);
