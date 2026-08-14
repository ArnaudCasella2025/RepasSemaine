import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormInput } from '../../components/FormInput';
import { ProgressBar } from '../../components/ProgressBar';
import { RayonSelect } from '../../components/RayonSelect';
import { ScreenShell } from '../../components/ScreenShell';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { fetchAiIngredients, isAiShoppingConfigured } from '../../lib/aiShoppingList';
import { notify } from '../../lib/alert';
import { RAYONS, Rayon } from '../../lib/meals';
import { buildShoppingGroups, buildShoppingGroupsByMeal } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { colors, fonts, radii } from '../../lib/theme';

type GroupMode = 'rayon' | 'meal';

export default function CoursesScreen() {
  const router = useRouter();
  const { nextMenu, extraItems, shoppingChecked, toggleShoppingItem, addExtraItem, removeExtraItem, applyAiIngredients } = useStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemRayon, setNewItemRayon] = useState<Rayon>(RAYONS[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>('rayon');

  const rayonGroups = useMemo(() => buildShoppingGroups(nextMenu, extraItems), [nextMenu, extraItems]);
  const mealGroups = useMemo(() => buildShoppingGroupsByMeal(nextMenu, extraItems), [nextMenu, extraItems]);
  const groups = groupMode === 'rayon' ? rayonGroups : mealGroups;
  const hasItems = groups.length > 0;
  const filledCount = nextMenu.filter((s) => s.meal).length;
  const menuComplete = filledCount === 7;

  const mealsMissingIngredients = useMemo(
    () => nextMenu.filter((sl) => sl.meal && sl.meal.ingredients.length === 0).map((sl) => ({ id: sl.meal!.id, name: sl.meal!.name })),
    [nextMenu]
  );

  const handleAdd = () => {
    if (!newItemName.trim()) return;
    addExtraItem(newItemName, newItemRayon);
    setNewItemName('');
  };

  const handleAiUpdate = async () => {
    if (mealsMissingIngredients.length === 0 || aiLoading) return;
    setAiLoading(true);
    try {
      const results = await fetchAiIngredients(mealsMissingIngredients);
      applyAiIngredients(results);
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : "La génération a échoué, réessaie plus tard.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScreenShell title="Liste de courses" subtitle="Un rayon à la fois">
      <View style={styles.addForm}>
        <FormInput value={newItemName} onChangeText={setNewItemName} placeholder="Ajouter un article" bg={colors.surface} />
        <View style={styles.addRow}>
          <RayonSelect value={newItemRayon} options={RAYONS} onChange={setNewItemRayon} />
          <Pressable onPress={handleAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>Ajouter</Text>
          </Pressable>
        </View>
      </View>

      {isAiShoppingConfigured && mealsMissingIngredients.length > 0 && (
        <Pressable onPress={handleAiUpdate} disabled={aiLoading} style={[styles.aiButton, aiLoading && styles.aiButtonDisabled]}>
          {aiLoading ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={styles.aiButtonText}>✨ Mettre à jour avec l'IA</Text>
          )}
        </Pressable>
      )}

      {hasItems ? (
        <>
          {!menuComplete && (
            <View style={styles.progressWrap}>
              <ProgressBar pct={Math.round((filledCount / 7) * 100)} label={`${filledCount}/7 repas planifiés`} size="sm" />
            </View>
          )}

          <View style={styles.modeSwitch}>
            <Pressable onPress={() => setGroupMode('rayon')} style={[styles.modeButton, groupMode === 'rayon' && styles.modeButtonActive]}>
              <Text style={[styles.modeButtonText, groupMode === 'rayon' && styles.modeButtonTextActive]}>Par rayon</Text>
            </Pressable>
            <Pressable onPress={() => setGroupMode('meal')} style={[styles.modeButton, groupMode === 'meal' && styles.modeButtonActive]}>
              <Text style={[styles.modeButtonText, groupMode === 'meal' && styles.modeButtonTextActive]}>Par repas</Text>
            </Pressable>
          </View>

          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((item) => (
                <ShoppingItemRow
                  key={item.name}
                  name={item.name}
                  checked={!!shoppingChecked[item.name]}
                  removable={item.extraId != null}
                  onToggle={() => toggleShoppingItem(item.name)}
                  onRemove={item.extraId != null ? () => removeExtraItem(item.extraId!) : undefined}
                />
              ))}
            </View>
          ))}
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Rien à acheter pour l'instant</Text>
          <Text style={styles.emptySubtitle}>La liste se remplit au fur et à mesure que tu ajoutes des repas au menu.</Text>
          <Pressable onPress={() => router.push('/menu')} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>Aller au menu</Text>
          </Pressable>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  aiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.input,
    paddingVertical: 12,
    marginBottom: 16,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
  },
  addForm: {
    gap: 8,
    marginBottom: 16,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    flexShrink: 0,
  },
  addButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.white,
  },
  progressWrap: {
    marginBottom: 16,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.input,
    padding: 3,
    marginBottom: 18,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.input - 3,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  modeButtonTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },
  group: {
    marginBottom: 18,
  },
  groupTitle: {
    fontFamily: fonts.sectionTitle,
    fontSize: 14,
    color: colors.accent,
    marginBottom: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: fonts.sectionTitle,
    fontSize: 17,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyCta: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyCtaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.white,
  },
});
