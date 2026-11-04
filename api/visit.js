// api/visit.js — fungsi server Vercel untuk menghitung kunjungan per negara.
// Negara dibaca dari header Vercel (x-vercel-ip-country); alamat IP TIDAK disimpan.
// Yang tersimpan di Supabase hanya: kode negara + jumlah kunjungan.
//
//   GET /api/visit?hit=1   -> menambah 1 kunjungan (negara pengunjung) lalu mengembalikan statistik
//   GET /api/visit         -> hanya mengembalikan statistik

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fsqzxdifxdtghbqrbipz.supabase.co';
// Kunci "publishable" memang publik (sama seperti di online-config.js).
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_m4vT3tVSRGgyoojRiE6PKA_o4cF1VvV';

async function rpc(name, body) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error('supabase ' + res.status);
  const text = await res.text();          // fungsi tanpa hasil (hit_visit) membalas kosong
  return text ? JSON.parse(text) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.query && req.query.hit === '1') {
      const raw = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
      const country = /^[A-Z]{2}$/.test(raw) ? raw : 'XX';
      await rpc('hit_visit', { p_country: country });
    }
    const stats = await rpc('get_visit_stats', {});
    res.status(200).json(stats);
  } catch (e) {
    res.status(200).json({ ok: false });
  }
};
