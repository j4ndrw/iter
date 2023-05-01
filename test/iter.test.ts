import { iter } from "../src";

const iterable = [1, 2, 3, 4, 5, 6, 0, 24, 13];
const flattenableIterable = [
  [1, 2, 3],
  [4, 5, 6],
];

describe("Iter", () => {
  it("should map the iterable", () => {
    const result = iter(iterable)
      .map((item) => item * 2 + 1)
      .collect();

    expect(result).toStrictEqual(iterable.map((item) => item * 2 + 1));
  });

  it("should fold the iterable", () => {
    const result = iter(iterable)
      .fold((acc, item) => acc + item, 0)
      .collect();

    expect(result).toBe(iterable.reduce((acc, item) => acc + item, 0));
  });

  it("should filter the iterable", () => {
    const result = iter(iterable)
      .filter((item) => item === 999)
      .collect();

    expect(result).toStrictEqual(iterable.filter((item) => item === 999));
  });

  it("should square all numbers, filter the odd ones and sum them up", () => {
    const result = iter(iterable)
      .map((num) => num * num)
      .filter((num) => num % 2 !== 0)
      .fold((acc, num) => acc + num, 0)
      .collect();

    expect(result).toBe(
      iterable
        .map((num) => num * num)
        .filter((num) => num % 2 !== 0)
        .reduce((acc, item) => acc + item, 0)
    );
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

    expect(result).toStrictEqual(
      iterable.reduce((acc, item) => {
        if (item % 2 === 0) {
          acc[`even ${item}`] = item;
          return acc;
        }
        acc[`odd ${item}`] = item;
        return acc;
      }, {} as Record<string, number>)
    );
  });

  it("should correctly apply a sum reduction", () => {
    const result = iter(iterable)
      .reduce((acc, number) => acc + number)
      .collect();

    expect(result).toBe(iterable.reduce((acc, number) => acc + number));
  });

  it("should correctly apply the reduction on an array with a single element", () => {
    const result = iter([1])
      .reduce((acc, number) => `this is number ${acc + number}`)
      .collect();

    expect(result).toBe("this is number 1");
  });

  it("should take the specified number of elements", () => {
    const result = iter(iterable).take(2).collect();

    expect(result).toStrictEqual([1, 2]);
  });

  it("should take the whole array if the take number is greater than the array length", () => {
    const result = iter(iterable)
      .take(iterable.length + 4)
      .collect();

    expect(result).toStrictEqual(iterable);
  });

  it("should take no elements if the take number is negative", () => {
    const result = iter(iterable).take(-6).collect();

    expect(result).toStrictEqual([]);
  });

  it("should take items, then map on the taken items", () => {
    const result = iter(iterable)
      .take(2)
      .map((number) => number * number)
      .collect();

    expect(result).toStrictEqual([1, 4]);
  });

  it("should map the items, then take the mapped items", () => {
    const result = iter(iterable)
      .map((number) => number * number)
      .take(2)
      .collect();

    expect(result).toStrictEqual([1, 4]);
  });

  it("should skip the specified number of elements", () => {
    const result = iter(iterable).skip(2).collect();

    expect(result).toStrictEqual(iterable.slice(2));
  });

  it("should skip the whole array if the skip number is greater than the array length", () => {
    const result = iter(iterable)
      .skip(iterable.length + 4)
      .collect();

    expect(result).toStrictEqual([]);
  });

  it("should skip no elements if the skip number is negative", () => {
    const result = iter(iterable).skip(-6).collect();

    expect(result).toStrictEqual(iterable);
  });

  it("should skip items, then map on the skipped items", () => {
    const result = iter(iterable)
      .skip(2)
      .map((number) => number * number)
      .collect();

    expect(result).toStrictEqual(
      iterable.slice(2).map((number) => number * number)
    );
  });

  it("should map the items, then skip the mapped items", () => {
    const result = iter(iterable)
      .map((number) => number * number)
      .skip(2)
      .collect();

    expect(result).toStrictEqual(
      iterable.map((number) => number * number).slice(2)
    );
  });

  it("should filter the items, then skip them", () => {
    const result = iter(iterable)
      .filter((number) => number % 2 !== 0)
      .skip(1)
      .collect();

    expect(result).toStrictEqual(
      iterable.filter((number) => number % 2 !== 0).slice(1)
    );
  });

  it("should skip the items, then filter them", () => {
    const result = iter(iterable)
      .skip(1)
      .filter((number) => number % 2 !== 0)
      .collect();

    expect(result).toStrictEqual(
      iterable.slice(1).filter((number) => number % 2 !== 0)
    );
  });

  it("should correctly scan the iterable", () => {
    const result = iter([1, 2, 3, 4])
      .scan((acc, number) => acc + number, 0)
      .collect();

    expect(result).toStrictEqual([1, 3, 6, 10]);
  });
});
