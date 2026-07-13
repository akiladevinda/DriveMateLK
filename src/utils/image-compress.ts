import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Resize/compress a picked photo so Edge Function + Gemini payloads stay under limits.
 * Returns JPEG base64 without a data-URL prefix.
 */
export async function compressDashboardPhoto(uri: string): Promise<{
  uri: string;
  base64: string;
}> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error('Could not prepare the photo for analysis.');
  }

  // Soft cap ~700KB base64 (~500KB binary) for Edge Function body limits.
  if (result.base64.length > 700_000) {
    const tighter = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: 960 } }],
      {
        compress: 0.4,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    if (!tighter.base64) {
      throw new Error('Could not prepare the photo for analysis.');
    }
    return { uri: tighter.uri, base64: tighter.base64 };
  }

  return { uri: result.uri, base64: result.base64 };
}
