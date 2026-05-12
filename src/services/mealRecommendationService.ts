export type MealSuggestionLanguage = 'en' | 'zh';
export type MealCuisine = 'Chinese' | 'Western' | 'Japanese' | 'Korean' | 'Other';

export type MealSuggestion = {
  id: string;
  name: string;
  cuisine: MealCuisine;
  description: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchScore: number;
  calories: number;
  timeMinutes: number;
};

type GenerateMealSuggestionsParams = {
  ingredients: string[];
  language: MealSuggestionLanguage;
};

type OpenAIResponseOutput = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

declare const process: {
  env?: Record<string, string | undefined>;
};

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const PRIMARY_MEAL_MODEL = 'gpt-5-mini';
const FALLBACK_MEAL_MODEL = 'gpt-4.1-mini';
const OPENAI_API_KEY = process.env?.EXPO_PUBLIC_OPENAI_API_KEY;

// Expo setup example:
// EXPO_PUBLIC_OPENAI_API_KEY=sk-...
// Never hardcode API keys in source code. For production, proxy OpenAI calls through your backend.
export async function generateMealSuggestions({ ingredients, language }: GenerateMealSuggestionsParams): Promise<MealSuggestion[]> {
  const trimmedIngredients = [...new Set(ingredients.map((ingredient) => ingredient.trim()).filter(Boolean))].slice(0, 10);

  if (trimmedIngredients.length === 0) {
    return [];
  }

  if (!OPENAI_API_KEY) {
    return buildFallbackMealSuggestions(trimmedIngredients, language);
  }

  try {
    return await requestMealSuggestionsWithJsonRetry(PRIMARY_MEAL_MODEL, trimmedIngredients, language);
  } catch (primaryError) {
    try {
      return await requestMealSuggestionsWithJsonRetry(FALLBACK_MEAL_MODEL, trimmedIngredients, language);
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : primaryError;
    }
  }
}

async function requestMealSuggestionsWithJsonRetry(
  model: string,
  ingredients: string[],
  language: MealSuggestionLanguage,
): Promise<MealSuggestion[]> {
  try {
    return await requestMealSuggestions(model, ingredients, language, false);
  } catch (error) {
    if (isJsonParsingError(error)) {
      try {
        return await requestMealSuggestions(model, ingredients, language, true);
      } catch (retryError) {
        if (isJsonParsingError(retryError)) {
          return buildFallbackMealSuggestions(ingredients, language);
        }

        throw retryError;
      }
    }

    throw error;
  }
}

