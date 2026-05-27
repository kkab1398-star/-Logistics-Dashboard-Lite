export interface BusinessConfig {
  ownerWhatsApp: string;
  phone: string;
  email: string;
}

const DEFAULTS: BusinessConfig = {
  ownerWhatsApp: "",
  phone: "0574072641",
  email: "shalal4rentalforkleft@gmail.com",
};

const STORAGE_KEY = "al-shalal-business-config";

export function getBusinessConfig(): BusinessConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULTS };
}

export function saveBusinessConfig(config: Partial<BusinessConfig>) {
  const current = getBusinessConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...config }));
}

export const BUSINESS_NAME_EN = "Al-Shalal Transport & Forklift Services";
export const BUSINESS_NAME_AR = "مؤسسة الشلال للنقل والرافعات الشوكية";
export const BUSINESS_ADDRESS_EN = "Khamis Mushait - Military City Road";
export const BUSINESS_ADDRESS_AR = "خميس مشيط - طريق المدينة العسكرية";
export const BUSINESS_EMAIL = "shalal4rentalforkleft@gmail.com";
export const BUSINESS_PHONES = [
  "0574072641",
  "0532208428",
  "0581316226",
  "0574759135",
  "0533232500",
];
