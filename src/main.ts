// Import Leaflet and styles
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images in Leaflet
import "./leafletWorkaround.ts";

import { Board, Cell } from "./board.ts";
import { Coin, createCoin, getCoinId } from "./coin.ts";

// Import deterministic random number generator
import luck from "./luck.ts";
import { Cache } from "./cache.ts"; // Import the Cache class

import { StorageManager } from "./StorageManager.ts";

import { UIManager } from "./uiManager.ts";

const uiManager = new UIManager();

interface CacheLayer extends L.Layer {
  cache?: Cache; // Assuming Cache is the type of your cache object
}

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
let playerPosition = OAKES_CLASSROOM;

const savedPosition = localStorage.getItem("playerPosition");
const initialPosition = savedPosition
  ? leaflet.latLng(JSON.parse(savedPosition))
  : OAKES_CLASSROOM;

const map = leaflet.map("map", {
  center: initialPosition, // Center the map on the saved position if it exists
  zoom: 19, // Set appropriate zoom level for the game
  minZoom: 19,
  maxZoom: 19,
  zoomControl: false,
  scrollWheelZoom: false,
});

const cacheLayer = new leaflet.LayerGroup();
cacheLayer.addTo(map);
// Add background tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Create the Board instance
const TILE_WIDTH = 0.0001; // 1 cell = 0.0001 degrees
const TILE_VISIBILITY_RADIUS = 8; // Define visibility radius
const CACHE_SPAWN_PROBABILITY = 0.1; // 10% chance to spawn a cache
const board = new Board(TILE_WIDTH);

const playerInventory: Coin[] = [];
let playerCoins = 0; // Track player's total coins

function initGame() {
  loadGameState(); // Load the player's state
  regenerateCaches(); // Generate initial caches around the starting position
  loadCollectedCoinsFromStorage();
}

document.addEventListener("DOMContentLoaded", initGame); // Ensure the DOM is fully loaded before initializing the game

function spawnCache(iOffset: number, jOffset: number) {
  const newCachePosition = leaflet.latLng(
    playerPosition.lat + iOffset,
    playerPosition.lng + jOffset,
  );

  const cell = board.getCellForPoint(newCachePosition);
  const bounds = board.getCellBounds(cell);

  let cache = loadCacheState(cell);
  if (!cache) {
    // Correctly initialize the number of coins, avoid overwriting `coinCount`
    cache = new Cache(cell, Math.floor(luck(`${cell.i},${cell.j}`) * 100) + 1);
    /*console.log(
      `New Cache created at ${cell.i}, ${cell.j} with ${cache.coins.length} coins`,
    );*/
  } else {
    // console.log(`Loaded Cache from state at ${cell.i}, ${cell.j}`);
  }

  const rect = leaflet.rectangle(bounds, { color: "blue", weight: 1 });
  rect.addTo(cacheLayer);
  rect.bindPopup(() => createPopupForCache(cache, rect)); // Pass rect here

  return cache;
}
const movementHistory: leaflet.Polyline = leaflet.polyline([], { color: "red" })
  .addTo(map);
function movePlayer(latOffset: number, lngOffset: number) {
  const newLatLng = leaflet.latLng(
    playerPosition.lat + latOffset,
    playerPosition.lng + lngOffset,
  );

  movementHistory.addLatLng(newLatLng);
  playerPosition = newLatLng;
  playerMarker.setLatLng(playerPosition);

  map.panTo(newLatLng); // Center the map on the player's new position

  regenerateCaches();
  StorageManager.saveGameState(playerPosition, playerCoins);
}

