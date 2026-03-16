const FACE_MESH_PUBLIC_BASE = "/mediapipe/face_mesh";
const FACE_MESH_SCRIPT_URL = `${FACE_MESH_PUBLIC_BASE}/face_mesh.js`;
const FACE_MESH_SCRIPT_SELECTOR = 'script[data-mediapipe-face-mesh="true"]';
const FACE_MESH_SCRIPT_STATE_KEY = "mediapipeFaceMeshState";

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

function getScriptState(script: HTMLScriptElement) {
  return script.dataset[FACE_MESH_SCRIPT_STATE_KEY];
}

function setScriptState(
  script: HTMLScriptElement,
  state: "loading" | "loaded" | "error"
) {
  script.dataset[FACE_MESH_SCRIPT_STATE_KEY] = state;
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

    const existingScriptState = getScriptState(existingScript);
    if (
      existingScriptState === "error" ||
      existingScriptState === "loaded"
    ) {
      existingScript.remove();
      return loadFaceMeshScript();
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        cleanup();
        if (getFaceMeshConstructor()) {
          resolve();
          return;
        }

        existingScript.remove();
        reject(new Error("MediaPipe FaceMesh failed to register globally."));
      };

      const handleError = () => {
        cleanup();
        setScriptState(existingScript, "error");
        existingScript.remove();
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
      setScriptState(script, "loaded");

      if (getFaceMeshConstructor()) {
        resolve();
        return;
      }

      script.remove();
      reject(new Error("MediaPipe FaceMesh failed to register globally."));
    };

    const handleError = () => {
      cleanup();
      setScriptState(script, "error");
      script.remove();
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
    setScriptState(script, "loading");
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
    locateFile: (file) => `${FACE_MESH_PUBLIC_BASE}/${file}`,
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
