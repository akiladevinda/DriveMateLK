import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { MenuCard } from '@/components/shared/MenuCard';
import { AppHeader, AppScreen } from '@/components/ui';
import { useTranslation } from '@/localization';

export default function AiTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const tools = [
    {
      title: t('ai.scanFault'),
      description: t('ai.scanFaultBody'),
      icon: 'scan-outline' as const,
      href: '/ai/scan-fault' as Href,
    },
    {
      title: t('ai.symptomAssistant'),
      description: 'Describe symptoms and get non-diagnostic guidance.',
      icon: 'medkit-outline' as const,
      href: '/ai/symptom-assistant' as Href,
    },
    {
      title: t('ai.chat'),
      description: 'Ask questions about your vehicle ownership.',
      icon: 'chatbubbles-outline' as const,
      href: '/ai/chat' as Href,
    },
    {
      title: t('ai.inspection'),
      description: 'Photo-based inspection assistant for pre-purchase checks.',
      icon: 'camera-outline' as const,
      href: '/ai/inspection' as Href,
    },
    {
      title: t('ai.resale'),
      description: 'Get resale preparation and pricing guidance.',
      icon: 'pricetag-outline' as const,
      href: '/ai/resale' as Href,
    },
  ];

  return (
    <AppScreen scrollable>
      <AppHeader title={t('ai.title')} />
      <AiSafetyBanner />
      <View style={styles.menu}>
        {tools.map((tool) => (
          <MenuCard
            key={String(tool.href)}
            description={tool.description}
            icon={tool.icon}
            onPress={() => router.push(tool.href)}
            title={tool.title}
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  menu: {
    gap: 12,
    marginTop: 16,
    paddingBottom: 32,
  },
});
