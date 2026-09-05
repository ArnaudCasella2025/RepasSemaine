import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FormInput } from '../../components/FormInput';
import { MenuSlot } from '../../components/MenuSlot';
import { ScreenShell } from '../../components/ScreenShell';
import { SuggestionCard } from '../../components/SuggestionCard';
import {
  AiSuggestion,
  fetchAiSuggestions,
  fetchMenuBalance,
  isAiShoppingConfigured,
  MenuBalanceResult,
} from '../../lib/aiShoppingList';
import { notify } from '../../lib/alert';
import { confirmAction } from '../../lib/confirm';
import { BALANCE_ORDER, QUICK_ORDER } from '../../lib/meals';
import { buildHabitSuggestions } from '../../lib/selectors';
import { makeCustomMealRef, mealRefFromCatalog, useStore } from '../../lib/store';
import { colors, fonts, radii } from '../../lib/theme';

type SuggestMode = 'balance' | 'cheap';

export default function MenuScreen() {
  const { nextMenu, ideas, history, assignToFirstEmpty, clearSlot, assignToSlot, mealFromIdea } = useStore();
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [detailSlot, setDetailSlot] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [balance, setBalance] = useState<MenuBalanceResult | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [suggestMode, setSuggestMode] = useState<SuggestMode | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState<SuggestMode | null>(null);

  const filledCount = nextMenu.filter((s) => s.meal).length;
  const habitSuggestions = useMemo(() => buildHabitSuggestions(history, nextMenu), [history, nextMenu]);

  const closePicker = () => {
    setPickerSlot(null);
    setCustomName('');
    setCustomDesc('');
    setCustomLink('');
  };

  const openPicker = (index: number) => {
    setDetailSlot(null);
    setPickerSlot(index);
  };

  const validateCustom = () => {
    if (pickerSlot === null) return;
    const name = customName.trim();
    if (!name) return;
    assignToSlot(pickerSlot, makeCustomMealRef(name, customDesc, customLink));
    closePicker();
  };

  const toggleDetail = (index: number) => {
    setPickerSlot(null);
    setDetailSlot((current) => (current === index ? null : index));
  };

  const confirmClearSlot = (index: number) => {
    const meal = nextMenu[index].meal;
    if (!meal) return;
    confirmAction('Retirer ce repas', `Retirer "${meal.name}" du menu de ${nextMenu[index].day} ?`, () => {
      clearSlot(index);
      setDetailSlot(null);
    });
  };

  const handleEvaluateBalance = async () => {
    if (balanceLoading || filledCount === 0) return;
    setBalanceLoading(true);
    try {
      const meals = nextMenu.filter((s) => s.meal).map((s) => ({ name: s.meal!.name, tag: s.meal!.tag }));
      const result = await fetchMenuBalance(meals);
      setBalance(result);
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : "L'évaluation a échoué, réessaie plus tard.");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleAiSuggest = async (mode: SuggestMode) => {
    if (suggestLoading) return;
    setSuggestLoading(mode);
    try {
      const currentMeals = nextMenu.filter((s) => s.meal).map((s) => ({ name: s.meal!.name, tag: s.meal!.tag }));
      const results = await fetchAiSuggestions(mode, currentMeals);
      setSuggestions(results);
      setSuggestMode(mode);
    } catch (e) {
      notify('Erreur', e instanceof Error ? e.message : 'La suggestion a échoué, réessaie plus tard.');
    } finally {
      setSuggestLoading(null);
    }
  };

  const detailMeal = detailSlot !== null ? nextMenu[detailSlot].meal : null;

  return (
    <ScreenShell title="Semaine prochaine" subtitle="Compose ton menu">
      <Text style={styles.progressText}>{filledCount}/7 repas planifiés — touche un repas pour le voir en détail</Text>

      <View style={styles.slotList}>
        {nextMenu.map((slot, i) => (
          <MenuSlot
            key={slot.day}
            day={slot.day}
            label={slot.meal ? slot.meal.name : '+ Choisir un repas'}
            filled={!!slot.meal}
            active={detailSlot === i || pickerSlot === i}
            onPress={() => (slot.meal ? toggleDetail(i) : openPicker(i))}
          />
        ))}
      </View>

      {detailMeal && (
        <View style={styles.detail}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{detailMeal.name}</Text>
            <Pressable onPress={() => setDetailSlot(null)} hitSlop={8}>
              <Text style={styles.pickerClose}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.detailTag}>
            <Text style={styles.detailTagText}>{detailMeal.tag}</Text>
          </View>
          {detailMeal.desc ? (
            <Text style={styles.detailDesc}>{detailMeal.desc}</Text>
          ) : (
            <Text style={styles.detailDescEmpty}>Pas de description pour ce repas.</Text>
          )}
          {!!detailMeal.link && (
            <Pressable onPress={() => Linking.openURL(detailMeal.link!)}>
              <Text style={styles.detailLink}>Voir la recette →</Text>
            </Pressable>
          )}
          <Pressable onPress={() => detailSlot !== null && confirmClearSlot(detailSlot)} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>Retirer ce repas</Text>
          </Pressable>
        </View>
      )}

      {pickerSlot !== null && (
        <View style={styles.picker}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choisir pour {nextMenu[pickerSlot].day}</Text>
            <Pressable onPress={closePicker} hitSlop={8}>
              <Text style={styles.pickerClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.pickerLabel}>Depuis la liste d'envie</Text>
          <View style={styles.chipsRow}>
            {ideas.map((idea) => (
              <Pressable
                key={idea.id}
                onPress={() => {
                  assignToSlot(pickerSlot, mealFromIdea(idea));
                  closePicker();
                }}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{idea.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.pickerLabel}>Ou entre ton propre choix</Text>
          <View style={styles.customForm}>
            <FormInput value={customName} onChangeText={setCustomName} placeholder="Nom du repas" />
            <FormInput value={customDesc} onChangeText={setCustomDesc} placeholder="Description (optionnel)" />
            <FormInput value={customLink} onChangeText={setCustomLink} placeholder="Lien Pinterest / Insta / recette" />
            <Pressable onPress={validateCustom} style={styles.validateButton}>
              <Text style={styles.validateButtonText}>Valider</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isAiShoppingConfigured && (
        <>
          <Pressable
            onPress={handleEvaluateBalance}
            disabled={balanceLoading || filledCount === 0}
            style={[styles.aiButton, (balanceLoading || filledCount === 0) && styles.aiButtonDisabled]}
          >
            {balanceLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.aiButtonText}>✨ Évaluer l'équilibre du menu</Text>
            )}
          </Pressable>

          {balance && (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceScore}>{balance.score}/10</Text>
              <Text style={styles.balanceComment}>{balance.comment}</Text>
            </View>
          )}
        </>
      )}

      <Text style={styles.sectionTitle}>De ta liste d'envie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
        {ideas.map((idea) => (
          <SuggestionCard key={idea.id} name={idea.name} tag="Envie" onPress={() => assignToFirstEmpty(mealFromIdea(idea))} />
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Vos habitudes</Text>
      {habitSuggestions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
          {habitSuggestions.map((meal) => (
            <SuggestionCard key={meal.id} name={meal.name} tag={meal.tag} onPress={() => assignToFirstEmpty(meal)} />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.emptyHabitsText}>Pas de nouvelle suggestion pour l'instant — variez encore un peu avant qu'on en propose à nouveau.</Text>
      )}

      <Text style={styles.sectionTitle}>Pour rééquilibrer</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
        {BALANCE_ORDER.map((id) => {
          const meal = mealRefFromCatalog(id);
          return <SuggestionCard key={id} name={meal.name} tag={meal.tag} variant="balance" onPress={() => assignToFirstEmpty(meal)} />;
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Rapide à faire</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
        {QUICK_ORDER.map((id) => {
          const meal = mealRefFromCatalog(id);
          return <SuggestionCard key={id} name={meal.name} tag={meal.tag} variant="quick" onPress={() => assignToFirstEmpty(meal)} />;
        })}
      </ScrollView>

      {isAiShoppingConfigured && (
        <>
          <Text style={styles.sectionTitle}>Suggestions IA</Text>
          <View style={styles.suggestButtonsRow}>
            <Pressable
              onPress={() => handleAiSuggest('balance')}
              disabled={suggestLoading !== null}
              style={[styles.suggestButton, suggestLoading !== null && styles.aiButtonDisabled]}
            >
              {suggestLoading === 'balance' ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.aiButtonText}>✨ Équilibrer le menu</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => handleAiSuggest('cheap')}
              disabled={suggestLoading !== null}
              style={[styles.suggestButton, suggestLoading !== null && styles.aiButtonDisabled]}
            >
              {suggestLoading === 'cheap' ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.aiButtonText}>✨ Idées pas chères</Text>
              )}
            </Pressable>
          </View>

          {suggestMode && suggestions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.suggestionsRow, { marginBottom: 0 }]}>
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={`${s.name}_${i}`}
                  name={s.name}
                  tag={s.tag}
                  variant={suggestMode === 'balance' ? 'balance' : 'neutral'}
                  onPress={() => assignToFirstEmpty(makeCustomMealRef(s.name, s.reason, undefined, s.tag))}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  progressText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  slotList: {
    gap: 8,
    marginBottom: 22,
  },
  picker: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 18,
  },
  detail: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 18,
  },
  detailTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    marginBottom: 8,
  },
  detailTagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  detailDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  detailDescEmpty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPlaceholder,
    marginBottom: 8,
  },
  detailLink: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.accent,
    marginBottom: 12,
  },
  removeButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.input,
    paddingVertical: 10,
    alignItems: 'center',
  },
  removeButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.removeIcon,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerTitle: {
    fontFamily: fonts.sectionTitle,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  pickerClose: {
    color: colors.textPlaceholder,
    fontSize: 14,
  },
  pickerLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  customForm: {
    gap: 8,
  },
  validateButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  validateButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.white,
  },
  sectionTitle: {
    fontFamily: fonts.sectionTitle,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  suggestionsRow: {
    marginBottom: 20,
  },
  emptyHabitsText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  aiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.input,
    paddingVertical: 12,
    marginBottom: 18,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 18,
    alignItems: 'center',
  },
  balanceScore: {
    fontFamily: fonts.sectionTitle,
    fontSize: 22,
    color: colors.accent,
    marginBottom: 4,
  },
  balanceComment: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  suggestButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  suggestButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.input,
    paddingVertical: 12,
  },
});
