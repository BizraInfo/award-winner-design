import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://bizra.ai/',
      lastModified: new Date('2026-07-24T00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
