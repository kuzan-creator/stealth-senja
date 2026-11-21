// Shadows of Pasar Senja — level data.
// Tile maps are 24 columns x 15 rows, one tile = 40px (canvas 960x600).
//   #  wall / kiosk / container / display case (blocks sight and movement)
//   .  floor (lit, open)
//   ,  shadow — bush, stall shade, dark corner (hides the player)
//   P  player start      E  exit gate (opens after all items)
//   1 2 3  items to steal   L  lamp (lit; press E nearby to switch it off)
// Guards patrol between waypoints (tile coords). Cameras rotate in place.
// Dogs are fast, hear footsteps, and see only a short cone.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;

export const LEVELS = [
  {
    id: 1,
    name: 'Pasar Malam Senja',
    subtitle: 'Pasar malam — kios Bu Lastri, penjaga berpatroli',
    kicker: 'PASAR SENJA · 21.00 WIB',
    intro: 'Malam turun di pasar. Tiga pusaka menunggu di antara kios — dan penjaga tidak pernah tidur.',
    seconds: 180,
    map: [
      '########################',
      '#P....#......,,....1...#',
      '#.....#..##..,,..##....#',
      '#..,,,....#......#..#..#',
      '#.##..##.....##.....#..#',
      '#......#..L......#.....#',
      '#..##......##..#....#..#',
      '#.....#.......#...,,...#',
      '#.##..#..##......,,.2..#',
      '#.....#......#..##.....#',
      '#..L......#.....#...#..#',
      '#.##..##.....##....#...#',
      '#......,,..#......#....#',
      '#..3...,,.....L....#..E#',
      '########################',
    ],
    items: [
      { id: 0, tile: [20, 1], name: 'Keris Pusaka' },
      { id: 1, tile: [20, 8], name: 'Wayang Kulit' },
      { id: 2, tile: [3, 13], name: 'Batik Tulis' },
    ],
    guards: [
      { waypoints: [[8, 1], [12, 1]], speed: 52, range: 175, fov: 1.15 },
      { waypoints: [[14, 8], [21, 8]], speed: 56, range: 175, fov: 1.15 },
      { waypoints: [[1, 5], [1, 10]], speed: 48, range: 165, fov: 1.15 },
    ],
    dogs: [],
    cameras: [],
    lamps: [[10, 5], [3, 10], [14, 13]],
  },
  {
    id: 2,
    name: 'Museum Pusaka',
    subtitle: 'Museum — etalase kaca, kamera berputar, lantai marmer',
    kicker: 'MUSEUM PUSAKA · 23.40 WIB',
    intro: 'Etalase kaca memantulkan langkahmu. Kamera berputar tanpa henti — tunggu sampai lensanya berpaling.',
    seconds: 210,
    map: [
      '########################',
      '#P....,,.....##....1...#',
      '#..##....#......#..##..#',
      '#......#....##.....#...#',
      '#.##.....##....#.......#',
      '#....#......#.....##...#',
      '#..,,...##.....#.......#',
      '#......#....##....#..#.#',
      '#.##......#.....##....2#',
      '#....##......#.........#',
      '#..#....,,.....##..#...#',
      '#....#......#......#...#',
      '#.##...##.....##.......#',
      '#..3....,,..#....L....E#',
      '########################',
    ],
    items: [
      { id: 0, tile: [20, 1], name: 'Topeng Panji' },
      { id: 1, tile: [21, 8], name: 'Gamelan Mini' },
      { id: 2, tile: [3, 13], name: 'Prasasti Batu' },
    ],
    guards: [
      { waypoints: [[2, 3], [5, 3]], speed: 54, range: 180, fov: 1.15 },
      { waypoints: [[11, 2], [11, 9]], speed: 50, range: 180, fov: 1.15 },
    ],
    dogs: [],
    cameras: [
      { tile: [12, 1], range: 190, fov: 0.9, sweep: [-0.9, 0.9], speed: 0.55 },
      { tile: [9, 10], range: 180, fov: 0.9, sweep: [0.4, 2.2], speed: 0.5 },
    ],
    lamps: [[17, 13]],
  },
  {
    id: 3,
    name: 'Pelabuhan Senja',
    subtitle: 'Pelabuhan — kontainer, lampu sorot, anjing penjaga',
    kicker: 'PELABUHAN SENJA · 02.10 WIB',
    intro: 'Dokumen rahasia itu ada di gudang terakhir. Lampu sorot menyapu dermaga dan anjing penjaga mendengar segalanya.',
    seconds: 240,
    map: [
      '########################',
      '#P...##....,,......1...#',
      '#....##..#......##.....#',
      '#..,,....#..##.....#...#',
      '#.###..#......#..##....#',
      '#......#..##.....#..#..#',
      '#..##.....#...,,......##',
      '#......#.....##..#.....#',
      '#.##..##..#......#..2..#',
      '#......#....##..#......#',
      '#..L.....#......##..#..#',
      '#.##..##....#.....#....#',
      '#.....#...,,..##....#..#',
      '#..3....#.....L....#..E#',
      '########################',
    ],
    items: [
      { id: 0, tile: [20, 1], name: 'Peta Jalur' },
      { id: 1, tile: [21, 8], name: 'Kunci Gudang' },
      { id: 2, tile: [3, 13], name: 'Surat Rahasia' },
    ],
    guards: [
      { waypoints: [[17, 9], [21, 9]], speed: 58, range: 180, fov: 1.15 },
      { waypoints: [[1, 6], [1, 11]], speed: 54, range: 175, fov: 1.15 },
    ],
    dogs: [
      { waypoints: [[8, 7], [12, 7]], speed: 95, range: 120, fov: 1.3 },
    ],
    cameras: [],
    lamps: [[3, 10], [14, 13]],
    searchlight: { tile: [12, 7], range: 260, fov: 0.5, speed: 0.4 },
  },
];
