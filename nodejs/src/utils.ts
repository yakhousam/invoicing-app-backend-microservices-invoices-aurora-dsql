import dayjs from "dayjs";
import { Invoice } from "./validation";

import { APIGatewayProxyEvent } from "aws-lambda";

export function createUpdateExpression(
  updates: Record<string, unknown>
): string {
  return Object.entries(updates)
    .filter((update) => update[1] !== undefined)
    .map(([key, value]) => `"${key}" = '${value}'`)
    .join(", ");
}

const isDev = process.env.NODE_ENV === "development";

export function getUserId(event: APIGatewayProxyEvent): string {
  return isDev
    ? process.env.userId
    : event.requestContext.authorizer?.jwt?.claims?.sub;
}

export function getAuthToken(event: APIGatewayProxyEvent): string {
  if (isDev) {
    return process.env.authToken as string;
  }
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;
  return authHeader?.replace("Bearer ", "") || "";
}

export function addStatusToInvoice(invoice: Omit<Invoice, "status">): Invoice {
  let status: Invoice["status"] = "sent";
  if (invoice.paid) {
    status = "paid";
  } else {
    status = dayjs().isAfter(
      dayjs(invoice.invoiceDate).add(invoice.invoiceDueDays, "day")
    )
      ? "overdue"
      : "sent";
  }
  return {
    ...invoice,
    status,
  };
}
