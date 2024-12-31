import { z } from 'zod'

const itemSchema = z.object({
  itemId: z.string(),
  itemName: z.string().min(1, 'item description must be at least 1 character'),
  itemPrice: z.coerce.number().positive('item price must be a positive number'),
  itemQuantity: z.coerce
    .number()
    .positive('item quantity must be a positive number')
    .optional()
    .default(1)
})

export const invoiceSchema = z.object({
  invoiceId: z.string(),
  invoiceDate: z.string().default(new Date().toISOString()),
  invoiceDueDays: z.number().default(7),
  userId: z
    .string({ message: 'User ID is required' })
    .min(1, 'userId must not be empty'),
  userName: z
    .string({ message: 'User name is required' })
    .min(1, 'userName must not be empty'),
  clientId: z.string(),
  clientName: z.string().nonempty(),
  items: z.array(itemSchema),
  paid: z.boolean().default(false),
  status: z.enum(['sent', 'paid', 'overdue']).default('sent'),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  taxPercentage: z.number().min(0).max(100).default(0),
  subTotal: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const createInvoiceSchema = invoiceSchema
  .omit({
    invoiceId: true,
    userId: true,
    userName: true,
    createdAt: true,
    updatedAt: true,
    totalAmount: true,
    subTotal: true,
    taxAmount: true
  })
  .extend({
    items: z.array(itemSchema.omit({ itemId: true }))
  })

export const updateInvoice = createInvoiceSchema
  .omit({ clientId: true, clientName: true })
  .partial()

export const invoicesSummarySchema = z.array(
  z.object({
    currency: createInvoiceSchema.shape.currency,
    total: z.number(),
    paid: z.number(),
    unpaid: z.number()
  })
)

export const invoicesTotalsByMonthSchema = z.array(
  z.object({
    date: z.object({
      month: z.number(),
      year: z.number()
    }),
    total: z.number(),
    paid: z.number(),
    unpaid: z.number()
  })
)

export type Invoice = z.infer<typeof invoiceSchema>

export type CreateInvoice = z.input<typeof createInvoiceSchema>

export type UpdateInvoice = z.infer<typeof updateInvoice>

export type invoicesSummary = z.infer<typeof invoicesSummarySchema>

export type invoicesTotalsByMonth = z.infer<typeof invoicesTotalsByMonthSchema>
