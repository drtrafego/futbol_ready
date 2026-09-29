/** Módulo de Perfis de Jogador (Acesso Bernardo & Afilhado/Convidado) */

export const PROFILES = Object.freeze([
  { id: 'bernardo', name: 'Bernardo', desc: 'Perfil Principal', saveKey: 'arena-de-bairro.profile.bernardo', backupKey: 'arena-de-bairro.backup.bernardo' },
  { id: 'convidado', name: 'Convidado (Afilhado)', desc: 'Segundo Perfil Independente', saveKey: 'arena-de-bairro.profile.convidado', backupKey: 'arena-de-bairro.backup.convidado' },
]);

const ACTIVE_PROFILE_KEY = 'arena-de-bairro.active-profile';

export function getActiveProfileId() {
  if (typeof localStorage === 'undefined') return 'bernardo';
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'bernardo';
  } catch {
    return 'bernardo';
  }
}

export function setActiveProfileId(id) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    // Silently continue
  }
}

export function getProfileConfig(id = null) {
  const targetId = id || getActiveProfileId();
  return PROFILES.find(p => p.id === targetId) || PROFILES[0];
}
