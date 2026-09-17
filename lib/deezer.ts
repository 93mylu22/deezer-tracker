export interface DeezerTrackResult {
  pos: number;
  artist: string;
  title: string;
}

interface DeezerApiTrack {
  title?: string;
  artist?: { name?: string };
}

interface DeezerApiResponse {
  data?: DeezerApiTrack[];
}

/**
 * Trae el top de una playlist pública de Deezer (por defecto hasta 100 canciones)
 * usando la API pública (sin autenticación, gratis).
 */
export async function getDeezerChart(
  playlistId: string
): Promise<DeezerTrackResult[]> {
  const url = `https://api.deezer.com/playlist/${playlistId}/tracks?limit=100`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Error consultando Deezer (playlist ${playlistId}): HTTP ${res.status}`
    );
  }

  const data: DeezerApiResponse = await res.json();
  const tracks = data.data ?? [];

  return tracks.map((track, index) => ({
    pos: index + 1,
    artist: track.artist?.name ?? "",
    title: track.title ?? "",
  }));
}
