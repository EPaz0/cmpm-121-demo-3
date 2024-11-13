import { Coin, createCoin, getCoinId } from "./coin.ts";
import { Cell } from "./board.ts"; // Ensure Cell is imported if it's used in Coin

interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

export class Cache implements Memento<string> {
  public coins: Coin[];
  public remainingCoins: number;

  constructor(public cell: Cell, initialCoinCount: number) {
    this.coins = this.createInitialCoins(initialCoinCount);
    this.remainingCoins = initialCoinCount;
  }

  private createInitialCoins(count: number): Coin[] {
    const coins: Coin[] = [];
    for (let index = 0; index < count; index++) {
      coins.push(createCoin(this.cell, index));
    }
    return coins;
  }

  toMemento(): string {
    return JSON.stringify(this.coins.map((coin) => getCoinId(coin)));
  }

  fromMemento(memento: string): void {
    const ids = JSON.parse(memento);
    this.coins = ids.map((id: string) => {
      const parts = id.split("#");
      const serial = parseInt(parts[1], 10);
      const ij = parts[0].split(":");
      const i = parseInt(ij[0], 10);
      const j = parseInt(ij[1], 10);
      const cell = { i, j };
      return createCoin(cell, serial);
    });
  }
}

class CacheManager {
  private caches: Cache[];
  private playerPosition: { i: number; j: number };
  private radius: number;
  private cacheStates: Map<Cache, string> = new Map();

  constructor(
    caches: Cache[],
    playerPosition: { i: number; j: number },
    radius: number,
  ) {
    this.caches = caches;
    this.playerPosition = playerPosition;
    this.radius = radius;
  }

  updatePlayerPosition(newPosition: { i: number; j: number }) {
    this.playerPosition = newPosition;
    this.updateVisibleCaches();
  }

  private updateVisibleCaches() {
    this.caches.forEach((cache) => {
      const distance = this.calculateDistance(this.playerPosition, cache.cell);
      if (distance > this.radius && !this.cacheStates.has(cache)) {
        const memento = cache.toMemento();
        this.cacheStates.set(cache, memento);
        cache.coins = []; // Or however you need to represent "invisible"
      } else if (distance <= this.radius && this.cacheStates.has(cache)) {
        const savedState = this.cacheStates.get(cache)!;
        cache.fromMemento(savedState);
        this.cacheStates.delete(cache);
      }
    });
  }

  private calculateDistance(
    pos1: { i: number; j: number },
    pos2: Cell,
  ): number {
    return Math.sqrt(
      Math.pow(pos1.i - pos2.i, 2) + Math.pow(pos1.j - pos2.j, 2),
    );
  }
}
