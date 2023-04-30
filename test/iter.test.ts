import { iter } from "../src";

const iterable = [1, 2, 3];
const flattenableIterable = [
  [1, 2, 3],
  [4, 5, 6],
];

describe("Iter", () => {
  it("should map the iterable", () => {
    const result = iter(iterable)
      .map((item) => item * 2 + 1)
      .collect();

    expect(result).toStrictEqual([3, 5, 7]);
  });

  it("should fold the iterable", () => {
    const result = iter(iterable)
      .fold((acc, item) => acc + item, 0)
      .collect();

    expect(result).toBe(6);
  });

  it("should filter the iterable", () => {
    const result = iter(iterable)
      .filter((item) => item === 0)
      .collect();

    expect(result).toStrictEqual([]);
  });

  it("should square all numbers, filter the odd ones and sum them up", () => {
    const result = iter(iterable)
      .map((num) => num * num)
      .filter((num) => num % 2 !== 0)
      .fold((acc, num) => acc + num, 0)
      .collect();

    expect(result).toBe(10);
  });

  it("should construct a record of strings with numbers as values", () => {
    const result = iter(iterable)
      .fold((acc, item) => {
        if (item % 2 === 0) {
          acc[`even ${item}`] = item;
          return acc;
        }
        acc[`odd ${item}`] = item;
        return acc;
      }, {} as Record<string, number>)
      .collect();

    expect(result).toStrictEqual({
      "odd 1": 1,
      "even 2": 2,
      "odd 3": 3,
    });
  });

  it("should correctly apply a sum reduction", () => {
    const result = iter(iterable)
      .reduce((acc, number) => acc + number)
      .collect();

    expect(result).toBe(6);
  });

  it("should correctly apply the reduction on an array with a single element", () => {
    const result = iter([1])
      .reduce((acc, number) => `this is number ${acc + number}`)
      .collect();

    expect(result).toBe("this is number 1");
  });
});
