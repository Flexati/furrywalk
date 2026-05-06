import { ScrollView, Text, View, TouchableOpacity, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { usePaymentService } from "@/lib/services/payment-service";
import { useState } from "react";

export default function SettingsScreen() {
  const { createCheckout, PREMIUM_PLAN } = usePaymentService();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleUpgradePremium = async () => {
    setIsLoading(true);
    const userId = "user_1"; // TODO: Get from auth context
    const session = await createCheckout(userId, "premium_monthly");

    if (session) {
      // Open checkout URL in browser
      // In production, use expo-web-browser or linking
      console.log("Checkout URL:", session.checkoutUrl);
    }
    setIsLoading(false);
  };
  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          <Text className="text-3xl font-bold text-foreground">Impostazioni</Text>
          
          {/* Subscription Section */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">ABBONAMENTO</Text>

            <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground mb-1">
                    {isPremium ? "✓ Premium Attivo" : "Piano Gratuito"}
                  </Text>
                  <Text className="text-xs text-muted">
                    {isPremium
                      ? "Accesso a tutte le feature"
                      : "Limitato a 1 cane e mappe base"}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${
                    isPremium ? "bg-success/20" : "bg-primary/20"
                  }`}
                >
                  <Text className={`text-xs font-bold ${isPremium ? "text-success" : "text-primary"}`}>
                    {isPremium ? "PREMIUM" : "FREE"}
                  </Text>
                </View>
              </View>

              {!isPremium && (
                <>
                  <View className="h-px bg-border" />
                  <View className="gap-2">
                    <Text className="text-xs font-semibold text-foreground">
                      Feature Premium:
                    </Text>
                    {PREMIUM_PLAN.features.map((feature, idx) => (
                      <Text key={idx} className="text-xs text-muted">
                        • {feature}
                      </Text>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={handleUpgradePremium}
                    disabled={isLoading}
                    className="bg-primary rounded-full py-3 items-center active:opacity-80"
                  >
                    <Text className="text-white font-bold">
                      {isLoading ? "Caricamento..." : `Upgrade a €${PREMIUM_PLAN.price / 100}/mese`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Notifications Section */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">NOTIFICHE</Text>

            <View className="bg-surface rounded-2xl p-4 border border-border flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground mb-1">
                  Notifiche Push
                </Text>
                <Text className="text-xs text-muted">
                  Reminder vaccini, antiparassitari, passeggiate
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#767577", true: "#81C784" }}
              />
            </View>
          </View>

          {/* Privacy Section */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">PRIVACY</Text>

            <TouchableOpacity className="bg-surface rounded-2xl p-4 border border-border active:opacity-80">
              <Text className="text-base font-semibold text-foreground">
                Informativa Privacy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface rounded-2xl p-4 border border-border active:opacity-80">
              <Text className="text-base font-semibold text-foreground">
                Termini di Servizio
              </Text>
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-foreground">ACCOUNT</Text>

            <TouchableOpacity className="bg-surface rounded-2xl p-4 border border-border active:opacity-80">
              <Text className="text-base font-semibold text-foreground">
                Modifica Profilo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-error/10 rounded-2xl p-4 border border-error/30 active:opacity-80">
              <Text className="text-base font-semibold text-error">Esci</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View className="gap-2 py-4 border-t border-border">
            <Text className="text-xs text-muted text-center">
              Passeggiata Furba v1.0.0
            </Text>
            <Text className="text-xs text-muted text-center">
              © 2026 Passeggiata Furba. Tutti i diritti riservati.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
