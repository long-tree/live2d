// character-manager.js

export function createCharacterManager() {
  const chars = new Map();

  function register(character) {
    // { id, model, mapper, actions, app }
    chars.set(character.id, character);
  }

  function get(id) {
    return chars.get(id);
  }

  function list() {
    return Array.from(chars.values());
  }

  return { register, get, list };
}
