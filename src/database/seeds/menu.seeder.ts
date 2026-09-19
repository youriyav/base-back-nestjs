import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { MenuCategory } from '../../modules/menu/entities/menu-category.entity';
import { MenuItem } from '../../modules/menu/entities/menu-item.entity';

interface CategorySeed {
  name: string;
  slug: string;
  icon: string;
}

interface ItemSeed {
  categorySlug: string;
  name: string;
  price: number;
  unit?: string;
}

const CATEGORIES: CategorySeed[] = [
  { name: 'Petit déjeuner', slug: 'petit-dejeuner', icon: '🍳' },
  { name: 'Mezza', slug: 'mezza', icon: '🫓' },
  { name: 'Pizza', slug: 'pizza', icon: '🍕' },
  { name: 'Salades', slug: 'salades', icon: '🥗' },
  { name: 'Burgers', slug: 'burgers', icon: '🍔' },
  { name: 'Sandwichs & Wraps', slug: 'sandwichs', icon: '🥙' },
  { name: 'Grillades', slug: 'grillades', icon: '🍢' },
  { name: 'Broasted & Crispy', slug: 'broasted', icon: '🍗' },
  { name: 'Plats', slug: 'plats', icon: '🍽️' },
];

const ITEMS: ItemSeed[] = [
  // Petit déjeuner
  { categorySlug: 'petit-dejeuner', name: 'Omelette Dinde et Fromage', price: 5500 },
  { categorySlug: 'petit-dejeuner', name: 'Omelette Légumes', price: 4500 },
  { categorySlug: 'petit-dejeuner', name: 'Omelette Nature', price: 4000 },
  { categorySlug: 'petit-dejeuner', name: 'English Breakfast', price: 7000 },
  { categorySlug: 'petit-dejeuner', name: 'Sandwich Dinde et Fromage', price: 4000 },
  { categorySlug: 'petit-dejeuner', name: 'Sandwich Halloumi Pesto', price: 4000 },
  { categorySlug: 'petit-dejeuner', name: 'Sandwich Avocat et Dinde', price: 4000 },
  { categorySlug: 'petit-dejeuner', name: 'Sandwich Feta Fromage', price: 4000 },

  // Mezza
  { categorySlug: 'mezza', name: 'Frites', price: 3000 },
  { categorySlug: 'mezza', name: 'Wedges', price: 3500 },
  { categorySlug: 'mezza', name: 'Frites et Fromage', price: 4500 },
  { categorySlug: 'mezza', name: 'Loaded Fries', price: 7000 },
  { categorySlug: 'mezza', name: 'Mozzarella Sticks', price: 4500 },
  { categorySlug: 'mezza', name: 'Ailes de Poulet BBQ', price: 4000 },
  { categorySlug: 'mezza', name: 'Dynamite Crevette', price: 7500 },
  { categorySlug: 'mezza', name: 'Nuggets', price: 7500 },
  { categorySlug: 'mezza', name: 'Chicken Tender', price: 5500 },
  { categorySlug: 'mezza', name: 'Crevettes Panées', price: 5500 },
  { categorySlug: 'mezza', name: 'Hommos', price: 3500 },
  { categorySlug: 'mezza', name: 'Hommos Pesto', price: 3500 },
  { categorySlug: 'mezza', name: 'Motabale Aubergine', price: 4000 },
  { categorySlug: 'mezza', name: 'Hommos Shawarma Poulet', price: 5000 },
  { categorySlug: 'mezza', name: 'Kibbeh', price: 5000 },
  { categorySlug: 'mezza', name: 'Rkakate Fromage', price: 4000 },
  { categorySlug: 'mezza', name: 'Sambousek Viande', price: 4500 },
  { categorySlug: 'mezza', name: 'Sojok', price: 7000 },
  { categorySlug: 'mezza', name: 'Makanek', price: 7000 },

  // Pizza
  { categorySlug: 'pizza', name: 'Margherita', price: 5000 },
  { categorySlug: 'pizza', name: 'Végétarienne', price: 6000 },
  { categorySlug: 'pizza', name: 'Poulet', price: 8000 },
  { categorySlug: 'pizza', name: '4 Fromages', price: 7500 },
  { categorySlug: 'pizza', name: 'Pepperoni', price: 8000 },
  { categorySlug: 'pizza', name: 'Tuna', price: 8000 },
  { categorySlug: 'pizza', name: 'BBQ Poulet', price: 7500 },
  { categorySlug: 'pizza', name: 'Crevettes', price: 7500 },
  { categorySlug: 'pizza', name: 'Libanaise', price: 8000 },

  // Salades
  { categorySlug: 'salades', name: 'Grecque', price: 5500 },
  { categorySlug: 'salades', name: 'Tabouleh', price: 5000 },
  { categorySlug: 'salades', name: 'Fatouche', price: 5500 },
  { categorySlug: 'salades', name: 'Crabes', price: 6000 },
  { categorySlug: 'salades', name: 'César', price: 6500 },
  { categorySlug: 'salades', name: 'Tuna', price: 7000 },
  { categorySlug: 'salades', name: 'Avocat', price: 5000 },
  { categorySlug: 'salades', name: 'Crevettes', price: 8000 },
  { categorySlug: 'salades', name: 'Halloumi', price: 5000 },

  // Burgers
  { categorySlug: 'burgers', name: 'Classique', price: 5000 },
  { categorySlug: 'burgers', name: 'Aux Œufs', price: 6000 },
  { categorySlug: 'burgers', name: 'Zinger', price: 7500 },
  { categorySlug: 'burgers', name: 'Végétarien', price: 4000 },
  { categorySlug: 'burgers', name: 'Deep Burger', price: 8000 },
  { categorySlug: 'burgers', name: 'Chicken Burger (Poulet)', price: 5000 },
  { categorySlug: 'burgers', name: 'Libanais', price: 5000 },
  { categorySlug: 'burgers', name: 'Aux Poissons', price: 5000 },
  { categorySlug: 'burgers', name: 'Shigezo', price: 8000 },

  // Sandwichs & Wraps
  { categorySlug: 'sandwichs', name: 'Club Sandwich Chicken', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Chicken Sub', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Fahita', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Crevettes', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Escalope', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Crispy', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Philadelphia', price: 6000 },
  { categorySlug: 'sandwichs', name: 'Sujuk', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Makanek', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Club Sandwich Dinde & Fromage', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Club Sandwich Tuna', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Tawook (Poulet)', price: 4000 },
  { categorySlug: 'sandwichs', name: 'Kafta', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Viande de Cabri', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Shawarma Viande', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Shawarma Poulet', price: 3500 },
  { categorySlug: 'sandwichs', name: 'Kebab Poulet', price: 4000 },
  { categorySlug: 'sandwichs', name: 'Twister', price: 5000 },
  { categorySlug: 'sandwichs', name: 'Viande de Bœuf', price: 4500 },

  // Grillades
  { categorySlug: 'grillades', name: 'Kabab Poulet', price: 9000, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Viande Cabri', price: 13500, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Kafta Cabri', price: 13500, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Mix Grillés', price: 12500, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Riyach Mouton', price: 14000, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Filet de Viande', price: 10000, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Poulet Grillé', price: 10000, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Ailes de Poulet Grillées', price: 7500, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Tawouk', price: 10000, unit: 'Plat' },
  { categorySlug: 'grillades', name: 'Mix Grillé', price: 20000, unit: '500 g' },
  { categorySlug: 'grillades', name: 'Tawouk', price: 15000, unit: '500 g' },
  { categorySlug: 'grillades', name: 'Kafta Cabri', price: 24000, unit: '500 g' },
  { categorySlug: 'grillades', name: 'Viande de Cabri Grillé', price: 25000, unit: '500 g' },
  { categorySlug: 'grillades', name: 'Viande de Bœuf Grillé', price: 15000, unit: '500 g' },
  { categorySlug: 'grillades', name: 'Mix Grillé', price: 35000, unit: '1 kg' },
  { categorySlug: 'grillades', name: 'Tawouk', price: 30000, unit: '1 kg' },
  { categorySlug: 'grillades', name: 'Kafta Cabri', price: 45000, unit: '1 kg' },
  { categorySlug: 'grillades', name: 'Viande de Cabri Grillé', price: 50000, unit: '1 kg' },
  { categorySlug: 'grillades', name: 'Viande de Bœuf Grillé', price: 30000, unit: '1 kg' },

  // Broasted & Crispy
  { categorySlug: 'broasted', name: '3 pcs Crispy', price: 6500 },
  { categorySlug: 'broasted', name: '4 pcs Crispy', price: 7500 },
  { categorySlug: 'broasted', name: '6 pcs Crispy', price: 10000 },
  { categorySlug: 'broasted', name: '4 pcs Broasted', price: 9000 },
  { categorySlug: 'broasted', name: '4 pcs Cuisse de Poulet', price: 7500 },
  { categorySlug: 'broasted', name: '12 pcs Ailes de Poulet', price: 7500 },
  { categorySlug: 'broasted', name: 'Combo (frites + sauce)', price: 2000, unit: 'Suppl.' },
  { categorySlug: 'broasted', name: 'Riz', price: 3000, unit: 'Suppl.' },
  { categorySlug: 'broasted', name: 'Sauce', price: 1000, unit: 'Suppl.' },

  // Plats
  { categorySlug: 'plats', name: 'Escalope', price: 9000 },
  { categorySlug: 'plats', name: 'Steak Viande', price: 12000 },
  { categorySlug: 'plats', name: 'Steak Poulet', price: 10000 },
  { categorySlug: 'plats', name: 'Shawarma Viande', price: 8500 },
  { categorySlug: 'plats', name: 'Shawarma Poulet', price: 8000 },
  { categorySlug: 'plats', name: 'Fahita', price: 10000 },
  { categorySlug: 'plats', name: 'Quesadillas Poulet', price: 9000 },
  { categorySlug: 'plats', name: 'Quesadillas Viande', price: 9000 },
  { categorySlug: 'plats', name: 'Riz (extra)', price: 3500, unit: 'Suppl.' },
  { categorySlug: 'plats', name: 'Frites (extra)', price: 2000, unit: 'Suppl.' },
  { categorySlug: 'plats', name: 'Sauce (extra)', price: 1500, unit: 'Suppl.' },
];

export class MenuSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const categoryRepository = dataSource.getRepository(MenuCategory);
    const itemRepository = dataSource.getRepository(MenuItem);

    const existingCategories = await categoryRepository.count();

    if (existingCategories > 0) {
      console.log('Menu already seeded, skipping...');
      return;
    }

    const categoriesToInsert: Partial<MenuCategory>[] = CATEGORIES.map((category, index) => ({
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      order: index,
    }));

    const savedCategories = await categoryRepository.save(categoriesToInsert);
    const categoryIdBySlug = new Map(savedCategories.map((c) => [c.slug, c.id]));

    const orderByCategory = new Map<string, number>();
    const itemsToInsert: Partial<MenuItem>[] = ITEMS.map((item) => {
      const order = orderByCategory.get(item.categorySlug) ?? 0;
      orderByCategory.set(item.categorySlug, order + 1);

      const categoryId = categoryIdBySlug.get(item.categorySlug);
      if (!categoryId) {
        throw new Error(`Unknown category slug in menu seed data: ${item.categorySlug}`);
      }

      return {
        name: item.name,
        categoryId,
        price: item.price,
        unit: item.unit,
        isAvailable: true,
        order,
      };
    });

    await itemRepository.save(itemsToInsert);

    console.log(
      `Menu seeded successfully: ${savedCategories.length} categories, ${itemsToInsert.length} items.`,
    );
  }
}
