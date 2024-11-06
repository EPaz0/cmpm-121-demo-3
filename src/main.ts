// Import Leaflet and styles
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images in Leaflet
import "./leafletWorkaround.ts";

// Import deterministic random number generator
//import luck from "./luck.ts";

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

  // Bind a popup to interact with the cache
  rect.bindPopup(`Cache at (${i}, ${j})`);
}

// Scan the neighborhood to spawn caches
for (let i = -NEIGHBORHOOD_SIZE; i <= NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j <= NEIGHBORHOOD_SIZE; j++) {
    if (Math.random() < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
