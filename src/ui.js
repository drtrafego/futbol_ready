import { CFG, UPGRADE_DEFS, MISSIONS } from './config.js';
import { currentMission, missionValue, carryCapacity, upgradeCost, upgradeLevel } from './simulation.js';
import { getDivision, sortTable } from './competition.js';
import { calculateTeamStrength, calculateTrainingCost, getStarters, getReserves, swapRosterPlayers } from './roster.js';
import { getProfileConfig } from './profile.js';

export const formatNumber = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);

export class UI {
  constructor(actions) {
    this.actions = actions;
    this.lastMission = null;
    this.toastUntil = 0;
    this.soundEnabled = false;
    this.audio = null;
    this.dialogs = [...document.querySelectorAll('dialog')];
    this.nodes = Object.fromEntries([
      'wallet', 'carry', 'cash', 'matches', 'mission-title', 'mission-text',
      'mission-progress', 'mission-count', 'navigate-button', 'save-status',
      'header-div-badge', 'header-div-name', 'header-team-strength',
      'team-strength-val', 'team-captain-name', 'tactic-formation', 'tactic-posture',
      'starters-grid', 'reserves-grid', 'league-title', 'league-round-info',
      'league-next-match', 'league-table-body', 'youth-facility-lvl', 'youth-prospects-list',
      'market-wallet-val', 'market-players-list', 'active-profile-name'
    ].map(id => [id, document.getElementById(id)]));

    const click = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    click('start-button', () => { document.getElementById('welcome-dialog').close(); actions.start(); });
    click('upgrade-button', () => this.open('upgrade-dialog'));
    click('wallet-upgrades', () => this.open('upgrade-dialog'));
    click('header-league-pill', () => this.open('league-dialog'));

    // Dock esportiva
    click('btn-dock-team', () => this.open('team-dialog'));
    click('btn-dock-league', () => this.open('league-dialog'));
    click('btn-dock-youth', () => this.open('youth-dialog'));
    click('btn-dock-market', () => this.open('market-dialog'));

    document.querySelector('.travel-dock')?.addEventListener('click', e => {
      const b = e.target.closest('[data-travel]');
      if (b && !b.disabled) actions.travel(b.dataset.travel);
    });

    click('menu-button', () => this.open('menu-dialog'));
    click('resume-button', () => document.getElementById('menu-dialog').close());
    click('navigate-button', () => actions.navigate());
    click('view-button', () => {
      const overview = actions.toggleView();
      document.getElementById('view-button').textContent = overview ? 'SEGUIR GERENTE' : 'VISÃO GERAL';
    });
    click('quality-button', () => {
      const low = actions.toggleQuality();
      document.getElementById('quality-button').textContent = `MODO ECONÔMICO: ${low ? 'SIM' : 'NÃO'}`;
    });
    click('sound-button', () => {
      this.soundEnabled = !this.soundEnabled;
      document.getElementById('sound-button').textContent = `SOM: ${this.soundEnabled ? 'LIGADO' : 'DESLIGADO'}`;
      if (this.soundEnabled) this.play('cash');
    });
    click('export-button', () => actions.export());
    click('import-button', () => document.getElementById('import-file').click());
    click('reset-button', () => {
      if (confirm('Apagar o progresso local e começar de novo? Exporte um backup antes de confirmar.')) actions.reset();
    });

    // Troca de Perfil
    click('profile-switch-btn', () => actions.switchProfile());

    // Ações da Liga
    click('btn-play-round', () => actions.playRound());
    click('btn-next-season', () => actions.nextSeason());

    // Ações de Base e Mercado
    click('btn-scout-youth', () => actions.scoutYouth());
    click('btn-refresh-market', () => actions.refreshMarket());

    // Táticas
    this.nodes['tactic-formation']?.addEventListener('change', e => actions.changeFormation(e.target.value));
    this.nodes['tactic-posture']?.addEventListener('change', e => actions.changePosture(e.target.value));

    // Ações dentro do grid de elenco (Treinar, Capitão, Substituir)
    const handleRosterClick = e => {
      const trainBtn = e.target.closest('[data-train-id]');
      if (trainBtn) { actions.trainPlayer(trainBtn.dataset.trainId); return; }
      const capBtn = e.target.closest('[data-captain-id]');
      if (capBtn) { actions.setCaptain(capBtn.dataset.captainId); return; }
      const subBtn = e.target.closest('[data-sub-id]');
      if (subBtn) { actions.swapPlayers(subBtn.dataset.subId); return; }
    };
    this.nodes['starters-grid']?.addEventListener('click', handleRosterClick);
    this.nodes['reserves-grid']?.addEventListener('click', handleRosterClick);

    // Ações da Base (Promover, Vender)
    this.nodes['youth-prospects-list']?.addEventListener('click', e => {
      const promBtn = e.target.closest('[data-promote-youth]');
      if (promBtn) { actions.promoteYouth(promBtn.dataset.promoteYouth); return; }
      const sellBtn = e.target.closest('[data-sell-youth]');
      if (sellBtn) { actions.sellYouth(sellBtn.dataset.sellYouth); return; }
    });

    // Ações do Mercado (Contratar)
    this.nodes['market-players-list']?.addEventListener('click', e => {
      const hireBtn = e.target.closest('[data-hire-market]');
      if (hireBtn) { actions.hireMarket(hireBtn.dataset.hireMarket); return; }
    });

    document.getElementById('import-file')?.addEventListener('change', async e => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (!file) return;
      if (file.size > CFG.maxSaveBytes) { this.toast('Arquivo grande demais. Limite: 180 KB.', 8); return; }
      if (!confirm('Substituir a sessão atual pelo save selecionado?')) return;
      try { await actions.import(await file.text()); } catch (error) { this.toast(error instanceof Error ? error.message : 'Não foi possível ler o save.', 8); }
    });

