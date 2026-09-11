import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormInput } from '../../components/FormInput';
import { ScreenShell } from '../../components/ScreenShell';
import { confirmAction } from '../../lib/confirm';
import { useStore } from '../../lib/store';
import { colors, fonts, radii } from '../../lib/theme';

export default function EnviesScreen() {
  const { ideas, addIdea, removeIdea } = useStore();

  const confirmRemoveIdea = (id: number, name: string) => {
    confirmAction('Supprimer cette idée', `Supprimer "${name}" de la boîte à idées ?`, () => removeIdea(id));
  };
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');

  const resetForm = () => {
    setFormOpen(false);
    setName('');
    setDesc('');
    setLink('');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addIdea(name, desc, link);
    resetForm();
  };

  return (
    <ScreenShell title="Boîte à idées" subtitle="Ta réserve d'inspiration">
      <Pressable onPress={() => (formOpen ? resetForm() : setFormOpen(true))} style={styles.addButton}>
        <Text style={styles.addButtonPlus}>+</Text>
        <Text style={styles.addButtonText}>Ajouter une idée</Text>
      </Pressable>

      {formOpen && (
        <View style={styles.form}>
          <FormInput value={name} onChangeText={setName} placeholder="Nom du repas" />
          <FormInput value={desc} onChangeText={setDesc} placeholder="Description (optionnel)" />
          <FormInput value={link} onChangeText={setLink} placeholder="Lien Pinterest / Insta / recette" />
          <View style={styles.formActions}>
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </Pressable>
            <Pressable onPress={resetForm} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      )}

      {ideas.map((idea) => (
        <View key={idea.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{idea.name}</Text>
            <Pressable onPress={() => confirmRemoveIdea(idea.id, idea.name)} hitSlop={8}>
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
          {!!idea.desc && <Text style={styles.cardDesc}>{idea.desc}</Text>}
          {!!idea.link && (
            <Pressable onPress={() => Linking.openURL(idea.link)}>
              <Text style={styles.cardLink}>Voir l'inspiration →</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radii.cardSm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    marginBottom: 14,
  },
  addButtonPlus: {
    fontSize: 18,
    lineHeight: 18,
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },
  addButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.accent,
  },
  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.input,
    paddingVertical: 10,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.input,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  removeText: {
    color: colors.removeIcon,
    fontSize: 14,
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  cardLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.accent,
    marginTop: 6,
  },
});
