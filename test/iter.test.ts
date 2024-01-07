import { describe, it, expect } from "vitest";

import "../src";

describe("LazyIterator", () => {
  const iterable = [1, 2, 3, 4, 5, 6, 0, 24, 13];
  const flattenableIterable = [
    [1, 2, 3],
    [4, 5, 6],
  ];

  describe("primitives", () => {
    describe("map", () => {
      it("should map the iterable", () => {
        const result = iterable
          .iter()
          .map((item) => item * 2 + 1)
          .collect();

        expect(result).toStrictEqual(iterable.map((item) => item * 2 + 1));
      });
    });

    describe("filter", () => {
      it("should filter the iterable", () => {
        const result = iterable
          .iter()
          .filter((item) => item === 999)
          .collect();

        expect(result).toStrictEqual(iterable.filter((item) => item === 999));
      });
    });

    describe("fold", () => {
      it("should fold the iterable", () => {
        const result = iterable
          .iter()
          .fold((acc, item) => acc + item, 0)
          .collect();

        expect(result).toBe(iterable.reduce((acc, item) => acc + item, 0));
      });
    });

    describe("reduce", () => {
      it("should correctly apply a sum reduction", () => {
        const result = iterable
          .iter()
          .reduce((acc, number) => acc + number)
          .collect();

        expect(result).toBe(iterable.reduce((acc, number) => acc + number));
      });

      it("should correctly apply the reduction on an array with a single element", () => {
        const result = [1]
          .iter()
          .reduce((acc, number) => `this is number ${acc + number}`)
          .collect();

        expect(result).toBe("this is number 1");
      });
    });

    describe("take", () => {
      it("should take the specified number of elements", () => {
        const result = iterable.iter().take(2).collect();

        expect(result).toStrictEqual([1, 2]);
      });

      it("should take the whole array if the take number is greater than the array length", () => {
        const result = iterable
          .iter()
          .take(iterable.length + 4)
          .collect();

        expect(result).toStrictEqual(iterable);
      });

      it("should take no elements if the take number is negative", () => {
        const result = iterable.iter().take(-6).collect();

        expect(result).toStrictEqual([]);
      });
    });

    describe("skip", () => {
      it("should skip the specified number of elements", () => {
        const result = iterable.iter().skip(2).collect();

        expect(result).toStrictEqual(iterable.slice(2));
      });

      it("should skip the whole array if the skip number is greater than the array length", () => {
        const result = iterable
          .iter()
          .skip(iterable.length + 4)
          .collect();

        expect(result).toStrictEqual([]);
      });

      it("should skip no elements if the skip number is negative", () => {
        const result = iterable.iter().skip(-6).collect();

        expect(result).toStrictEqual(iterable);
      });
    });

    describe("scan", () => {
      it("should correctly scan the iterable", () => {
        const result = [1, 2, 3, 4]
          .iter()
          .scan((acc, number) => acc + number, 0)
          .collect();

        expect(result).toStrictEqual([1, 3, 6, 10]);
      });
    });

    describe("flat", () => {
      it("should correctly flatten the iterable", () => {
        const result = flattenableIterable.iter().flat().collect();
        expect(result).toStrictEqual(flattenableIterable.flat());
      });
      it("should return the iterable as is if the depth is <= 1", () => {
        const result = [1, 2, 3].iter().flat().collect();
        expect(result).toStrictEqual([1, 2, 3]);
      });
      // it("should flatten the whole iterable if the specified depth is greater than the actual depth", () => {
      //   const result = deeperFlattenableIterable.iter().flat(2).collect();
      //   expect(result).toStrictEqual(deeperFlattenableIterable.flat(2));
      // });
    });
  });

  describe("combos", () => {
    it("should square all numbers, filter the odd ones and sum them up", () => {
      const result = iterable
        .iter()
        .map((num) => num * num)
        .filter((num) => num % 2 !== 0)
        .fold((acc, num) => acc + num, 0)
        .collect();

      expect(result).toBe(
        iterable
          .map((num) => num * num)
          .filter((num) => num % 2 !== 0)
          .reduce((acc, item) => acc + item, 0),
      );
    });

    it("should construct a record of strings with numbers as values", () => {
      const result = iterable
        .iter()
        .fold(
          (acc, item) => {
            if (item % 2 === 0) {
              acc[`even ${item}`] = item;
              return acc;
            }
            acc[`odd ${item}`] = item;
            return acc;
          },
          {} as Record<`odd ${number}` | `even ${number}`, number>,
        )
        .collect();

      expect(result).toStrictEqual(
        iterable.reduce(
          (acc, item) => {
            if (item % 2 === 0) {
              acc[`even ${item}`] = item;
              return acc;
            }
            acc[`odd ${item}`] = item;
            return acc;
          },
          {} as Record<`odd ${number}` | `even ${number}`, number>,
        ),
      );
    });

    it("should take items, then map on the taken items", () => {
      const result = iterable
        .iter()
        .take(2)
        .map((number) => number * number)
        .collect();

      expect(result).toStrictEqual([1, 4]);
    });

    it("should map the items, then take the mapped items", () => {
      const result = iterable
        .iter()
        .map((number) => number * number)
        .take(2)
        .collect();

      expect(result).toStrictEqual([1, 4]);
    });

    it("should skip items, then map on the skipped items", () => {
      const result = iterable
        .iter()
        .skip(2)
        .map((number) => number * number)
        .collect();

      expect(result).toStrictEqual(
        iterable.slice(2).map((number) => number * number),
      );
    });

    it("should map the items, then skip the mapped items", () => {
      const result = iterable
        .iter()
        .map((number) => number * number)
        .skip(2)
        .collect();

      expect(result).toStrictEqual(
        iterable.map((number) => number * number).slice(2),
      );
    });

    it("should filter the items, then skip them", () => {
      const result = iterable
        .iter()
        .filter((number) => number % 2 !== 0)
        .skip(1)
        .collect();

      expect(result).toStrictEqual(
        iterable.filter((number) => number % 2 !== 0).slice(1),
      );
    });

    it("should skip the items, then filter them", () => {
      const result = iterable
        .iter()
        .skip(1)
        .filter((number) => number % 2 !== 0)
        .collect();

      expect(result).toStrictEqual(
        iterable.slice(1).filter((number) => number % 2 !== 0),
      );
    });

    it("should filter, then reduce", () => {
      const result = [1, 2, 3, 4]
        .iter()
        .filter((number) => number % 2 === 0)
        .reduce((acc, number) => acc + number)
        .collect();

      expect(result).toBe(6);
    });

    it("should filter, then fold into an object", () => {
      const result = [1, 2, 3, 4]
        .iter()
        .filter((n) => n % 2 === 0)
        .fold(
          (acc, n) => {
            acc[`num${n}`] = n;
            return acc;
          },
          {} as Record<string, number>,
        )
        .collect();
      expect(result).toStrictEqual({ num2: 2, num4: 4 });
    });

    it("should flatten the iterable, then square the contents, then filter only the even numbers", () => {
      const result = flattenableIterable
        .iter()
        .flat()
        .identity((item) => {
          console.log({ item });
        })
        .map((item) => item * item)
        .filter((item) => item % 2 === 0)
        .collect();

      expect(result).toStrictEqual(
        flattenableIterable
          .flat()
          .map((item) => item * item)
          .filter((item) => item % 2 === 0),
      );
    });
  });
});
