import type { APIRoute } from 'astro';

export const prerender = false;

// Random search terms to get diverse IKEA products
const SEARCH_TERMS = [
  'lamp',
  'chair',
  'table',
  'shelf',
  'sofa',
  'bed',
  'desk',
  'mirror',
  'rug',
  'curtain',
  'plant',
  'vase',
  'clock',
  'frame',
  'basket',
  'storage',
  'box',
  'hook',
  'candle',
  'cushion',
  'blanket',
  'towel',
  'pan',
  'pot',
  'plate',
  'bowl',
  'glass',
  'mug',
  'knife',
  'cutting board',
  'trash',
  'bin',
  'organizer',
  'drawer',
  'rack',
  'stand',
  'stool',
  'bookcase',
  'wardrobe',
  'dresser',
  'nightstand',
  'cabinet',
  'trolley',
  'outdoor',
  'garden',
  'kids',
  'baby',
  'toy',
  'game',
  'office',
  'bathroom',
];

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const searchTerm =
    url.searchParams.get('q') || SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const country = url.searchParams.get('country') || 'us';
  const language = url.searchParams.get('language') || 'en';

  const ikeaSearchUrl = `https://sik.search.blue.cdtapps.com/${country}/${language}/search-result-page?q=${encodeURIComponent(searchTerm)}&size=50&types=PRODUCT&autocorrect=true&subcategories-style=tree-navigation&c=sr&v=20210322`;

  try {
    const response = await fetch(ikeaSearchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch from IKEA' }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
