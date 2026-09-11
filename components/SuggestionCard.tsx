import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../lib/theme';

type Variant = 'neutral' | 'balance' | 'quick';

const VARIANT_STYLES: Record<Variant, { border: string; tagBg: string; tagText: string }> = {
  neutral: { border: colors.cardBorder, tagBg: colors.accentSoft, tagText: colors.textMuted },
  balance: { border: colors.balanceBorder, tagBg: colors.balanceBg, tagText: colors.balanceText },
  quick: { border: colors.quickBorder, tagBg: colors.quickBg, tagText: colors.quickText },
};

export function SuggestionCard({ name, tag, variant = 'neutral', onPress }: { name: string; tag: string; variant?: Variant; onPress: () => void }) {
  const v = VARIANT_STYLES[variant];
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderColor: v.border }]}>
      <Text style={styles.name}>{name}</Text>
      <View style={[styles.tag, { backgroundColor: v.tagBg }]}>
        <Text style={[styles.tagText, { color: v.tagText }]}>{tag}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: radii.cardSm,
    padding: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
