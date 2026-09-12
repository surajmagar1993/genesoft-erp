/**
 * Code 128 (Subset B) Pure Vector SVG Generator
 * Supports full standard ASCII alphanumeric characters (A-Z, a-z, 0-9, punctuation).
 * Generates crisp, scalable vector SVG with zero external dependencies.
 */

// Code 128 character widths pattern table (widths of 3 bars and 3 spaces, sum to 11)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
]

const START_B = 104
const STOP = 106

export interface Code128Options {
  width?: number
  height?: number
  showText?: boolean
  barColor?: string
  backgroundColor?: string
  fontSize?: number
}

/**
 * Encodes text into a series of bar widths (1=bar, 0=space) using Code 128B.
 */
export function encodeCode128B(text: string): string {
  // Sanitize text to ASCII range 32-126
  const clean = text.replace(/[^\x20-\x7E]/g, "").slice(0, 80)
  if (!clean) return ""

  const indices: number[] = [START_B]
  let checksum = START_B

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32
    indices.push(code)
    checksum += code * (i + 1)
  }

  indices.push(checksum % 103)
  indices.push(STOP)

  let binaryPattern = ""
  for (const idx of indices) {
    const pattern = CODE128_PATTERNS[idx] || "212222"
    let isBar = true
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10)
      binaryPattern += (isBar ? "1" : "0").repeat(width)
      isBar = !isBar
    }
  }

  return binaryPattern
}

/**
 * Generates an SVG string for a Code 128 barcode.
 */
export function generateCode128Svg(text: string, options: Code128Options = {}): string {
  const {
    width = 240,
    height = 70,
    showText = true,
    barColor = "#0f172a",
    backgroundColor = "transparent",
    fontSize = 11,
  } = options

  const binary = encodeCode128B(text)
  if (!binary) return ""

  const quietZone = 10
  const totalModules = binary.length + quietZone * 2
  const textHeight = showText ? fontSize + 8 : 0
  const barHeight = height - textHeight

  // Construct SVG rects for each bar
  let currentX = quietZone
  const rects: string[] = []

  let i = 0
  while (i < binary.length) {
    if (binary[i] === "1") {
      let runLength = 0
      while (i < binary.length && binary[i] === "1") {
        runLength++
        i++
      }
      rects.push(`<rect x="${currentX}" y="2" width="${runLength}" height="${barHeight}" fill="${barColor}" />`)
      currentX += runLength
    } else {
      let runLength = 0
      while (i < binary.length && binary[i] === "0") {
        runLength++
        i++
      }
      currentX += runLength
    }
  }

  const bgRect = backgroundColor !== "transparent"
    ? `<rect width="100%" height="100%" fill="${backgroundColor}" />`
    : ""

  const textElement = showText
    ? `<text x="${totalModules / 2}" y="${height - 2}" text-anchor="middle" font-family="monospace, ui-monospace, sans-serif" font-size="${fontSize}" font-weight="600" fill="${barColor}">${text}</text>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet">
    ${bgRect}
    ${rects.join("")}
    ${textElement}
  </svg>`
}

/**
 * Generates an SVG Data URI for Code-128
 */
export function getCode128SvgDataUri(text: string, options?: Code128Options): string {
  const svg = generateCode128Svg(text, options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

