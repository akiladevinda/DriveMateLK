import type { Phase1VehicleType } from '@/constants/vehicles';

/** Popular car makes for fast offline suggestions (Sri Lanka + common imports). */
export const POPULAR_VEHICLE_MAKES = [
  'Toyota',
  'Honda',
  'Suzuki',
  'Nissan',
  'Mitsubishi',
  'Mazda',
  'Hyundai',
  'Kia',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Volkswagen',
  'Ford',
  'Chevrolet',
  'Peugeot',
  'Renault',
  'Perodua',
  'Proton',
  'Micro',
  'Tata',
  'Mahindra',
  'Isuzu',
  'Daihatsu',
  'Subaru',
  'Lexus',
  'Land Rover',
  'Jaguar',
  'Volvo',
  'Jeep',
  'Porsche',
  'Mini',
  'Fiat',
  'Alfa Romeo',
  'Skoda',
  'SsangYong',
  'DFSK',
  'Chery',
  'MG',
  'BYD',
  'Tesla',
] as const;

/** Van / passenger & cargo vans common in Sri Lanka. */
export const POPULAR_VAN_MAKES = [
  'Toyota',
  'Nissan',
  'Suzuki',
  'Mitsubishi',
  'Mazda',
  'Hyundai',
  'Isuzu',
  'Ford',
  'Mercedes-Benz',
  'Micro',
  'DFSK',
  'Changan',
  'Peugeot',
  'Volkswagen',
  'Kia',
  'Tata',
  'Mahindra',
  'Daihatsu',
] as const;

/** Three-wheeler (tuk-tuk) makes common on Sri Lankan roads. */
export const POPULAR_THREE_WHEELER_MAKES = [
  'Bajaj',
  'TVS',
  'Piaggio',
  'Mahindra',
  'Atul',
  'Force',
  'Piaggio Ape',
  'Bajaj RE',
  'TVS King',
  'Mahindra Alfa',
  'Jinal',
  'Best',
] as const;

/** Motor bikes & scooters popular in Sri Lanka. */
export const POPULAR_MOTORCYCLE_MAKES = [
  'Honda',
  'Yamaha',
  'Bajaj',
  'TVS',
  'Hero',
  'Suzuki',
  'Royal Enfield',
  'Kawasaki',
  'KTM',
  'Vespa',
  'Aprilia',
  'BMW',
  'Demak',
  'Haojue',
  'Loncin',
  'Metro',
  'Ranomoto',
  'Hero Honda',
  'Piaggio',
  'Ducati',
] as const;

/** Offline fallback models for common SL car makes when the API is slow/offline. */
export const FALLBACK_MODELS_BY_MAKE: Record<string, readonly string[]> = {
  toyota: [
    'Aqua',
    'Prius',
    'Corolla',
    'Axio',
    'Allion',
    'Premio',
    'Vitz',
    'Yaris',
    'Raize',
    'CHR',
    'C-HR',
    'Rav4',
    'Land Cruiser',
    'Prado',
    'Hilux',
    'Fortuner',
    'Camry',
  ],
  honda: [
    'Fit',
    'Jazz',
    'Civic',
    'City',
    'Vezel',
    'HR-V',
    'CR-V',
    'Grace',
    'Insight',
    'Accord',
    'Freed',
    'Shuttle',
  ],
  suzuki: [
    'Alto',
    'Wagon R',
    'Swift',
    'Baleno',
    'Vitara',
    'Jimny',
    'S-Cross',
    'Ertiga',
  ],
  nissan: ['Leaf', 'Note', 'March', 'Tiida', 'Sunny', 'X-Trail', 'Navara', 'Sylphy'],
  mitsubishi: ['Lancer', 'Outlander', 'ASX', 'Pajero', 'Montero', 'Attrage', 'L200'],
  bmw: [
    '116i',
    '118i',
    '120i',
    '318i',
    '320i',
    '320d',
    '330i',
    '520i',
    '520d',
    '530i',
    'X1',
    'X3',
    'X5',
    'M3',
    'M4',
  ],
  'mercedes-benz': [
    'A180',
    'A200',
    'C180',
    'C200',
    'C220',
    'E200',
    'E220',
    'E300',
    'GLA',
    'GLC',
    'GLE',
    'S-Class',
  ],
  hyundai: ['i10', 'i20', 'Accent', 'Elantra', 'Tucson', 'Santa Fe', 'Kona', 'Creta'],
  kia: ['Picanto', 'Rio', 'Cerato', 'Sportage', 'Sorento', 'Seltos'],
  mazda: ['2', '3', '6', 'CX-3', 'CX-5', 'CX-8', 'Demio', 'Axela'],
  audi: ['A3', 'A4', 'A6', 'Q2', 'Q3', 'Q5', 'Q7', 'TT'],
  micro: ['Panda', 'Trend', 'Viva', 'MX7'],
  perodua: ['Axia', 'Bezza', 'Myvi', 'Alza', 'Ativa'],
};

