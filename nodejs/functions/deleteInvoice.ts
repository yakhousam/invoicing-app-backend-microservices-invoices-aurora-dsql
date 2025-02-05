import {
  type APIGatewayProxyEvent,
  type APIGatewayProxyResult,
} from "aws-lambda";

import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpErrorHandlerMiddleware from "@middy/http-error-handler";
import httpEventNormalizerMiddleware from "@middy/http-event-normalizer";
import httpHeaderNormalizerMiddleware from "@middy/http-header-normalizer";
import httpSecurityHeadersMiddleware from "@middy/http-security-headers";

import customErrorMiddleware from "@/custom-middlewares/customErrorMiddleware";

import deleteInvoiceController from "@/controllers/deleteInvoiceController";

const deleteInvoiceHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return await deleteInvoiceController(event);
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
  .use(httpSecurityHeadersMiddleware())
  .use(httpErrorHandlerMiddleware())
  .use(customErrorMiddleware())
  .use(errorLogger())
  .handler(deleteInvoiceHandler);
