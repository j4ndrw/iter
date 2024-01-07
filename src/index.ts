import { ILazyIterator, Operation, ReducedIterator } from "./types";
import { castFromReturnType, defaultOf } from "./utils";

type GeneratorOptions = {
  flat: {
    cursor: number;
    depth: number;
    recursions: number;
  };
  pause?: boolean;
};
type GeneratorProcess<Aggregate extends unknown> = (
  item: unknown,
  options: GeneratorOptions,
) => {
  skip?: boolean;
  aggregate: Aggregate;
  reduced?: boolean;
  pause?: boolean;
  options: GeneratorOptions;
};

const createGenerator = function* <
  Iterable extends any[],
  Aggregate extends unknown,
>(
  iterable: Iterable,
  from: number,
  to: number,
  process: GeneratorProcess<Aggregate>,
) {
  let iterIndex = Math.max(from, 0);
  let length = Math.min(to, iterable.length);

  let options: GeneratorOptions = {
    flat: { cursor: 0, depth: 0, recursions: 0 },
    pause: false,
  };

  while (iterIndex < length) {
    const result = process(iterable[iterIndex], options);
    options = result.options;

    const { aggregate, skip = false, reduced = false } = result;
    if (!skip) yield { aggregate, reduced };
    if (!options.pause) iterIndex++;
  }
};

class LazyIterator<
  Iterable extends any[],
  Aggregates extends any[] = Iterable,
  ReducedAggregate extends any = never,
