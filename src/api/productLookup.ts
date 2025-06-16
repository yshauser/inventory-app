export interface ProductInfo {
    name: string;
    category: string;
    brand: string;
    imageUrl: string;
  }
  
  export async function fetchProductInfo(barcode: string): Promise<ProductInfo | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
  
      if (data.status !== 1) return null;
  
      const product = data.product;
  
      return {
        name: product.product_name || "Unknown product",
        category: product.categories || "Unknown category",
        brand: product.brands || "Unknown brand",
        imageUrl: product.image_url || "",
      };
    } catch (error) {
      console.error("Error fetching product info:", error);
      return null;
    }
  }
  