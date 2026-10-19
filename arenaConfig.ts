export interface ArenaConfig {
  name: string;
  tagline: string;
  whatsapp: string;
  address: string;
  logo: string;
  theme: {
    headerBg: string;
    primaryButton: string;
    accentText: string;
    badgeBg: string;
    badgeText: string;
    bannerBg: string;
  };
  sports: string[];
}

export const currentArena: ArenaConfig = {
  name: "CT Viva Esportes",
  tagline: "Reserva rápida de quadras de areia e futebol society em Fortaleza",
  whatsapp: "85999999999",
  address: "Fortaleza, CE",
  logo: "/logo.png",
  theme: {
    headerBg: "bg-[#041E8C] text-white border-b border-[#031566]",
    primaryButton: "bg-[#00E599] hover:bg-[#00c985] text-[#041E8C] font-black shadow-md",
    accentText: "text-[#00E599]",
    badgeBg: "bg-[#00E599]/15 border border-[#00E599]/40",
    badgeText: "text-[#00E599]",
    bannerBg: "bg-gradient-to-br from-[#041E8C] to-[#0629B5] text-white",
  },
  sports: [
    "Beach Tennis",
    "Futevôlei",
    "Vôlei de Praia",
    "Carimba",
    "Futebol Society",
  ],
};