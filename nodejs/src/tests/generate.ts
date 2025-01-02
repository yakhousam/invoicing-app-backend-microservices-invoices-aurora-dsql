import { CreateInvoice, Invoice, Item, UpdateInvoice } from '@/validation'
import { faker } from '@faker-js/faker'

export function generateCreateInvoice(): CreateInvoice {
  return {
    currency: maybe(faker.helpers.arrayElement(['USD', 'EUR', 'GBP'])),
    taxPercentage: maybe(faker.number.int({ min: 0, max: 30 })),
    items: Array.from(
      { length: faker.number.int({ min: 1, max: 10 }) },
      () => ({
        itemName: faker.commerce.productName(),
        itemPrice: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
        itemQuantity: faker.number.int({ min: 1, max: 100 })
      })
    ),
    clientId: faker.string.uuid(),
    clientName: faker.company.name(),
    invoiceDate: maybe(faker.date.recent().toISOString()),
    invoiceDueDays: maybe(faker.number.int({ min: 1, max: 30 }))
  }
}

export function generateInvoices(
  num: number,
  userId: string,
  userName: string
): Omit<Invoice, 'status'>[] {
  const items: Item[] = Array.from(
    { length: faker.number.int({ min: 1, max: 10 }) },
    () => ({
      itemId: faker.string.uuid(),
      itemName: faker.commerce.productName(),
      itemPrice: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      itemQuantity: faker.number.int({ min: 1, max: 100 })
    })
  )

  return Array.from({ length: num }, () => ({
    invoiceId: faker.string.uuid(),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
    taxPercentage: faker.number.int({ min: 0, max: 30 }),
    items,
    clientId: faker.string.uuid(),
    clientName: faker.company.name(),
    userId,
    userName,
    invoiceDate: faker.date.recent({ days: 30 }).toISOString(),
    invoiceDueDays: faker.number.int({ min: 1, max: 30 }),
    paid: false,
    subTotal: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
    taxAmount: faker.number.float({ min: 0, max: 3000, fractionDigits: 2 }),
    totalAmount: faker.number.float({ min: 0, max: 13000, fractionDigits: 2 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString()
  }))
}

export function generateUpdateInvoice(): UpdateInvoice {
  return {
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
    taxPercentage: faker.number.int({ min: 0, max: 30 }),
    items: Array.from(
      { length: faker.number.int({ min: 1, max: 10 }) },
      () => ({
        itemName: faker.commerce.productName(),
        itemPrice: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
        itemQuantity: faker.number.int({ min: 1, max: 100 })
      })
    ),
    invoiceDate: maybe(faker.date.recent().toISOString()),
    invoiceDueDays: maybe(faker.number.int({ min: 1, max: 30 })),
    paid: true
  }
}

export function generateUserId(): string {
  return faker.string.uuid()
}

export function generateName(): string {
  return faker.company.name()
}

function maybe<T>(value: T): T | undefined {
  return Math.random() > 0.5 ? value : undefined
}
