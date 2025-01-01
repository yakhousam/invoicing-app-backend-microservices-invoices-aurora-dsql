import { CreateInvoice, Item } from '@/validation'
import { faker } from '@faker-js/faker'

export function generateCreateInvoice(): CreateInvoice {
  return {
    currency: maybe(faker.helpers.arrayElement(['USD', 'EUR', 'GBP'])),
    taxPercentage: maybe(faker.number.int({ min: 0, max: 30 })),
    items: generateItems(faker.number.int({ min: 1, max: 10 })),
    clientId: faker.string.uuid(),
    clientName: faker.company.name(),
    invoiceDate: maybe(faker.date.recent().toISOString()),
    invoiceDueDays: maybe(faker.number.int({ min: 1, max: 30 }))
  }
}

export function generateItems(num: number): Omit<Item, 'itemId'>[] {
  return Array.from({ length: num }, () => ({
    itemName: faker.commerce.productName(),
    itemPrice: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
    itemQuantity: faker.number.int({ min: 1, max: 100 })
  }))
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
