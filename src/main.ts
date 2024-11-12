// Import Leaflet and styles
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images in Leaflet
import "./leafletWorkaround.ts";

import { Board } from "./board.ts";
import { Coin, createCoin, getCoinId } from "./coin.ts";

// Import deterministic random number generator
import luck from "./luck.ts";

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

function spawnCache(iOffset: number, jOffset: number) {
  // Use Board to get the Cell at the given offsets
  const centerLatLng = OAKES_CLASSROOM;
  const offsetLatLng = leaflet.latLng(
    centerLatLng.lat + iOffset * TILE_WIDTH,
    centerLatLng.lng + jOffset * TILE_WIDTH,
  );

  const cell = board.getCellForPoint(offsetLatLng); // Get a canonical Cell
  const bounds = board.getCellBounds(cell); // Get the cell bounds

  const rect = leaflet.rectangle(bounds, { color: "blue", weight: 1 });
  rect.addTo(map);

  const coins: Coin[] = [];
  const coinCount = Math.floor(luck(`${cell.i},${cell.j}`) * 4) + 1; // 1-4 coins

  for (let serial = 0; serial < coinCount; serial++) {
    const coin = createCoin(cell, serial);
    coins.push(coin);
    console.log(`Coin created: ${getCoinId(coin)}`);
  }

  let coinValue = coins.length;

  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
    <div>Cache at (${cell.i}, ${cell.j})</div>
    <div>Coins: <span id="coinValue">${coinValue}</span></div>
    <ul id="coinList">${
    coins.map((c) => `<li>${getCoinId(c)}</li>`).join("")
  }</ul>
    <button id="collectButton">Collect</button>
    <button id="depositButton">Deposit</button>`;

  popupDiv.querySelector("#collectButton")?.addEventListener("click", () => {
    if (coinValue > 0) {
      const collectedCoin = coins.pop();
      playerCoins++;
      coinValue--;

      const coinList = popupDiv.querySelector("#coinList") as HTMLUListElement;
      coinList.removeChild(coinList.lastChild!);

      statusPanel.innerHTML = `Coins: ${playerCoins}`;
      const coinValueSpan = popupDiv.querySelector(
        "#coinValue",
      ) as HTMLSpanElement;
      coinValueSpan.innerText = `${coinValue}`;

      if (collectedCoin) playerInventory.push(collectedCoin);
    }
  });

  popupDiv.querySelector("#depositButton")?.addEventListener("click", () => {
    if (playerCoins > 0) {
      const depositedCoin = playerInventory.pop();
      if (depositedCoin) {
        coins.push(depositedCoin);
        playerCoins--;
        coinValue++;

        const coinList = popupDiv.querySelector(
          "#coinList",
        ) as HTMLUListElement;
        const newCoinItem = document.createElement("li");
        newCoinItem.textContent = getCoinId(depositedCoin);
        coinList.appendChild(newCoinItem);

        statusPanel.innerHTML = `Coins: ${playerCoins}`;
        const coinValueSpan = popupDiv.querySelector(
          "#coinValue",
        ) as HTMLSpanElement;
        coinValueSpan.innerText = `${coinValue}`;
      }
    }
  });

  rect.bindPopup(popupDiv);
}

// Scan the neighborhood to spawn caches
for (let i = -TILE_VISIBILITY_RADIUS; i <= TILE_VISIBILITY_RADIUS; i++) {
  for (let j = -TILE_VISIBILITY_RADIUS; j <= TILE_VISIBILITY_RADIUS; j++) {
    if (luck(`${i},${j}`) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition = leaflet.latLng(
    playerPosition.lat + latOffset,
    playerPosition.lng + lngOffset,
  );

  // Update the marker's position on the map
  playerMarker.setLatLng(playerPosition);
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
