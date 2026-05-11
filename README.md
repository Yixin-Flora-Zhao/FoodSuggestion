# FridgeChef AI Food Suggestion

FridgeChef AI is an Expo React Native prototype that helps users turn refrigerator contents into realistic meal ideas. Users can take or upload multiple fridge photos, review mock AI-detected ingredients with confidence labels, add or edit ingredients manually, and generate meal recommendations across Western, Chinese, and international cuisines.

The app is designed for Expo Go SDK 54 and currently runs without any API keys. AI behavior is implemented locally in `src/services/ai.ts` so the service layer can later be replaced with OpenAI Vision and text generation calls.

## Features

- Home screen with three primary actions:
  - Take refrigerator photos
  - Upload refrigerator photos
  - Add food manually
- Multiple photo selection through `expo-image-picker`.
- Mock refrigerator image analysis with detected ingredients, quantities, and confidence labels.
- Editable ingredient confirmation step before meal generation.
- Meal recommendations grouped into vegetables, meats, main food / staples, snacks, and drinks.
- Per-meal cuisine, ingredients used, missing optional ingredients, estimated calories, macros, cooking time, and simple cooking steps.
- Language selector for English, Chinese, and French app labels and meal suggestions.
- Loading states for scanning the refrigerator and generating meal ideas.

## AI/API architecture

The mock AI service exposes clearly named functions that are ready to be swapped for real API implementations:

- `detectIngredientsFromImages(images)` — placeholder for OpenAI Vision-based fridge image recognition.
- `recommendMealsFromIngredients(ingredients, language)` — placeholder for OpenAI text generation of localized meal ideas.
- `estimateNutrition(meal)` — placeholder for more precise nutrition estimation.

Integration comments in `src/services/ai.ts` identify where to connect OpenAI Vision and text generation requests later.

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
