import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { Colors } from "./src/theme/Theme";

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <AppNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
