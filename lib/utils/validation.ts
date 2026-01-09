// Validation utilities
export const isValidPhoneNumber = (phone: string): boolean => {
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
};

export const formatPhoneNumber = (phone: string, defaultCountryCode: string = '1'): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length >= 10) {
    if (cleaned.length > 10 || !cleaned.startsWith(defaultCountryCode)) {
      return `+${cleaned}`;
    }
    return `+${defaultCountryCode}${cleaned}`;
  }
  
  return `+${defaultCountryCode}${cleaned}`;
};

export const displayPhoneNumber = (phone: string): string => {
  if (!phone.startsWith('+')) return phone;
  
  const cleaned = phone.substring(1);
  
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
  }
  
  if (cleaned.length > 6) {
    const countryCode = cleaned.substring(0, cleaned.length - 10);
    const rest = cleaned.substring(cleaned.length - 10);
    return `+${countryCode} ${rest.substring(0, 5)} ${rest.substring(5)}`;
  }
  
  return phone;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

export const validateRequired = (value: any, fieldName: string): void => {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
};