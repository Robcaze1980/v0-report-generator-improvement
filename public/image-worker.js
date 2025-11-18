// Web Worker for image compression
self.onmessage = async function (e) {
  const { file, maxSize, quality, index } = e.data

  try {
    // Read file as data URL
    const reader = new FileReaderSync()
    const dataUrl = reader.readAsDataURL(file)

    // Create image bitmap for better performance
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const imageBitmap = await createImageBitmap(blob)

    // Calculate dimensions
    let width = imageBitmap.width
    let height = imageBitmap.height

    if (width > height && width > maxSize) {
      height = (height * maxSize) / width
      width = maxSize
    } else if (height > maxSize) {
      width = (width * maxSize) / height
      height = maxSize
    }

    // Create offscreen canvas for compression
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(imageBitmap, 0, 0, width, height)

    // Convert to blob
    const compressedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality,
    })

    // Convert blob to data URL
    const compressedDataUrl = await new Promise((resolve) => {
      const reader = new FileReaderSync()
      resolve(reader.readAsDataURL(compressedBlob))
    })

    self.postMessage({
      success: true,
      dataUrl: compressedDataUrl,
      index: index,
    })
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
      index: index,
    })
  }
}
