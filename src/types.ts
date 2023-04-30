export interface Iter<
  TIterable extends any[],
  TAggregates extends any[] = TIterable,
  TReducedAggregate extends any = never
> {
  collect(): TReducedAggregate | TAggregates;
  map<TResult, TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => TResult
  ): TItem extends never ? never : Iter<TIterable, TResult[]>;
  filter<TItem extends TAggregates[number] = TAggregates[number]>(
    fn: (item: TItem) => boolean
  ): TItem extends never ? never : Iter<TIterable, TAggregates>;
  reduce<
    TAcc,
    TResult,
    TItem extends TAggregates[number] = TAggregates[number]
  >(
    fn: (acc: TAcc, item: TItem) => TResult,
    initialAccumulator: TAcc
  ): TItem extends never ? never : ReducedIter<TIterable, TResult>;
}

export type ReducedIter<
  TIterable extends any[],
  TReducedAggregate extends any = never
> = Pick<Iter<TIterable, never, TReducedAggregate>, "collect">;

export type Operation<TIterable extends any[]> =
  | ["map", ...Parameters<Iter<TIterable>["map"]>]
  | ["filter", ...Parameters<Iter<TIterable>["filter"]>]
  | ["reduce", ...Parameters<Iter<TIterable>["reduce"]>];

export type EitherNever<NeverType, Type> = NeverType extends never
  ? never
  : Type;
