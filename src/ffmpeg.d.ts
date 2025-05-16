
declare module '@ffmpeg/ffmpeg' {
  export function createFFmpeg(options?: {
    log?: boolean;
    corePath?: string;
    logger?: (message: string) => void;
    progress?: (progress: { ratio: number }) => void;
  }): FFmpeg;

  export interface FFmpeg {
    load(): Promise<void>;
    isLoaded(): boolean;
    run(...args: string[]): Promise<void>;
    FS(method: string, ...args: any[]): any;
  }

  export function fetchFile(file: File | string | URL): Promise<Uint8Array>;
}