async function requestMealSuggestions(
  model: string,
  ingredients: string[],
  language: MealSuggestionLanguage,
  strictJsonRetry: boolean,
): Promise<MealSuggestion[]> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildMealPrompt(ingredients, language, strictJsonRetry),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'meal_suggestions',
          strict: true,
          schema: {
            type: 'array',
            minItems: 8,
            maxItems: 12,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                cuisine: { type: 'string', enum: ['Chinese', 'Western', 'Japanese', 'Korean', 'Other'] },
                description: { type: 'string' },
                matchedIngredients: { type: 'array', items: { type: 'string' } },
                missingIngredients: { type: 'array', items: { type: 'string' }, maxItems: 4 },
                matchScore: { type: 'number', minimum: 0, maximum: 100 },
                calories: { type: 'number', minimum: 0 },
                timeMinutes: { type: 'number', minimum: 1 },
              },
              required: [
                'id',
                'name',
                'cuisine',
                'description',
                'matchedIngredients',
                'missingIngredients',
                'matchScore',
                'calories',
                'timeMinutes',
              ],
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI meal suggestions failed (${response.status}): ${errorBody}`);
  }

  const responseJson = (await response.json()) as OpenAIResponseOutput;
  return normalizeMealSuggestions(parseMealSuggestions(responseJson));
}

function buildMealPrompt(ingredients: string[], language: MealSuggestionLanguage, strictJsonRetry: boolean): string {
  const outputLanguage = language === 'zh' ? 'Simplified Chinese' : 'English';
  const retryInstruction = strictJsonRetry
    ? 'IMPORTANT RETRY: Return raw JSON only. Do not include Markdown, comments, code fences, or any text outside the JSON array.'
    : 'Return only a valid JSON array.';

  return [
    retryInstruction,
    `Output language: ${outputLanguage}.`,
    `Available fridge ingredients, ordered by confidence or user priority: ${ingredients.join(', ')}.`,
    'Generate 8-12 concise meal suggestions.',
    'Include both Chinese and Western meals. Japanese, Korean, or Other meals are also allowed when realistic.',
    'Prioritize recipes that use available ingredients and minimize missing ingredients.',
    'Avoid unrealistic recipes and avoid requiring specialty equipment.',
    'Do not include image URLs, image prompts, or image generation instructions.',
    'Each object must contain: id, name, cuisine, description, matchedIngredients, missingIngredients, matchScore, calories, timeMinutes.',
    'Use cuisine exactly as one of: Chinese, Western, Japanese, Korean, Other.',
  ].join('\n');
}

function parseMealSuggestions(response: OpenAIResponseOutput): unknown {
  const responseText = response.output_text ?? response.output?.flatMap((item) => item.content ?? []).find((content) => content.type === 'output_text' || content.text)?.text;

  if (!responseText) {
    throw new SyntaxError('OpenAI did not return meal suggestion text.');
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    const jsonStart = responseText.indexOf('[');
    const jsonEnd = responseText.lastIndexOf(']');

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
    }

    throw error;
  }
}

function normalizeMealSuggestions(value: unknown): MealSuggestion[] {
  if (!Array.isArray(value)) {
    throw new SyntaxError('Meal suggestions JSON must be an array.');
  }

  return value.slice(0, 12).map((meal, index) => {
    const item = meal as Partial<MealSuggestion>;
    const cuisine = normalizeCuisine(item.cuisine);

    return {
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `meal-${index + 1}`,
      name: typeof item.name === 'string' ? item.name.trim() : 'Meal idea',
      cuisine,
      description: typeof item.description === 'string' ? item.description.trim() : '',
      matchedIngredients: Array.isArray(item.matchedIngredients) ? item.matchedIngredients.filter(isString).slice(0, 8) : [],
      missingIngredients: Array.isArray(item.missingIngredients) ? item.missingIngredients.filter(isString).slice(0, 4) : [],
      matchScore: clampNumber(item.matchScore, 0, 100, 70),
      calories: Math.round(clampNumber(item.calories, 0, 2000, 450)),
      timeMinutes: Math.round(clampNumber(item.timeMinutes, 1, 240, 25)),
    };
  });
}

function normalizeCuisine(cuisine: unknown): MealCuisine {
  return cuisine === 'Chinese' || cuisine === 'Western' || cuisine === 'Japanese' || cuisine === 'Korean' || cuisine === 'Other' ? cuisine : 'Other';
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isJsonParsingError(error: unknown) {
  return error instanceof SyntaxError;
}

function buildFallbackMealSuggestions(ingredients: string[], language: MealSuggestionLanguage): MealSuggestion[] {
  const labels = language === 'zh'
    ? {
        quick: '快手',
        withText: '搭配',
        chinese: '中式家常炒菜',
        western: '西式煎蛋盘',
        soup: '暖胃汤面',
        salad: '清爽沙拉碗',
        rice: '简易盖饭',
        snack: '轻食小吃',
        breakfast: '早餐拼盘',
        stirFry: '蔬菜快炒',
        description: '优先使用已有食材，缺少调味料也容易替换。',
      }
    : {
        quick: 'Quick',
        withText: 'with',
        chinese: 'Chinese home-style stir-fry',
        western: 'Western egg plate',
        soup: 'Cozy noodle soup',
        salad: 'Fresh salad bowl',
        rice: 'Easy rice bowl',
        snack: 'Light snack plate',
        breakfast: 'Breakfast plate',
        stirFry: 'Vegetable quick sauté',
        description: 'Prioritizes available ingredients and keeps missing extras easy to replace.',
      };
  const baseNames = [labels.chinese, labels.western, labels.soup, labels.salad, labels.rice, labels.snack, labels.breakfast, labels.stirFry];

  return baseNames.map((name, index) => ({
    id: `fallback-${index + 1}`,
    name: `${labels.quick} ${name}`,
    cuisine: index % 3 === 0 ? 'Chinese' : index % 3 === 1 ? 'Western' : 'Other',
    description: `${labels.description} ${labels.withText} ${ingredients.slice(0, 3).join(', ')}.`,
    matchedIngredients: ingredients.slice(0, Math.min(ingredients.length, 4)),
    missingIngredients: index % 2 === 0 ? ['salt', 'oil'] : ['herbs'],
    matchScore: Math.max(65, 92 - index * 4),
    calories: 280 + index * 45,
    timeMinutes: 12 + index * 4,
  }));
}
