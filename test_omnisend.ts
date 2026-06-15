async function test() {
  const apiKey = '68b59ef5ab4f8ff06d63070b-y9pgoAwnIeu9FSJRkGfXNprB2Sq8ZUJ7zJVRC3gEX6uakBAWaF';

  // Try api/segments
  const res1 = await fetch('https://api.omnisend.com/api/segments?limit=1', {
    headers: {
      'Authorization': `Omnisend-API-Key ${apiKey}`,
      'Omnisend-Version': '2026-03-15'
    }
  });
  console.log('/api/segments status:', res1.status, await res1.text());

  // Try v3/segments
  const res2 = await fetch('https://api.omnisend.com/v3/segments?limit=1', {
    headers: {
      'X-API-KEY': apiKey,
    }
  });
  console.log('/v3/segments status:', res2.status, await res2.text());
}

test();
