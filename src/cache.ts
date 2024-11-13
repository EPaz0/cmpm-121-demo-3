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
