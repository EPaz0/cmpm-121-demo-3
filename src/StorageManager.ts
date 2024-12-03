import leaflet from "leaflet";
import { Coin, createCoin } from "./coin.ts"; // Adjust import paths
import { Cell } from "./board.ts"; // Adjust import paths

interface CacheState {
  coins: Coin[]; // Array of coins in the cache
  remainingCoins: number;
}

export class StorageManager {
  static saveGameState(playerPosition: leaflet.LatLng, playerCoins: number) {
    localStorage.setItem("playerPosition", JSON.stringify(playerPosition));
    localStorage.setItem("playerCoins", playerCoins.toString());
  }

  static loadGameState(): {
    playerPosition: leaflet.LatLng;
    playerCoins: number;
  } | null {
    const savedPosition = localStorage.getItem("playerPosition");
    const savedCoins = localStorage.getItem("playerCoins");

    if (savedPosition && savedCoins) {
      return {
        playerPosition: leaflet.latLng(JSON.parse(savedPosition)),
        playerCoins: parseInt(savedCoins, 10),
      };
    }
    return null;
  }

  static saveCollectedCoins(collectedCoins: Coin[]) {
    // Serialize coins using their properties
    const serializedCoins = collectedCoins.map((coin) => ({
      cell: coin.cell,
      serial: coin.serial,
    }));
    localStorage.setItem("collectedCoins", JSON.stringify(serializedCoins));
  }

  static loadCollectedCoins(): Coin[] {
    // Deserialize coins from saved data
    const serializedCoins = JSON.parse(
      localStorage.getItem("collectedCoins") || "[]",
    );
    return serializedCoins.map((coinData: { cell: Cell; serial: number }) =>
      createCoin(coinData.cell, coinData.serial)
    );
  }

  static saveCacheState(cacheKey: string, cacheState: CacheState) {
    // Serialize cache state with coins and remaining coins
    const serializedState = {
      coins: cacheState.coins.map((coin) => ({
        cell: coin.cell,
        serial: coin.serial,
      })),
      remainingCoins: cacheState.remainingCoins,
    };
    localStorage.setItem(cacheKey, JSON.stringify(serializedState));
  }

  static loadCacheState(cacheKey: string): CacheState | null {
    const savedState = localStorage.getItem(cacheKey);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return {
        coins: parsedState.coins.map((
          coinData: { cell: Cell; serial: number },
        ) => createCoin(coinData.cell, coinData.serial)),
        remainingCoins: parsedState.remainingCoins,
      };
    }
    return null;
  }

  /**
   * Clears a specific cache entry from localStorage based on the cache key.
   */
  static clearCache(cacheKey: string) {
    localStorage.removeItem(cacheKey);
  }

  /**
   * Clears all game-related data from localStorage, including caches, game state, and collected coins.
   */
  static clearAll() {
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("cache-") ||
        key === "playerPosition" ||
        key === "playerCoins" ||
        key === "collectedCoins"
      ) {
        localStorage.removeItem(key);
      }
    });
  }
}
