console.log("[STARTUP] App.tsx module loaded");
import React from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { Colors } from "./src/theme/Theme";

export default function App(): React.JSX.Element {
  console.log("[STARTUP] App component rendering AppNavigator inside View flex:1");
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});



