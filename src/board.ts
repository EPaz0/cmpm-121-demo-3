import leaflet from "leaflet";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  private readonly knownCells = new Map<string, Cell>();

  constructor(private tileWidth: number) {}

  // Flyweight pattern implementation: ensure unique instance of Cell
  private getCanonicalCell(cell: Cell): Cell {
    const key = `${cell.i}:${cell.j}`;
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i: cell.i, j: cell.j });
    }
    return this.knownCells.get(key)!;
  }

  // Convert a LatLng point to a grid Cell
  public getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i, j });
  }

  // Get the geographical bounds of a specific Cell
  public getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const southWest = leaflet.latLng(
      cell.i * this.tileWidth,
      cell.j * this.tileWidth,
    );
    const northEast = leaflet.latLng(
      (cell.i + 1) * this.tileWidth,
      (cell.j + 1) * this.tileWidth,
    );
    return leaflet.latLngBounds(southWest, northEast);
  }

  // Find all cells within a specified radius of a LatLng point
  public getCellsNearPoint(point: leaflet.LatLng, radius: number): Cell[] {
    const originCell = this.getCellForPoint(point);
    const resultCells: Cell[] = [];

    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        resultCells.push(this.getCanonicalCell({
          i: originCell.i + i,
          j: originCell.j + j,
        }));
      }
    }

    return resultCells;
  }
  public getCellByIndices(i: number, j: number): Cell {
    return this.getCanonicalCell({ i, j });
  }
}
