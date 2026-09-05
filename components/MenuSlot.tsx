import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export function MenuSlot({
  day,
  label,
  filled,
  active,
  onPress,
}: {
  day: string;
  label: string;
  filled: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.slot,
        {
          backgroundColor: filled ? colors.surface : colors.emptySlotBg,
          borderColor: active ? colors.accent : filled ? 'transparent' : colors.dashedBorder,
          borderStyle: filled ? 'solid' : 'dashed',
        },
      ]}
    >
      <Text style={styles.day}>{day}</Text>
      <Text style={[styles.label, { color: filled ? colors.text : colors.textPlaceholder }]}>{label}</Text>
      {filled && (
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>{active ? '︿' : '›'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  day: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
    width: 74,
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  chevron: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
