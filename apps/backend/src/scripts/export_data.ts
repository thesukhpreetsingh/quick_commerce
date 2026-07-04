import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function fetchAndSaveData() {
  const categories = ['groceries', 'smartphones'];
  const data: Record<string, any[]> = {};

  try {
    for (const category of categories) {
      console.log(`Fetching ${category}...`);
      const response = await axios.get(`https://dummyjson.com/products/category/${category}`);
      data[category] = response.data.products;
    }

    const filePath = path.resolve(__dirname, '../../data/products_seed.json');
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully saved data to ${filePath}`);
  } catch (error: any) {
    console.error('Error fetching and saving data:', error.message);
  }
}

fetchAndSaveData();
