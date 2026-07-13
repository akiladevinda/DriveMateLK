import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import { getAIProvider } from '@/services/ai';
import type { VehicleChatMessage } from '@/services/ai/types';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function AiChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activeVehicle } = useActiveVehicle();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<VehicleChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ask me about maintenance, documents, or general vehicle ownership in Sri Lanka. I provide guidance, not diagnoses.',
    },
  ]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const nextHistory: VehicleChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await getAIProvider().chat({
        vehicleId: activeVehicle?.id,
        message: text,
        history: nextHistory,
        context: activeVehicle
          ? {
              make: activeVehicle.make,
              model: activeVehicle.model,
              year: activeVehicle.manufacture_year,
              odometer: activeVehicle.current_odometer,
              fuelType: activeVehicle.fuel_type,
            }
          : undefined,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader showBack title={t('ai.chat')} />
      <AiSafetyBanner />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(_, index) => `msg-${index}`}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              {
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor:
                  item.role === 'user' ? colors.accentMuted : colors.surfaceMuted,
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary }}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          multiline
          onChangeText={setInput}
          placeholder="Ask about your vehicle…"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
          ]}
          value={input}
        />
        <PrimaryButton label="Send" loading={loading} onPress={send} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  composer: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
});
