export class UIManager {
  private statusPanel: HTMLDivElement;
  private collectedCoinsList: HTMLUListElement;

  constructor() {
    this.statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
    this.collectedCoinsList = document.querySelector<HTMLUListElement>(
      "#collectedCoinsList",
    )!;
  }

  /**
   * Updates the coin counter in the status panel.
   * @param playerCoins - The current number of player coins.
   */
  updateCoinCounter(playerCoins: number) {
    this.statusPanel.innerHTML = `Coins: ${playerCoins}`;
  }

  /**
   * Updates the UI for collected coins by adding a coin to the collected list.
   * @param coinId - The ID of the coin being added to the list.
   * @param onClick - Callback for when the coin is clicked in the UI.
   */
  updateCollectedCoinsUI(coinId: string, onClick: () => void) {
    // Check if the coin is already in the list
    const existingCoin = Array.from(
      this.collectedCoinsList.querySelectorAll("a"),
    ).find(
      (link) => link.textContent === `Coin: ${coinId}`,
    );

    if (existingCoin) return; // Exit if the coin already exists

    const coinListItem = document.createElement("li");
    const coinLink = document.createElement("a");
    coinLink.href = "#";
    coinLink.textContent = `Coin: ${coinId}`;
    coinLink.style.color = "blue";
    coinLink.style.textDecoration = "underline";

    coinLink.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
    });

    coinListItem.appendChild(coinLink);
    this.collectedCoinsList.appendChild(coinListItem);
  }

  /**
   * Removes a coin from the collected coins list.
   * @param coinId - The ID of the coin to remove.
   */
  removeCollectedCoin(coinId: string) {
    const coinItems = Array.from(
      this.collectedCoinsList.querySelectorAll("li"),
    );
    for (const item of coinItems) {
      if (item.textContent === `Coin: ${coinId}`) {
        this.collectedCoinsList.removeChild(item);
        break;
      }
    }
  }

  /**
   * Clears the collected coins list UI.
   */
  clearCollectedCoinsUI() {
    this.collectedCoinsList.innerHTML = "";
  }
}
