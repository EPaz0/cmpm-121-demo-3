// Import Leaflet and styles
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images in Leaflet
import "./leafletWorkaround.ts";

// Import deterministic random number generator
import luck from "./luck.ts";

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

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

const TILE_DEGREES = 0.0001; // Width of tile
const NEIGHBORHOOD_SIZE = 8; // Define an 8x8 grid of cells
const CACHE_SPAWN_PROBABILITY = 0.1; // 10% chance to spawn a cache

let playerCoins = 0; // Track player's total coins
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = `Coins: ${playerCoins}`; // Initial status

function latLngToGrid(lat: number, lng: number): { i: number; j: number } {
  const TILE_DEGREES = 0.0001; // Grid resolution (degrees per tile)
  return {
    i: Math.floor(lat / TILE_DEGREES),
    j: Math.floor(lng / TILE_DEGREES),
  };
}

function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;

  // Calculate the cell bounds
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to represent the cache on the map
  const rect = leaflet.rectangle(bounds, { color: "blue", weight: 1 });
  rect.addTo(map);

  // Convert the bounds' center to `{i, j}` grid coordinates
  const center = bounds.getCenter();
  const gridCoords = latLngToGrid(center.lat, center.lng);

  let coinValue = Math.floor(luck(`${i},${j}`) * 100) % 10 + 1; // Random coin value for each cache
  // console.log(`Cache at (${i}, ${j}) Coin Value = ${coinValue} `);
  // console.log(`Luck value: ${luck(`${i},${j}`)}`);
  const popupDiv = document.createElement("div");

  popupDiv.innerHTML = `
    <div>Cache at (${gridCoords.i}, ${gridCoords.j})</div>
    <div>Coins: <span id="coinValue">${coinValue}</span></div>
    <button id="collectButton">Collect</button>
    <button id="depositButton">Deposit</button>`;

  // Add event listener once for the button
  popupDiv.querySelector("#collectButton")?.addEventListener("click", () => {
    if (coinValue > 0) {
      playerCoins += 1;
      coinValue -= 1;
      statusPanel.innerHTML = `Coins: ${playerCoins}`; // Update player's coin count
      // Update coin value in the popup
      const coinValueSpan = popupDiv.querySelector(
        "#coinValue",
      ) as HTMLSpanElement;
      if (coinValueSpan) {
        coinValueSpan.innerText = `${coinValue}`;
      }
    }
  });

  // Add event listener once for the button
  popupDiv.querySelector("#depositButton")?.addEventListener("click", () => {
    if (playerCoins > 0) {
      playerCoins -= 1;
      coinValue += 1;
      statusPanel.innerHTML = `Coins: ${playerCoins}`; // Update player's coin count
      // Update coin value in the popup
      const coinValueSpan = popupDiv.querySelector(
        "#coinValue",
      ) as HTMLSpanElement;
      if (coinValueSpan) {
        coinValueSpan.innerText = `${coinValue}`;
      }
    }
  });
  // Bind pre-generated content to the popup
  rect.bindPopup(popupDiv);
}

// Scan the neighborhood to spawn caches
for (let i = -NEIGHBORHOOD_SIZE; i <= NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j <= NEIGHBORHOOD_SIZE; j++) {
    if (luck(`${i},${j}`) < CACHE_SPAWN_PROBABILITY) { // Use deterministic luck
      spawnCache(i, j);
    }
  }
}
