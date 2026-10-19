import React from 'react';
import { StatusBar } from 'react-native';
import { CameraTestScreen } from './src/screens/CameraTestScreen';

export default function App(): React.JSX.Element {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <CameraTestScreen />
    </>
  );
}
