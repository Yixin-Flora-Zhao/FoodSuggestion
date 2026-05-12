import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  canonicalizeIngredientName,
  detectIngredientsFromImages,
  recommendMealsFromIngredients,
  type FridgeImage,
  type Ingredient,
  type MealCategory,
  type MealRecommendation,
} from './src/services/ai';

const categoryOrder: MealCategory[] = ['vegetables', 'meats', 'staples', 'snacks', 'drinks'];
const categoryLabels: Record<MealCategory, string> = {
  vegetables: 'Vegetables',
  meats: 'Meats',
  staples: 'Staples',
  snacks: 'Snacks',
  drinks: 'Drinks',
};
type AppScreen = 'photos' | 'ingredients' | 'meals';
type MealTab = 'all' | MealCategory;

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('photos');
  const [images, setImages] = useState<FridgeImage[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [meals, setMeals] = useState<MealRecommendation[]>([]);
  const [activeMealTab, setActiveMealTab] = useState<MealTab>('all');
  const [manualIngredient, setManualIngredient] = useState('');
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [mealError, setMealError] = useState<string | null>(null);
  const manualInputRef = useRef<TextInput>(null);

  const isBusy = loadingMessage !== null;
  const filteredMeals = useMemo(
    () => (activeMealTab === 'all' ? meals : meals.filter((meal) => meal.category === activeMealTab)),
    [activeMealTab, meals],
  );


  async function takeRefrigeratorPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is needed to take refrigerator photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    appendImages(result.assets.map((asset: { uri: string }) => ({ uri: asset.uri, source: 'camera' as const })));
  }

  async function uploadRefrigeratorPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is needed to upload refrigerator photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    appendImages(result.assets.map((asset: { uri: string }) => ({ uri: asset.uri, source: 'library' as const })));
  }

  async function cropPhoto(id: string) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is needed to upload refrigerator photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const replacement = result.assets[0];

    if (!replacement) {
      return;
    }

    setImages((currentImages) =>
      currentImages.map((image) =>
        image.id === id
          ? {
              ...image,
              uri: replacement.uri,
              rotation: 0,
            }
          : image,
      ),
    );
    clearAnalysis();
  }

  function appendImages(newImages: Array<Omit<FridgeImage, 'id'>>) {
    setImages((currentImages) => [
      ...currentImages,
      ...newImages.map((image, index) => ({
        ...image,
        id: `${image.source}-${Date.now()}-${index}`,
        rotation: 0,
      })),
    ]);
    clearAnalysis();
  }

  function rotatePhoto(id: string) {
    setImages((currentImages) =>
      currentImages.map((image) => (image.id === id ? { ...image, rotation: ((image.rotation ?? 0) + 90) % 360 } : image)),
    );
    clearAnalysis();
  }

  function confirmDeletePhoto(id: string) {
    Alert.alert('Delete photo?', 'This photo will be removed from the analysis.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(id) },
    ]);
  }

  function deletePhoto(id: string) {
    setImages((currentImages) => currentImages.filter((image) => image.id !== id));
    clearAnalysis();
  }

  function clearAnalysis() {
    setIngredients([]);
    setMeals([]);
    setActiveMealTab('all');
  }

  async function scanImages() {
    setLoadingMessage('Scanning refrigerator...');

    try {
      const detectedIngredients = await detectIngredientsFromImages(images);
      setIngredients((currentIngredients) => mergeIngredients(currentIngredients, detectedIngredients));
      setMeals([]);
      setScreen('ingredients');
    } catch (error) {
      Alert.alert('Photo analysis failed', error instanceof Error ? error.message : 'Please try again or add ingredients manually.');
    } finally {
      setLoadingMessage(null);
    }
  }

  function addManualIngredient() {
    const normalizedName = manualIngredient.trim();

    if (normalizedName.length === 0) {
      return;
    }

    setIngredients((currentIngredients) =>
      mergeIngredients(currentIngredients, [
        {
          id: `manual-${Date.now()}`,
          name: normalizedName,
          confidence: 1,
          source: 'manual',
        },
      ]),
    );
    setManualIngredient('');
    setMeals([]);
  }

  function updateIngredientName(id: string, name: string) {
    setIngredients((currentIngredients) =>
      currentIngredients.map((ingredient) => (ingredient.id === id ? { ...ingredient, name } : ingredient)),
    );
    setMeals([]);
  }

  function removeIngredient(id: string) {
    setIngredients((currentIngredients) => currentIngredients.filter((ingredient) => ingredient.id !== id));
    setMeals([]);
  }

  async function generateMeals() {
    setLoadingMessage('Finding meals');

    try {
      const recommendedMeals = await recommendMealsFromIngredients(ingredients, 'en');
      setMeals(recommendedMeals);
      setActiveMealTab('all');
      setScreen('meals');
    } finally {
      setLoadingMessage(null);
    }
  }

  function startOver() {
    setImages([]);
    setIngredients([]);
    setMeals([]);
    setManualIngredient('');
    setActiveMealTab('all');
    setScreen('photos');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <View style={styles.appHeader}>
          <View>
            <Text style={{ color: "black", fontSize: 32 }}>Food Pollution</Text>
            <Text style={styles.eyebrow}>AI refrigerator cooking assistant</Text>
            <Text style={styles.appTitle}>Food Pollution</Text>
            <Text style={styles.appSubtitle}>Upload fridge photos, review detected ingredients, and get meal ideas by category.</Text>
          </View>
        </View>

        <View style={styles.stepTabs}>
          <StepTab active={screen === 'photos'} label={'Photos'} onPress={() => setScreen('photos')} />
          <StepTab active={screen === 'ingredients'} disabled={ingredients.length === 0} label={'Ingredients'} onPress={() => setScreen('ingredients')} />
          <StepTab active={screen === 'meals'} disabled={meals.length === 0} label={'Meals'} onPress={() => setScreen('meals')} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {screen === 'photos' && renderPhotosScreen()}
          {screen === 'ingredients' && renderIngredientsScreen()}
          {screen === 'meals' && renderMealsScreen()}
        </ScrollView>

        {loadingMessage && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#047857" />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderPhotosScreen() {
    return (
      <View style={styles.screenCard}>
        <Text style={styles.screenTitle}>{'Photos'}</Text>
        <Text style={styles.screenSubtitle}>{'Start with clear photos of shelves, drawers, and labels. You can crop, rotate, or delete photos before analysis.'}</Text>

        <View style={styles.primaryActions}>
          <ActionButton disabled={isBusy} label={'Take photos'} onPress={takeRefrigeratorPhoto} tone="green" />
          <ActionButton disabled={isBusy} label={'Upload photos'} onPress={uploadRefrigeratorPhotos} tone="blue" />
        </View>

        <View style={styles.photoGridHeader}>
          <Text style={styles.photoCountText}>{images.length > 0 ? `${images.length} ${'photos ready'}` : 'No photos yet. Take or upload fridge photos to begin.'}</Text>
        </View>

        <View style={styles.photoGrid}>
          {images.map((image, index) => (
            <View key={image.id} style={styles.photoCard}>
              <Image source={{ uri: image.uri }} style={[styles.photo, { transform: [{ rotate: `${image.rotation ?? 0}deg` }] }]} />
              <Text style={styles.photoLabel}>{`${'Photo'} ${index + 1}`}</Text>
              <View style={styles.photoActions}>
                <MiniButton disabled={isBusy} label={'Crop'} onPress={() => cropPhoto(image.id)} />
                <MiniButton disabled={isBusy} label={'Rotate'} onPress={() => rotatePhoto(image.id)} />
                <MiniButton destructive disabled={isBusy} label={'Delete'} onPress={() => confirmDeletePhoto(image.id)} />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={images.length === 0 || isBusy}
          onPress={scanImages}
          style={[styles.primaryCta, (images.length === 0 || isBusy) && styles.disabledButton]}
        >
          <Text style={styles.primaryCtaText}>{'Analyze photos'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderIngredientsScreen() {
    return (
      <View style={styles.screenCard}>
        <Text style={styles.screenTitle}>{'Ingredients'}</Text>
        <Text style={styles.screenSubtitle}>{ingredients.length > 0 ? 'Edit ingredient names, remove incorrect items, then ask for meal suggestions.' : 'Confirm what the AI found before generating recommendations.'}</Text>

        <View style={styles.manualRow}>
          <TextInput
            ref={manualInputRef}
            onChangeText={setManualIngredient}
            onSubmitEditing={addManualIngredient}
            placeholder={'Add ingredient, e.g. carrots'}
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            style={styles.manualInput}
            value={manualIngredient}
          />
          <TouchableOpacity accessibilityRole="button" onPress={addManualIngredient} style={styles.addButton}>
            <Text style={styles.addButtonText}>{'Add ingredient'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ingredientsGrid}>
          {ingredients.map((ingredient) => (
            <View key={ingredient.id} style={styles.ingredientPill}>
              <TextInput
                onChangeText={(name) => updateIngredientName(ingredient.id, name)}
                style={styles.ingredientInput}
                value={ingredient.name}
              />
              <Text style={styles.confidenceText}>{`${Math.round(ingredient.confidence * 100)}% ${'confidence'}`}</Text>
              <TouchableOpacity accessibilityLabel="Remove ingredient" onPress={() => removeIngredient(ingredient.id)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity accessibilityRole="button" disabled={isBusy} onPress={() => setScreen('photos')} style={styles.secondaryCta}>
            <Text style={styles.secondaryCtaText}>{'Back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={ingredients.length === 0 || isBusy}
            onPress={generateMeals}
            style={[styles.primaryCta, styles.flexCta, (ingredients.length === 0 || isBusy) && styles.disabledButton]}
          >
            <Text style={styles.primaryCtaText}>{'Finding meals'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderMealsScreen() {
    return (
      <View style={styles.screenCard}>
        <View style={styles.mealScreenHeader}>
          <View style={styles.mealTitleWrap}>
            <Text style={styles.screenTitle}>{'Finding meals'}</Text>
            <Text style={styles.screenSubtitle}>{'Choose a category tab to browse matching meal ideas.'}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={startOver} style={styles.restartButton}>
            <Text style={styles.restartButtonText}>{'Start over'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTabs}>
          <CategoryTab active={activeMealTab === 'all'} label={'All'} onPress={() => setActiveMealTab('all')} />
          {categoryOrder.map((category) => (
            <CategoryTab
              active={activeMealTab === category}
              key={category}
              label={categoryLabels[category]}
              onPress={() => setActiveMealTab(category)}
            />
          ))}
        </ScrollView>

        {filteredMeals.length > 0 ? (
          filteredMeals.map((meal) => <MealCard key={meal.id} meal={meal} />)
        ) : (
          <Text style={styles.emptyText}>{'No meal suggestions in this category yet.'}</Text>
        )}
      </View>
    );
  }
}

function mergeIngredients(currentIngredients: Ingredient[], detectedIngredients: Ingredient[]) {
  const currentNames = new Set(currentIngredients.map((ingredient) => canonicalizeIngredientName(ingredient.name)));
  const uniqueDetected = detectedIngredients.filter((ingredient) => !currentNames.has(canonicalizeIngredientName(ingredient.name)));

  return [...currentIngredients, ...uniqueDetected];
}

type StepTabProps = {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function StepTab({ active, disabled, label, onPress }: StepTabProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepTab, active && styles.stepTabActive, disabled && styles.disabledTab]}
    >
      <Text style={[styles.stepTabText, active && styles.stepTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

type ActionButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone: 'green' | 'blue';
};

function ActionButton({ disabled, label, onPress, tone }: ActionButtonProps) {
  const toneStyle = {
    green: styles.greenAction,
    blue: styles.blueAction,
  }[tone];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, toneStyle, disabled && styles.disabledButton]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

type MiniButtonProps = {
  destructive?: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function MiniButton({ destructive, disabled, label, onPress }: MiniButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.miniButton, destructive && styles.miniButtonDestructive, disabled && styles.disabledButton]}
    >
      <Text style={[styles.miniButtonText, destructive && styles.miniButtonTextDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

type CategoryTabProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function CategoryTab({ active, label, onPress }: CategoryTabProps) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.categoryTab, active && styles.categoryTabActive]}>
      <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

type MealCardProps = {
  meal: MealRecommendation;
};

function MealCard({ meal }: MealCardProps) {
  const mealImageUri = mealImageUris[meal.id] ?? mealImageUris['tomato-cucumber-yogurt-salad'];
  const macros = [
    meal.nutrition.protein ? `${meal.nutrition.protein}g ${'protein'}` : null,
    meal.nutrition.carbs ? `${meal.nutrition.carbs}g ${'carbs'}` : null,
    meal.nutrition.fat ? `${meal.nutrition.fat}g ${'fat'}` : null,
  ].filter(Boolean);

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealContent}>
        <View style={styles.mealTitleBlock}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMeta}>{`${meal.cuisine} • ${categoryLabels[meal.category]}`}</Text>
          <Text style={styles.mealIngredientLine} numberOfLines={2}>
            <Text style={styles.mealIngredientLabel}>{'Matching ingredients'}: </Text>
            {meal.ingredientsUsed.length > 0 ? meal.ingredientsUsed.join(', ') : '—'}
          </Text>
          <Text style={styles.mealIngredientLine} numberOfLines={2}>
            <Text style={styles.mealIngredientLabel}>{'Missing ingredients'}: </Text>
            {meal.missingOptionalIngredients.length > 0 ? meal.missingOptionalIngredients.join(', ') : '—'}
          </Text>
        </View>

        <View style={styles.mealImageWrap}>
          <Image source={{ uri: mealImageUri }} style={styles.mealImage} />
          <TouchableOpacity accessibilityLabel={'Save meal'} accessibilityRole="button" onPress={() => undefined} style={styles.saveMealButton}>
            <Text style={styles.saveMealButtonText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <InfoLine label={'Uses'} value={meal.ingredientsUsed.length > 0 ? meal.ingredientsUsed.join(', ') : '—'} />
      <InfoLine label={'Optional extras'} value={meal.missingOptionalIngredients.join(', ')} />
      <InfoLine label={'Nutrition'} value={`${meal.nutrition.calories} ${'cal'}${macros.length > 0 ? ` • ${macros.join(' • ')}` : ''}`} />

      <Text style={styles.stepsTitle}>{'Simple steps'}</Text>
      {meal.steps.map((step, index) => (
        <Text key={step} style={styles.stepText}>{`${index + 1}. ${step}`}</Text>
      ))}
    </View>
  );
}

type InfoLineProps = {
  label: string;
  value: string;
};

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}


const mealImageUris: Record<string, string> = {
  'tomato-cucumber-yogurt-salad': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=480',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  appHeader: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  eyebrow: {
    color: '#1F2933',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  appTitle: {
    color: '#1F2933',
    fontSize: 24,
    fontWeight: '700',
  },
  appSubtitle: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 230,
  },
  stepTabs: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stepTab: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  stepTabActive: {
    backgroundColor: '#D1FAE5',
  },
  stepTabText: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
  },
  stepTabTextActive: {
    color: '#1F2933',
  },
  disabledTab: {
    opacity: 0.5,
  },
  container: {
    padding: 18,
    paddingBottom: 44,
  },
  screenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  screenTitle: {
    color: '#1F2933',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    color: '#1F2933',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 18,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  greenAction: {
    backgroundColor: '#047857',
  },
  blueAction: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  photoGridHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  photoCountText: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    width: '48%',
  },
  photo: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    height: 132,
    width: '100%',
  },
  photoLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  miniButton: {
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  miniButtonDestructive: {
    backgroundColor: '#FEE2E2',
  },
  miniButtonText: {
    color: '#1F2933',
    fontSize: 11,
    fontWeight: '700',
  },
  miniButtonTextDestructive: {
    color: '#1F2933',
  },
  primaryCta: {
    alignItems: 'center',
    backgroundColor: '#047857',
    borderRadius: 18,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryCta: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  secondaryCtaText: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
  },
  flexCta: {
    flex: 1,
    marginTop: 0,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  manualInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D1FAE5',
    borderRadius: 16,
    borderWidth: 1,
    color: '#1F2933',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyIngredientsCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  emptyIngredientsTitle: {
    color: '#1F2933',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyIngredientsText: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  ingredientsGrid: {
    gap: 10,
  },
  ingredientPill: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ingredientInput: {
    color: '#1F2933',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 6,
  },
  confidenceText: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  removeButtonText: {
    color: '#1F2933',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  mealScreenHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mealTitleWrap: {
    flex: 1,
  },
  restartButton: {
    backgroundColor: '#FFEDD5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  restartButtonText: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '700',
  },
  mealTabs: {
    marginBottom: 16,
  },
  categoryTab: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryTabActive: {
    backgroundColor: '#047857',
  },
  categoryTabText: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  mealContent: {
    flexDirection: 'row',
    gap: 14,
  },
  mealTitleBlock: {
    flex: 1,
    paddingVertical: 4,
  },
  mealName: {
    color: '#1F2933',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
  },
  mealMeta: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  mealIngredientLine: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 7,
  },
  mealIngredientLabel: {
    color: '#1F2933',
    fontWeight: '900',
  },
  mealImageWrap: {
    borderRadius: 20,
    height: 116,
    overflow: 'hidden',
    position: 'relative',
    width: 104,
  },
  mealImage: {
    backgroundColor: '#D1FAE5',
    height: '100%',
    width: '100%',
  },
  saveMealButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    bottom: 8,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    width: 30,
  },
  saveMealButtonText: {
    color: '#1F2933',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  mealDescription: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  timeBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    borderWidth: 3,
    bottom: -8,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    width: 38,
  },
  timeBadgeText: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '900',
  },
  infoLine: {
    marginBottom: 8,
  },
  infoLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '900',
  },
  infoValue: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 2,
  },
  stepsTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 6,
  },
  stepText: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  mealStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  mealStatPill: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  mealStatValue: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  mealStatLabel: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    paddingVertical: 24,
    textAlign: 'center',
  },
  errorText: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 14,
    padding: 12,
  },
  disabledButton: {
    opacity: 0.45,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  loadingText: {
    color: '#1F2933',
    fontSize: 16,
    fontWeight: '900',
  },
});
