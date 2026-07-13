import { Linking, Platform } from 'react-native';

export async function openPhoneCall(phone: string): Promise<void> {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return;
  await Linking.openURL(`tel:${cleaned}`);
}

/** Opens Google Maps directions to the destination (falls back to geo: / Apple Maps). */
export async function openMapsNavigation(opts: {
  latitude: number;
  longitude: number;
  label?: string;
}): Promise<void> {
  const { latitude, longitude, label } = opts;
  const encodedLabel = encodeURIComponent(label?.trim() || 'Workshop');
  const googleWeb = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=&travelmode=driving`;

  if (Platform.OS === 'ios') {
    const apple = `maps:0,0?q=${encodedLabel}@${latitude},${longitude}`;
    const googleIos = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
    const canGoogle = await Linking.canOpenURL(googleIos);
    await Linking.openURL(canGoogle ? googleIos : apple);
    return;
  }

  if (Platform.OS === 'android') {
    const geo = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
    await Linking.openURL(geo);
    return;
  }

  await Linking.openURL(googleWeb);
}
