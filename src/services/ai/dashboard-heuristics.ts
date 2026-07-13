import type { DashboardAnalysis } from '@/services/ai/types';

type DetectedSymbol = DashboardAnalysis['detectedSymbols'][number];

/**
 * Keyword heuristics used when live vision AI is unavailable.
 * Prefer Gemini edge analysis for real image recognition.
 */
export function inferDashboardSymbolsFromText(message?: string): DetectedSymbol[] {
  const normalized = (message ?? '').toLowerCase();

  if (
    normalized.includes('check engine') ||
    normalized.includes('malfunction') ||
    normalized.includes('mil') ||
    normalized.includes('engine light') ||
    normalized.includes('engine warning') ||
    /\bcel\b/.test(normalized) ||
    normalized.includes('obd')
  ) {
    return [
      {
        name: 'Check Engine Light (MIL)',
        description:
          'Amber engine outline / malfunction indicator lamp common on petrol and diesel vehicles in Sri Lanka.',
        confidence: 0.86,
        severity: 'urgent',
        likelyMeaning:
          'The engine management system has logged a fault. It may be minor (sensor) or serious (misfire, catalyst, emissions).',
        possibleCauses: [
          'Faulty oxygen / MAF / MAP sensor',
          'Loose or damaged fuel cap',
          'Ignition misfire or spark plugs',
          'Catalytic converter or emissions issue',
          'Wiring / ECU fault',
        ],
        recommendedActions: [
          'Avoid high load driving until inspected.',
          'Note if the light is steady or flashing (flashing is more urgent).',
          'Have an OBD-II scan done at a garage.',
          'If the car shakes, loses power, or the light flashes — stop when safe and seek help.',
        ],
        canContinueDriving: 'professional_inspection_recommended',
      },
    ];
  }

  if (normalized.includes('oil') || normalized.includes('pressure')) {
    return [
      {
        name: 'Engine Oil Pressure Warning',
        description:
          'Red oil-can or dripping-oil symbol commonly seen on Sri Lankan petrol and diesel vehicles.',
        confidence: 0.82,
        severity: 'critical',
        likelyMeaning:
          'This may indicate low engine oil pressure. Continuing to drive can cause serious engine damage.',
        possibleCauses: [
          'Low engine oil level',
          'Failing oil pump',
          'Blocked oil filter',
          'Sensor or wiring fault',
        ],
        recommendedActions: [
          'Stop in a safe place and switch off the engine.',
          'Check the oil level when safe.',
          'Arrange a professional inspection before continuing.',
        ],
        canContinueDriving: 'stop_when_safe',
      },
    ];
  }

  if (
    normalized.includes('battery') ||
    normalized.includes('charging') ||
    normalized.includes('alternator')
  ) {
    return [
      {
        name: 'Battery / Charging System Warning',
        description: 'Battery symbol indicating charging-system fault.',
        confidence: 0.8,
        severity: 'urgent',
        likelyMeaning:
          'The alternator may not be charging the battery, or the battery/connections are weak.',
        possibleCauses: ['Failing alternator', 'Loose battery terminal', 'Worn belt', 'Weak battery'],
        recommendedActions: [
          'Turn off non-essential electrics.',
          'Drive to a safe place or garage soon.',
          'Avoid stopping/restarting repeatedly.',
        ],
        canContinueDriving: 'professional_inspection_recommended',
      },
    ];
  }

  if (normalized.includes('abs') || normalized.includes('brake')) {
    return [
      {
        name: 'ABS / Brake System Warning',
        description: 'ABS or brake-system indicator commonly shown in amber or red.',
        confidence: 0.78,
        severity: 'urgent',
        likelyMeaning:
          'This may relate to the anti-lock braking system or a broader brake-system fault.',
        possibleCauses: ['Low brake fluid', 'Wheel-speed sensor fault', 'ABS module issue'],
        recommendedActions: [
          'Reduce speed and avoid hard braking if possible.',
          'Check brake fluid when safe.',
          'Seek a professional brake inspection promptly.',
        ],
        canContinueDriving: 'professional_inspection_recommended',
      },
    ];
  }

  if (normalized.includes('temp') || normalized.includes('overheat') || normalized.includes('coolant')) {
    return [
      {
        name: 'Engine Temperature / Coolant Warning',
        description: 'Temperature or coolant symbol.',
        confidence: 0.8,
        severity: 'critical',
        likelyMeaning: 'The engine may be overheating or coolant level may be low.',
        possibleCauses: ['Low coolant', 'Faulty thermostat', 'Radiator / fan issue', 'Water pump fault'],
        recommendedActions: [
          'Stop safely and allow the engine to cool.',
          'Do not open a hot radiator cap.',
          'Check coolant when cool and seek professional help.',
        ],
        canContinueDriving: 'stop_when_safe',
      },
    ];
  }

  return [
    {
      name: 'Unidentified Dashboard Indicator',
      description:
        'Could not match a specific symbol from text alone. Live image AI is required for photo recognition.',
      confidence: 0.35,
      severity: 'attention',
      likelyMeaning:
        'Type what you see (e.g. “check engine”) or enable Gemini vision on the server for photo analysis.',
      possibleCauses: ['Mock/text-only mode', 'Unclear description', 'Multiple indicators'],
      recommendedActions: [
        'In the description box, type: check engine',
        'Or deploy analyze-dashboard-image with GEMINI_API_KEY for real vision.',
        'Consult a qualified mechanic for confirmation.',
      ],
      canContinueDriving: 'unknown',
    },
  ];
}

export function buildMockDashboardAnalysis(input: {
  imageBase64: string;
  dashboardMessage?: string;
  mockedReason?: string;
}): DashboardAnalysis {
  const hasImage = input.imageBase64.length > 1000;
  const symbols = inferDashboardSymbolsFromText(input.dashboardMessage);
  const reason =
    input.mockedReason ??
    'Mock / text heuristics only — the photo pixels are not visually analysed in this mode.';

  // If user uploaded a photo but left description empty in mock mode, nudge clearly.
  const detectedSymbols =
    hasImage && !(input.dashboardMessage ?? '').trim() && symbols[0]?.name === 'Unidentified Dashboard Indicator'
      ? [
          {
            ...symbols[0]!,
            name: 'Photo received — live vision unavailable',
            description:
              'Your image was received, but live Gemini vision did not return a result for this request.',
            likelyMeaning:
              'Your photo likely shows a warning lamp. Fix the live-AI error below, or type what you see (e.g. “check engine”) and Analyze again.',
            recommendedActions: [
              reason,
              'Type “check engine” in Describe the warning, then Analyze again.',
              'If this keeps happening, reload the app and retry with a clearer, closer photo.',
            ],
            possibleCauses: [
              'Edge Function / Gemini call failed',
              'Photo too large or unclear',
              'API quota or model error',
            ],
          },
        ]
      : symbols;

  return {
    detectedSymbols,
    imageQuality: hasImage ? 'acceptable' : 'poor',
    limitations: [
      reason,
      'Always confirm with a qualified mechanic before major repairs.',
    ],
    safetyNotice: 'Dashboard guidance is indicative only.',
    modelId: 'mock-drivemate-lk-v1',
  };
}
