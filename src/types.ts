export interface ILazyIterator<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never,
> {
  collect(): TReducedAggregate | TAggregates;

  map<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => TResult,
  ): TItem extends never ? never : ILazyIterator<TIterable, TResult[]>;

  filter<TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => boolean,
  ): TItem extends never ? never : ILazyIterator<TIterable, TAggregates>;

  fold<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc,
  ): TItem extends never ? never : ReducedIterator<TIterable, TResult>;

  reduce<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAggregates[number], item: TItem) => TResult,
  ): TItem extends never
    ? never
    : TAggregates[1] extends never
    ? never
    : ReducedIterator<TIterable, TResult>;

  scan<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc,
  ): TItem extends never ? never : ILazyIterator<TIterable, TAggregates>;

  take<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number,
  ): TItem extends never ? never : ILazyIterator<TIterable, TAggregates>;

  skip<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number,
  ): TItem extends never ? never : ILazyIterator<TIterable, TAggregates>;
}

export type ReducedIterator<
  TIterable extends any[],
  TReducedAggregate extends any = never,
> = Pick<ILazyIterator<TIterable, never, TReducedAggregate>, "collect">;

export type Operation<TIterable extends any[]> =
  | ["map", ...Parameters<ILazyIterator<TIterable>["map"]>]
  | ["filter", ...Parameters<ILazyIterator<TIterable>["filter"]>]
  | ["fold", ...Parameters<ILazyIterator<TIterable>["fold"]>]
  | ["reduce", ...Parameters<ILazyIterator<TIterable>["reduce"]>]
  | ["scan", ...Parameters<ILazyIterator<TIterable>["scan"]>]
  | ["take", ...Parameters<ILazyIterator<TIterable>["take"]>]
  | ["skip", ...Parameters<ILazyIterator<TIterable>["skip"]>];
