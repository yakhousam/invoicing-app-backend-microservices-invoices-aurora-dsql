import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { z } from "zod";

dayjs.extend(customParseFormat);

const dateToZodDate = z.preprocess(
  (val: unknown) => {
    if (val === undefined) {
      return dayjs().toISOString();
    }
    return val;
  },
  z
    .string()
    .refine((val) => dayjs(val, "YYYY-MM-DDTHH:mm:ss.SSS[Z]", true).isValid(), {
      message: "Invalid date format, must be in ISO 8601 format",
    })
);

export const itemSchema = z.object({
  itemId: z.string(),
  invoiceId: z.string(),
  itemName: z
    .string()
    .nonempty("item description must be at least 1 character"),
  itemPrice: z.coerce.number().positive("item price must be a positive number"),
  itemQuantity: z.coerce
    .number()
    .positive("item quantity must be a positive number")
    .optional()
    .default(1),
});

export const invoiceSchema = z.object({
  invoiceId: z.string(),
  invoiceDate: z.date(),
  invoiceDueDays: z.number().max(30).default(7),
  userCompanyName: z.string(),
  clientName: z.string(),
  userId: z
    .string({ message: "User ID is required" })
    .uuid("User ID must be a valid UUID")
    .nonempty("User ID must not be empty"),
  clientId: z
    .string({ message: "Client ID  is required" })
    .uuid("Client ID must be a valid UUID")
    .nonempty("Client ID must not be empty"),
  items: z.array(itemSchema).nonempty("Items array must not be empty"),
  paid: z.boolean().default(false),
  status: z.enum(["sent", "paid", "overdue"]),
  currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
  taxPercentage: z.string().transform((val) => parseFloat(val)),
  subTotal: z.string().transform((val) => parseFloat(val)),
  taxAmount: z.string().transform((val) => parseFloat(val)),
  totalAmount: z.string().transform((val) => parseFloat(val)),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createInvoiceSchema = invoiceSchema
  .pick({
    invoiceDueDays: true,
    clientId: true,
    currency: true,
    paid: true,
  })
  .extend({
    invoiceDate: dateToZodDate,
    taxPercentage: z.number().min(0).max(100).default(0),
    items: z
      .array(itemSchema.omit({ itemId: true, invoiceId: true }))
      .nonempty("Items array must not be empty"),
  });

export const updateInvoiceSchema = createInvoiceSchema
  .omit({ clientId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be updated",
    path: ["updates"],
  });

export const getAllInvoicesResponse = z.array(
  invoiceSchema
    .pick({
      invoiceId: true,
      invoiceDate: true,
      totalAmount: true,
      status: true,
    })
    .extend({
      clientName: z.string(),
    })
);

export const getAllInvoicesQuery = z.object({
  limit: z
    .string()
    .default("10")
    .refine((val) => /^\d+$/.test(val) && parseInt(val, 10) > 0)
    .transform((val) => parseInt(val, 10))
    .catch(10),
  offset: z
    .string()
    .default("0")
    .refine((val) => /^\d+$/.test(val) && parseInt(val, 10) >= 0)
    .transform((val) => parseInt(val, 10))
    .catch(0),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export type Item = z.infer<typeof itemSchema>;

export type CreateInvoice = z.input<typeof createInvoiceSchema>;

export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
