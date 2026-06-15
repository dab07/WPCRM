async function test() {
  const apiKey = '68b59ef5ab4f8ff06d63070b-y9pgoAwnIeu9FSJRkGfXNprB2Sq8ZUJ7zJVRC3gEX6uakBAWaF';

  // Try v3/segments
  const res3 = await fetch('https://api.omnisend.com/v3/segments?limit=1', {
    headers: {
      'X-API-KEY': apiKey,
    }
  });
  console.log('/v3/segments status:', res3.status, await res3.text());
}

test();
