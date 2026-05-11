export type Language = 'en' | 'zh' | 'fr';
export type MealCategory = 'vegetables' | 'meats' | 'staples' | 'snacks' | 'drinks';

export type Ingredient = {
  id: string;
  name: string;
  quantity?: string;
  confidence: number;
  source: 'photo' | 'manual';
};

export type FridgeImage = {
  id: string;
  uri: string;
  source: 'camera' | 'library' | 'demo';
};

export type Nutrition = {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type MealRecommendation = {
  id: string;
  name: string;
  cuisine: string;
  category: MealCategory;
  ingredientsUsed: string[];
  missingOptionalIngredients: string[];
  nutrition: Nutrition;
  cookingTime: string;
  steps: string[];
};

type LocalizedMealTemplate = {
  id: string;
  cuisine: Record<Language, string>;
  category: MealCategory;
  requiredAny: string[];
  bonusIngredients: string[];
  nutrition: Nutrition;
  cookingMinutes: number;
  name: Record<Language, string>;
  optional: Record<Language, string[]>;
  steps: Record<Language, string[]>;
};

const ingredientTranslations: Record<string, Record<Language, string>> = {
  eggs: { en: 'eggs', zh: '鸡蛋', fr: 'œufs' },
  spinach: { en: 'spinach', zh: '菠菜', fr: 'épinards' },
  mushrooms: { en: 'mushrooms', zh: '蘑菇', fr: 'champignons' },
  chicken: { en: 'chicken', zh: '鸡肉', fr: 'poulet' },
  rice: { en: 'rice', zh: '米饭', fr: 'riz' },
  tofu: { en: 'tofu', zh: '豆腐', fr: 'tofu' },
  tomatoes: { en: 'tomatoes', zh: '番茄', fr: 'tomates' },
  milk: { en: 'milk', zh: '牛奶', fr: 'lait' },
  yogurt: { en: 'yogurt', zh: '酸奶', fr: 'yaourt' },
  cheese: { en: 'cheese', zh: '奶酪', fr: 'fromage' },
  cucumber: { en: 'cucumber', zh: '黄瓜', fr: 'concombre' },
  apples: { en: 'apples', zh: '苹果', fr: 'pommes' },
  carrots: { en: 'carrots', zh: '胡萝卜', fr: 'carottes' },
  noodles: { en: 'noodles', zh: '面条', fr: 'nouilles' },
  beef: { en: 'beef', zh: '牛肉', fr: 'bœuf' },
  lettuce: { en: 'lettuce', zh: '生菜', fr: 'laitue' },
};

const detectedIngredientPool: Ingredient[] = [
  { id: 'eggs', name: 'eggs', quantity: '6', confidence: 0.94, source: 'photo' },
  { id: 'spinach', name: 'spinach', quantity: '1 bag', confidence: 0.88, source: 'photo' },
  { id: 'mushrooms', name: 'mushrooms', quantity: '1 carton', confidence: 0.82, source: 'photo' },
  { id: 'chicken', name: 'chicken', quantity: '1 pack', confidence: 0.79, source: 'photo' },
  { id: 'rice', name: 'rice', quantity: 'leftover bowl', confidence: 0.76, source: 'photo' },
  { id: 'tofu', name: 'tofu', quantity: '1 block', confidence: 0.74, source: 'photo' },
  { id: 'tomatoes', name: 'tomatoes', quantity: '4', confidence: 0.91, source: 'photo' },
  { id: 'milk', name: 'milk', quantity: '1 carton', confidence: 0.86, source: 'photo' },
  { id: 'yogurt', name: 'yogurt', quantity: '2 cups', confidence: 0.83, source: 'photo' },
  { id: 'cucumber', name: 'cucumber', quantity: '2', confidence: 0.81, source: 'photo' },
];

const mealTemplates: LocalizedMealTemplate[] = [
  {
    id: 'spinach-mushroom-omelet',
    cuisine: { en: 'Western', zh: '西式', fr: 'occidentale' },
    category: 'vegetables',
    requiredAny: ['eggs', 'spinach', 'mushrooms', 'cheese'],
    bonusIngredients: ['tomatoes', 'milk'],
    nutrition: { calories: 360, protein: 24, carbs: 12, fat: 24 },
    cookingMinutes: 15,
    name: { en: 'Spinach mushroom omelet', zh: '菠菜蘑菇煎蛋卷', fr: 'Omelette épinards et champignons' },
    optional: { en: ['fresh herbs', 'toast'], zh: ['新鲜香草', '吐司'], fr: ['herbes fraîches', 'pain grillé'] },
    steps: {
      en: ['Whisk eggs with a splash of milk.', 'Sauté mushrooms and spinach until tender.', 'Pour in eggs, add cheese if available, and fold when set.'],
      zh: ['将鸡蛋和少量牛奶打匀。', '炒蘑菇和菠菜至变软。', '倒入蛋液，可加奶酪，凝固后对折。'],
      fr: ['Battez les œufs avec un peu de lait.', 'Faites revenir champignons et épinards.', 'Versez les œufs, ajoutez du fromage si disponible, puis repliez.'],
    },
  },
  {
    id: 'chicken-fried-rice',
    cuisine: { en: 'Chinese', zh: '中式', fr: 'chinoise' },
    category: 'staples',
    requiredAny: ['chicken', 'rice', 'eggs', 'carrots'],
    bonusIngredients: ['spinach', 'cucumber'],
    nutrition: { calories: 620, protein: 38, carbs: 72, fat: 18 },
    cookingMinutes: 22,
    name: { en: 'Chicken egg fried rice', zh: '鸡肉鸡蛋炒饭', fr: 'Riz sauté au poulet et aux œufs' },
    optional: { en: ['scallions', 'soy sauce', 'sesame oil'], zh: ['葱花', '酱油', '香油'], fr: ['oignons verts', 'sauce soja', 'huile de sésame'] },
    steps: {
      en: ['Dice chicken and cook until browned.', 'Scramble eggs, then add rice and vegetables.', 'Season lightly and stir-fry until hot.'],
      zh: ['鸡肉切丁并煎至上色。', '炒散鸡蛋，加入米饭和蔬菜。', '简单调味后翻炒至热透。'],
      fr: ['Coupez le poulet en dés et faites-le dorer.', 'Brouillez les œufs, ajoutez riz et légumes.', 'Assaisonnez et faites sauter jusqu’à ce que tout soit chaud.'],
    },
  },
  {
    id: 'mapo-style-tofu',
    cuisine: { en: 'Chinese', zh: '中式', fr: 'chinoise' },
    category: 'meats',
    requiredAny: ['tofu', 'beef', 'chicken', 'rice'],
    bonusIngredients: ['mushrooms', 'spinach'],
    nutrition: { calories: 540, protein: 34, carbs: 48, fat: 22 },
    cookingMinutes: 25,
    name: { en: 'Mapo-style tofu rice bowl', zh: '麻婆风味豆腐盖饭', fr: 'Bol de riz au tofu façon mapo' },
    optional: { en: ['doubanjiang', 'Sichuan pepper', 'scallions'], zh: ['豆瓣酱', '花椒', '葱花'], fr: ['doubanjiang', 'poivre du Sichuan', 'oignons verts'] },
    steps: {
      en: ['Simmer tofu cubes with minced meat or mushrooms.', 'Add a savory spicy sauce and reduce slightly.', 'Serve over warm rice.'],
      zh: ['豆腐切块，与肉末或蘑菇一起炖煮。', '加入咸香微辣酱汁并收浓。', '浇在热米饭上。'],
      fr: ['Mijotez les cubes de tofu avec viande hachée ou champignons.', 'Ajoutez une sauce épicée salée et réduisez.', 'Servez sur du riz chaud.'],
    },
  },
  {
    id: 'tomato-cucumber-yogurt-salad',
    cuisine: { en: 'Mediterranean', zh: '地中海风味', fr: 'méditerranéenne' },
    category: 'snacks',
    requiredAny: ['tomatoes', 'cucumber', 'yogurt', 'lettuce'],
    bonusIngredients: ['cheese', 'chicken'],
    nutrition: { calories: 240, protein: 14, carbs: 22, fat: 10 },
    cookingMinutes: 10,
    name: { en: 'Tomato cucumber yogurt salad', zh: '番茄黄瓜酸奶沙拉', fr: 'Salade tomates concombre au yaourt' },
    optional: { en: ['olive oil', 'lemon', 'mint'], zh: ['橄榄油', '柠檬', '薄荷'], fr: ['huile d’olive', 'citron', 'menthe'] },
    steps: {
      en: ['Slice tomatoes and cucumber.', 'Mix yogurt with a pinch of salt and pepper.', 'Toss together and top with cheese or chicken if desired.'],
      zh: ['番茄和黄瓜切片。', '酸奶加少许盐和胡椒调匀。', '拌匀，可加奶酪或鸡肉。'],
      fr: ['Tranchez les tomates et le concombre.', 'Mélangez le yaourt avec sel et poivre.', 'Assemblez et ajoutez fromage ou poulet si souhaité.'],
    },
  },
  {
    id: 'apple-yogurt-smoothie',
    cuisine: { en: 'International', zh: '国际风味', fr: 'internationale' },
    category: 'drinks',
    requiredAny: ['apples', 'yogurt', 'milk'],
    bonusIngredients: ['spinach'],
    nutrition: { calories: 210, protein: 11, carbs: 34, fat: 4 },
    cookingMinutes: 5,
    name: { en: 'Apple yogurt smoothie', zh: '苹果酸奶奶昔', fr: 'Smoothie pomme yaourt' },
    optional: { en: ['honey', 'cinnamon', 'ice'], zh: ['蜂蜜', '肉桂', '冰块'], fr: ['miel', 'cannelle', 'glaçons'] },
    steps: {
      en: ['Chop apples and add to a blender.', 'Add yogurt, milk, and ice if available.', 'Blend until smooth and serve cold.'],
      zh: ['苹果切块放入搅拌机。', '加入酸奶、牛奶和冰块。', '搅打顺滑后冷饮。'],
      fr: ['Coupez les pommes et mettez-les au blender.', 'Ajoutez yaourt, lait et glaçons.', 'Mixez jusqu’à consistance lisse et servez frais.'],
    },
  },
];

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function translateIngredientName(name: string, language: Language): string {
  return ingredientTranslations[name.toLowerCase()]?.[language] ?? name;
}

export async function detectIngredientsFromImages(images: FridgeImage[]): Promise<Ingredient[]> {
  // OpenAI Vision API integration point:
  // Replace this mock with a call that sends each image URI/base64 payload to a vision-capable OpenAI model
  // and asks it to return structured ingredients with quantities and confidence scores.
  await delay(900);

  if (images.length === 0) {
    return [];
  }

  const count = Math.min(detectedIngredientPool.length, 5 + images.length * 2);
  return detectedIngredientPool.slice(0, count).map((ingredient, index) => ({
    ...ingredient,
    id: `${ingredient.id}-${index}`,
  }));
}

export async function recommendMealsFromIngredients(
  ingredients: Ingredient[],
  language: Language,
): Promise<MealRecommendation[]> {
  // OpenAI text generation integration point:
  // Replace or augment this rule-based matcher with an OpenAI chat/completions request that receives
  // confirmed ingredients, user language, cuisine/category requirements, and returns JSON meal plans.
  await delay(900);

  const available = new Set(ingredients.map((ingredient) => ingredient.name.toLowerCase().trim()));
  const scoredTemplates = mealTemplates
    .map((template) => {
      const used = [...template.requiredAny, ...template.bonusIngredients].filter((ingredient) => available.has(ingredient));
      return { template, used, score: used.length };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const fallbackTemplates = scoredTemplates.length > 0 ? scoredTemplates : mealTemplates.slice(0, 3).map((template) => ({ template, used: [], score: 0 }));

  return fallbackTemplates.map(({ template, used }) => ({
    id: template.id,
    name: template.name[language],
    cuisine: template.cuisine[language],
    category: template.category,
    ingredientsUsed: used.map((ingredient) => translateIngredientName(ingredient, language)),
    missingOptionalIngredients: template.optional[language],
    nutrition: estimateNutrition(template),
    cookingTime: formatCookingTime(template.cookingMinutes, language),
    steps: template.steps[language],
  }));
}

export function estimateNutrition(meal: { nutrition: Nutrition }): Nutrition {
  // OpenAI/nutrition API integration point:
  // Swap this estimate with a dedicated nutrition model or database lookup once exact quantities are known.
  return meal.nutrition;
}

function formatCookingTime(minutes: number, language: Language): string {
  if (language === 'zh') {
    return `${minutes} 分钟`;
  }

  if (language === 'fr') {
    return `${minutes} min`;
  }

  return `${minutes} min`;
}
