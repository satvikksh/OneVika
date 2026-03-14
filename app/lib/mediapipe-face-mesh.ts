const FACE_MESH_CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";
const FACE_MESH_SCRIPT_URL = `${FACE_MESH_CDN_BASE}/face_mesh.js`;
const FACE_MESH_SCRIPT_SELECTOR = 'script[data-mediapipe-face-mesh="true"]';

let faceMeshConstructorPromise: Promise<FaceMeshConstructor> | null = null;

export interface FaceMeshLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks?: FaceMeshLandmark[][];
  image?: unknown;
}

export interface FaceMeshOptions {
  maxNumFaces?: number;
  refineLandmarks?: boolean;
  selfieMode?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface FaceMeshInstance {
  close(): Promise<void>;
  initialize(): Promise<void>;
  onResults(listener: (results: FaceMeshResults) => void): void;
  reset(): void;
  send(inputs: {
    image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;
  }): Promise<void>;
  setOptions(options: FaceMeshOptions): void;
}

interface FaceMeshConstructor {
  new (config?: {
    locateFile?: (path: string, prefix?: string) => string;
  }): FaceMeshInstance;
}

declare global {
  interface Window {
    FaceMesh?: FaceMeshConstructor;
  }
}

function getFaceMeshConstructor(): FaceMeshConstructor | undefined {
  return (globalThis as typeof globalThis & { FaceMesh?: FaceMeshConstructor })
    .FaceMesh;
}

function loadFaceMeshScript(): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.reject(
      new Error("FaceMesh script loading requires a browser document.")
    );
  }

  const existingScript = document.querySelector(
    FACE_MESH_SCRIPT_SELECTOR
  ) as HTMLScriptElement | null;

  if (existingScript) {
    if (getFaceMeshConstructor()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Failed to load MediaPipe FaceMesh script."));
      };

      const cleanup = () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    const handleLoad = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Failed to load MediaPipe FaceMesh script."));
    };

    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    script.src = FACE_MESH_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.mediapipeFaceMesh = "true";
    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    document.head.appendChild(script);
  });
}

export async function loadFaceMeshConstructor(): Promise<FaceMeshConstructor> {
  if (typeof window === "undefined") {
    throw new Error("FaceMesh can only be loaded in the browser.");
  }

  const existingConstructor = getFaceMeshConstructor();
  if (existingConstructor) {
    return existingConstructor;
  }

  if (!faceMeshConstructorPromise) {
    faceMeshConstructorPromise = (async () => {
      await loadFaceMeshScript();

      const constructor = getFaceMeshConstructor();
      if (!constructor) {
        throw new Error("MediaPipe FaceMesh failed to register globally.");
      }

      return constructor;
    })().catch((error) => {
      faceMeshConstructorPromise = null;
      throw error;
    });
  }

  return faceMeshConstructorPromise;
}

export async function createFaceMeshInstance(
  options: FaceMeshOptions = {}
): Promise<FaceMeshInstance> {
  const FaceMesh = await loadFaceMeshConstructor();
  const faceMesh = new FaceMesh({
    locateFile: (file) => `${FACE_MESH_CDN_BASE}/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    ...options,
  });

  await faceMesh.initialize();

  return faceMesh;
}
