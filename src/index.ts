import { EitherNever, Iter as IIter, Operation, ReducedIter } from "./types";
import { defaultOf } from "./utils";

export class Iter<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never
> implements IIter<TIterable, TAggregates, TReducedAggregate>
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
      let aggregate: TIterable[number] | TAggregates[number] =
        this.iterable[iterIndex];
      let shouldCollect = true;

      for (
        let operationIndex = 0;
        operationIndex < this.operations.length;
        operationIndex++
      ) {
        if (!shouldCollect) break;

        const operation = this.operations[operationIndex];
        const [kind, fn, ...rest] = operation;

        if (kind === "map") {
          aggregate = this.applyMap(fn, aggregate);
          continue;
        }

        if (kind === "filter") {
          shouldCollect = this.applyFilter(fn, aggregate);
          continue;
        }

        if (kind === "fold") {
          const [accumulator] = rest;
          aggregate = this.applyFold(
            fn,
            aggregate,
            accumulator,
            operationIndex
          );
          continue;
        }

        if (kind === "reduce") {
          aggregate = this.applyReduction(
            fn,
            aggregate,
            iterIndex,
            operationIndex
          );
          continue;
        }

        if (kind === "scan") {
          const [accumulator] = rest;

          aggregate = this.applyScan(
            fn,
            aggregate,
            accumulator,
            operationIndex
          );
          continue;
        }
      }

      if (this.reduced && iterIndex === this.iterable.length - 1)
        return aggregate;

      if (shouldCollect && !this.reduced) {
        if (collected.length === this.takeMany) break;
        if (numCollected >= this.skipMany) collected.push(aggregate);
        numCollected++;
      }
    }

    return collected as TAggregates;
  }

  map<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => TResult
  ): EitherNever<TItem, Iter<TIterable, TResult[]>> {
    if (this.reduced)
      throw new Error("Cannot map an iterable that has been reduced");

    this.operations.push(["map", fn]);
    return this as unknown as ReturnType<typeof this.map<TResult, TItem>>;
  }

  private applyMap(
    fn: (item: TAggregates[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number]
  ) {
    return fn(aggregate);
  }

  filter<TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => boolean
  ): EitherNever<TItem, Iter<TIterable, TAggregates>> {
    if (this.reduced)
      throw new Error("Cannot filter an iterable that has been reduced");

    this.operations.push(["filter", fn]);
    return this as unknown as ReturnType<typeof this.filter<TItem>>;
  }

  private applyFilter(
    fn: (item: TAggregates[number]) => boolean,
    aggregate: TAggregates[number] | TIterable[number]
  ) {
    return fn(aggregate);
  }

  fold<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc
  ): EitherNever<TItem, ReducedIter<TIterable, TResult>> {
    if (this.reduced)
      throw new Error("Cannot fold an iterable that has already been reduced");

    this.operations.push([
      "fold",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return this as unknown as ReturnType<
      typeof this.fold<TAcc, TResult, TItem>
    >;
  }

  private applyFold(
    fn: (acc: unknown, item: TAggregates[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number],
    accumulator: unknown,
    operationIndex: number
  ) {
    this.reduced = true;

    aggregate = fn(accumulator, aggregate);
    this.operations[operationIndex] = ["fold", fn, aggregate];
    return aggregate;
  }

  reduce<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (
      acc: EitherNever<TAggregates[1], TAggregates[number]>,
      item: TItem
    ) => TResult
  ): EitherNever<
    TItem,
    EitherNever<TAggregates[1], ReducedIter<TIterable, TResult>>
  > {
    if (this.reduced)
      throw new Error("Cannot fold an iterable that has already been reduced");

    this.operations.push([
      "reduce",
      fn as (acc: unknown, item: unknown) => unknown,
    ]);
    return this as unknown as ReturnType<typeof this.reduce<TResult, TItem>>;
  }

  private applyReduction(
    fn: (acc: TIterable[number], item: TIterable[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number],
    iterIndex: number,
    operationIndex: number
  ) {
    const accumulator = (() => {
      if (iterIndex === 0) return defaultOf(typeof aggregate);
      return this.iterable[iterIndex - 1];
    })();

    return this.applyFold(fn, accumulator, aggregate, operationIndex);
  }

  scan<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc
  ): EitherNever<TItem, IIter<TIterable, TAggregates, never>> {
    if (this.reduced)
      throw new Error("Cannot scan an iterable that has already been reduced");

    this.operations.push([
      "scan",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return this as unknown as ReturnType<
      typeof this.scan<TAcc, TResult, TItem>
    >;
  }

  private applyScan(
    fn: (acc: unknown, item: TIterable[number]) => unknown,
    aggregate: TIterable[number] | TAggregates[number],
    accumulator: unknown,
    operationIndex: number
  ) {
    aggregate = fn(accumulator, aggregate);
    this.operations[operationIndex] = ["scan", fn, aggregate];
    return aggregate;
  }

  take<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number
  ): EitherNever<TItem, IIter<TIterable, TAggregates, never>> {
    this.takeMany = (() => {
      if (many < 0) return 0;
      if (many > this.iterable.length) return this.iterable.length;

      return many;
    })();
    return this as unknown as ReturnType<typeof this.take>;
  }

  skip<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number
  ): EitherNever<TItem, IIter<TIterable, TAggregates, never>> {
    this.skipMany = (() => {
      if (many < 0) return 0;
      if (many > this.iterable.length) return this.iterable.length;

      return many;
    })();
    return this as unknown as ReturnType<typeof this.take>;
  }
}

export const iter = <T extends any[]>(item: T) => new Iter(item);
