# FridgeChef AI Food Suggestion

FridgeChef AI is an Expo React Native prototype that helps users turn refrigerator contents into realistic meal ideas. Users can take or upload multiple fridge photos, review AI-detected ingredients with confidence labels, add or edit ingredients manually, and generate meal recommendations across Western, Chinese, and international cuisines.

The app is designed for Expo Go SDK 54. If no OpenAI API key is configured, refrigerator photo analysis falls back to the local mock detector in `src/services/ai.ts` so the rest of the app remains usable during development.

## Features

- Three-step mobile flow instead of one long page:
  - Photo capture/upload and photo cleanup
  - Ingredient review and manual edits
  - Meal recommendations
- Top-right language selector with English as the default language.
- Multiple photo selection through `expo-image-picker`.
- Per-photo controls to crop, rotate, or delete images before analysis.
- OpenAI Vision-powered refrigerator image analysis when `EXPO_PUBLIC_OPENAI_API_KEY` is available.
- Local mock refrigerator image analysis fallback when no API key is configured.
- Editable ingredient confirmation step before meal generation.
- Meal recommendations browsed with category tabs for vegetables, meats, staples, snacks, and drinks.
- Per-meal cuisine, ingredients used, missing optional ingredients, estimated calories, macros, cooking time, and simple cooking steps.
- Fully localized English, Chinese, and French labels for the redesigned flow and meal suggestions.
- Loading states for scanning the refrigerator and generating meal ideas.

## AI/API architecture

The AI service exposes clearly named functions for image recognition and meal planning:

- `detectIngredientsFromImages(images)` — sends selected image data to the OpenAI Responses API with a vision-capable model and requests structured ingredient JSON. Without an API key, it uses the local mock detector.
- `recommendMealsFromIngredients(ingredients, language)` — local rule-based meal ideas that can later be replaced or augmented with OpenAI text generation. Ingredient names are canonicalized across supported languages before matching so Chinese/French inputs still map to the same recipe logic.
- `estimateNutrition(meal)` — placeholder for more precise nutrition estimation.

### OpenAI setup

Set your OpenAI key in your local shell before starting Expo:

```sh
export EXPO_PUBLIC_OPENAI_API_KEY="your_openai_api_key"
npm start
```

Optionally override the vision model:

```sh
export EXPO_PUBLIC_OPENAI_VISION_MODEL="gpt-4.1-mini"
```

> Security note: `EXPO_PUBLIC_` variables are bundled into client-side Expo apps. This is acceptable only for local prototypes. For production, proxy OpenAI requests through your own backend and keep the API key server-side.

## Run locally

Install dependencies and start the Expo development server:

```sh
npm install
npm start
```

Use the Expo CLI prompts to open the app in Expo Go on iOS, Android, or web.

## Type checking

```sh
npm run typecheck
```

## Repository hygiene

Generated files such as `node_modules`, lockfiles, build output, caches, and binary assets are intentionally ignored so pull requests contain only editable source files.
