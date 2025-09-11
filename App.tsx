import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, TouchableOpacity } from "react-native";
import MobileApp from "./app/MobileApp";
import { ThemeProvider } from "./app/contexts/ThemeContext";
import { LanguageProvider } from "./app/contexts/LanguageContext";
import { AuthProvider } from "./app/contexts/AuthContext";
import { SessionProvider } from "./app/contexts/SessionContext";
import { ContractProvider } from "./app/contexts/ContractContext";
import { ErrorBoundary } from "./app/components/ErrorBoundary";

const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#fff",
    }}
  >
    <Text style={{ fontSize: 18, color: "#333" }}>
      Loading Shariaa Analyzer...
    </Text>
  </View>
);

const ErrorFallback = ({
  error,
  retry,
}: {
  error?: Error;
  retry: () => void;
}) => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#fff",
      padding: 20,
    }}
  >
    <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
      App Error
    </Text>
    <Text
      style={{
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
        color: "#666",
      }}
    >
      {error?.message || "The app encountered an unexpected error"}
    </Text>
    <TouchableOpacity
      style={{ backgroundColor: "#007AFF", padding: 12, borderRadius: 8 }}
      onPress={retry}
    >
      <Text style={{ color: "white", fontSize: 16 }}>Restart App</Text>
    </TouchableOpacity>
  </View>
);

export default function App() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SessionProvider>
              <ContractProvider>
                <MobileApp />
                <StatusBar style="auto" />
              </ContractProvider>
            </SessionProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
