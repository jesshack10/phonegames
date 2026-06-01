// ─── Firebase layer ────────────────────────────────────────────────────────
export {
  ROOM_TTL,
  createRoom,
  joinRoom,
  kickPlayer,
  getRoomMeta,
  updateRoomMeta,
  endRoom,
  subscribeRoom,
  subscribeRoomPlayers,
} from './firebase/roomDb.js'

// ─── Hooks ─────────────────────────────────────────────────────────────────
export { useRoom } from './hooks/useRoom.js'
export { useRoomJoin } from './hooks/useRoomJoin.js'

// ─── Avatar utilities ──────────────────────────────────────────────────────
export {
  COLORS,
  ANIMALS,
  ANIMAL_EMOJI,
  COLOR_BG,
  generateAvatar,
  parseAvatar,
} from './utils/avatar.js'

// ─── UI components ─────────────────────────────────────────────────────────
export { Avatar } from './components/Avatar.jsx'
export { RoomPlayerList } from './components/RoomPlayerList.jsx'
export { RoomShareLink } from './components/RoomShareLink.jsx'
export { RoomJoinScreen } from './components/RoomJoinScreen.jsx'
export { RoomLobby } from './components/RoomLobby.jsx'
export { RoomModeratorPanel } from './components/RoomModeratorPanel.jsx'
