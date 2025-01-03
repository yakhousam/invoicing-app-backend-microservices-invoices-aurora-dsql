import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { z } from 'zod'

dayjs.extend(customParseFormat)

const dateToZodDate = z.preprocess(
  (val: unknown) => {
    if (val === undefined) {
      return dayjs().toISOString()
    }
    return val
  },
  z
    .string()
    .refine((val) => dayjs(val, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]', true).isValid(), {
      message: 'Invalid date format, must be in ISO 8601 format'
    })
)

export const itemSchema = z.object({
  itemId: z.string(),
  itemName: z
    .string()
    .nonempty('item description must be at least 1 character'),
  itemPrice: z.coerce.number().positive('item price must be a positive number'),
  itemQuantity: z.coerce
    .number()
    .positive('item quantity must be a positive number')
    .optional()
    .default(1)
})

export const invoiceSchema = z.object({
  invoiceId: z.string(),
  invoiceDate: dateToZodDate,
  invoiceDueDays: z.number().max(30).default(7),
  userId: z
    .string({ message: 'User ID is required' })
    .nonempty('User ID must not be empty'),
  userName: z
    .string({ message: 'User name is required' })
    .nonempty('User name must not be empty'),
  clientId: z.string(),
  clientName: z.string().nonempty(),
  items: z.array(itemSchema).nonempty('Items array must not be empty'),
  paid: z.boolean().default(false),
  status: z.enum(['sent', 'paid', 'overdue']),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  taxPercentage: z.number().min(0).max(100).default(0),
  subTotal: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  createdAt: dateToZodDate,
  updatedAt: dateToZodDate
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
    taxAmount: true,
    status: true
  })
  .extend({
    items: z
      .array(itemSchema.omit({ itemId: true }))
      .nonempty('Items array must not be empty')
  })

export const updateInvoiceSchema = createInvoiceSchema
  .omit({ clientId: true, clientName: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be updated',
    path: ['updates']
  })

export type Invoice = z.infer<typeof invoiceSchema>

export type Item = z.infer<typeof itemSchema>

export type CreateInvoice = z.input<typeof createInvoiceSchema>

export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>