function regenerateCaches() {
  clearCaches();

  for (let i = -TILE_VISIBILITY_RADIUS; i <= TILE_VISIBILITY_RADIUS; i++) {
    for (let j = -TILE_VISIBILITY_RADIUS; j <= TILE_VISIBILITY_RADIUS; j++) {
      const latOffset = i * TILE_WIDTH;
      const lngOffset = j * TILE_WIDTH;
      const newPosition = leaflet.latLng(
        playerPosition.lat + latOffset,
        playerPosition.lng + lngOffset,
      );
      const cell = board.getCellForPoint(newPosition);
      let cache = loadCacheState(cell);

      if (!cache && luck(`${cell.i},${cell.j}`) < CACHE_SPAWN_PROBABILITY) {
        cache = spawnCache(latOffset, lngOffset);
      }

      if (cache) {
        const bounds = board.getCellBounds(cell);
        const rect = leaflet.rectangle(bounds, { color: "blue", weight: 1 })
          .addTo(cacheLayer);
        rect.bindPopup(() => createPopupForCache(cache, rect));
      }
    }
  }
}

function saveCollectedCoinsToStorage() {
  StorageManager.saveCollectedCoins(playerInventory); // Save the full playerInventory
}
function loadCollectedCoinsFromStorage() {
  const collectedCoinsList = document.querySelector("#collectedCoinsList")!;
  collectedCoinsList.innerHTML = ""; // Clear existing list to avoid duplicates

  const savedCoins = StorageManager.loadCollectedCoins();
  savedCoins.forEach((savedCoin: { cell: Cell; serial: number }) => {
    const coin = createCoin(savedCoin.cell, savedCoin.serial);
    playerInventory.push(coin);
    uiManager.updateCollectedCoinsUI(getCoinId(coin), () => {
      const [i, jWithSerial] = getCoinId(coin).split(":");
      const [j] = jWithSerial.split("#");
      const coinCell = board.getCellByIndices(Number(i), Number(j));
      const cacheBounds = board.getCellBounds(coinCell);
      map.fitBounds(cacheBounds, { maxZoom: 19, animate: true });
    });
  });
}

function updateCoinCounter() {
  uiManager.updateCoinCounter(playerCoins);
  StorageManager.saveGameState(playerPosition, playerCoins);
}

function createPopupForCache(
  cache: Cache,
  _rect: leaflet.Rectangle,
): HTMLDivElement {
  console.log(`Creating popup for cache at (${cache.cell.i}, ${cache.cell.j})`);
  const popupDiv = document.createElement("div");

  // Populate popup content
  function refreshPopupContent() {
    popupDiv.innerHTML = `
      <div>Cache at (${cache.cell.i}, ${cache.cell.j})</div>
      <div>Coins: ${cache.coins.length}</div>
      <ul>
        ${cache.coins.map((coin) => `<li>${getCoinId(coin)}</li>`).join("")}
      </ul>
      <button id="collectButton">Collect</button>
      <button id="depositButton">Deposit</button>
    `;
  }

  refreshPopupContent(); // Initialize content

  popupDiv.querySelector("#collectButton")?.addEventListener("click", () => {
    if (cache.coins.length > 0) {
      const collectedCoin = cache.coins.pop();
      if (collectedCoin) {
        playerInventory.push(collectedCoin);
        playerCoins++;
        saveCollectedCoinsToStorage();
        saveCacheState(cache);
        updateCoinCounter();

        // Update the UI dynamically
        uiManager.updateCollectedCoinsUI(getCoinId(collectedCoin), () => {
          const [i, jWithSerial] = getCoinId(collectedCoin).split(":");
          const [j] = jWithSerial.split("#");
          const coinCell = board.getCellByIndices(Number(i), Number(j));
          const cacheBounds = board.getCellBounds(coinCell);
          map.fitBounds(cacheBounds, { maxZoom: 19, animate: true });
        });

        refreshPopupContent(); // Refresh popup after collecting
      }
    }
  });

  popupDiv.querySelector("#depositButton")?.addEventListener("click", () => {
    if (playerInventory.length > 0) {
      const depositedCoin = playerInventory.pop();
      if (depositedCoin) {
        cache.coins.push(depositedCoin);
        playerCoins--;
        saveCollectedCoinsToStorage();
        saveCacheState(cache);
        updateCoinCounter();

        // Update the UI dynamically
        uiManager.removeCollectedCoin(getCoinId(depositedCoin));

        refreshPopupContent(); // Refresh popup after depositing
      }
    }
    UIManager;
  });

  return popupDiv;
}

