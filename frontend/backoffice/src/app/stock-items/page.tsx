import { StockItemList } from "@/components/stock-items/StockItemList";

export default function StockItemsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-catl-primary">Stock</h1>
        <p className="text-catl-text text-sm mt-1">
          Visualisez et gérez les articles en stock — filtrez par statut, repérez les expirations proches et les niveaux faibles.
        </p>
      </header>

      <StockItemList />
    </div>
  );
}
