export interface ArenaConfig {
  name: string;
  tagline: string;
  whatsapp: string;
  address: string;
  theme: {
    primaryButton: string; // Classes Tailwind para botões principais
    accentText: string;    // Texto de destaque
    badgeBg: string;       // Fundo de etiquetas
    badgeText: string;     // Texto de etiquetas
  };
  sports: string[];
}

// Configuração modular: Viva Esportes
export const currentArena: ArenaConfig = {
  name: "Viva Esportes",
  tagline: "Reserva de campos e equipamentos desportivos",
  whatsapp: "85999999999",
  address: "Fortaleza, CE",
  theme: {
    primaryButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
    accentText: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-700",
  },
  sports: [
    "Beach Tennis",
    "Futevólei",
    "Vólei de Praia",
    "Carimba / Queimada",
    "Futebol Society",
    "Basquetebol",
  ],
};