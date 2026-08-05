import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { colors, fonts, radii } from '../lib/theme';

export function FormInput(props: TextInputProps & { bg?: string }) {
  const { bg = colors.background, style, ...rest } = props;
  return <TextInput placeholderTextColor={colors.textPlaceholder} style={[styles.input, { backgroundColor: bg }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
  },
});
