export interface Iter<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never
> {
  collect(): TReducedAggregate | TAggregates;
  map<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => TResult
  ): EitherNever<TItem, Iter<TIterable, TResult[]>>;
  filter<TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => boolean
  ): EitherNever<TItem, Iter<TIterable, TAggregates>>;
  fold<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc
  ): EitherNever<TItem, ReducedIter<TIterable, TResult>>;
  reduce<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAggregates[number], item: TItem) => TResult
  ): EitherNever<
    TItem,
    EitherNever<TAggregates[1], ReducedIter<TIterable, TResult>>
  >;
  scan<TAcc, TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc
  ): EitherNever<TItem, Iter<TIterable, TAggregates>>;
  take<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number
  ): EitherNever<TItem, Iter<TIterable, TAggregates>>;
  skip<TItem extends TAggregates[number] = TAggregates[number]>(
    many: number
  ): EitherNever<TItem, Iter<TIterable, TAggregates>>;
}

export type ReducedIter<
  TIterable extends any[],
  TReducedAggregate extends any = never
> = Pick<Iter<TIterable, never, TReducedAggregate>, "collect">;

export type Operation<TIterable extends any[]> =
  | ["map", ...Parameters<Iter<TIterable>["map"]>]
  | ["filter", ...Parameters<Iter<TIterable>["filter"]>]
  | ["fold", ...Parameters<Iter<TIterable>["fold"]>]
  | ["reduce", ...Parameters<Iter<TIterable>["reduce"]>]
  | ["scan", ...Parameters<Iter<TIterable>["scan"]>];

export type EitherNever<NeverType, Type> = NeverType extends never
  ? never
  : Type;
