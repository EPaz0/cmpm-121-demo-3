// Import Leaflet and styles
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images in Leaflet
import "./leafletWorkaround.ts";

import { Board,Cell } from "./board.ts";
import { Coin, createCoin, getCoinId } from "./coin.ts";

// Import deterministic random number generator
import luck from "./luck.ts";
import { Cache } from "./cache.ts"; // Import the Cache class

interface CacheLayer extends L.Layer {
  cache?: Cache;  // Assuming Cache is the type of your cache object
}

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
let playerPosition = OAKES_CLASSROOM;

// Initialize the map
const map = leaflet.map("map", {
  center: OAKES_CLASSROOM,
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
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = `Coins: ${playerCoins}`; // Initial status

function initGame() {
  regenerateCaches();  // Generate initial caches around the starting position
}

document.addEventListener('DOMContentLoaded', initGame); // Ensure the DOM is fully loaded before initializing the game


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
    console.log(`New Cache created at ${cell.i}, ${cell.j} with ${cache.coins.length} coins`);
} else {
    console.log(`Loaded Cache from state at ${cell.i}, ${cell.j}`);
}

const rect = leaflet.rectangle(bounds, { color: "blue", weight: 1 });
rect.addTo(cacheLayer);
rect.bindPopup(() => createPopupForCache(cache));

return cache;
}





function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition = leaflet.latLng(
      playerPosition.lat + latOffset,
      playerPosition.lng + lngOffset,
  );

  playerMarker.setLatLng(playerPosition); // Update player's marker

  // Clear and regenerate caches around the new position
  regenerateCaches();
}

function regenerateCaches() {
  clearCaches();
    
  for (let i = -TILE_VISIBILITY_RADIUS; i <= TILE_VISIBILITY_RADIUS; i++) {
      for (let j = -TILE_VISIBILITY_RADIUS; j <= TILE_VISIBILITY_RADIUS; j++) {
          const latOffset = i * TILE_WIDTH;
          const lngOffset = j * TILE_WIDTH;
          const newPosition = leaflet.latLng(
              playerPosition.lat + latOffset,
              playerPosition.lng + lngOffset
          );
          const cell = board.getCellForPoint(newPosition);
          let cache = loadCacheState(cell);

          if (!cache && luck(`${cell.i},${cell.j}`) < CACHE_SPAWN_PROBABILITY) {
              cache = spawnCache(latOffset, lngOffset);
          } 

          if (cache) {
              const bounds = board.getCellBounds(cell);
              const rect = leaflet.rectangle(bounds, { color: "blue", weight: 1 }).addTo(cacheLayer);
              rect.bindPopup(() => createPopupForCache(cache));
          }
      }
  }
}
function createPopupForCache(cache: Cache) {
  let coinValue = cache.coins.length;
  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
    <div>Cache at (${cache.cell.i}, ${cache.cell.j})</div>
    <div>Coins: <span id="coinValue">${coinValue}</span></div>
    <ul id="coinList">${cache.coins.map(c => `<li>${getCoinId(c)}</li>`).join("")}</ul>
    <button id="collectButton">Collect</button>
    <button id="depositButton">Deposit</button>
  `;

  popupDiv.querySelector("#collectButton")?.addEventListener("click", () => {
    if (coinValue > 0) {
      const collectedCoin = cache.coins.pop();
      playerCoins++;
      coinValue--;

      const coinList = popupDiv.querySelector("#coinList") as HTMLUListElement;
      coinList.removeChild(coinList.lastChild!);

      statusPanel.innerHTML = `Coins: ${playerCoins}`;
      popupDiv.querySelector("#coinValue")!.textContent = `${coinValue}`;

      if (collectedCoin) playerInventory.push(collectedCoin);
      saveCacheState(cache); // Save updated state
    }
  });

  popupDiv.querySelector("#depositButton")?.addEventListener("click", () => {
    if (playerCoins > 0) {
      const depositedCoin = playerInventory.pop();
      cache.coins.push(depositedCoin!);
      playerCoins--;
      coinValue++;

      const coinList = popupDiv.querySelector("#coinList") as HTMLUListElement;
      const newCoinItem = document.createElement("li");
      newCoinItem.textContent = getCoinId(depositedCoin!);
      coinList.appendChild(newCoinItem);

      statusPanel.innerHTML = `Coins: ${playerCoins}`;
      popupDiv.querySelector("#coinValue")!.textContent = `${coinValue}`;
      saveCacheState(cache); // Save updated state
    }
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
    coins: cache.coins.map(coin => getCoinId(coin)), // Save only coin IDs or a state that represents the coins
    remainingCoins: cache.remainingCoins // Assuming you keep track of how many coins are left in the cache
  };
  localStorage.setItem(key, JSON.stringify(state));
}

function loadCacheState(cell: Cell): Cache | null {
  const key = `cache-${cell.i}-${cell.j}`;
  const savedState = localStorage.getItem(key);

  if (savedState) {
    const cacheData = JSON.parse(savedState);
    const cache = new Cache(cell, 0);  // Assuming the cache starts with zero coins and they are set from the saved state

    // Explicitly type coinId as string since JSON.parse results in any
    cache.coins = cacheData.coins.map((coinId: string) => recreateCoinFromId(coinId));
    cache.remainingCoins = cacheData.remainingCoins;

    return cache;
  }

  return null;
}

function recreateCoinFromId(coinId: string) {
  const [i, j, serial] = coinId.split(':');
  const cell = {i: parseInt(i), j: parseInt(j)}; // Recreate the cell object
  return createCoin(cell, parseInt(serial));
}

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
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache-')) {
      localStorage.removeItem(key);
    }
  });
}
function resetGame() {
  clearCacheEntries();  // or clearAllStoredData();
  location.reload();    // Reload to reflect changes
}

// Add a button to trigger the reset
document.querySelector("#resetButton")?.addEventListener("click", resetGame);