function clearCaches() {
  cacheLayer.eachLayer((layer: CacheLayer) => {
    const cache = layer.cache;
    if (cache) {
      saveCacheState(cache);
    }
  });
  cacheLayer.clearLayers();
}
function saveCacheState(cache: Cache) {
  const key = `cache-${cache.cell.i}-${cache.cell.j}`;
  const state = {
    coins: cache.coins, // Use the Coin objects directly
    remainingCoins: cache.remainingCoins, // Keep as it is
  };
  StorageManager.saveCacheState(key, state); // Pass the correct type
}

function loadGameState() {
  const gameState = StorageManager.loadGameState(); // Load from storage
  if (gameState) {
    playerPosition = gameState.playerPosition; // Restore player position
    playerCoins = gameState.playerCoins; // Restore player coin count
    playerMarker.setLatLng(playerPosition); // Update player marker on map
    updateCoinCounter(); // Update the UI coin counter
  }

  loadCollectedCoinsFromStorage(); // Ensure inventory is restored after refresh
}

function loadCacheState(cell: Cell): Cache | null {
  const key = `cache-${cell.i}-${cell.j}`;
  const savedState = StorageManager.loadCacheState(key);

  if (savedState) {
    const cache = new Cache(cell, 0);
    cache.coins = savedState.coins.map((
      coinData: { cell: Cell; serial: number },
    ) => createCoin(coinData.cell, coinData.serial));
    cache.remainingCoins = savedState.remainingCoins;
    return cache;
  }
  return null;
}
/*
function recreateCoinFromId(coinId: string) {
  const [i, j, serial] = coinId.split(":");
  const cell = { i: parseInt(i), j: parseInt(j) }; // Recreate the cell object
  return createCoin(cell, parseInt(serial));
}*/

// Add event listeners to buttons
document.querySelector("#upButton")?.addEventListener("click", () => {
  movePlayer(0.0001, 0); // Move north
});
document.querySelector("#downButton")?.addEventListener("click", () => {
  movePlayer(-0.0001, 0); // Move south
});
document.querySelector("#leftButton")?.addEventListener("click", () => {
  movePlayer(0, -0.0001); // Move west
});
document.querySelector("#rightButton")?.addEventListener("click", () => {
  movePlayer(0, 0.0001); // Move east
});
// Scan the neighborhood to spawn caches
for (let i = -TILE_VISIBILITY_RADIUS; i <= TILE_VISIBILITY_RADIUS; i++) {
  for (let j = -TILE_VISIBILITY_RADIUS; j <= TILE_VISIBILITY_RADIUS; j++) {
    if (luck(`${i},${j}`) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
function clearCacheEntries() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("cache-")) {
      StorageManager.clearCache(key);
    }
  });
}
function resetGame() {
  clearCacheEntries();
  StorageManager.clearAll();
  uiManager.clearCollectedCoinsUI();
  location.reload();
}

// Add a button to trigger the reset
document.querySelector("#resetButton")?.addEventListener("click", () => {
  if (confirm("Are you sure you want to erase your game state?")) {
    resetGame();
  }
});

// Enable geolocation-based tracking when the globe button is pressed
document.querySelector("#globeButton")?.addEventListener("click", () => {
  map.locate({ setView: true, watch: true, maxZoom: 19 });
});

map.on("locationfound", (e: L.LocationEvent) => {
  const newLatLng = e.latlng;
  playerPosition = newLatLng;
  playerMarker.setLatLng(newLatLng);
  regenerateCaches(); // Update nearby caches
});

map.on("locationerror", (_e: L.ErrorEvent) => {
  alert(
    "Could not get your location. Please ensure location services are enabled.",
  );
});
