import { ProductList } from "@/components/products/ProductList";

export default function ProductsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-catl-primary">Catalogue produits</h1>
        <p className="text-catl-text text-sm mt-1">
          Gérez les fiches produits du WMS — nom, catégorie, EAN, type de conservation et producteur associé.
        </p>
      </header>

      <ProductList />
    </div>
  );
}
