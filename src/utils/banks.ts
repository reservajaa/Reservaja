export const BANKS_BASE = [
  {
    id: "mercadopago",
    name: "Mercado Pago",
    logoUrl: "/banks/mercadopago.png?v=2",
    color: "#00B1EA",
  },
  {
    id: "nubank",
    name: "Nubank",
    logoUrl: "/banks/nubank.png?v=2",
    color: "#820AD1",
  },
  {
    id: "c6",
    name: "C6 Bank",
    logoUrl: "/banks/c6.svg?v=2",
    color: "#242424",
  },
  {
    id: "itau",
    name: "Itaú",
    logoUrl: "/banks/itau.png?v=2",
    color: "#F57900",
  },
  {
    id: "bradesco",
    name: "Bradesco",
    logoUrl: "/banks/bradesco.png?v=2",
    color: "#CC092F",
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    logoUrl: "/banks/bb.png?v=2",
    color: "#F9DD16",
  },
  {
    id: "inter",
    name: "Inter",
    logoUrl: "/banks/inter.png?v=2",
    color: "#FF6600",
  },
  {
    id: "infinitepay",
    name: "InfinitePay",
    logoUrl: "/banks/infinitepay.svg?v=2",
    color: "#00C566",
  },
  {
    id: "pan",
    name: "Banco Pan",
    logoUrl: "/banks/pan.svg?v=2",
    color: "#0053A0",
  },
  {
    id: "caixa",
    name: "Caixa",
    logoUrl: "/banks/caixa.svg?v=2",
    color: "#005CA9",
  },
  {
    id: "caixatem",
    name: "Caixa Tem",
    logoUrl: "/banks/caixatem.svg?v=2",
    color: "#005CA9",
  },
  {
    id: "paypal",
    name: "PayPal",
    logoUrl: "/banks/paypal.svg?v=2",
    color: "#003087",
  },
];

import { CustomBankEntry } from '../types';

// Alias para compatibilidade
export const BANKS = BANKS_BASE;

export function cleanImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Tratar links de imagem do Google (ex: https://www.google.com/imgres?imgurl=...)
  if (trimmed.includes('google.') && trimmed.includes('imgurl=')) {
    try {
      const urlObj = new URL(trimmed);
      const imgurl = urlObj.searchParams.get('imgurl');
      if (imgurl) {
        return decodeURIComponent(imgurl);
      }
    } catch {
      const match = trimmed.match(/[?&]imgurl=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  }

  // Tratar links de compartilhamento do Google Drive
  if (trimmed.includes('drive.google.com') && trimmed.includes('/file/d/')) {
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return trimmed;
}

export function getBankLogoUrl(
  bankId: string, 
  customBanks?: Record<string, string>,
  extraBanks?: CustomBankEntry[]
): string {
  if (customBanks?.[bankId]) return customBanks[bankId];
  const bank = BANKS_BASE.find(b => b.id === bankId) || extraBanks?.find(b => b.id === bankId);
  if (!bank) return '';
  return bank.logoUrl;
}

export function compressImage(file: File, maxWidth = 180, maxHeight = 180): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const compressed = canvas.toDataURL('image/webp', 0.88);
          resolve(compressed);
        } catch {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

