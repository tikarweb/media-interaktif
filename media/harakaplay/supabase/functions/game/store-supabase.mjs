/* Store Supabase untuk core.mjs. Dipakai Edge Function dengan service_role.
   BELUM diuji terhadap proyek Supabase sungguhan di sisi pengembang —
   uji pertama dilakukan saat deploy (lihat README, bagian Uji coba). */
export function createSupabaseStore(admin) {
  async function must(p) {
    const { data, error } = await p;
    if (error) throw new Error(error.message);
    return data;
  }
  return {
    async getRoomByCode(code) {
      return await must(admin.from('rooms').select('*').eq('code', code).maybeSingle());
    },
    async getRoom(id) {
      if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
      return await must(admin.from('rooms').select('*').eq('id', id).maybeSingle());
    },
    async createRoom({ code, hostId }) {
      return await must(admin.from('rooms').insert({ code, host_id: hostId }).select('*').single());
    },
    async listPlayers(roomId) {
      return (await must(admin.from('room_players').select('user_id,name,seat').eq('room_id', roomId))) || [];
    },
    async addPlayer(roomId, userId, name, seat) {
      await must(admin.from('room_players').insert({ room_id: roomId, user_id: userId, name, seat }));
    },
    async removePlayer(roomId, userId) {
      await must(admin.from('room_players').delete().eq('room_id', roomId).eq('user_id', userId));
    },
    async deleteRoom(roomId) { await must(admin.from('rooms').delete().eq('id', roomId)); },
    async setHost(roomId, userId) { await must(admin.from('rooms').update({ host_id: userId }).eq('id', roomId)); },
    async setStatus(roomId, status) {
      await must(admin.from('rooms').update({ status, updated_at: new Date().toISOString() }).eq('id', roomId));
    },
    async loadSecret(roomId) {
      return await must(admin.from('room_secrets').select('state,version').eq('room_id', roomId).maybeSingle());
    },
    async getHand(roomId, userId) {
      const row = await must(admin.from('hands').select('cards,drawn_card_id').eq('room_id', roomId).eq('user_id', userId).maybeSingle());
      return row ? { cards: row.cards, drawn: row.drawn_card_id } : null;
    },
    async saveGame({ roomId, expectedVersion, state, publicState, hands, status }) {
      const { data, error } = await admin.rpc('hp_save_game', {
        p_room: roomId,
        p_expected: expectedVersion,
        p_state: state,
        p_public: publicState,
        p_hands: hands,
        p_status: status
      });
      if (error) throw new Error(error.message);
      return data === true;
    }
  };
}
