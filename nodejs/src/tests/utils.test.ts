import { describe, it, expect } from 'vitest'
import { addStatusToInvoice } from '../utils'
import dayjs from 'dayjs'
import { generateInvoices } from './generate'

describe('addStatusToInvoice', () => {
  it('should set status to "paid" if invoice is paid', () => {
    const genInvoice = generateInvoices(1, 'userId', 'userName')
    const invoice = {
      ...genInvoice[0],
      paid: true,
      invoiceDate: '2023-01-01',
      invoiceDueDays: 30
    }
    const result = addStatusToInvoice(invoice)
    expect(result.status).toBe('paid')
  })

  it('should set status to "overdue" if invoice is not paid and past due date', () => {
    const genInvoice = generateInvoices(1, 'userId', 'userName')
    const invoice = {
      ...genInvoice[0],
      paid: false,
      invoiceDate: dayjs().subtract(31, 'day').format('YYYY-MM-DD'),
      invoiceDueDays: 30
    }
    const result = addStatusToInvoice(invoice)
    expect(result.status).toBe('overdue')
  })

  it('should set status to "sent" if invoice is not paid and not past due date', () => {
    const genInvoice = generateInvoices(1, 'userId', 'userName')
    const invoice = {
      ...genInvoice[0],
      paid: false,
      invoiceDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
      invoiceDueDays: 30
    }
    const result = addStatusToInvoice(invoice)
    expect(result.status).toBe('sent')
  })
})
