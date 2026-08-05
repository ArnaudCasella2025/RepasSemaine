import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormInput } from '../../components/FormInput';
import { ProgressBar } from '../../components/ProgressBar';
import { RayonSelect } from '../../components/RayonSelect';
import { ScreenShell } from '../../components/ScreenShell';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { RAYONS, Rayon } from '../../lib/meals';
import { buildShoppingGroups } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { colors, fonts, radii } from '../../lib/theme';

export default function CoursesScreen() {
  const router = useRouter();
  const { nextMenu, extraItems, shoppingChecked, toggleShoppingItem, addExtraItem, removeExtraItem } = useStore();
  const [newItemName, setNewItemName] = useState('');
  const [newItemRayon, setNewItemRayon] = useState<Rayon>(RAYONS[0]);

  const groups = useMemo(() => buildShoppingGroups(nextMenu, extraItems), [nextMenu, extraItems]);
  const hasItems = groups.length > 0;
  const filledCount = nextMenu.filter((s) => s.meal).length;
  const menuComplete = filledCount === 7;

  const handleAdd = () => {
    if (!newItemName.trim()) return;
    addExtraItem(newItemName, newItemRayon);
    setNewItemName('');
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

      {hasItems ? (
        <>
          {!menuComplete && (
            <View style={styles.progressWrap}>
              <ProgressBar pct={Math.round((filledCount / 7) * 100)} label={`${filledCount}/7 repas planifiés`} size="sm" />
            </View>
          )}

          {groups.map((group) => (
            <View key={group.rayon} style={styles.group}>
              <Text style={styles.groupTitle}>{group.rayon}</Text>
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
