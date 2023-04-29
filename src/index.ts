export class Iter<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never
> {
  private iterable: TIterable[];
  private operations: (
    | ["map", ...Parameters<typeof this.map>]
    | ["filter", ...Parameters<typeof this.filter>]
    | ["reduce", ...Parameters<typeof this.reduce>]
  )[] = [];
  private reduced: boolean = false;

  constructor(iterable: TIterable) {
    this.iterable = iterable;
  }

  collect(): TReducedAggregate | TAggregates {
    let collected = [];

    for (let i = 0; i < this.iterable.length; i++) {
      let aggregate: TIterable[number] | TAggregates[number] = this.iterable[i];
      let shouldCollect = true;

      this.operations.forEach((op, opIndex) => {
        const [kind, fn, ...rest] = op;

        switch (kind) {
          case "map": {
            aggregate = fn(aggregate);
            console.log({ mapAggregate: aggregate });
            break;
          }
          case "filter": {
            shouldCollect = fn(aggregate);
            break;
          }
          case "reduce": {
            if (!shouldCollect) break;
            this.reduced = true;

            const [initialAccumulator] = rest;
            aggregate = fn(initialAccumulator, aggregate);
            console.log({ reduceAggregate: aggregate });
            this.operations[opIndex] = [kind, fn, aggregate];
            break;
          }
        }
      });

      if (this.reduced && i === this.iterable.length - 1) {
        return aggregate;
      }
      if (shouldCollect && !this.reduced) collected.push(aggregate);
    }

    return collected as TAggregates;
  }

  map<TResult>(
    fn: (item: TAggregates[number]) => TResult
  ): Iter<TIterable, TResult[]> {
    this.operations.push(["map", fn]);
    return this as unknown as Iter<TIterable, TResult[]>;
  }

  filter(
    fn: (item: TAggregates[number]) => boolean
  ): Iter<TIterable, TAggregates> {
    this.operations.push(["filter", fn]);
    return this as unknown as Iter<TIterable, TAggregates>;
  }

  reduce<TAcc, TResult>(
    fn: (acc: TAcc, item: TAggregates[number]) => TResult,
    initialAccumulator: TAcc
  ): Iter<TIterable, never, TResult> {
    this.operations.push([
      "reduce",
      fn as (acc: unknown, item: unknown) => unknown,
      initialAccumulator,
    ]);
    return this as unknown as Iter<TIterable, never, TResult>;
  }
}

export const iter = <T extends any[]>(item: T) => new Iter(item);
