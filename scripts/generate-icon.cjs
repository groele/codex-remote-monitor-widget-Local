const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function generatePNG(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const lineOffset = y * (1 + width * 4);
    rawData[lineOffset] = 0; // Filter type 0: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 4;

      const relX = x / width;
      const relY = y / height;

      // Rounded rectangle badge
      const cornerRadius = 0.18;
      const inX = relX >= 0.05 && relX <= 0.95;
      const inY = relY >= 0.05 && relY <= 0.95;

      const left = 0.05 + cornerRadius;
      const right = 0.95 - cornerRadius;
      const top = 0.05 + cornerRadius;
      const bottom = 0.95 - cornerRadius;

      let isCornerOut = false;
      if (relX < left && relY < top) {
        isCornerOut = Math.hypot(relX - left, relY - top) > cornerRadius;
      } else if (relX > right && relY < top) {
        isCornerOut = Math.hypot(relX - right, relY - top) > cornerRadius;
      } else if (relX < left && relY > bottom) {
        isCornerOut = Math.hypot(relX - left, relY - bottom) > cornerRadius;
      } else if (relX > right && relY > bottom) {
        isCornerOut = Math.hypot(relX - right, relY - bottom) > cornerRadius;
      }

      // Monitor elements
      const isScreenBorder = relX >= 0.20 && relX <= 0.80 && relY >= 0.18 && relY <= 0.65;
      const isScreenInner = relX >= 0.25 && relX <= 0.75 && relY >= 0.23 && relY <= 0.60;
      const isStand = relX >= 0.44 && relX <= 0.56 && relY >= 0.65 && relY <= 0.78;
      const isBase = relX >= 0.28 && relX <= 0.72 && relY >= 0.78 && relY <= 0.85;

      // Pulse wave line inside screen
      const pulseY = 0.415;
      const isPulse = isScreenInner && (
        (Math.abs(relY - pulseY) <= 0.02 && relX >= 0.28 && relX <= 0.40) ||
        (relX >= 0.40 && relX <= 0.47 && relY >= pulseY - 0.14 && relY <= pulseY + 0.02) ||
        (relX >= 0.47 && relX <= 0.54 && relY >= pulseY - 0.04 && relY <= pulseY + 0.12) ||
        (Math.abs(relY - (pulseY + 0.04)) <= 0.02 && relX >= 0.54 && relX <= 0.72)
      );

      if (inX && inY && !isCornerOut) {
        if (isPulse) {
          // Bright Neon Emerald Cyan (#34D399)
          rawData[pixelOffset] = 52;
          rawData[pixelOffset + 1] = 211;
          rawData[pixelOffset + 2] = 153;
          rawData[pixelOffset + 3] = 255;
        } else if (isScreenInner) {
          // Dark Slate Glass Screen (#0F172A)
          rawData[pixelOffset] = 15;
          rawData[pixelOffset + 1] = 23;
          rawData[pixelOffset + 2] = 42;
          rawData[pixelOffset + 3] = 255;
        } else if (isScreenBorder || isStand || isBase) {
          // Pure Crisp White (#FFFFFF)
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          // Vibrant Emerald Green (#10B981) Gradient
          rawData[pixelOffset] = 16;
          rawData[pixelOffset + 1] = 185;
          rawData[pixelOffset + 2] = 129;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent background
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return ~c >>> 0;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

const png256 = generatePNG(256, 256);
const png64 = generatePNG(64, 64);
const buildDir = path.join(process.cwd(), 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);
fs.writeFileSync(path.join(buildDir, 'icon-small.png'), png64);

console.log('Valid 256x256 PNG generated at build/icon.png!');
console.log('BASE64_256:' + png256.toString('base64'));
console.log('BASE64_64:' + png64.toString('base64'));
