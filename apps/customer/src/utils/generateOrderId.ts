// Shared by every screen that needs a stand-in order id (ReceiptScreen,
// HomeSearchBar's truck shortcut, PurchaseScreen's "On the way" card) —
// one implementation instead of three copies of the same Date.now() slice.
// Swap for a real backend order id once orders are actually persisted.
export function generateOrderId(): string {
  return `#${Date.now().toString().slice(-9)}`;
}
