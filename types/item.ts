interface Item {
    name: string;
    description?: string;
    ean?: string;
    category?: string;
    quantity?: number;
  }
  
  interface ItemList {
    items: Item[];
  }
  