/**
 * Determines if a given IP address is within a specified CIDR block.
 *
 * @param ip - The IP address to check (e.g., '192.168.1.10').
 * @param cidr - The CIDR block (e.g., '192.168.1.0/24').
 * @returns True if the IP address is within the CIDR block; otherwise, false.
 * @throws Error if either the IP address or CIDR block is invalid.
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  if (!isValidIp(ip)) {
    throw new Error('Invalid IP address');
  }

  if (!isValidCidr(cidr)) {
    throw new Error('Invalid CIDR block');
  }

  const [cidrIp, prefixLengthStr] = cidr.split('/');
  const prefixLength = parseInt(prefixLengthStr, 10);

  const ipLong = ipToLong(ip);
  const cidrIpLong = ipToLong(cidrIp);

  const mask = -1 << (32 - prefixLength);

  return (ipLong & mask) === (cidrIpLong & mask);
}

/**
 * Validates an IPv4 address.
 *
 * @param ip - The IP address to validate.
 * @returns True if the IP address is valid; otherwise, false.
 */
function isValidIp(ip: string): boolean {
  const ipRegex =
    /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
  return ipRegex.test(ip);
}

/**
 * Validates an IPv4 CIDR block.
 *
 * @param cidr - The CIDR block to validate.
 * @returns True if the CIDR block is valid; otherwise, false.
 */
function isValidCidr(cidr: string): boolean {
  const cidrRegex =
    /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3})\/([0-9]|[1-2][0-9]|3[0-2])$/;
  return cidrRegex.test(cidr);
}

/**
 * Converts an IPv4 address to a 32-bit number.
 *
 * @param ip - The IP address to convert.
 * @returns The numeric representation of the IP address.
 */
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => {
    return (acc << 8) + parseInt(octet, 10);
  }, 0) >>> 0;
}