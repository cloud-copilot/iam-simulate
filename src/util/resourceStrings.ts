/**
 * Determines if two AWS ARN patterns have any overlap in the resources they could match.
 * Handles wildcards (*) and single-character patterns (?) in both ARN strings.
 *
 * @param arn1 First ARN pattern to compare
 * @param arn2 Second ARN pattern to compare
 * @returns true if the patterns could match some of the same resources, false if they are completely disjoint
 */
export function resourceArnsOverlap(arn1: string, arn2: string): boolean {
  // Fast-path
  if (arn1 === arn2) return true
  if (arn1 === '*' || arn2 === '*') return true

  const A = [...arn1]
  const B = [...arn2]

  const n = A.length
  const m = B.length

  // BFS over states (i, j) meaning:
  // we've consumed up to i in A and up to j in B
  const visited = new Set<string>()
  const queue: Array<[number, number]> = [[0, 0]]

  const key = (i: number, j: number) => `${i},${j}`

  while (queue.length > 0) {
    const [i, j] = queue.shift()!
    const k = key(i, j)
    if (visited.has(k)) continue
    visited.add(k)

    // Accept if both ended
    if (i === n && j === m) return true

    const aTok = tokAt(A, i)
    const bTok = tokAt(B, j)

    // Epsilon transitions: '*' can match empty
    if (aTok === '*') queue.push([i + 1, j])
    if (bTok === '*') queue.push([i, j + 1])

    // Consume-one-character transitions:
    // if both can consume the same next character, advance appropriately
    if (canConsumeSameChar(aTok, bTok)) {
      const nextIs = nextIdxAfterOneChar(A, i)
      const nextJs = nextIdxAfterOneChar(B, j)
      for (const ni of nextIs) {
        for (const nj of nextJs) {
          queue.push([ni, nj])
        }
      }
    }
  }

  return false
}

function tokAt(p: string[], idx: number): string | null {
  return idx < p.length ? p[idx] : null // null = end
}

// Whether both patterns can consume at least one *same* next character
function canConsumeSameChar(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false

  const aAny = a === '*' || a === '?'
  const bAny = b === '*' || b === '?'

  // both literals
  if (!aAny && !bAny) return a === b

  // at least one side can match any char
  return true
}

// Next indices after consuming exactly one character from pattern p at idx
function nextIdxAfterOneChar(p: string[], idx: number): number[] {
  const t = tokAt(p, idx)
  if (t === null) return []
  if (t === '*') return [idx] // '*' stays and can keep consuming
  return [idx + 1] // literal or '?' consumes one and advances
}
