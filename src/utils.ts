export const defaultOf = (
  _type:
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function"
) => {
  const defaults: Record<
    typeof _type,
    | string
    | number
    | bigint
    | boolean
    | symbol
    | undefined
    | object
    | (() => void)
  > = {
    undefined,
    boolean: false,
    number: 0,
    bigint: 0n,
    string: "",
    function: () => {},
    object: {},
    symbol: undefined,
  };

  if (_type === "symbol") {
    throw new Error("Found unexpected symbol.");
  }

  return defaults[_type];
};

export const cast = <T extends (...args: any[]) => any>(self: any) =>
  self as unknown as ReturnType<T>;
