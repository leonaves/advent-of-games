declare module '*.json' {
  const value: unknown;
  export default value;
}

export interface Game {
  day: number;
  date: string;
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
  height?: string;
  repo: string;
  branch: string;
  buildConfig: {
    packageManager: string;
    installCommand: string;
    buildCommand: string;
    buildOutputDir: string;
    nodeVersion: string;
  };
  apiRoutes?: {
    source: string;
    dest: string;
  }[];
}

export interface Manifest {
  year: number;
  baseUrl: string;
  games: Game[];
}