/** Van models common in Sri Lanka (keyed by normalized make). */
export const VAN_MODELS_BY_MAKE: Record<string, readonly string[]> = {
  toyota: [
    'Hiace',
    'Hiace Commuter',
    'Hiace Super GL',
    'Noah',
    'Voxy',
    'TownAce',
    'LiteAce',
    'Granvia',
    'Alphard',
    'Vellfire',
    'RegiusAce',
  ],
  nissan: ['Caravan', 'Vanette', 'NV200', 'Urvan', 'Serena', 'Elgrand', 'NV350'],
  suzuki: ['Every', 'Every Wagon', 'Carry', 'Landy', 'APV'],
  mitsubishi: ['Delica', 'Delica D:5', 'L300', 'Express'],
  mazda: ['Bongo', 'Bongo Brawny', 'Premacy'],
  hyundai: ['H1', 'H100', 'Staria', 'Starex', 'iLoad'],
  isuzu: ['Elf', 'N-Series', 'Journey'],
  ford: ['Transit', 'Transit Custom', 'Tourneo'],
  'mercedes-benz': ['Sprinter', 'Vito', 'V-Class', 'Citan'],
  micro: ['Trend Van', 'Panda Van', 'Viva Van'],
  dfsk: ['C37', 'Glory', 'EC35'],
  changan: ['Star', 'Kaicene', 'Honor'],
  peugeot: ['Partner', 'Expert', 'Boxer'],
  volkswagen: ['Transporter', 'Caddy', 'Caravelle'],
  kia: ['Carnival', 'Pregio'],
  tata: ['Winger', 'Magic'],
  mahindra: ['Supro', 'Bolero Maxi Truck'],
  daihatsu: ['Hijet', 'Atrai', 'Gran Max'],
};

/** Three-wheeler models common in Sri Lanka. */
export const THREE_WHEELER_MODELS_BY_MAKE: Record<string, readonly string[]> = {
  bajaj: [
    'RE',
    'RE 2S',
    'RE 4S',
    'RE Compact',
    'RE Optima',
    'Qute',
    'Maxima',
    'Maxima Cargo',
  ],
  'bajaj re': ['RE', 'RE Compact', 'RE Optima', 'RE 4S'],
  tvs: ['King', 'King Deluxe', 'King Duramax', 'King Kargo', 'King EV'],
  'tvs king': ['King', 'King Deluxe', 'King Duramax', 'King Kargo'],
  piaggio: ['Ape', 'Ape City', 'Ape Xtra', 'Ape Trax', 'Ape Electric'],
  'piaggio ape': ['Ape City', 'Ape Xtra', 'Ape Trax'],
  mahindra: ['Alfa', 'Alfa Champ', 'Treo', 'Treo Zor', 'Jeeto'],
  'mahindra alfa': ['Alfa', 'Alfa Champ'],
  atul: ['Gemini', 'Shakti', 'Smart', 'Gem'],
  force: ['Traveller Auto', 'Trump'],
  jinal: ['Auto'],
  best: ['Auto'],
};

