/**
 * Translates Supabase Auth error messages from English to Korean
 */

// Map of Supabase Auth error messages to Korean translations
const errorTranslations: Record<string, string> = {
  // Login errors
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다',
  'Invalid login credentials.': '이메일 또는 비밀번호가 올바르지 않습니다',
  'Email not confirmed': '이메일이 아직 인증되지 않았습니다',
  'Email not confirmed.': '이메일이 아직 인증되지 않았습니다',

  // Signup errors
  'User already registered': '이미 등록된 이메일입니다',
  'User already registered.': '이미 등록된 이메일입니다',
  'A user with this email address has already been registered': '이미 등록된 이메일입니다',
  'A user with this email address has already been registered.': '이미 등록된 이메일입니다',
  'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다',
  'Password should be at least 6 characters.': '비밀번호는 최소 6자 이상이어야 합니다',
  'Signup requires a valid password': '유효한 비밀번호를 입력해주세요',
  'Signup requires a valid password.': '유효한 비밀번호를 입력해주세요',

  // Email errors
  'Unable to validate email address: invalid format': '이메일 주소 형식이 올바르지 않습니다',
  'Unable to validate email address: invalid format.': '이메일 주소 형식이 올바르지 않습니다',
  'Invalid email': '올바른 이메일 주소를 입력해주세요',
  'Invalid email.': '올바른 이메일 주소를 입력해주세요',

  // Rate limit errors
  'Email rate limit exceeded': '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요',
  'Email rate limit exceeded.': '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요',
  'For security purposes, you can only request this once every 60 seconds': '보안을 위해 60초에 한 번만 요청할 수 있습니다',
  'For security purposes, you can only request this once every 60 seconds.': '보안을 위해 60초에 한 번만 요청할 수 있습니다',
  'Too many requests': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
  'Too many requests.': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',

  // Password reset errors
  'Email link is invalid or has expired': '이메일 링크가 유효하지 않거나 만료되었습니다',
  'Email link is invalid or has expired.': '이메일 링크가 유효하지 않거나 만료되었습니다',
  'Token has expired or is invalid': '토큰이 만료되었거나 유효하지 않습니다',
  'Token has expired or is invalid.': '토큰이 만료되었거나 유효하지 않습니다',

  // Session errors
  'Session expired': '세션이 만료되었습니다. 다시 로그인해주세요',
  'Session expired.': '세션이 만료되었습니다. 다시 로그인해주세요',
  'Invalid Refresh Token: Refresh Token Not Found': '세션이 만료되었습니다. 다시 로그인해주세요',
  'Refresh token is required': '세션이 만료되었습니다. 다시 로그인해주세요',

  // Generic errors
  'Network error': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요',
  'Network error.': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요',
  'An error occurred': '오류가 발생했습니다',
  'An error occurred.': '오류가 발생했습니다',
}

/**
 * Translates a Supabase Auth error message to Korean
 * @param message - The original error message (typically in English)
 * @returns The Korean translation if available, otherwise the original message
 */
export function translateAuthError(message: string): string {
  // Check for exact match first
  if (errorTranslations[message]) {
    return errorTranslations[message]
  }

  // Check for partial matches (some Supabase errors have dynamic parts)
  for (const [key, translation] of Object.entries(errorTranslations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return translation
    }
  }

  // Return the original message if no translation is found
  return message
}
