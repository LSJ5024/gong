/**
 * 민감정보 (보훈·장애) AES-256-GCM 암호화/복호화 유틸리티
 *
 * 환경 변수 SENSITIVE_ENCRYPTION_KEY:
 *   - 32바이트 (256비트) hex 문자열 (64자)
 *   - 생성 명령: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * 보안 원칙:
 *   - 이 모듈의 출력값(암호문)은 절대 로그에 출력하지 않음
 *   - 복호화된 원문 boolean 값도 로그에 출력하지 않음
 *   - 키는 환경 변수로만 관리, 코드에 하드코딩 절대 금지
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // GCM 권장 96비트
const TAG_LENGTH = 16  // GCM 인증 태그 128비트

function getKey(): Buffer {
  const keyHex = process.env.SENSITIVE_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    // 개발 환경: 키 미설정 시 고정 개발용 키 사용 (운영에서는 반드시 설정 필요)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[보안] SENSITIVE_ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다. ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" 로 생성하세요.'
      )
    }
    // 개발용 임시 키 (운영 절대 사용 금지)
    return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * boolean 값을 AES-256-GCM으로 암호화하여 base64 문자열로 반환
 * 형식: base64(iv[12] + authTag[16] + ciphertext[1])
 */
export function encryptSensitiveBool(value: boolean): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const plaintext = value ? Buffer.from('1') : Buffer.from('0')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()

  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64')
}

/**
 * base64 암호문을 복호화하여 boolean으로 반환
 * 복호화 실패 시 false 반환 (안전한 기본값)
 */
export function decryptSensitiveBool(encryptedBase64: string): boolean {
  if (!encryptedBase64) return false

  try {
    const key = getKey()
    const data = Buffer.from(encryptedBase64, 'base64')

    if (data.length < IV_LENGTH + TAG_LENGTH + 1) return false

    const iv = data.subarray(0, IV_LENGTH)
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString() === '1'
  } catch {
    // 복호화 실패 (키 불일치, 데이터 손상 등) — 안전 기본값
    return false
  }
}

/**
 * 프로필 저장용: is_veterans, is_disabled boolean → 암호화 문자열 변환
 */
export function encryptProfileSensitiveFields(fields: {
  is_veterans: boolean
  is_disabled: boolean
}): {
  is_veterans_enc: string
  is_disabled_enc: string
} {
  return {
    is_veterans_enc: encryptSensitiveBool(fields.is_veterans),
    is_disabled_enc: encryptSensitiveBool(fields.is_disabled),
  }
}

/**
 * 프로필 읽기용: 암호화 문자열 → is_veterans, is_disabled boolean 복호화
 */
export function decryptProfileSensitiveFields(fields: {
  is_veterans_enc: string
  is_disabled_enc: string
}): {
  is_veterans: boolean
  is_disabled: boolean
} {
  return {
    is_veterans: decryptSensitiveBool(fields.is_veterans_enc),
    is_disabled: decryptSensitiveBool(fields.is_disabled_enc),
  }
}
