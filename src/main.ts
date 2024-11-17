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

interface CacheLayer extends L.Layer {
  cache?: Cache; // Assuming Cache is the type of your cache object
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
  loadGameState(); // Load the player's state
  regenerateCaches(); // Generate initial caches around the starting position
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
  rect.bindPopup(() => createPopupForCache(cache));

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
  saveGameState();
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
        rect.bindPopup(() => createPopupForCache(cache));
      }
    }
  }
}

function updateCollectedCoinsUI(coin: Coin) {
  const collectedCoinsList = document.querySelector(
    "#collectedCoinsList",
  ) as HTMLUListElement;

  const coinListItem = document.createElement("li");

  // Create a clickable link for each coin
  const coinLink = document.createElement("a");
  coinLink.href = "#"; // Prevent default navigation
  coinLink.textContent = `Coin: ${getCoinId(coin)}`;
  coinLink.style.color = "blue"; // Optional: styling for the link
  coinLink.style.textDecoration = "underline";

  console.log(`Coin ID from getCoinId: ${getCoinId(coin)}`); // <--- Add this comment here

  // Add click event to zoom and center the map on the coin's original cache
  coinLink.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent default behavior of <a>
    const [i, jWithSerial] = getCoinId(coin).split(":"); // Split by ":"
    const [j] = jWithSerial.split("#"); // Split j from the serial using "#"

    console.log(`Zooming to coin at i:${i}, j:${j}`); // Debugging log

    const coinCell = board.getCellByIndices(Number(i), Number(j)); // Convert to numbers and get cell
    const cacheBounds = board.getCellBounds(coinCell); // Get bounds for the cache
    map.fitBounds(cacheBounds, { maxZoom: 19, animate: true }); // Zoom and center map
  });

  coinListItem.appendChild(coinLink);
  collectedCoinsList.appendChild(coinListItem);
}

function createPopupForCache(cache: Cache) {
  let coinValue = cache.coins.length;
  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
    <div>Cache at (${cache.cell.i}, ${cache.cell.j})</div>
    <div>Coins: <span id="coinValue">${coinValue}</span></div>
    <ul id="coinList">${
    cache.coins.map((c) =>
      `<li class="coin" data-id="${getCoinId(c)}">${getCoinId(c)}</li>`
    ).join("")
  }</ul>
    <button id="collectButton">Collect</button>
    <button id="depositButton">Deposit</button>
  `;

  // Center map on coin's cache when coin in the popup is clicked
  popupDiv.querySelectorAll(".coin").forEach((coinElement) => {
    coinElement.addEventListener("click", (event) => {
      const coinId = (event.target as HTMLElement).dataset.id!;
      const [i, j] = coinId.split(":").map(Number); // Extract cell indices from coin ID
      const coinCell = board.getCellByIndices(i, j); // Get cell of the cache
      const coinBounds = board.getCellBounds(coinCell);

      map.fitBounds(coinBounds); // Center map on this cache's home bounds
    });
  });

  // Handle collecting coins
  popupDiv.querySelector("#collectButton")?.addEventListener("click", () => {
    if (coinValue > 0) {
      const collectedCoin = cache.coins.pop() as Coin; // Collect a coin
      playerCoins++;
      coinValue--;

      const coinList = popupDiv.querySelector("#coinList") as HTMLUListElement;
      coinList.removeChild(coinList.lastChild!); // Remove coin from popup list

      statusPanel.innerHTML = `Coins: ${playerCoins}`;
      popupDiv.querySelector("#coinValue")!.textContent = `${coinValue}`;

      // Update the collected coins list UI
      playerInventory.push(collectedCoin);
      updateCollectedCoinsUI(collectedCoin); // Add the coin to the list and make it clickable
      saveCacheState(cache); // Save the updated state
    }
  });

  popupDiv.querySelector("#depositButton")?.addEventListener("click", () => {
    if (playerCoins > 0) {
      const depositedCoin = playerInventory.pop()!;
      cache.coins.push(depositedCoin);
      playerCoins--;
      coinValue++;

      const coinList = popupDiv.querySelector("#coinList") as HTMLUListElement;
      const newCoinItem = document.createElement("li");
      newCoinItem.textContent = getCoinId(depositedCoin);
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
    coins: cache.coins.map((coin) => getCoinId(coin)), // Save only coin IDs or a state that represents the coins
    remainingCoins: cache.remainingCoins, // Assuming you keep track of how many coins are left in the cache
  };

  localStorage.setItem(key, JSON.stringify(state));
}
function saveGameState() {
  localStorage.setItem("playerPosition", JSON.stringify(playerPosition));
  localStorage.setItem("playerCoins", playerCoins.toString());
}

function loadGameState() {
  const savedPosition = localStorage.getItem("playerPosition");
  const savedCoins = localStorage.getItem("playerCoins");

  if (savedPosition) {
    playerPosition = leaflet.latLng(JSON.parse(savedPosition));
    playerMarker.setLatLng(playerPosition);
  }
  if (savedCoins) {
    playerCoins = parseInt(savedCoins, 10);
    statusPanel.innerHTML = `Coins: ${playerCoins}`;
  }
}

function loadCacheState(cell: Cell): Cache | null {
  const key = `cache-${cell.i}-${cell.j}`;
  const savedState = localStorage.getItem(key);

  if (savedState) {
    const cacheData = JSON.parse(savedState);
    const cache = new Cache(cell, 0); // Assuming the cache starts with zero coins and they are set from the saved state

    // Explicitly type coinId as string since JSON.parse results in any
    cache.coins = cacheData.coins.map((coinId: string) =>
      recreateCoinFromId(coinId)
    );
    cache.remainingCoins = cacheData.remainingCoins;

    return cache;
  }

  return null;
}

function recreateCoinFromId(coinId: string) {
  const [i, j, serial] = coinId.split(":");
  const cell = { i: parseInt(i), j: parseInt(j) }; // Recreate the cell object
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
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("cache-")) {
      localStorage.removeItem(key);
    }
  });
}
function resetGame() {
  clearCacheEntries();
  localStorage.clear(); // Clear all saved game state
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
