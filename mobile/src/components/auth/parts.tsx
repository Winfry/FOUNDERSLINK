import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AlertCircle, Check, ChevronDown, Sparkles, type LucideIcon } from 'lucide-react-native';
import { Text, TextInput } from '../ui/Text';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';

/** The steps of a flow, by name: done, current (orange) and still to come. */
export function Steps({ names, current }: { names: string[]; current: number }) {
  return (
    <View
      style={styles.steps}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${names.length}: ${names[current - 1]}`}
    >
      {names.map((name, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <View key={name} style={styles.step}>
            <View style={[styles.stepBar, done && styles.stepBarDone, active && styles.stepBarActive]} />
            <View style={styles.stepLabelRow}>
              {done ? <Check size={14} color={colors.primary} strokeWidth={3} /> : null}
              <Text style={[styles.stepLabel, (done || active) && styles.stepLabelOn]} numberOfLines={1}>
                {done ? name : `${n}. ${name}`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Six boxes for a six-digit code. One real input sits over them, so paste and the SMS autofill still work. */
export function CodeInput({
  value,
  onChange,
  error,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: string;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  const cells = [0, 1, 2, 3, 4, 5];
  const at = Math.min(value.length, 5);
  return (
    <View style={styles.codeWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.codeRow}>
        {cells.map((i) => (
          <View
            key={i}
            style={[
              styles.codeCell,
              value[i] ? styles.codeCellFilled : null,
              focused && i === at ? styles.codeCellActive : null,
              error ? styles.codeCellError : null,
            ]}
          >
            <Text style={styles.codeDigit}>{value[i] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          caretHidden
          accessibilityLabel={label}
          style={styles.codeInput}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** The password rules, ticked off as she types. They are the same three the form checks. */
export function PasswordRules({ password }: { password: string }) {
  const rules: [string, boolean][] = [
    ['At least 8 characters', password.length >= 8],
    ['An uppercase and a lowercase letter', /[A-Z]/.test(password) && /[a-z]/.test(password)],
    ['A number', /[0-9]/.test(password)],
  ];
  return (
    <View style={styles.rules}>
      {rules.map(([text, met]) => (
        <View key={text} style={styles.rule} accessibilityLabel={`${text}: ${met ? 'done' : 'not yet'}`}>
          <View style={[styles.ruleDot, met && styles.ruleDotMet]}>
            {met ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}
          </View>
          <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

export interface Choice {
  value: string;
  title: string;
  line: string;
  icon: LucideIcon;
}

/** A choice between a few things, each a card she can read before picking. */
export function ChoiceCards({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceWrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {choices.map(({ value: v, title, line, icon: Icon }) => {
          const on = v === value;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${title}. ${line}`}
              style={[styles.choice, on && styles.choiceOn]}
            >
              <View style={styles.choiceTop}>
                <Icon size={24} color={on ? colors.primary : colors.textMuted} />
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              </View>
              <Text style={styles.choiceTitle}>{title}</Text>
              <Text style={styles.choiceLine}>{line}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A real checkbox: an empty bordered box, or a blue box with a white tick. The whole row is the target. */
export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <View style={styles.checkWrap}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={styles.checkRow}
      >
        <View style={[styles.box, checked && styles.boxOn, !checked && error ? styles.boxError : null]}>
          {checked ? <Check size={16} color={colors.white} strokeWidth={3} /> : null}
        </View>
        <Text style={styles.checkText}>{children}</Text>
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** What went wrong with the whole form (the backend refused it), in the form rather than a passing toast. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert">
      <AlertCircle size={20} color={colors.error} />
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

/** A quiet text link, still a full-size target. */
export function TextLink({ title, onPress, align = 'center' }: { title: string; onPress: () => void; align?: 'center' | 'left' | 'right' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.link,
        align === 'left' && { alignSelf: 'flex-start' },
        align === 'right' && { alignSelf: 'flex-end' },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={styles.linkText}>{title}</Text>
    </Pressable>
  );
}

/** Marks a field the app filled in for her, so she knows to check it. Sits on the label's line. */
export function SuggestedTag() {
  return (
    <View style={styles.tag}>
      <Sparkles size={12} color={colors.primaryDark} />
      <Text style={styles.tagText}>Suggested</Text>
    </View>
  );
}

/** An amount of money: "KSh" in front, thousands separated as she types. */
export function AmountField({
  label,
  value,
  onChange,
  hint,
  error,
  onRawChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (amount: number) => void;
  hint?: string;
  error?: string;
  /** The digits as typed, for a form that must tell an empty field from a typed 0. */
  onRawChange?: (digits: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  // A typed 0 stays visible, so she can see what she entered.
  const [typedZero, setTypedZero] = useState(false);
  return (
    <View style={styles.amountWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.amountBox, focused && styles.amountBoxFocused, error ? styles.amountBoxError : null]}>
        <View style={styles.amountPrefix}>
          <Text style={styles.amountPrefixText}>KSh</Text>
        </View>
        <TextInput
          value={value ? value.toLocaleString('en-US') : typedZero ? '0' : ''}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '').slice(0, 10);
            setTypedZero(digits !== '' && Number(digits) === 0);
            onRawChange?.(digits);
            onChange(Number(digits) || 0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="1,000,000"
          accessibilityLabel={label}
          style={styles.amountInput}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A picker for a long list (the 47 counties). The shared Select's sheet
 * does not scroll, so anything past the first screenful cannot be reached;
 * this one looks the same and scrolls.
 */
export function LongSelect({
  label,
  options,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.amountWrap}>
      <Text style={styles.pickLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pickTrigger, error ? styles.amountBoxError : null]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={value ? styles.pickValue : styles.pickPlaceholder}>{value || placeholder}</Text>
        <ChevronDown size={20} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickBackdrop} onPress={() => setOpen(false)} accessibilityLabel="Close list" />
        <View style={styles.pickSheet}>
          <View style={styles.pickHandle} />
          <Text style={styles.pickTitle}>{label}</Text>
          <ScrollView style={styles.pickList}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={styles.pickOption}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.pickValue, opt === value && styles.pickChosen]}>{opt}</Text>
                {opt === value ? <Check size={20} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pickLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  pickTrigger: {
    minHeight: touchTargetMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickValue: { fontSize: 16, color: colors.text },
  pickPlaceholder: { fontSize: 16, color: colors.textMuted },
  pickChosen: { fontWeight: '700', color: colors.primary },
  pickBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  pickSheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '70%',
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing[3],
    paddingBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing[2] },
  pickTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing[1] },
  pickList: { flexGrow: 0 },
  pickOption: {
    minHeight: touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  steps: { flexDirection: 'row', gap: spacing[1] },
  step: { flex: 1 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepBarDone: { backgroundColor: colors.primary },
  stepBarActive: { backgroundColor: colors.accent },
  stepLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5], marginTop: spacing[1] },
  stepLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, flexShrink: 1 },
  stepLabelOn: { color: colors.text },

  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: spacing[1] },
  fieldError: { fontSize: 14, color: colors.error, marginTop: spacing[0.5] },
  fieldHint: { fontSize: 14, color: colors.textMuted, marginTop: spacing[0.5] },

  codeWrap: { marginBottom: spacing[2] },
  codeRow: { flexDirection: 'row', gap: spacing[1] },
  codeCell: {
    flex: 1,
    height: 56,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCellFilled: { borderColor: colors.primaryDark },
  codeCellActive: { borderColor: colors.primary, borderWidth: 2 },
  codeCellError: { borderColor: colors.error },
  codeDigit: { fontSize: 24, fontWeight: '800', color: colors.text },
  // Invisible, but it covers the boxes: a tap anywhere on them opens the keyboard.
  codeInput: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.01, color: 'transparent' },

  rules: { gap: spacing[1], marginBottom: spacing[2] },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  ruleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.grey300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleDotMet: { backgroundColor: colors.success, borderColor: colors.success },
  ruleText: { fontSize: 14, color: colors.textMuted },
  ruleTextMet: { color: colors.text },

  choiceWrap: { marginBottom: spacing[2] },
  choiceRow: { flexDirection: 'row', gap: spacing[1.5] },
  choice: {
    flex: 1,
    minHeight: touchTargetMin,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[2],
    // The selected card's border is 1px thicker; this keeps the text from shifting.
    margin: 1,
  },
  choiceOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight, margin: 0 },
  choiceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1.5] },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.grey300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  choiceTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  choiceLine: { fontSize: 14, color: colors.textMuted, marginTop: spacing[0.5] },

  checkWrap: {},
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], minHeight: touchTargetMin },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.grey300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  boxError: { borderColor: colors.error },
  checkText: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: spacing[1] },

  formError: {
    flexDirection: 'row',
    gap: spacing[1],
    alignItems: 'flex-start',
    backgroundColor: colors.errorLight,
    borderRadius: radius.card,
    padding: spacing[1.5],
    marginBottom: spacing[2],
  },
  formErrorText: { flex: 1, fontSize: 14, color: colors.text },

  link: { minHeight: touchTargetMin, justifyContent: 'center', alignSelf: 'center' },
  linkText: { fontSize: 16, fontWeight: '600', color: colors.primary },

  tag: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing[1],
    height: 20,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },

  amountWrap: { marginBottom: spacing[2] },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: touchTargetMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  amountBoxFocused: { borderColor: colors.primary },
  amountBoxError: { borderColor: colors.error },
  amountPrefix: {
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    backgroundColor: colors.grey100,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  amountPrefixText: { fontSize: 16, fontWeight: '700', color: colors.text },
  amountInput: { flex: 1, minWidth: 0, paddingHorizontal: spacing[2], fontSize: 16, fontWeight: '600', color: colors.text },
});
