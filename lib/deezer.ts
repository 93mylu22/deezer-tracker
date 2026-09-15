export interface DeezerTrackResult {
  pos: number;
  artist: string;
  title: string;
}

export interface DeezerArtistResult {
  pos: number;
  name: string;
}

interface DeezerApiTrack {
  title?: string;
  artist?: { name?: string };
}

interface DeezerApiResponse {
  data?: DeezerApiTrack[];
}

interface DeezerApiArtist {
  name?: string;
}

interface DeezerApiArtistsResponse {
  data?: DeezerApiArtist[];
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

/**
 * Trae el top de artistas más escuchados en Deezer (chart público, global,
 * no específico por país — Deezer no ofrece un chart público de artistas
 * por país, solo listas curadas de canciones vía playlist).
 */
export async function getDeezerArtistChart(
  limit = 100
): Promise<DeezerArtistResult[]> {
  const url = `https://api.deezer.com/chart/0/artists?limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Error consultando el chart de artistas de Deezer: HTTP ${res.status}`
    );
  }

  const data: DeezerApiArtistsResponse = await res.json();
  const artistas = data.data ?? [];

  return artistas.map((artista, index) => ({
    pos: index + 1,
    name: artista.name ?? "",
  }));
}
