import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputProps,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { theme as t } from "@lingoloop/ui";
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.default }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.screen}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Copy({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <Text
      accessibilityLiveRegion={error ? "polite" : undefined}
      style={[styles.copy, error && { color: t.feedback.error }]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  busy = false,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary
            ? t.bg.subtle
            : pressed
              ? t.action.pressed
              : t.action.primary,
          opacity: disabled || busy ? 0.55 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={t.text.inverse} />
      ) : (
        <Text
          style={{
            fontSize: t.fontSize.body,
            fontWeight: "700",
            color: secondary ? t.text.primary : t.text.inverse,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: t.spacing.sm }}>
      <Text style={styles.copy}>{label}</Text>
      <TextInput {...props} accessibilityLabel={label} style={styles.input} />
    </View>
  );
}
export const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: t.spacing.screen,
    paddingVertical: t.spacing.xxxl,
    gap: t.spacing.xl,
  },
  heading: {
    fontSize: t.fontSize.h1,
    lineHeight: 40,
    fontWeight: "700",
    color: t.text.primary,
  },
  copy: { fontSize: t.fontSize.body, lineHeight: 25, color: t.text.secondary },
  button: {
    minHeight: 52,
    borderRadius: t.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: t.spacing.lg,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: t.border.default,
    borderRadius: t.radius.md,
    padding: t.spacing.lg,
    fontSize: t.fontSize.body,
    color: t.text.primary,
  },
  card: {
    padding: t.spacing.xl,
    borderRadius: t.radius.xl,
    backgroundColor: t.bg.brand,
    gap: t.spacing.md,
  },
});
