import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckIcon } from '../../components/icons';
import { ProgressBar } from '../../components/ProgressBar';
import { ScreenShell } from '../../components/ScreenShell';
import { useStore } from '../../lib/store';
import { colors, fonts } from '../../lib/theme';

export default function SemaineScreen() {
  const { week, toggleDone } = useStore();
  const doneCount = week.filter((d) => d.done).length;

  return (
    <ScreenShell title="Cette semaine" subtitle="Coche les repas au fur et à mesure">
      <View style={styles.progressWrap}>
        <ProgressBar pct={Math.round((doneCount / 7) * 100)} label={`${doneCount}/7 faits`} />
      </View>

      {week.map((d, i) => (
        <View key={d.day} style={styles.card}>
          <Pressable
            onPress={() => toggleDone(i)}
            style={[styles.checkbox, { borderColor: d.done ? colors.done : colors.checkboxBorder, backgroundColor: d.done ? colors.done : 'transparent' }]}
          >
            {d.done && <CheckIcon size={14} color="white" />}
          </Pressable>
          <View style={styles.info}>
            <Text style={styles.day}>{d.day.toUpperCase()}</Text>
            <Text style={[styles.mealName, d.done && styles.mealNameDone]}>{d.meal.name}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{d.meal.tag}</Text>
          </View>
        </View>
      ))}
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
  tag: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
