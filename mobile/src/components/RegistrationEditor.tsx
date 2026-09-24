import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "../theme/Theme";

interface RegistrationEditorProps {
  initialValue?: string;
  onConfirm: (confirmedRegistration: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const RegistrationEditor: React.FC<RegistrationEditorProps> = ({
  initialValue = "",
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [value, setValue] = useState(initialValue.toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const handleChangeText = (text: string) => {
    const uppercaseText = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setValue(uppercaseText);
    if (error) setError(null);
  };

  const handleConfirm = () => {
    if (!value || value.length < 4 || value.length > 15) {
      setError("Registration must be 4 to 15 alphanumeric characters (e.g. DL01AB1234)");
      return;
    }
    onConfirm(value);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>EDIT REGISTRATION</Text>
      <Text style={styles.subtitle}>Confirm or correct the detected plate registration</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder="e.g. DL01AB1234"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={15}
          editable={!isLoading}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        {onCancel ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.confirmButton, isLoading && styles.disabledButton]}
          onPress={handleConfirm}
          disabled={isLoading}
        >
          <Text style={styles.confirmText}>
            {isLoading ? "VERIFYING..." : "CONFIRM & VERIFY"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 2,
    textAlign: "center",
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
  },
  cancelText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
