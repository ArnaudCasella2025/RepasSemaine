import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckIcon } from './icons';
import { colors, fonts } from '../lib/theme';

export function ShoppingItemRow({
  name,
  checked,
  onToggle,
  onRemove,
  onRename,
}: {
  name: string;
  checked: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const startEditing = () => {
    setDraft(name);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commitEdit}
          onBlur={commitEdit}
          autoFocus
          style={styles.editInput}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable onPress={onToggle} style={styles.checkboxTap} hitSlop={4}>
        <View style={[styles.checkbox, { borderColor: checked ? colors.done : colors.checkboxBorder, backgroundColor: checked ? colors.done : 'transparent' }]}>
          {checked && <CheckIcon size={12} color="white" />}
        </View>
      </Pressable>
      <Pressable onPress={startEditing} style={styles.nameTap}>
        <Text style={[styles.name, checked && styles.nameChecked]}>{name}</Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
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
  checkboxTap: {
    flexShrink: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameTap: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
  editInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  removeBtn: {
    padding: 4,
  },
  removeText: {
    color: colors.removeIcon,
    fontSize: 14,
  },
});
