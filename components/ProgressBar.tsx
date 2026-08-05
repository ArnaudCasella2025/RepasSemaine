import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export function ProgressBar({ pct, label, size = 'md' }: { pct: number; label: string; size?: 'md' | 'sm' }) {
  const trackHeight = 8;
  return (
    <View style={styles.row}>
      <View style={[styles.track, { height: trackHeight }]}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={[styles.label, size === 'sm' && styles.labelSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    backgroundColor: colors.divider,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 999,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 0,
  },
  labelSm: {
    fontSize: 12,
  },
});
