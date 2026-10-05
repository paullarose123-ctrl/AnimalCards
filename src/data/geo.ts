// Régions de la carte du monde : chaque pays emblématique des espèces (code du drapeau), son identifiant
// ISO 3166 numérique dans le tracé world-atlas, et la position de son repère [longitude, latitude].
// Le Royaume-Uni regroupe l'Angleterre et l'Écosse ; « Océans » et « Plusieurs continents » n'ont qu'un repère.

export interface Region {
  key: string;
  /** codes des drapeaux des espèces rattachées */
  codes: string[];
  /** identifiant du pays dans world-atlas (absent pour les régions sans contour) */
  iso?: string;
  /** position du repère */
  at: [number, number];
  /** nom imposé (sinon celui du drapeau) */
  name?: string;
}

export const REGIONS: Region[] = [
  { key: 'FR', codes: ['FR'], iso: '250', at: [2.4, 46.6] },
  { key: 'US', codes: ['US'], iso: '840', at: [-98.5, 39.5] },
  { key: 'AU', codes: ['AU'], iso: '036', at: [134, -25.5] },
  { key: 'BR', codes: ['BR'], iso: '076', at: [-52, -10.5] },
  { key: 'ZA', codes: ['ZA'], iso: '710', at: [24.5, -29] },
  { key: 'IN', codes: ['IN'], iso: '356', at: [79, 22] },
  { key: 'EG', codes: ['EG'], iso: '818', at: [30, 26.5] },
  { key: 'KE', codes: ['KE'], iso: '404', at: [37.9, 0.4] },
  { key: 'MX', codes: ['MX'], iso: '484', at: [-102.5, 23.5] },
  { key: 'CN', codes: ['CN'], iso: '156', at: [104, 35] },
  { key: 'CA', codes: ['CA'], iso: '124', at: [-105, 56] },
  { key: 'JP', codes: ['JP'], iso: '392', at: [138.5, 36.5] },
  { key: 'NO', codes: ['NO'], iso: '578', at: [9, 61.5] },
  { key: 'MG', codes: ['MG'], iso: '450', at: [46.8, -19.5] },
  { key: 'TH', codes: ['TH'], iso: '764', at: [101, 15.5] },
  { key: 'BW', codes: ['BW'], iso: '072', at: [24, -22.3] },
  { key: 'PE', codes: ['PE'], iso: '604', at: [-75, -9.5] },
  { key: 'AR', codes: ['AR'], iso: '032', at: [-64.5, -35] },
  { key: 'EC', codes: ['EC'], iso: '218', at: [-78.4, -1.5] },
  { key: 'NZ', codes: ['NZ'], iso: '554', at: [172.5, -41.5] },
  { key: 'MN', codes: ['MN'], iso: '496', at: [103.5, 46.8] },
  { key: 'NP', codes: ['NP'], iso: '524', at: [84.1, 28.4] },
  { key: 'TZ', codes: ['TZ'], iso: '834', at: [34.9, -6.4] },
  { key: 'ID', codes: ['ID'], iso: '360', at: [117, -2.5] },
  { key: 'CR', codes: ['CR'], iso: '188', at: [-84.2, 9.9] },
  { key: 'PA', codes: ['PA'], iso: '591', at: [-80.1, 8.5] },
  { key: 'IS', codes: ['IS'], iso: '352', at: [-18.8, 64.9] },
  { key: 'MY', codes: ['MY'], iso: '458', at: [112.5, 3] },
  { key: 'PH', codes: ['PH'], iso: '608', at: [122.5, 12.5] },
  { key: 'CM', codes: ['CM'], iso: '120', at: [12.5, 5.7] },
  { key: 'ES', codes: ['ES'], iso: '724', at: [-3.7, 40.2] },
  { key: 'AQ', codes: ['AQ'], iso: '010', at: [20, -78] },
  { key: 'GB', codes: ['GB-ENG', 'GB-SCT', 'GB-WLS'], iso: '826', at: [-2.5, 54], name: 'Royaume-Uni' },
  { key: 'NA', codes: ['NA'], iso: '516', at: [17.5, -22.5] },
  { key: 'GA', codes: ['GA'], iso: '266', at: [11.6, -0.8] },
  { key: 'ET', codes: ['ET'], iso: '231', at: [39.5, 8.6] },
  { key: 'MA', codes: ['MA'], iso: '504', at: [-6.3, 31.8] },
  { key: 'CO', codes: ['CO'], iso: '170', at: [-73.3, 4.1] },
  { key: 'FI', codes: ['FI'], iso: '246', at: [26, 64.5] },
  { key: 'IT', codes: ['IT'], iso: '380', at: [12.6, 42.8] },
  { key: 'GL', codes: ['GL'], iso: '304', at: [-41, 72] },
  { key: 'RU', codes: ['RU'], iso: '643', at: [97, 62] },
  { key: 'GR', codes: ['GR'], iso: '300', at: [22.5, 39.3] },
  { key: 'DE', codes: ['DE'], iso: '276', at: [10.4, 51.1] },
  { key: 'DZ', codes: ['DZ'], iso: '012', at: [2.6, 28.2] },
  { key: 'CD', codes: ['CD'], iso: '180', at: [23.6, -2.9] },
  { key: 'PL', codes: ['PL'], iso: '616', at: [19.4, 52.1] },
  { key: 'PG', codes: ['PG'], iso: '598', at: [144, -6.4] },
  { key: 'NL', codes: ['NL'], iso: '528', at: [5.3, 52.2] },
  { key: 'FJ', codes: ['FJ'], iso: '242', at: [178, -17.8] },
  { key: 'LK', codes: ['LK'], iso: '144', at: [80.7, 7.8] },
  { key: 'RW', codes: ['RW'], iso: '646', at: [29.9, -2] },
  { key: 'LR', codes: ['LR'], iso: '430', at: [-9.4, 6.4] },
  { key: 'SE', codes: ['SE'], iso: '752', at: [16, 62.5] },
  { key: 'KZ', codes: ['KZ'], iso: '398', at: [67, 48] },
  { key: 'CL', codes: ['CL'], iso: '152', at: [-71.5, -33.5] },
  { key: 'JM', codes: ['JM'], iso: '388', at: [-77.3, 18.1] },
  { key: 'CU', codes: ['CU'], iso: '192', at: [-79, 21.7] },
  { key: 'SD', codes: ['SD'], iso: '729', at: [30, 15.5] },
  { key: 'MU', codes: ['MU'], at: [57.6, -20.3] },
  { key: 'RO', codes: ['RO'], iso: '642', at: [25, 45.9] },
  { key: 'GT', codes: ['GT'], iso: '320', at: [-90.3, 15.7] },
  { key: 'SC', codes: ['SC'], at: [55.5, -4.6] },
  { key: 'MP', codes: ['MP'], at: [145.7, 15.2] },
  { key: 'SI', codes: ['SI'], iso: '705', at: [14.9, 46.1] },
  { key: 'GH', codes: ['GH'], iso: '288', at: [-1.2, 7.9] },
  { key: 'SY', codes: ['SY'], iso: '760', at: [38.5, 35] },
  { key: 'BE', codes: ['BE'], iso: '056', at: [4.5, 50.6] },
  { key: 'IE', codes: ['IE'], iso: '372', at: [-8, 53.2] },
  { key: 'IL', codes: ['IL'], iso: '376', at: [34.9, 31.4] },
  { key: 'IR', codes: ['IR'], iso: '364', at: [53.7, 32.4] },
  // sans contour : les espèces des océans (au milieu du Pacifique) et celles présentes partout (Atlantique Sud)
  { key: 'XO', codes: ['XO'], at: [-150, -12] },
  { key: 'XW', codes: ['XW'], at: [-28, -32] },
];

export const REGION_BY_ISO: Record<string, Region> = Object.fromEntries(REGIONS.filter((r) => r.iso).map((r) => [r.iso!, r]));
export const REGION_BY_CODE: Record<string, Region> = Object.fromEntries(REGIONS.flatMap((r) => r.codes.map((code) => [code, r])));
