import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type {
  OcrExtractResponse,
  UserSession,
  VerificationResult,
} from "../domain/ComplianceStatus";
import { CameraScreen } from "../screens/CameraScreen";
import { ComplianceResultScreen } from "../screens/ComplianceResultScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { OcrConfirmationScreen } from "../screens/OcrConfirmationScreen";
import { OcrProcessingScreen } from "../screens/OcrProcessingScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { VerificationHistoryScreen } from "../screens/VerificationHistoryScreen";
import { VerificationApi } from "../services/VerificationApi";
import { Colors } from "../theme/Theme";

type ScreenState =
  | "LOGIN"
  | "HOME"
  | "CAMERA"
  | "OCR_PROCESSING"
  | "OCR_CONFIRMATION"
  | "COMPLIANCE_RESULT"
  | "HISTORY"
  | "PROFILE";

interface AppNavigatorProps {
  apiClient?: VerificationApi;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  apiClient = new VerificationApi("http://localhost:8000"),
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("LOGIN");
  const [session, setSession] = useState<UserSession | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<VerificationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<VerificationResult | null>(null);
  const [currentOcrResult, setCurrentOcrResult] = useState<OcrExtractResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Screen 1: Login Handler
  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    setCurrentScreen("HOME");
  };

  // Screen 2: Camera Capture Handler
  const handleCaptureImage = async (
    imageBlob: Blob | { uri: string; type: string; name: string }
  ) => {
    setCurrentScreen("OCR_PROCESSING");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const ocrResp = await apiClient.extractOcr(imageBlob);
      setCurrentOcrResult(ocrResp);
      setIsConnected(true);

      if (!ocrResp.manual_review_required && ocrResp.verification_result) {
        // High confidence: automated verification already performed by API
        setSelectedResult(ocrResp.verification_result);
        setCurrentScreen("OCR_CONFIRMATION");
      } else {
        // Low confidence or missing candidate: manual confirmation required
        setCurrentScreen("OCR_CONFIRMATION");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process image via OCR");
    } finally {
      setIsLoading(false);
    }
  };

  // Screen 3: OCR Confirmation / Verification Submit Handler
  const handleConfirmRegistration = async (confirmedRegistration: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let result: VerificationResult;
      if (currentOcrResult && currentOcrResult.manual_review_required) {
        result = await apiClient.confirmManualReview({
          confirmed_registration: confirmedRegistration,
          original_raw_text: currentOcrResult.raw_text,
          original_confidence: currentOcrResult.confidence,
          actor: session?.user_id || "operator",
        });
      } else {
        const conf = currentOcrResult ? currentOcrResult.confidence : null;
        result = await apiClient.verify(confirmedRegistration, conf);
      }

      setSelectedResult(result);
      setCurrentScreen("COMPLIANCE_RESULT");
    } catch (err: any) {
      setErrorMessage(err.message || "Verification request failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Screen 4: Result Completion Handler
  const handleDoneResult = () => {
    if (selectedResult) {
      setRecentVerifications((prev) => [selectedResult, ...prev.filter((v) => v.id !== selectedResult.id)]);
    }
    setSelectedResult(null);
    setCurrentOcrResult(null);
    setCurrentScreen("HOME");
  };

  if (!session || currentScreen === "LOGIN") {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <View style={styles.container}>
      {/* Global Error Banner */}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠ {errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Text style={styles.errorDismiss}>DISMISS</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {currentScreen === "HOME" && (
        <HomeScreen
          session={session}
          recentVerifications={recentVerifications}
          isConnected={isConnected}
          onScanPress={() => setCurrentScreen("CAMERA")}
          onHistoryPress={() => setCurrentScreen("HISTORY")}
          onProfilePress={() => setCurrentScreen("PROFILE")}
          onSelectVerification={(res) => {
            setSelectedResult(res);
            setCurrentScreen("COMPLIANCE_RESULT");
          }}
        />
      )}

      {currentScreen === "CAMERA" && (
        <CameraScreen
          onCaptureImage={handleCaptureImage}
          onBack={() => setCurrentScreen("HOME")}
        />
      )}

      {currentScreen === "OCR_PROCESSING" && (
        <OcrProcessingScreen statusMessage="Uploading plate image & extracting registration..." />
      )}

      {currentScreen === "OCR_CONFIRMATION" && currentOcrResult && (
        <OcrConfirmationScreen
          ocrResult={currentOcrResult}
          onConfirm={handleConfirmRegistration}
          onRetake={() => setCurrentScreen("CAMERA")}
          isLoading={isLoading}
        />
      )}

      {currentScreen === "COMPLIANCE_RESULT" && selectedResult && (
        <ComplianceResultScreen
          result={selectedResult}
          onDone={handleDoneResult}
          onRetry={() => setCurrentScreen("CAMERA")}
        />
      )}

      {currentScreen === "HISTORY" && (
        <VerificationHistoryScreen
          verifications={recentVerifications}
          onSelectVerification={(res) => {
            setSelectedResult(res);
            setCurrentScreen("COMPLIANCE_RESULT");
          }}
          onBack={() => setCurrentScreen("HOME")}
        />
      )}

      {currentScreen === "PROFILE" && (
        <ProfileScreen
          session={session}
          onLogout={() => {
            setSession(null);
            setCurrentScreen("LOGIN");
          }}
          onBack={() => setCurrentScreen("HOME")}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorBanner: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: Colors.danger,
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  errorBannerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  errorDismiss: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
});