> implements ILazyIterator<Iterable, Aggregates, ReducedAggregate>
{
  private iterable: Iterable[];
  private operations: Operation<Iterable>[] = [];

  private skipMany: number;
  private takeMany: number;

  constructor(iterable: Iterable) {
    this.iterable = iterable;
    this.skipMany = 0;
    this.takeMany = iterable.length;
  }

  collect(): ReducedAggregate | Aggregates {
    const collection = [];
    const reducedCollection: {
      present: boolean;
      result: Iterable[number] | Aggregates[number];
    } = { present: false, result: null };

    const process: GeneratorProcess<Aggregates> = (item, options) => {
      let aggregate = item as Iterable[number] | Aggregates[number];

      for (let opIndex = 0; opIndex < this.operations.length; opIndex++) {
        const operation = this.operations[opIndex];
        const [kind, fnOrValue, acc] = operation;

        if (kind === "identity") fnOrValue(aggregate);

        if (Array.isArray(aggregate) && kind === "flat") {
          // const aggregateArray = aggregate as unknown[];
          // options.flat.depth = (() => {
          //   if (typeof fnOrValue === "undefined") return 1;
          //   if (fnOrValue <= 0) return 0;
          //   return fnOrValue;
          // })();
          // if (
          //   options.flat.depth > 0 &&
          //   options.flat.recursions < aggregateArray.length
          // ) {
          //   const flattenResult = this.applyFlatten(
          //     aggregate,
          //     options.flat.cursor,
          //   );
          //   options.flat.cursor = flattenResult.flatCursor;
          //
          //   aggregate = flattenResult.aggregate;
          //   if (flattenResult.skip) return { skip: true, aggregate, options };
          //
          //   options.flat.recursions++;
          //   options.pause = true;
          //   const result = process(aggregate, options);
          //
          //   if (result.skip) {
          //     options.pause = false;
          //     return { skip: true, aggregate, options };
          //   }
          //   aggregate = result.aggregate;
          // }
          // return { aggregate, options };
        }

        aggregate = (() => {
          switch (kind) {
            case "map":
              return this.applyMap(fnOrValue, aggregate);
            case "scan":
              return this.applyScan(fnOrValue, aggregate, acc, opIndex);
            case "fold":
              return this.applyFold(fnOrValue, aggregate, acc, opIndex);
            case "reduce":
              return this.applyReduction(fnOrValue, aggregate, opIndex);
            default:
              return aggregate;
          }
        })();

        if (kind === "filter" && !this.applyFilter(fnOrValue, aggregate)) {
          return { skip: true, aggregate, options };
        }

        if ((["fold", "reduce"] as (typeof kind)[]).includes(kind)) {
          return { reduced: true, aggregate, options };
        }
      }
      return { aggregate, options };
    };

    const generator = createGenerator(
      this.iterable,
      this.skipMany,
      this.takeMany,
      process,
    );

    for (const item of generator) {
      const { aggregate, reduced } = item;

      reducedCollection.present = reduced;
      if (reducedCollection.present) reducedCollection.result = aggregate;
      else collection.push(aggregate);
    }

    if (reducedCollection.present) return reducedCollection.result;
    return collection as Aggregates;
  }

  private applyMap(
    fn: (item: Aggregates[number]) => unknown,
    aggregate: Aggregates[number] | Iterable[number],
  ) {
    return fn(aggregate);
  }

  private applyFilter(
    fn: (item: Aggregates[number]) => boolean,
    aggregate: Aggregates[number] | Iterable[number],
  ) {
    return fn(aggregate);
  }

  private applyFold(
    fn: (acc: unknown, item: Aggregates[number]) => unknown,
    aggregate: Aggregates[number] | Iterable[number],
    accumulator: unknown,
    operationIndex: number,
  ) {
    aggregate = fn(accumulator, aggregate);
    this.operations[operationIndex] = ["fold", fn, aggregate];
    return aggregate;
  }

  private applyReduction(
    fn: (acc: Iterable[number], item: Iterable[number]) => unknown,
    aggregate: Aggregates[number] | Iterable[number],
    operationIndex: number,
  ) {
    const accumulator = defaultOf(typeof aggregate);
    return this.applyFold(fn, accumulator, aggregate, operationIndex);
  }

  private applyScan(
    fn: (acc: unknown, item: Iterable[number]) => unknown,
    aggregate: Iterable[number] | Aggregates[number],
    accumulator: unknown,
    operationIndex: number,
  ) {
    aggregate = fn(accumulator, aggregate);
    this.operations[operationIndex] = ["scan", fn, aggregate];
    return aggregate;
  }

  private applyFlatten(
    aggregate: Iterable[number] | Aggregates[number],
    flatCursor: number = 0,
  ): {
    aggregate: Iterable[number] | Aggregates[number];
    flatCursor: number;
    skip?: boolean;
  } {
    if (flatCursor === (aggregate as unknown[]).length) {
      return { aggregate, flatCursor: 0, skip: true };
    }

    aggregate = (aggregate as unknown[])[flatCursor];
    flatCursor++;

    return { aggregate, flatCursor };
  }

  map<Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (item: Item) => Result,
  ): Item extends never ? never : ILazyIterator<Iterable, Result[], never> {
    this.operations.push(["map", fn]);
    return castFromReturnType<typeof this.map<Result, Item>>(this);
  }

  filter<Item extends Aggregates[number] = Aggregates[number]>(
    fn: (item: Item) => boolean,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates, never> {
    this.operations.push(["filter", fn]);
    return castFromReturnType<typeof this.filter<Item>>(this);
  }

  fold<TAcc, Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (acc: TAcc, item: Item) => Result,
    initialAccumulator: TAcc,
  ): Item extends never ? never : ReducedIterator<Iterable, Result> {
    this.operations.push([
      "fold",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return castFromReturnType<typeof this.fold<TAcc, Result, Item>>(this);
  }

  reduce<Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (
      acc: Aggregates[1] extends never ? never : Aggregates[number],
      item: Item,
    ) => Result,
  ): Item extends never
    ? never
    : Aggregates[1] extends never
      ? never
      : ReducedIterator<Iterable, Result> {
    this.operations.push([
      "reduce",
      fn as (acc: unknown, item: unknown) => unknown,
    ]);
    return castFromReturnType<typeof this.reduce<Result, Item>>(this);
  }

  scan<TAcc, Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (acc: TAcc, item: Item) => Result,
    initialAccumulator: TAcc,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates, never> {
    this.operations.push([
      "scan",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return castFromReturnType<typeof this.scan<TAcc, Result, Item>>(this);
  }

  take<Item extends Aggregates[number] = Aggregates[number]>(
    many: number,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates, never> {
    this.takeMany = (() => {
      if (many < 0) return 0;
      if (many > this.iterable.length) return this.iterable.length;

      return many;
    })();
    return castFromReturnType<typeof this.take>(this);
  }

  skip<Item extends Aggregates[number] = Aggregates[number]>(
    many: number,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates, never> {
    this.skipMany = (() => {
      if (many < 0) return 0;
      if (many > this.iterable.length) return this.iterable.length;

      return many;
    })();
    return castFromReturnType<typeof this.skip>(this);
  }

  flat<Item extends Aggregates[number] = Aggregates[number]>(
    depth?: number,
  ): Item extends never
    ? never
    : ILazyIterator<
        Iterable,
        Item extends any[][] ? Item[number] : Item,
        never
      > {
    this.operations.push(["flat", depth]);
    return castFromReturnType<typeof this.flat<Item>>(this);
  }

  identity<Item extends Aggregates[number] = Aggregates[number]>(
    fn: (item: Item) => void,
  ): Item extends never ? never : ILazyIterator<Iterable, Item[], never> {
    this.operations.push(["identity", fn]);
    return castFromReturnType<typeof this.identity<Item>>(this);
  }
}

Array.prototype.iter = function () {
  return new LazyIterator(this);
};

declare global {
  interface Array<T> {
    iter(): LazyIterator<T[]>;
  }
}