/** Motorcycle / scooter models popular in Sri Lanka. */
export const MOTORCYCLE_MODELS_BY_MAKE: Record<string, readonly string[]> = {
  honda: [
    'Dio',
    'Activa',
    'Activa 125',
    'PCX',
    'PCX 160',
    'Shine',
    'CB Shine',
    'CB Unicorn',
    'Unicorn',
    'CB150R',
    'CB200X',
    'CBR150R',
    'CBR250R',
    'Hornet',
    'Livo',
    'Wave',
    'Navi',
    'Benly',
  ],
  yamaha: [
    'FZ',
    'FZ-S',
    'FZ25',
    'MT-15',
    'MT-03',
    'R15',
    'YZF-R15',
    'R3',
    'RayZR',
    'Fascino',
    'Aerox',
    'NMAX',
    'FZ16',
    'FZs',
  ],
  bajaj: [
    'Pulsar',
    'Pulsar 150',
    'Pulsar NS200',
    'Pulsar NS160',
    'Pulsar RS200',
    'CT 100',
    'Discover',
    'Avenger',
    'Dominar 250',
    'Dominar 400',
    'Platina',
  ],
  tvs: [
    'Apache RTR 160',
    'Apache RTR 200',
    'Apache RR 310',
    'Ntorq',
    'Ntorq 125',
    'Jupiter',
    'XL100',
    'Wego',
    'Scooty Pep',
    'Raider',
    'iQube',
  ],
  hero: [
    'Splendor',
    'Splendor Plus',
    'Passion',
    'HF Deluxe',
    'Xpulse 200',
    'Glamour',
    'Pleasure',
    'Destini',
    'Maestro',
    'Hunk',
  ],
  'hero honda': ['Splendor', 'Passion', 'CD 100', 'CBZ'],
  suzuki: [
    'Gixxer',
    'Gixxer SF',
    'Access 125',
    'Burgman',
    'Burgman Street',
    'Lets',
    'Avenis',
    'Address',
  ],
  'royal enfield': [
    'Classic 350',
    'Bullet 350',
    'Hunter 350',
    'Meteor 350',
    'Interceptor 650',
    'Continental GT',
    'Himalayan',
    'Scram 411',
  ],
  kawasaki: ['Ninja 300', 'Ninja 400', 'Ninja 650', 'Z250', 'Z400', 'Versys'],
  ktm: ['Duke 125', 'Duke 200', 'Duke 250', 'Duke 390', 'RC 125', 'RC 200', 'RC 390'],
  vespa: ['LX', 'VXL', 'SXL', 'Elegante', 'Primavera', 'Sprint'],
  aprilia: ['SR 160', 'SXR', 'Storm'],
  bmw: ['G 310 R', 'G 310 GS', 'F 750 GS', 'F 850 GS'],
  demak: ['DTV', 'ECO', 'Rino'],
  haojue: ['DR160', 'UY125', 'TZ125'],
  loncin: ['LX', 'CR'],
  metro: ['MR', 'Scooty'],
  ranomoto: ['RX', 'Scooter'],
  piaggio: ['Vespa', 'Liberty'],
  ducati: ['Monster', 'Scrambler', 'Panigale'],
};

export const NHTSA_VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

export function getPopularMakesForType(vehicleType: Phase1VehicleType | string): readonly string[] {
  switch (vehicleType) {
    case 'van':
      return POPULAR_VAN_MAKES;
    case 'three_wheeler':
      return POPULAR_THREE_WHEELER_MAKES;
    case 'motorcycle':
      return POPULAR_MOTORCYCLE_MAKES;
    case 'car':
    default:
      return POPULAR_VEHICLE_MAKES;
  }
}

export function getFallbackModelsForType(
  vehicleType: Phase1VehicleType | string,
  makeKey: string,
): readonly string[] {
  switch (vehicleType) {
    case 'van':
      return VAN_MODELS_BY_MAKE[makeKey] ?? [];
    case 'three_wheeler':
      return THREE_WHEELER_MODELS_BY_MAKE[makeKey] ?? [];
    case 'motorcycle':
      return MOTORCYCLE_MODELS_BY_MAKE[makeKey] ?? [];
    case 'car':
    default:
      return FALLBACK_MODELS_BY_MAKE[makeKey] ?? [];
  }
}

export function getMakePlaceholder(vehicleType: Phase1VehicleType | string): string {
  switch (vehicleType) {
    case 'van':
      return 'e.g. Toyota';
    case 'three_wheeler':
      return 'e.g. Bajaj';
    case 'motorcycle':
      return 'e.g. Honda';
    default:
      return 'e.g. Toyota';
  }
}

export function getModelPlaceholder(
  vehicleType: Phase1VehicleType | string,
  make?: string,
): string {
  const m = make?.trim().toLowerCase() ?? '';
  switch (vehicleType) {
    case 'van':
      return m.includes('toyota') ? 'e.g. Hiace' : 'e.g. Hiace / Noah';
    case 'three_wheeler':
      return m.includes('bajaj') ? 'e.g. RE' : 'e.g. RE / King';
    case 'motorcycle':
      return m.includes('honda') ? 'e.g. Dio' : 'e.g. Dio / Pulsar';
    default:
      return m.includes('bmw') ? 'e.g. 318i' : 'e.g. Aqua / Civic';
  }
}

export function getMakeHint(vehicleType: Phase1VehicleType | string): string {
  switch (vehicleType) {
    case 'van':
      return 'Sri Lanka vans · pick a suggestion or type your own';
    case 'three_wheeler':
      return 'Sri Lanka 3 Wheel makers · pick or type your own';
    case 'motorcycle':
      return 'Sri Lanka bikes & scooters · pick or type your own';
    default:
      return 'Example: Toyota · pick a suggestion or type your own';
  }
}
