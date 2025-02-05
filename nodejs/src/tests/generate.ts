import { Item, UpdateInvoice } from "@/validation";
import { faker } from "@faker-js/faker";

export function generateCreateInvoice() {
  return {
    currency: maybe(faker.helpers.arrayElement(["USD", "EUR", "GBP"])),
    taxPercentage: maybe(faker.number.int({ min: 0, max: 30 })),
    items: generateItems(faker.number.int({ min: 1, max: 10 })),
    clientId: faker.string.uuid(),
    invoiceDate: maybe(faker.date.recent()),
    invoiceDueDays: maybe(faker.number.int({ min: 1, max: 30 })),
  };
}

export function generateInvoices(num: number, userId: string) {
  return Array.from({ length: num }, () => ({
    invoiceId: faker.string.uuid(),
    currency: faker.helpers.arrayElement(["USD", "EUR", "GBP"]),
    companyName: faker.company.name(),
    items: generateItems(faker.number.int({ min: 1, max: 10 })),
    clientId: faker.string.uuid(),
    userId,
    invoiceDueDays: faker.number.int({ min: 1, max: 30 }),
    paid: false,
    taxPercentage: faker.number.int({ min: 0, max: 30 }).toString(),
    subTotal: faker.number
      .float({ min: 0, max: 10000, fractionDigits: 2 })
      .toString(),
    taxAmount: faker.number
      .float({ min: 0, max: 3000, fractionDigits: 2 })
      .toString(),
    totalAmount: faker.number
      .float({ min: 0, max: 13000, fractionDigits: 2 })
      .toString(),
    invoiceDate: faker.date.recent({ days: 30 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    status: "sent",
  }));
}

export function generateUpdateInvoice(): UpdateInvoice {
  return {
    currency: faker.helpers.arrayElement(["USD", "EUR", "GBP"]),
    taxPercentage: faker.number.int({ min: 0, max: 30 }),
    items: generateItems(faker.number.int({ min: 1, max: 10 })),
    invoiceDueDays: maybe(faker.number.int({ min: 1, max: 30 })),
    paid: true,
  };
}

function generateItems(num: number) {
  const invoiceId = faker.string.uuid();
  const items: Item[] = Array(num)
    .fill(0)
    .map(() => ({
      itemId: faker.string.uuid(),
      itemName: faker.commerce.productName(),
      itemPrice: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      itemQuantity: faker.number.int({ min: 1, max: 100 }),
      invoiceId,
    }));
  return items as [Item, ...Item[]];
}

export function generateUserId(): string {
  return faker.string.uuid();
}

export function generateName(): string {
  return faker.company.name();
}

function maybe<T>(value: T): T | undefined {
  return Math.random() > 0.5 ? value : undefined;
}
