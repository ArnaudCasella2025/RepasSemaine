import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckIcon } from '../../components/icons';
import { ProgressBar } from '../../components/ProgressBar';
import { ScreenShell } from '../../components/ScreenShell';
import { confirmAction } from '../../lib/confirm';
import { useStore } from '../../lib/store';
import { colors, fonts, radii } from '../../lib/theme';

export default function SemaineScreen() {
  const { week, nextMenu, toggleDone, startNewWeek } = useStore();
  const doneCount = week.filter((d) => d.done).length;
  const plannedCount = nextMenu.filter((s) => s.meal).length;

  const confirmNewWeek = () => {
    confirmAction(
      'Nouvelle semaine',
      plannedCount < 7
        ? `Seuls ${plannedCount}/7 repas sont planifiés pour la semaine prochaine. Continuer quand même ?`
        : 'Le menu prévu devient la semaine en cours. Continuer ?',
      startNewWeek
    );
  };

  return (
    <ScreenShell title="Cette semaine" subtitle="Coche les repas au fur et à mesure">
      <View style={styles.progressWrap}>
        <ProgressBar pct={Math.round((doneCount / 7) * 100)} label={`${doneCount}/7 faits`} />
      </View>

      {week.map((d, i) => (
        <View key={d.day} style={styles.card}>
          <Pressable
            disabled={!d.meal}
            onPress={() => toggleDone(i)}
            style={[styles.checkbox, { borderColor: d.done ? colors.done : colors.checkboxBorder, backgroundColor: d.done ? colors.done : 'transparent' }]}
          >
            {d.done && <CheckIcon size={14} color="white" />}
          </Pressable>
          <View style={styles.info}>
            <Text style={styles.day}>{d.day.toUpperCase()}</Text>
            <Text style={[styles.mealName, d.done && styles.mealNameDone, !d.meal && styles.mealNameEmpty]}>{d.meal ? d.meal.name : 'Non planifié'}</Text>
          </View>
          {d.meal && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{d.meal.tag}</Text>
            </View>
          )}
        </View>
      ))}

      <Pressable onPress={confirmNewWeek} style={styles.newWeekButton}>
        <Text style={styles.newWeekButtonText}>Nouvelle semaine →</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  day: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.4,
  },
  mealName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  },
  mealNameDone: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
  mealNameEmpty: {
    color: colors.textPlaceholder,
    fontFamily: fonts.body,
  },
  tag: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  newWeekButton: {
    alignItems: 'center',
    borderRadius: radii.cardSm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    paddingVertical: 13,
    marginTop: 4,
  },
  newWeekButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.accent,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
