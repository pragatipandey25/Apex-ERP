import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

let activeClient: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = activeClient;
}

/**
 * Proxy export ensuring all imported references dynamically resolve to the active Prisma client.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    return Reflect.get(activeClient, prop, receiver);
  },
});

/**
 * Overrides active PrismaClient for isolated testing environments (e.g. apex_tape_factory_test).
 */
export function setPrismaClient(client: PrismaClient): void {
  activeClient = client;
}

export default prisma;
