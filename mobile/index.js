console.log("[STARTUP] index.js loaded");
import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

console.log("[STARTUP] registering component", appName);
AppRegistry.registerComponent(appName, () => App);

