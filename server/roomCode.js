import { randomInt } from 'crypto';

/**
 * Generate a 6-digit room code (e.g., "482913")
 */
export function generateRoomCode() {
  // Generate digits in range 100000-999999 to ensure always 6 digits
  return String(randomInt(100000, 999999));
}
