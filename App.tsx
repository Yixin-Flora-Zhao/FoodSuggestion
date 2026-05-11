import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FoodSuggestion = {
  name: string;
  description: string;
  tags: string[];
};

const suggestions: FoodSuggestion[] = [
  {
    name: 'Veggie grain bowl',
    description: 'Brown rice, roasted vegetables, chickpeas, and a lemon-tahini drizzle.',
    tags: ['fresh', 'vegetarian', 'meal prep'],
  },
  {
    name: 'Chicken taco salad',
    description: 'Seasoned chicken over crisp greens with beans, corn, avocado, and salsa.',
    tags: ['high protein', 'quick', 'bright'],
  },
  {
    name: 'Tomato basil pasta',
    description: 'Pasta tossed with cherry tomatoes, garlic, basil, olive oil, and parmesan.',
    tags: ['comforting', 'simple', 'pantry'],
  },
  {
    name: 'Salmon rice plate',
    description: 'Flaky salmon with steamed rice, cucumber, edamame, and spicy mayo.',
    tags: ['omega-3', 'savory', 'balanced'],
  },
  {
    name: 'Mushroom ramen',
    description: 'Noodles in a cozy broth with mushrooms, soft egg, scallions, and sesame.',
    tags: ['warm', 'umami', 'cozy'],
  },
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSuggestion = suggestions[currentIndex];
  const tagLine = useMemo(() => currentSuggestion.tags.join(' • '), [currentSuggestion]);

  function suggestAnother() {
    setCurrentIndex((previousIndex: number) => (previousIndex + 1) % suggestions.length);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Tonight&apos;s idea</Text>
        <Text style={styles.title}>{currentSuggestion.name}</Text>
        <Text style={styles.description}>{currentSuggestion.description}</Text>
        <Text style={styles.tags}>{tagLine}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={suggestAnother} style={styles.button}>
          <Text style={styles.buttonText}>Suggest another</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 28,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  eyebrow: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1F2937',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 16,
  },
  description: {
    color: '#4B5563',
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 20,
  },
  tags: {
    color: '#9A3412',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 28,
  },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#EA580C',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
