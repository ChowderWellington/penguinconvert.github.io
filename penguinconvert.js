class DataURLConverterExtension {
  constructor() {
    this.ffmpeg = null; // FFmpeg instance
  }

  async loadFFmpeg() {
    if (this.ffmpeg) return; // Prevent multiple loads
    const { createFFmpeg } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.3');
    this.ffmpeg = createFFmpeg({ log: true });
    await this.ffmpeg.load();
  }

  getInfo() {
    return {
      id: 'dataURLConverter',
      name: 'Data URL Converter',
      blocks: [
        {
          opcode: 'convertDataURL',
          blockType: 'reporter',
          text: 'convert [DATAURL] to [FORMAT]',
          arguments: {
            DATAURL: {
              type: 'string',
              defaultValue: 'data:video/mp4;base64,...'
            },
            FORMAT: {
              type: 'string',
              menu: 'formats'
            }
          }
        }
      ],
      menus: {
        formats: {
          acceptReporters: true,
          items: ['mp3', 'png', 'jpeg'] // Supported formats
        }
      }
    };
  }

  async convertDataURL(args) {
    const dataURL = args.DATAURL;
    const format = args.FORMAT;

    if (!dataURL.startsWith('data:')) {
      return 'Invalid data URL';
    }

    if (format === 'mp3') {
      return await this.extractMP3(dataURL);
    } else if (['png', 'jpeg'].includes(format)) {
      return await this.convertImage(dataURL, format);
    } else {
      return 'Unsupported format';
    }
  }

  async extractMP3(dataURL) {
    await this.loadFFmpeg();

    // Decode base64 Data URL
    const base64Data = dataURL.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Write the MP4 file to FFmpeg's virtual filesystem
    this.ffmpeg.FS('writeFile', 'input.mp4', binaryData);

    // Run FFmpeg to extract audio and convert to MP3
    await this.ffmpeg.run('-i', 'input.mp4', '-q:a', '0', '-map', 'a', 'output.mp3');

    // Read the converted MP3 file
    const mp3Data = this.ffmpeg.FS('readFile', 'output.mp3');

    // Create a Blob and generate a Data URL
    const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mp3' });
    const mp3URL = URL.createObjectURL(mp3Blob);

    return mp3URL;
  }

  async convertImage(dataURL, format) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(`image/${format}`));
      };
      img.onerror = () => resolve('Invalid image data URL');
      img.src = dataURL;
    });
  }
}

Scratch.extensions.register(new DataURLConverterExtension());
