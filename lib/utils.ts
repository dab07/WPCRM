export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}


/**
 * Format phone number to E.164 format for WhatsApp
 */
export function formatPhoneNumber(phone: string, defaultCountryCode: string = '1'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length >= 10) {
    if (cleaned.length > 10 || !cleaned.startsWith(defaultCountryCode)) {
      return `+${cleaned}`;
    }
    return `+${defaultCountryCode}${cleaned}`;
  }
  
  return `+${defaultCountryCode}${cleaned}`;
}

/**
 * Validate if phone number is in correct E.164 format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
}

/**
 * Display phone number in a readable format
 */
export function displayPhoneNumber(phone: string): string {
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
}
