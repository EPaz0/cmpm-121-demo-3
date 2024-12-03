import { Cell } from "./board.ts";

export interface Coin {
  cell: Cell;
  serial: number;
}

export function createCoin(cell: Cell, serial: number): Coin {
  const coin = { cell, serial };
  // console.log(`Coin created: ${JSON.stringify(cell)} with ID: ${getCoinId(coin)}`);
  return coin;
}

export function getCoinId(coin: Coin): string {
  return `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;
}
