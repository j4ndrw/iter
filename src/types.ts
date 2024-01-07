export interface ILazyIterator<
  Iterable extends any[],
  Aggregates extends any[] = Iterable,
  ReducedAggregate extends any = never,
> {
  collect(): ReducedAggregate | Aggregates;

  map<Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (item: Item) => Result,
  ): Item extends never ? never : ILazyIterator<Iterable, Result[]>;

  filter<Item extends Aggregates[number] = Aggregates[number]>(
    fn: (item: Item) => boolean,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates>;

  fold<TAcc, Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (acc: TAcc, item: Item) => Result,
    initialAccumulator: TAcc,
  ): Item extends never ? never : ReducedIterator<Iterable, Result>;

  reduce<Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (acc: Aggregates[number], item: Item) => Result,
  ): Item extends never
    ? never
    : Aggregates[1] extends never
      ? never
      : ReducedIterator<Iterable, Result>;

  scan<TAcc, Result, Item extends Aggregates[number] = Aggregates[number]>(
    fn: (acc: TAcc, item: Item) => Result,
    initialAccumulator: TAcc,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates>;

  take<Item extends Aggregates[number] = Aggregates[number]>(
    many: number,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates>;

  skip<Item extends Aggregates[number] = Aggregates[number]>(
    many: number,
  ): Item extends never ? never : ILazyIterator<Iterable, Aggregates>;

  flat<Item extends Aggregates[number] = Aggregates[number]>(
    depth?: number,
  ): Item extends never
    ? never
    : ILazyIterator<Iterable, Item extends any[][] ? Item[number] : Item>;

  identity<Item extends Aggregates[number] = Aggregates[number]>(
    fn: (item: Item) => void,
  ): Item extends never ? never : ILazyIterator<Iterable, Item[]>;
}

export type ReducedIterator<
  Iterable extends any[],
  TReducedAggregate extends any = never,
> = Pick<ILazyIterator<Iterable, never, TReducedAggregate>, "collect">;

export type Operation<Iterable extends any[]> =
  | ["map", ...Parameters<ILazyIterator<Iterable>["map"]>]
  | ["filter", ...Parameters<ILazyIterator<Iterable>["filter"]>]
  | ["fold", ...Parameters<ILazyIterator<Iterable>["fold"]>]
  | ["reduce", ...Parameters<ILazyIterator<Iterable>["reduce"]>]
  | ["scan", ...Parameters<ILazyIterator<Iterable>["scan"]>]
  | ["take", ...Parameters<ILazyIterator<Iterable>["take"]>]
  | ["skip", ...Parameters<ILazyIterator<Iterable>["skip"]>]
  | ["flat", ...Parameters<ILazyIterator<Iterable>["flat"]>]
  | ["identity", ...Parameters<ILazyIterator<Iterable>["identity"]>];
