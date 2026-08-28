import { Mp3Encoder } from '@breezystack/lamejs';

// Client-side Web Audio API processor for instant zero-latency preview and client-side Roblox uploads
// Handles speed modification, volume amplification (dB), duration trimming, and MP3 / WAV rendering

export function audioBufferToMp3(buffer: AudioBuffer, kbps: number = 192): Blob {
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  const length = left.length;
  const leftInt16 = new Int16Array(length);
  const rightInt16 = new Int16Array(length);

  for (let i = 0; i < length; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
    if (channels > 1) {
      const sR = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
    }
  }

  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array | Uint8Array;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf && endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // subchunk1size (16 for PCM)
  setUint16(1); // audio format (1 = PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

export async function renderProcessedAudioBuffer(
  audioSource: File | Blob | ArrayBuffer,
  options: {
    speed?: number;
    amplification?: number; // in dB
    maxDuration?: number; // in seconds
  }
): Promise<AudioBuffer> {
  const { speed = 2.33, amplification = -4, maxDuration = 400 } = options;

  let arrayBuffer: ArrayBuffer;
  if (audioSource instanceof File || audioSource instanceof Blob) {
    arrayBuffer = await audioSource.arrayBuffer();
  } else {
    arrayBuffer = audioSource;
  }

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API no está disponible en este navegador');
  }

  const tempCtx = new AudioCtx();
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    try {
      tempCtx.close();
    } catch {}
  }

  const rawDuration = decodedBuffer.duration;
  const speedAdjustedDuration = rawDuration / Math.max(0.2, speed);
  const targetDuration = Math.min(speedAdjustedDuration, maxDuration);

  // Amplification gain calculation: 10^(dB / 20)
  const linearGain = Math.pow(10, amplification / 20);

  const sampleRate = decodedBuffer.sampleRate;
  const targetLength = Math.max(1, Math.floor(targetDuration * sampleRate));
  const offlineCtx = new OfflineAudioContext(
    decodedBuffer.numberOfChannels,
    targetLength,
    sampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = decodedBuffer;
  sourceNode.playbackRate.value = speed;

  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = linearGain;

  sourceNode.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  sourceNode.start(0);

  return await offlineCtx.startRendering();
}

export async function processAudioToMp3Blob(
  audioSource: File | Blob | ArrayBuffer,
  options: {
    speed?: number;
    amplification?: number; // in dB
    maxDuration?: number; // in seconds
  }
): Promise<Blob> {
  const renderedBuffer = await renderProcessedAudioBuffer(audioSource, options);
  return audioBufferToMp3(renderedBuffer, 192);
}

export async function processAudioInBrowser(
  audioSource: File | Blob | ArrayBuffer,
  options: {
    speed?: number;
    amplification?: number; // in dB
    maxDuration?: number; // in seconds
  }
): Promise<string> {
  const renderedBuffer = await renderProcessedAudioBuffer(audioSource, options);
  const wavBlob = audioBufferToWav(renderedBuffer);
  return URL.createObjectURL(wavBlob);
}

