import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FormInput } from '../../components/FormInput';
import { MenuSlot } from '../../components/MenuSlot';
import { ScreenShell } from '../../components/ScreenShell';
import { SuggestionCard } from '../../components/SuggestionCard';
import { confirmAction } from '../../lib/confirm';
import { BALANCE_ORDER, QUICK_ORDER } from '../../lib/meals';
import { buildHabitSuggestions } from '../../lib/selectors';
import { makeCustomMealRef, mealRefFromCatalog, useStore } from '../../lib/store';
import { colors, fonts, radii } from '../../lib/theme';

export default function MenuScreen() {
  const { nextMenu, ideas, history, assignToFirstEmpty, clearSlot, assignToSlot, mealFromIdea } = useStore();
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customLink, setCustomLink] = useState('');

  const filledCount = nextMenu.filter((s) => s.meal).length;
  const habitSuggestions = useMemo(() => buildHabitSuggestions(history, nextMenu), [history, nextMenu]);

  const closePicker = () => {
    setPickerSlot(null);
    setCustomName('');
    setCustomDesc('');
    setCustomLink('');
  };

  const validateCustom = () => {
    if (pickerSlot === null) return;
    const name = customName.trim();
    if (!name) return;
    assignToSlot(pickerSlot, makeCustomMealRef(name));
    closePicker();
  };

  const confirmClearSlot = (index: number) => {
    const meal = nextMenu[index].meal;
    if (!meal) return;
    confirmAction('Retirer ce repas', `Retirer "${meal.name}" du menu de ${nextMenu[index].day} ?`, () => clearSlot(index));
  };

  return (
    <ScreenShell title="Semaine prochaine" subtitle="Compose ton menu">
      <Text style={styles.progressText}>{filledCount}/7 repas planifiés — touche une suggestion pour la placer</Text>

      <View style={styles.slotList}>
        {nextMenu.map((slot, i) => (
          <MenuSlot
            key={slot.day}
            day={slot.day}
            label={slot.meal ? slot.meal.name : '+ Choisir un repas'}
            filled={!!slot.meal}
            onPress={() => (slot.meal ? confirmClearSlot(i) : setPickerSlot(i))}
          />
        ))}
      </View>

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.suggestionsRow, { marginBottom: 0 }]}>
        {QUICK_ORDER.map((id) => {
          const meal = mealRefFromCatalog(id);
          return <SuggestionCard key={id} name={meal.name} tag={meal.tag} variant="quick" onPress={() => assignToFirstEmpty(meal)} />;
        })}
      </ScrollView>
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
});
