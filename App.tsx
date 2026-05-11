import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState, type ReactNode } from 'react';
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

import { categoryLabels, languageLabels, translations } from './src/i18n/translations';
import {
  detectIngredientsFromImages,
  type FridgeImage,
  type Ingredient,
  type Language,
  type MealCategory,
  type MealRecommendation,
  recommendMealsFromIngredients,
  translateIngredientName,
} from './src/services/ai';

const categoryOrder: MealCategory[] = ['vegetables', 'meats', 'staples', 'snacks', 'drinks'];
const languages: Language[] = ['en', 'zh', 'fr'];

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [images, setImages] = useState<FridgeImage[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [meals, setMeals] = useState<MealRecommendation[]>([]);
  const [manualIngredient, setManualIngredient] = useState('');
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const manualInputRef = useRef<TextInput>(null);

  const t = translations[language];
  const isBusy = loadingMessage !== null;

  const groupedMeals = useMemo(
    () =>
      categoryOrder.map((category) => ({
        category,
        meals: meals.filter((meal) => meal.category === category),
      })),
    [meals],
  );

  async function takeRefrigeratorPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t.permissionTitle, t.cameraPermission);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
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
      Alert.alert(t.permissionTitle, t.libraryPermission);
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

  function appendImages(newImages: Array<Omit<FridgeImage, 'id'>>) {
    setImages((currentImages) => [
      ...currentImages,
      ...newImages.map((image, index) => ({
        ...image,
        id: `${image.source}-${Date.now()}-${index}`,
      })),
    ]);
    setMeals([]);
  }

  async function scanImages() {
    setLoadingMessage(t.scanning);

    try {
      const detectedIngredients = await detectIngredientsFromImages(images);
      setIngredients((currentIngredients) => mergeIngredients(currentIngredients, detectedIngredients));
      setMeals([]);
    } catch (error) {
      Alert.alert(t.scanErrorTitle, error instanceof Error ? error.message : t.scanErrorMessage);
    } finally {
      setLoadingMessage(null);
    }
  }

  function addManualIngredient() {
    const normalizedName = manualIngredient.trim();

    if (normalizedName.length === 0) {
      return;
    }

    setIngredients((currentIngredients) => [
      ...currentIngredients,
      {
        id: `manual-${Date.now()}`,
        name: normalizedName,
        confidence: 1,
        source: 'manual',
      },
    ]);
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
    setLoadingMessage(t.generating);
    const recommendedMeals = await recommendMealsFromIngredients(ingredients, language);
    setMeals(recommendedMeals);
    setLoadingMessage(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <View style={styles.languageTabs}>
              {languages.map((item) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setLanguage(item)}
                  style={[styles.languageTab, language === item && styles.languageTabActive]}
                >
                  <Text style={[styles.languageText, language === item && styles.languageTextActive]}>{languageLabels[item]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.eyebrow}>{t.eyebrow}</Text>
            <Text style={styles.title}>{t.appName}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>

            <View style={styles.primaryActions}>
              <ActionButton disabled={isBusy} label={t.takePhotos} onPress={takeRefrigeratorPhoto} tone="green" />
              <ActionButton disabled={isBusy} label={t.uploadPhotos} onPress={uploadRefrigeratorPhotos} tone="blue" />
              <ActionButton disabled={isBusy} label={t.addManually} onPress={() => manualInputRefocus()} tone="orange" />
            </View>
          </View>

          <SectionCard title={t.selectedPhotos} subtitle={images.length > 0 ? `${images.length} ${t.photoCount}` : t.noPhotos}>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                {images.map((image, index) => (
                  <View key={image.id} style={styles.photoCard}>
                    <Image source={{ uri: image.uri }} style={styles.photo} />
                    <Text style={styles.photoLabel}>{`${t.fallbackPhoto} ${index + 1}`}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={images.length === 0 || isBusy}
              onPress={scanImages}
              style={[styles.secondaryButton, (images.length === 0 || isBusy) && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>{t.scanFridge}</Text>
            </TouchableOpacity>
          </SectionCard>

          <SectionCard title={t.ingredients} subtitle={ingredients.length > 0 ? t.editHint : t.noIngredients}>
            <View style={styles.manualRow}>
              <TextInput
                ref={manualInputRef}
                onChangeText={setManualIngredient}
                onSubmitEditing={addManualIngredient}
                placeholder={t.manualInputPlaceholder}
                placeholderTextColor="#94A3B8"
                returnKeyType="done"
                style={styles.manualInput}
                value={manualIngredient}
              />
              <TouchableOpacity accessibilityRole="button" onPress={addManualIngredient} style={styles.addButton}>
                <Text style={styles.addButtonText}>{t.add}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ingredientsGrid}>
              {ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredientPill}>
                  <TextInput
                    onChangeText={(name) => updateIngredientName(ingredient.id, name)}
                    style={styles.ingredientInput}
                    value={translateIngredientName(ingredient.name, language)}
                  />
                  <Text style={styles.confidenceText}>{`${Math.round(ingredient.confidence * 100)}% ${t.confidence}`}</Text>
                  <TouchableOpacity accessibilityLabel="Remove ingredient" onPress={() => removeIngredient(ingredient.id)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              disabled={ingredients.length === 0 || isBusy}
              onPress={generateMeals}
              style={[styles.recommendButton, (ingredients.length === 0 || isBusy) && styles.disabledButton]}
            >
              <Text style={styles.recommendButtonText}>{t.confirmMeals}</Text>
            </TouchableOpacity>
          </SectionCard>

          {loadingMessage && (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#047857" />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          )}

          {meals.length > 0 && (
            <SectionCard title={t.mealIdeas}>
              {groupedMeals.map(({ category, meals: mealsInCategory }) =>
                mealsInCategory.length > 0 ? (
                  <View key={category} style={styles.categoryBlock}>
                    <Text style={styles.categoryTitle}>{categoryLabels[language][category]}</Text>
                    {mealsInCategory.map((meal) => (
                      <MealCard key={meal.id} language={language} meal={meal} />
                    ))}
                  </View>
                ) : null,
              )}
            </SectionCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function manualInputRefocus() {
    manualInputRef.current?.focus();
  }
}

function mergeIngredients(currentIngredients: Ingredient[], detectedIngredients: Ingredient[]) {
  const currentNames = new Set(currentIngredients.map((ingredient) => ingredient.name.toLowerCase().trim()));
  const uniqueDetected = detectedIngredients.filter((ingredient) => !currentNames.has(ingredient.name.toLowerCase().trim()));

  return [...currentIngredients, ...uniqueDetected];
}

type ActionButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone: 'green' | 'blue' | 'orange';
};

function ActionButton({ disabled, label, onPress, tone }: ActionButtonProps) {
  const toneStyle = {
    green: styles.greenAction,
    blue: styles.blueAction,
    orange: styles.orangeAction,
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

type SectionCardProps = {
  children: ReactNode;
  subtitle?: string;
  title: string;
};

function SectionCard({ children, subtitle, title }: SectionCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

type MealCardProps = {
  language: Language;
  meal: MealRecommendation;
};

function MealCard({ language, meal }: MealCardProps) {
  const t = translations[language];
  const macros = [
    meal.nutrition.protein ? `${meal.nutrition.protein}g ${t.protein}` : null,
    meal.nutrition.carbs ? `${meal.nutrition.carbs}g ${t.carbs}` : null,
    meal.nutrition.fat ? `${meal.nutrition.fat}g ${t.fat}` : null,
  ].filter(Boolean);

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleBlock}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMeta}>{`${meal.cuisine} • ${categoryLabels[language][meal.category]}`}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>{meal.cookingTime}</Text>
        </View>
      </View>

      <InfoLine label={t.used} value={meal.ingredientsUsed.length > 0 ? meal.ingredientsUsed.join(', ') : '—'} />
      <InfoLine label={t.optionalMissing} value={meal.missingOptionalIngredients.join(', ')} />
      <InfoLine label={t.nutrition} value={`${meal.nutrition.calories} ${t.calories}${macros.length > 0 ? ` • ${macros.join(' • ')}` : ''}`} />
      <InfoLine label={t.cookTime} value={meal.cookingTime} />

      <Text style={styles.stepsTitle}>{t.steps}</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECFDF5',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  languageTabs: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 22,
    padding: 5,
  },
  languageTab: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  languageTabActive: {
    backgroundColor: '#047857',
  },
  languageText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  eyebrow: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: '#064E3B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 42,
    marginBottom: 12,
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
  },
  primaryActions: {
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  greenAction: {
    backgroundColor: '#047857',
  },
  blueAction: {
    backgroundColor: '#2563EB',
  },
  orangeAction: {
    backgroundColor: '#F97316',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    marginTop: 18,
    padding: 20,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  photoStrip: {
    marginBottom: 16,
  },
  photoCard: {
    marginRight: 12,
    width: 116,
  },
  photo: {
    backgroundColor: '#D1FAE5',
    borderRadius: 18,
    height: 116,
    width: 116,
  },
  photoLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
    color: '#0F172A',
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
    fontWeight: '900',
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
    color: '#064E3B',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 6,
  },
  confidenceText: {
    color: '#047857',
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
    color: '#065F46',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  recommendButton: {
    alignItems: 'center',
    backgroundColor: '#047857',
    borderRadius: 18,
    marginTop: 16,
    paddingVertical: 16,
  },
  recommendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    padding: 18,
  },
  loadingText: {
    color: '#047857',
    fontSize: 16,
    fontWeight: '800',
  },
  categoryBlock: {
    marginTop: 12,
  },
  categoryTitle: {
    color: '#F97316',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  mealCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  mealHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mealTitleBlock: {
    flex: 1,
  },
  mealName: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
  },
  mealMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  timeBadge: {
    backgroundColor: '#FFEDD5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeBadgeText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '900',
  },
  infoLine: {
    marginBottom: 8,
  },
  infoLabel: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  stepsTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 6,
  },
  stepText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});