    for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());
    for (const dialog of this.dialogs) {
      dialog.addEventListener('close', () => actions.onPauseChange());
      dialog.addEventListener('cancel', e => { if (dialog.id === 'welcome-dialog') { e.preventDefault(); return; } actions.onPauseChange(); });
    }

    document.getElementById('upgrade-grid').innerHTML = UPGRADE_DEFS.map(d => `<article class="upgrade-card"><div class="upgrade-icon" aria-hidden="true">${d.icon}</div><h3>${d.name}<span class="upgrade-level" id="level-${d.id}"></span></h3><p>${d.desc}</p><button id="buy-${d.id}" data-upgrade="${d.id}"></button></article>`).join('');
    document.getElementById('upgrade-grid').addEventListener('click', e => { const button = e.target.closest('[data-upgrade]'); if (button && !button.disabled) actions.purchase(button.dataset.upgrade); });
  }

  get paused() { return this.dialogs.some(d => d.open); }
  open(id) { for (const d of this.dialogs) if (d.open) d.close(); document.getElementById(id).showModal(); this.actions.onPauseChange(); }
  toast(message, seconds = 4) { const node = document.getElementById('toast'); node.textContent = message; node.hidden = false; this.toastUntil = performance.now() + seconds * 1000; }

  update(s) {
    document.getElementById('travel-field2').disabled = !s.fields[1].unlocked;
    this.nodes.wallet.textContent = formatNumber(s.wallet);
    this.nodes.carry.textContent = `${s.player.carry}/${carryCapacity(s)}`;
    this.nodes.cash.textContent = formatNumber(s.cashDesk);
    this.nodes.matches.textContent = formatNumber(s.stats.matches);
    document.getElementById('shop-wallet').textContent = formatNumber(s.wallet);

    // Divisão e força no cabeçalho
    const div = getDivision(s.season?.divisionIndex || 0);
    const strength = calculateTeamStrength(s.roster, s.tactics?.formation, s.tactics?.posture, s.tactics?.captainId, s.facilities?.coaching || 0);
    if (this.nodes['header-div-badge']) this.nodes['header-div-badge'].textContent = div.badge;
    if (this.nodes['header-div-name']) this.nodes['header-div-name'].textContent = div.name.toUpperCase();
    if (this.nodes['header-team-strength']) this.nodes['header-team-strength'].textContent = `FORÇA ${strength}`;

    // Perfil ativo
    const prof = getProfileConfig();
    if (this.nodes['active-profile-name']) this.nodes['active-profile-name'].textContent = `${prof.name} (${prof.desc})`;

    // Missões
    const mission = currentMission(s), index = mission ? MISSIONS.indexOf(mission) : MISSIONS.length;
    this.nodes['mission-title'].textContent = mission?.title || 'O bairro ganhou uma arena!';
    this.nodes['mission-text'].textContent = mission?.text || 'Sua equipe cuida da operação. Melhore as arquibancadas e continue fazendo a arena crescer.';
    this.nodes['mission-count'].textContent = `${Math.min(index + 1, MISSIONS.length)}/${MISSIONS.length}`;
    this.nodes['mission-progress'].style.width = `${mission ? Math.min(100, missionValue(s, mission.key) / mission.target * 100) : 100}%`;
    this.nodes['navigate-button'].disabled = !mission?.zone;

    for (const def of UPGRADE_DEFS) {
      const cost = upgradeCost(s, def.id), level = upgradeLevel(s, def.id), button = document.getElementById(`buy-${def.id}`);
      document.getElementById(`level-${def.id}`).textContent = def.max > 1 ? ` ${level}/${def.max}` : '';
      button.disabled = cost === null || s.wallet < cost;
      button.textContent = cost === null ? 'CONCLUÍDO' : `${formatNumber(cost)} MOEDAS${s.wallet < cost ? ' · FALTAM ' + formatNumber(cost - s.wallet) : ' · COMPRAR'}`;
    }

    if (this.lastMission !== null && index > this.lastMission) this.toast('Etapa concluída. Vamos para a próxima!', 3);
    this.lastMission = index;
    if (performance.now() > this.toastUntil) document.getElementById('toast').hidden = true;

    // Atualização de diálogos ativos
    if (document.getElementById('team-dialog')?.open) this.renderTeam(s, strength);
    if (document.getElementById('league-dialog')?.open) this.renderLeague(s, div);
    if (document.getElementById('youth-dialog')?.open) this.renderYouth(s);
    if (document.getElementById('market-dialog')?.open) this.renderMarket(s);
  }

  renderTeam(s, strength) {
    if (this.nodes['team-strength-val']) this.nodes['team-strength-val'].textContent = strength;
    if (this.nodes['tactic-formation']) this.nodes['tactic-formation'].value = s.tactics.formation;
    if (this.nodes['tactic-posture']) this.nodes['tactic-posture'].value = s.tactics.posture;

    const captain = s.roster.find(j => j.id === s.tactics.captainId);
    if (this.nodes['team-captain-name']) this.nodes['team-captain-name'].textContent = captain ? `${captain.name} (+cap)` : 'Nenhum';

    const starters = getStarters(s.roster);
    const reserves = getReserves(s.roster);

    const renderCard = (p, isStarter) => {
      const cost = calculateTrainingCost(p);
      const isCap = s.tactics.captainId === p.id;
      const canTrain = p.overall < p.potential && s.wallet >= cost;
      return `
        <div class="player-card ${isCap ? 'is-captain' : ''}">
          <div class="player-card-header">
            <span class="badge-pos pos-${p.pos}">${p.pos}</span>
            <small style="font-weight:700;">${p.age} anos</small>
          </div>
          <h4 class="player-name">${p.name} ${isCap ? '👑' : ''}</h4>
          <div class="player-stats">
            <span>FORÇA: <strong>${p.overall}</strong></span>
            <span>POTENCIAL: <strong>${p.potential}</strong></span>
          </div>
          <div class="player-actions">
            <button class="btn-train" data-train-id="${p.id}" ${canTrain ? '' : 'disabled'}>
              ${p.overall >= p.potential ? 'MAX' : `TREINAR (${cost}m)`}
            </button>
            ${isStarter ? `
              <button class="btn-cap" data-captain-id="${p.id}">${isCap ? 'CAPITÃO' : 'DAR FAIXA'}</button>
            ` : `
              <button class="btn-sub" data-sub-id="${p.id}">ESCALAR ⇄</button>
            `}
          </div>
        </div>
      `;
    };

    if (this.nodes['starters-grid']) this.nodes['starters-grid'].innerHTML = starters.map(p => renderCard(p, true)).join('');
    if (this.nodes['reserves-grid']) this.nodes['reserves-grid'].innerHTML = reserves.length ? reserves.map(p => renderCard(p, false)).join('') : '<p style="color:#667b66;font-size:12px;">Nenhum reserva no momento. Contrate no Mercado ou promova da Base!</p>';
  }

  renderLeague(s, div) {
    if (this.nodes['league-title']) this.nodes['league-title'].textContent = `${div.name} ${div.badge}`;
    if (this.nodes['league-round-info']) this.nodes['league-round-info'].textContent = `Rodada ${s.season.currentRound} de ${s.season.totalRounds}`;

    const btnPlay = document.getElementById('btn-play-round');
    const btnNext = document.getElementById('btn-next-season');
    if (s.season.finished) {
      if (btnPlay) btnPlay.style.display = 'none';
      if (btnNext) {
        btnNext.style.display = 'block';
        btnNext.textContent = `FINALIZAR TEMPORADA E AVANÇAR 🏆`;
      }
    } else {
      if (btnPlay) {
        btnPlay.style.display = 'block';
        btnPlay.textContent = `JOGAR RODADA ${s.season.currentRound} →`;
      }
      if (btnNext) btnNext.style.display = 'none';
    }

    // Próximo confronto
    const currentRoundObj = s.season.rounds.find(r => r.roundNumber === s.season.currentRound);
    if (currentRoundObj) {
      const pMatch = currentRoundObj.matches.find(m => m.homeId === 'player' || m.awayId === 'player');
      if (pMatch) {
        const home = s.season.clubs.find(c => c.id === pMatch.homeId)?.name || 'Mandante';
        const away = s.season.clubs.find(c => c.id === pMatch.awayId)?.name || 'Visitante';
        if (this.nodes['league-next-match']) this.nodes['league-next-match'].textContent = `${home} vs ${away}`;
      }
    }

    // Tabela
    const sorted = sortTable(s.season.clubs);
    if (this.nodes['league-table-body']) {
      this.nodes['league-table-body'].innerHTML = sorted.map((c, i) => {
        const isG2 = i < 2;
        const isZ2 = i >= sorted.length - 2;
        const cls = [c.isPlayer ? 'is-player' : '', isG2 ? 'g2' : '', isZ2 ? 'z2' : ''].filter(Boolean).join(' ');
        return `
          <tr class="${cls}">
            <td><b>${i + 1}º</b></td>
            <td>${c.name} (${c.sigla})</td>
            <td>${c.played}</td>
            <td>${c.won}</td>
            <td>${c.drawn}</td>
            <td>${c.lost}</td>
            <td>${c.goalDiff > 0 ? '+' + c.goalDiff : c.goalDiff}</td>
            <td><b>${c.points}</b></td>
          </tr>
        `;
      }).join('');
    }
  }

  renderYouth(s) {
    if (this.nodes['youth-facility-lvl']) this.nodes['youth-facility-lvl'].textContent = `Nível ${s.facilities.youth || 0}`;
    const cost = 80 + (s.facilities.youth || 0) * 40;
    const scoutBtn = document.getElementById('btn-scout-youth');
    if (scoutBtn) {
      scoutBtn.textContent = `ORGANIZAR PENEIRA (${cost} Moedas)`;
      scoutBtn.disabled = s.wallet < cost || s.youthList.length >= 6;
    }

    if (this.nodes['youth-prospects-list']) {
      if (!s.youthList.length) {
        this.nodes['youth-prospects-list'].innerHTML = '<p style="color:#667b66;font-size:12px;">Nenhuma promessa sendo observada. Clique em Organizar Peneira para descobrir novos talentos locais!</p>';
      } else {
        this.nodes['youth-prospects-list'].innerHTML = s.youthList.map(y => `
          <div class="youth-card">
            <div class="player-card-header">
              <span class="badge-pos pos-${y.pos}">${y.pos}</span>
              <small style="font-weight:700;">${y.age} anos</small>
            </div>
            <h4 class="player-name">${y.name}</h4>
            <div class="player-stats">
              <span>FORÇA: <strong>${y.overall}</strong></span>
              <span>POTENCIAL: <strong>${y.potential}</strong></span>
            </div>
            <div class="player-actions">
              <button class="btn-train" data-promote-youth="${y.id}">PROMOVER AO ELENCO</button>
              <button class="btn-cap" data-sell-youth="${y.id}">VENDER (+${y.marketValue || 100}m)</button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  renderMarket(s) {
    if (this.nodes['market-wallet-val']) this.nodes['market-wallet-val'].textContent = formatNumber(s.wallet);

    if (this.nodes['market-players-list']) {
      if (!s.market || !s.market.length) {
        this.nodes['market-players-list'].innerHTML = '<p style="color:#667b66;font-size:12px;">Lista de transferências vazia. Clique em Renovar Lista para buscar novos atletas!</p>';
      } else {
        this.nodes['market-players-list'].innerHTML = s.market.map(m => `
          <div class="market-card">
            <div class="player-card-header">
              <span class="badge-pos pos-${m.pos}">${m.pos}</span>
              <small style="font-weight:700;">${m.age} anos</small>
            </div>
            <h4 class="player-name">${m.name}</h4>
            <div class="player-stats">
              <span>FORÇA: <strong>${m.overall}</strong></span>
              <span>POTENCIAL: <strong>${m.potential}</strong></span>
            </div>
            <div class="player-actions">
              <button class="btn-train" data-hire-market="${m.id}" ${s.wallet < m.cost ? 'disabled' : ''}>
                CONTRATAR (${formatNumber(m.cost)} MOEDAS)
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  saveStatus(ok, text = '') { const node = this.nodes['save-status']; node.textContent = text || (ok ? 'SALVO NESTE NAVEGADOR' : 'SAVE INDISPONÍVEL · EXPORTE BACKUP'); node.classList.toggle('saved-warn', !ok); }
  play(type) {
    if (!this.soundEnabled || !['cash', 'purchase', 'goal', 'start', 'hire', 'training', 'promotion'].includes(type)) return;
    try {
      this.audio ??= new AudioContext(); if (this.audio.state === 'suspended') void this.audio.resume();
      const osc = this.audio.createOscillator(), gain = this.audio.createGain(), now = this.audio.currentTime;
      const base = { cash: 700, purchase: 980, goal: 540, start: 850, hire: 880, training: 740, promotion: 920 }[type] || 700;
      osc.type = 'sine'; osc.frequency.setValueAtTime(base, now); osc.frequency.exponentialRampToValueAtTime(base * 1.4, now + .12);
      gain.gain.setValueAtTime(.045, now); gain.gain.exponentialRampToValueAtTime(.001, now + .2); osc.connect(gain); gain.connect(this.audio.destination); osc.start(now); osc.stop(now + .21);
    } catch { this.soundEnabled = false; this.toast('Áudio indisponível neste navegador.'); }
  }
}

