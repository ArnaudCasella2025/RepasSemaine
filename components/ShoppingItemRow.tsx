import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckIcon } from './icons';
import { colors, fonts } from '../lib/theme';

export function ShoppingItemRow({
  name,
  checked,
  removable,
  onToggle,
  onRemove,
}: {
  name: string;
  checked: boolean;
  removable: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={[styles.checkbox, { borderColor: checked ? colors.done : colors.checkboxBorder, backgroundColor: checked ? colors.done : 'transparent' }]}>
        {checked && <CheckIcon size={12} color="white" />}
      </View>
      <Text style={[styles.name, checked && styles.nameChecked]}>{name}</Text>
      {removable && (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Text style={styles.removeText}>✕</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
  removeBtn: {
    padding: 4,
  },
  removeText: {
    color: colors.removeIcon,
    fontSize: 14,
  },
});
