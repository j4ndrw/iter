export const defaultOf = (
  _type:
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "null"
    | "object"
    | "function",
) => {
  const defaults: Record<
    typeof _type,
    | string
    | number
    | bigint
    | boolean
    | symbol
    | undefined
    | null
    | object
    | (() => void)
  > = {
    undefined,
    null: null,
    boolean: false,
    number: 0,
    bigint: 0n,
    string: "",
    function: () => { },
    object: {},
    symbol: undefined,
  };

  if (_type === "symbol") {
    throw new Error("Found unexpected symbol.");
  }

  return defaults[_type];
};

export const castFromReturnType = <T extends (...args: any[]) => any>(self: any) =>
  self as unknown as ReturnType<T>;
