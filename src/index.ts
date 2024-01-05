import { ILazyIterator, Operation, ReducedIterator } from "./types";
import { castFromReturnType, defaultOf } from "./utils";

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
  private flatDepth: number;

  constructor(iterable: Iterable) {
    this.iterable = iterable;
    this.skipMany = 0;
    this.takeMany = iterable.length;
    this.flatDepth = 0;
  }

  collect(): ReducedAggregate | Aggregates {
    const collected = [];
    const reduced: {
      present: boolean;
      result: Iterable[number] | Aggregates[number];
    } = { present: false, result: null };

    let iterIndex = Math.max(this.skipMany, 0);
    let length = Math.min(this.takeMany, this.iterable.length);

    let flatCursor = 0;

    const flatten = (aggregate: Iterable[number] | Aggregates[number]) => {
      let remainingDepth = Math.min(
        this.flatDepth,
        (aggregate as unknown[]).length,
      );
      while (remainingDepth !== 0) {
        aggregate = (aggregate as unknown[])[flatCursor];
        remainingDepth--;
      }
      flatCursor++;
      return aggregate;
    };

    while (iterIndex < length) {
      let aggregate = this.iterable[iterIndex] as
        | Iterable[number]
        | Aggregates[number];
      let skipped = false;

      const shouldFlatten = this.flatDepth > 0 && Array.isArray(aggregate);
      if (shouldFlatten) {
        if (flatCursor >= (aggregate as unknown[]).length) {
          iterIndex++;
          flatCursor = 0;
          continue;
        }
        aggregate = flatten(aggregate);
      }

      for (let opIndex = 0; opIndex < this.operations.length; opIndex++) {
        const operation = this.operations[opIndex];
        const [kind, fn, acc] = operation;

        if (kind === "map") aggregate = this.applyMap(fn, aggregate);
        if (kind === "filter" && !this.applyFilter(fn, aggregate)) {
          skipped = true;
          break;
        }
        if (kind === "scan") {
          aggregate = this.applyScan(fn, aggregate, acc, opIndex);
        }
        if (kind === "fold") {
          aggregate = this.applyFold(fn, aggregate, acc, opIndex);
          reduced.present = true;
          reduced.result = aggregate;
          break;
        }
        if (kind === "reduce") {
          aggregate = this.applyReduction(fn, aggregate, opIndex);
          reduced.present = true;
          reduced.result = aggregate;
          break;
        }
      }
      if (!skipped) collected.push(aggregate);
      if (!shouldFlatten) iterIndex++;
    }

    if (reduced.present) return reduced.result;
    return collected as Aggregates;
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
    this.flatDepth += depth ?? 1;
    return castFromReturnType<typeof this.flat<Item>>(this);
  }
}

Array.prototype.iter = function() {
  return new LazyIterator(this);
};

declare global {
  interface Array<T> {
    iter(): LazyIterator<T[]>;
  }
}
