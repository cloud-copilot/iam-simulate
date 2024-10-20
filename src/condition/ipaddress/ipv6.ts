/**
 * Determines if a given IPv6 address is within a specified CIDR block.
 *
 * @param ip - The IPv6 address to check (e.g., '2001:0db8:85a3::8a2e:0370:7334').
 * @param cidr - The IPv6 CIDR block (e.g., '2001:0db8::/32').
 * @returns True if the IP address is within the CIDR block; otherwise, false.
 * @throws Error if either the IP address or CIDR block is invalid.
 */
export function isIpInCidrV6(ip: string, cidr: string): boolean {
  if (!isValidIpV6(ip)) {
    throw new Error('Invalid IPv6 address');
  }

  if (!isValidIpCidrV6(cidr)) {
    throw new Error('Invalid IPv6 CIDR block');
  }

  const [cidrIp, prefixLengthStr] = cidr.split('/');
  const prefixLength = parseInt(prefixLengthStr, 10);

  const ipBigInt = ipv6ToBigInt(ip);
  const cidrIpBigInt = ipv6ToBigInt(cidrIp);

  const mask = BigInt(-1) << BigInt(128 - prefixLength);

  return (ipBigInt & mask) === (cidrIpBigInt & mask);
}

/**
 * Validates an IPv6 address.
 *
 * @param ip - The IPv6 address to validate.
 * @returns True if the IPv6 address is valid; otherwise, false.
 */
export function isValidIpV6(ip: string): boolean {
  const ipv6Regex = new RegExp(
    '^(' +
      '(([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|' +
      '(([0-9A-Fa-f]{1,4}:){1,7}:)|' +
      '(([0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4})|' +
      '(([0-9A-Fa-f]{1,4}:){1,5}(:[0-9A-Fa-f]{1,4}){1,2})|' +
      '(([0-9A-Fa-f]{1,4}:){1,4}(:[0-9A-Fa-f]{1,4}){1,3})|' +
      '(([0-9A-Fa-f]{1,4}:){1,3}(:[0-9A-Fa-f]{1,4}){1,4})|' +
      '(([0-9A-Fa-f]{1,4}:){1,2}(:[0-9A-Fa-f]{1,4}){1,5})|' +
      '([0-9A-Fa-f]{1,4}:)((:[0-9A-Fa-f]{1,4}){1,6})|' +
      '(:)((:[0-9A-Fa-f]{1,4}){1,7}|:)|' +
      'fe80:(:[0-9A-Fa-f]{0,4}){0,4}%[0-9a-zA-Z]{1,}|' +
      '::(ffff(:0{1,4}){0,1}:){0,1}' +
      '(([0-9A-Fa-f]{1,4}:){1,4}:)?' +
      '((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}' +
      '(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])|' +
      '([0-9A-Fa-f]{1,4}:){1,4}:' +
      '((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}' +
      '(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])' +
      ')$'
  );
  return ipv6Regex.test(ip);
}

/**
 * Validates an IPv6 CIDR block.
 *
 * @param cidr - The IPv6 CIDR block to validate.
 * @returns True if the CIDR block is valid; otherwise, false.
 */
export function isValidIpCidrV6(cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const [cidrIp, prefixLengthStr] = parts;
  if (!isValidIpV6(cidrIp)) {
    return false;
  }

  const prefixLength = parseInt(prefixLengthStr, 10);
  return prefixLength >= 0 && prefixLength <= 128;
}

/**
 * Converts an IPv6 address to a BigInt representation.
 *
 * @param ip - The IPv6 address to convert.
 * @returns A BigInt representing the IPv6 address.
 */
function ipv6ToBigInt(ip: string): bigint {
  const fullIp = expandIpv6Address(ip);
  const parts = fullIp.split(':');
  let result = BigInt(0);
  for (const part of parts) {
    result = (result << BigInt(16)) + BigInt(parseInt(part, 16));
  }
  return result;
}

/**
 * Expands an abbreviated IPv6 address to its full form.
 *
 * @param ip - The IPv6 address to expand.
 * @returns The expanded IPv6 address.
 */
function expandIpv6Address(ip: string): string {
  // Replace '::' with the appropriate number of ':0'
  const numColons = (ip.match(/:/g) || []).length;
  const numMissingSections = 8 - numColons + (ip.includes('::') ? 1 : 0);

  if (ip.startsWith('::')) {
    ip = ip.replace('::', '0:'.repeat(numMissingSections));
  } else if (ip.endsWith('::')) {
    ip = ip.replace('::', ':0'.repeat(numMissingSections));
  } else if (ip.includes('::')) {
    ip = ip.replace('::', ':' + '0:'.repeat(numMissingSections - 1));
  }

  const parts = ip.split(':').map(part => part.padStart(4, '0'));
  return parts.join(':');
}