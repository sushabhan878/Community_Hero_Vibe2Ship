const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

export async function uploadToCloudinary(uri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ' +
      'and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env'
    )
  }

  const formData = new FormData()
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `upload_${Date.now()}.jpg`,
  } as unknown as Blob)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  const text = await res.text()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Cloudinary returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error((data.error as Record<string, string>)?.message || 'Cloudinary upload failed')
  return data.secure_url as string
}
