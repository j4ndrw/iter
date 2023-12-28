import { ILazyIterator, Operation, ReducedIterator } from "./types";
import { cast, defaultOf } from "./utils";

class LazyIterator<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never,
> implements ILazyIterator<TIterable, TAggregates, TReducedAggregate>
{
  private iterable: TIterable[];
  private operations: Operation<TIterable>[] = [];
  private reduced: boolean = false;

  private skipMany: number;
  private takeMany: number;

  constructor(iterable: TIterable) {
    this.iterable = iterable;
    this.skipMany = 0;
    this.takeMany = iterable.length;
  }

  collect(): TReducedAggregate | TAggregates {
    let collected = [];
    let numCollected = 0;

    for (let iterIndex = 0; iterIndex < this.iterable.length; iterIndex++) {
      const { aggregate, shouldCollect } = this.aggregateItem(iterIndex);

      if (this.reduced && iterIndex === this.iterable.length - 1)
        return aggregate;

      if (!shouldCollect || this.reduced) continue;
      if (collected.length === this.takeMany) break;

      if (numCollected >= this.skipMany) collected.push(aggregate);

      numCollected++;
    }

    return collected as TAggregates;
  }

  private aggregateItem(iterIndex: number): {
    aggregate: TIterable[number] | TAggregates[number];
    shouldCollect: boolean;
  } {
    let aggregate = this.iterable[iterIndex] as
      | TIterable[number]
      | TAggregates[number];
    let shouldCollect = true;

    for (
      let operationIndex = 0;
      operationIndex < this.operations.length;
      operationIndex++
    ) {
      ({ aggregate = aggregate, shouldCollect = shouldCollect } =
        this.applyOperation(operationIndex, aggregate, shouldCollect));
    }
    return { aggregate, shouldCollect };
  }

  private applyOperation(
    operationIndex: number,
    aggregate?: TIterable[number] | TAggregates[number],
    shouldCollect?: boolean,
  ): {
    aggregate?: unknown;
    shouldCollect?: boolean;
  } {
    if (!shouldCollect) return {};

    const operation = this.operations[operationIndex];
    const [kind, fn, ...rest] = operation;

    if (kind === "map") return { aggregate: this.applyMap(fn, aggregate) };
    if (kind === "filter")
      return { shouldCollect: this.applyFilter(fn, aggregate) };

    if (kind === "fold") {
      const [accumulator] = rest;
      return {
        aggregate: this.applyFold(fn, aggregate, accumulator, operationIndex),
      };
    }

    if (kind === "reduce")
      return { aggregate: this.applyReduction(fn, aggregate, operationIndex) };

    if (kind === "scan") {
      const [accumulator] = rest;

      return {
        aggregate: this.applyScan(fn, aggregate, accumulator, operationIndex),
      };
    }

    return {};
  }

  map<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => TResult,
  ): TItem extends never ? never : ILazyIterator<TIterable, TResult[], never> {
    if (this.reduced)
      throw new Error("Cannot map an iterable that has been reduced");

    this.operations.push(["map", fn]);
    return cast<typeof this.map<TResult, TItem>>(this);
  }

  private applyMap(
    fn: (item: TAggregates[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number],
  ) {
    return fn(aggregate);
  }

  filter<TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => boolean,
  ): TItem extends never
    ? never
    : ILazyIterator<TIterable, TAggregates, never> {
    if (this.reduced)
      throw new Error("Cannot filter an iterable that has been reduced");

    this.operations.push(["filter", fn]);
    return cast<typeof this.filter<TItem>>(this);
  }

  private applyFilter(
    fn: (item: TAggregates[number]) => boolean,
    aggregate: TAggregates[number] | TIterable[number],
  ) {
    return fn(aggregate);
  }

  fold<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc,
  ): TItem extends never ? never : ReducedIterator<TIterable, TResult> {
    if (this.reduced)
      throw new Error("Cannot fold an iterable that has already been reduced");

    this.operations.push([
      "fold",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return cast<typeof this.fold<TAcc, TResult, TItem>>(this);
  }

  private applyFold(
    fn: (acc: unknown, item: TAggregates[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number],
    accumulator: unknown,
    operationIndex: number,
  ) {
    this.reduced = true;

    aggregate = fn(accumulator, aggregate);
    this.operations[operationIndex] = ["fold", fn, aggregate];
    return aggregate;
  }

  reduce<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (
      acc: TAggregates[1] extends never ? never : TAggregates[number],
      item: TItem,
    ) => TResult,
  ): TItem extends never
    ? never
    : TAggregates[1] extends never
    ? never
    : ReducedIterator<TIterable, TResult> {
    if (this.reduced)
      throw new Error("Cannot fold an iterable that has already been reduced");

    this.operations.push([
      "reduce",
      fn as (acc: unknown, item: unknown) => unknown,
    ]);
    return cast<typeof this.reduce<TResult, TItem>>(this);
  }

  private applyReduction(
    fn: (acc: TIterable[number], item: TIterable[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number],
    operationIndex: number,
  ) {
    const accumulator = defaultOf(typeof aggregate);
    return this.applyFold(fn, accumulator, aggregate, operationIndex);
  }

  scan<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc,
  ): TItem extends never
    ? never
    : ILazyIterator<TIterable, TAggregates, never> {
    if (this.reduced)
      throw new Error("Cannot scan an iterable that has already been reduced");

    this.operations.push([
      "scan",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return cast<typeof this.scan<TAcc, TResult, TItem>>(this);
  }

  private applyScan(
    fn: (acc: unknown, item: TIterable[number]) => unknown,
    aggregate: TIterable[number] | TAggregates[number],
    accumulator: unknown,
    operationIndex: number,
  ) {
    aggregate = fn(accumulator, aggregate);
    this.operations[operationIndex] = ["scan", fn, aggregate];
    return aggregate;
  }

  take<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number,
  ): TItem extends never
    ? never
    : ILazyIterator<TIterable, TAggregates, never> {
    if (this.reduced)
      throw new Error("Cannot take an iterable that has already been reduced");

    this.takeMany = (() => {
      if (many < 0) return 0;
      if (many > this.iterable.length) return this.iterable.length;

      return many;
    })();
    return cast<typeof this.take>(this);
  }

  skip<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number,
  ): TItem extends never
    ? never
    : ILazyIterator<TIterable, TAggregates, never> {
    if (this.reduced)
      throw new Error("Cannot skip an iterable that has already been reduced");

    this.skipMany = (() => {
      if (many < 0) return 0;
      if (many > this.iterable.length) return this.iterable.length;

      return many;
    })();

    return cast<typeof this.skip>(this);
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
