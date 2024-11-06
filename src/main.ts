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
