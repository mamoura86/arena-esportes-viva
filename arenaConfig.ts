export interface ArenaConfig {
  name: string;
  tagline: string;
  whatsapp: string;
  address: string;
  theme: {
    primaryButton: string;
    accentText: string;
    badgeBg: string;
    badgeText: string;
  };
  sports: string[];
}

export const currentArena: ArenaConfig = {
  name: "Viva Esportes",
  tagline: "Reserva de quadras e equipamentos esportivos",
  whatsapp: "85999999999", // Coloque o número com DDD da arena
  address: "Fortaleza, CE",
  theme: {
    primaryButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
    accentText: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-700",
  },
  sports: [
    "Beach Tennis",
    "Futevôlei",
    "Vôlei de Praia",
    "Carimba",
    "Futebol Society",
  ],
};