export const replacer = (_key: any, value: any) => typeof value === "bigint" ? value.toString() : value;
