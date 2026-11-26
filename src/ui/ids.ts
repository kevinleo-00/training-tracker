export const newId = <T extends string>(): T => crypto.randomUUID() as T;
