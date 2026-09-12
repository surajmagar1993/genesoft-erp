import QRCode from "qrcode"

export interface QrCodeOptions {
  width?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Generates an SVG string representation of a QR Code.
 */
export async function generateQrCodeSvg(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const {
    width = 120,
    margin = 1,
    color = { dark: "#0f172a", light: "#00000000" },
  } = options

  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      width,
      margin,
      color,
      errorCorrectionLevel: "M",
    })
    return svg
  } catch (err) {
    console.error("Failed to generate QR Code SVG:", err)
    return ""
  }
}

/**
 * Generates a PNG Data URL of a QR Code.
 */
export async function generateQrCodeDataUrl(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const {
    width = 160,
    margin = 1,
    color = { dark: "#0f172a", light: "#ffffffff" },
  } = options

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width,
      margin,
      color,
      errorCorrectionLevel: "M",
    })
    return dataUrl
  } catch (err) {
    console.error("Failed to generate QR Code Data URL:", err)
    return ""
  }
}

/**
 * Generates an SVG Data URI for QR Code
 */
export async function getQrCodeSvgDataUri(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const svg = await generateQrCodeSvg(text, options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

