import type { Game } from "@/types";

/** Obje bağlamına `Game` türünü bağlayarak `category/difficulty` genişlemesini engelle. */
function defineGame(details: Game): Game {
  return details;
}

/** Tüm mini oyunlar — `order` maraton sırasını belirler (1 tabanlı). */
export const GAMES = [
  defineGame({
    id: "kerning-shot",
    name: "Kerning Shot",
    category: "typography",
    description: "Harfi fırlat, doğru kerning dengesini yakala.",
    duration: 30,
    difficulty: "hard",
    order: 1,
  }),
  defineGame({
    id: "curve-control",
    name: "Curve Control",
    category: "shape",
    description: "Eğriyi referansa kilitleyen minimal bir tepki testi.",
    duration: 30,
    difficulty: "medium",
    order: 2,
  }),
  defineGame({
    id: "glyph-guess",
    name: "Glyph Guess",
    category: "typography",
    description: "Gizli karakteri tek ipucuyla tahmin et.",
    duration: 25,
    difficulty: "medium",
    order: 3,
  }),
  defineGame({
    id: "rgb-guess",
    name: "RGB Guess",
    category: "color",
    description: "Panele yaklaşarak doğru RGB bileşimini bul.",
    duration: 30,
    difficulty: "hard",
    order: 4,
  }),
  defineGame({
    id: "gradient-angle",
    name: "Gradient Angle",
    category: "color",
    description: "Açıyı görsel olarak hizala, mükemmel geçişi yakala.",
    duration: 30,
    difficulty: "medium",
    order: 5,
  }),
  defineGame({
    id: "color-split",
    name: "Color Split",
    category: "color",
    description: "Alanı doğru yüzdelik bölgelerle ayır.",
    duration: 28,
    difficulty: "hard",
    order: 6,
  }),
  defineGame({
    id: "color-mix",
    name: "Color Mix",
    category: "color",
    description: "İki pigmentin karışımını ezberinden üret.",
    duration: 30,
    difficulty: "medium",
    order: 7,
  }),
  defineGame({
    id: "2px-difference",
    name: "2px Difference",
    category: "structure",
    description:
      "İki özdeş şekilden boyutu tam 2 px daha küçük olanı seç. Süre bitene kadar en yüksek doğruluk skorunu yakalamaya çalış.",
    duration: 35,
    difficulty: "hard",
    order: 8,
  }),
  defineGame({
    id: "untitled-project",
    name: "Untitled Project",
    category: "structure",
    description: "Boş tuvalde düzeni hissederek oluştur.",
    duration: 30,
    difficulty: "easy",
    order: 9,
  }),
  defineGame({
    id: "widow-hunter",
    name: "Widow Hunter",
    category: "typography",
    description: "Dökümdeki yalnız satırları avla, tipografiyi koru.",
    duration: 32,
    difficulty: "hard",
    order: 10,
  }),
].sort((a, b) => a.order - b.order);

export function getGameById(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

export function getGameByOrder(step: number): Game | undefined {
  return GAMES.find((g) => g.order === step);
}

export const TOTAL_GAMES = GAMES.length;
