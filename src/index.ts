import { EitherNever, Iter as IIter, Operation, ReducedIter } from "./types";

export class Iter<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never
> implements IIter<TIterable, TAggregates, TReducedAggregate>
{
  private iterable: TIterable[];
  private operations: Operation<TIterable>[] = [];
  private reduced: boolean = false;

  constructor(iterable: TIterable) {
    this.iterable = iterable;
  }

  collect(): TReducedAggregate | TAggregates {
    let collected = [];

    for (let iterIndex = 0; iterIndex < this.iterable.length; iterIndex++) {
      let aggregate: TIterable[number] | TAggregates[number] =
        this.iterable[iterIndex];
      let shouldCollect = true;

      for (
        let operationIndex = 0;
        operationIndex < this.operations.length;
        operationIndex++
      ) {
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

        if (kind === "reduce") {
          if (!shouldCollect) continue;

          aggregate = this.applyReduce(fn, aggregate, rest, operationIndex);
          continue;
        }
      }

      if (this.reduced && iterIndex === this.iterable.length - 1)
        return aggregate;
      if (shouldCollect && !this.reduced) collected.push(aggregate);
    }

    return collected as TAggregates;
  }

  map<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => TResult
  ): EitherNever<TItem, Iter<TIterable, TResult[]>> {
    if (this.reduced)
      throw new Error("Cannot map an iterable that has been reduced");

    this.operations.push(["map", fn]);
    return this as unknown as EitherNever<TItem, Iter<TIterable, TResult[]>>;
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
    return this as unknown as EitherNever<TItem, Iter<TIterable, TAggregates>>;
  }

  private applyFilter(
    fn: (item: TAggregates[number]) => boolean,
    aggregate: TAggregates[number] | TIterable[number]
  ) {
    return fn(aggregate);
  }

  reduce<
    TAcc,
    TResult,
    TItem extends TAggregates[number] = TAggregates[number]
  >(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc
  ): EitherNever<TItem, ReducedIter<TIterable, TResult>> {
    if (this.reduced)
      throw new Error(
        "Cannot reduce an iterable that has already been reduced"
      );

    this.operations.push([
      "reduce",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return this as unknown as EitherNever<
      TItem,
      ReducedIter<TIterable, TResult>
    >;
  }

  private applyReduce(
    fn: (acc: unknown, item: TAggregates[number]) => unknown,
    aggregate: TAggregates[number] | TIterable[number],
    rest: [] | [unknown],
    opIndex: number
  ) {
    this.reduced = true;

    const [initialAccumulator] = rest;
    aggregate = fn(initialAccumulator, aggregate);
    this.operations[opIndex] = ["reduce", fn, aggregate];
    return aggregate;
  }
}

export const iter = <T extends any[]>(item: T) => new Iter(item);
