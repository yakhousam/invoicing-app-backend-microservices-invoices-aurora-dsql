import { faker } from '@faker-js/faker'
import { Client, CreateClient, UpdateClient } from '../validation'

export function generateClients(num: number): Client[] {
  return Array(num)
    .fill(0)
    .map(() => {
      return {
        clientId: faker.string.uuid(),
        clientName: faker.company.name(),
        email: faker.internet.email(),
        createdAt: faker.date.recent().toISOString(),
        updatedAt: faker.date.recent().toISOString(),
        userId: faker.string.uuid(),
        currencyPreference: faker.finance.currencyCode(),
        address: faker.location.streetAddress(),
        phone: faker.phone.number(),
        VATNumber: faker.string.uuid()
      }
    })
}

export function generatePostClient(): CreateClient {
  return {
    clientName: faker.company.name(),
    email: faker.internet.email(),
    currencyPreference: faker.finance.currencyCode(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number(),
    VATNumber: faker.string.uuid()
  }
}

export function generateUserId(): string {
  return faker.string.uuid()
}

export function generateUpdateClient(): UpdateClient {
  return {
    clientName: faker.company.name(),
    email: faker.internet.email(),
    currencyPreference: getValueOrUndefined(faker.finance.currencyCode()),
    address: getValueOrUndefined(faker.location.streetAddress()),
    phone: getValueOrUndefined(faker.phone.number()),
    VATNumber: getValueOrUndefined(faker.string.uuid())
  }
}

function getValueOrUndefined<T>(value: T): T | undefined {
  return Math.random() > 0.5 ? value : undefined
}
