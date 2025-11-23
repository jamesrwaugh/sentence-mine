export interface MassifApiResponse {
  hits: number;
  hits_limited: boolean;
  results: MassifApiResult[];
}

export interface MassifApiResult {
  highlighted_html: string;
  sample_source: MassifApiSampleSource;
  source_count: number;
  text: string;
}

export interface MassifApiSampleSource {
  publish_date: Date;
  title: string;
  url: string;
}

export async function searchMassifApi(
  query: string
): Promise<MassifApiResponse> {
  const response = await fetch(
    `https://massif.la/ja/search?q=${encodeURIComponent(query)}&fmt=json`,
    {
      method: "GET",
    }
  );

  return response.json() as Promise<MassifApiResponse>;
}
