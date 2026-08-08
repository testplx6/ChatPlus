// Ce que la partie a fait de vous.
//
// Le jeu n'a pas de condition de victoire, et il n'en aura pas : on ne gagne
// pas contre un désert. Mais il n'avait pas non plus de miroir — on jouait cent
// heures et rien ne disait ce qu'on était devenu. Or il le sait : il a compté
// les combats, les prisonniers vendus, les lois promulguées, les villes prises
// et les gens enterrés.
//
// La chronique n'est donc pas un score, c'est une lecture. Elle ne récompense
// rien et ne débloque rien. Elle dit : voilà ce que vous avez fait, et voilà
// comment on vous appellera.
//
// Un titre ne se choisit pas : il se mérite au sens le plus littéral — chaque
// titre a une condition tirée de l'état réel, et l'on porte le plus lourd de
// ceux qu'on a mérités. Le vagabond n'est pas un titre par défaut faute de
// mieux, c'est ce qu'on est quand on a traversé le monde sans y laisser de
// trace, et c'est très bien aussi.

import { FACTIONS, drapeauDe} from './data.js';
import { estVivant } from './characters.js';
import { rangDe, RANGS } from './allegeance.js';

/**
 * Les titres, du plus lourd au plus léger. On prend le premier dont la
 * condition est remplie — l'ordre est donc la hiérarchie, et elle est
 * discutable, ce qui est bien le propre d'une réputation.
 */
export const RENOMMEES = [
  {
    key: 'negrier',
    nom: 'Négrier',
    // On passe avant tout le reste, et ce n'est pas un hasard : c'est le genre
    // de chose qui définit quelqu'un aux yeux des autres, quoi qu'il ait fait
    // par ailleurs.
    dit: 'On vous a vu vendre des hommes. Le reste, on l’oubliera.',
    quand: (f) => f.captifsVendus >= 5,
  },
  {
    key: 'commandeur',
    nom: 'Commandeur',
    dit: 'Vous avez fixé la loi d’un pays et envoyé ses colonnes.',
    quand: (f) => f.grade >= 4 && f.prerogatives >= 5,
  },
  {
    key: 'fondateur',
    nom: 'Fondateur',
    dit: 'Il y a une ville sur les cartes qui n’y était pas avant vous.',
    quand: (f) => f.villeReconnue,
  },
  {
    key: 'seigneur',
    nom: 'Seigneur de guerre',
    dit: 'On compte vos batailles plus facilement que vos années.',
    // On regarde le meilleur bras de la colonne, pas la moyenne de la troupe.
    //
    // La moyenne était le blocage, pas les quarante victoires : elle est tirée
    // vers le bas par les recrues fraîches qui remplacent les vétérans morts, et
    // le banc la mesure entre 15 et 18 quelle que soit la façon de jouer — jamais
    // 25. Les meilleurs bretteurs, eux, montent à 37 ou 44. Un chef de guerre se
    // juge à son arme, pas à la moyenne de ses hommes.
    quand: (f) => f.combatsGagnes >= 40 && f.meilleurCombat >= 25,
  },
  {
    key: 'bienfaiteur',
    nom: 'Bienfaiteur',
    dit: 'Des gens vous doivent quelque chose, et s’en souviennent.',
    // Au-dessus du bâtisseur et de l'officier, et ce n'est pas de la morale :
    // c'est de la fréquence. Mesuré sur cent vingt parties, quatre façons de
    // jouer, un camp de douze habitants arrive dans deux parties sur cinq et un
    // grade d'officier dans une sur trois — les deux presque sans le vouloir.
    // Six personnes qui se souviennent de vous, une partie sur quatre pour qui
    // en fait son métier. Un titre qui se mérite ne doit pas être masqué par un
    // titre qui s'attrape.
    //
    // Le seuil était à douze, posé sans mesure — rien n'avait jamais joué cette
    // voie. Mesurée enfin, sur soixante parties d'un bot qui ne fait que ça :
    // médiane trois services, neuvième décile sept, record quatorze. Douze,
    // c'était une partie sur soixante ; six, c'est une sur quatre, ce qui est le
    // taux des autres titres pour qui les vise.
    quand: (f) => f.services >= 6,
  },
  {
    key: 'geolier',
    nom: 'Chasseur de primes',
    dit: 'Les geôles de la région se sont remplies de ce que vous y avez mis.',
    // Vingt-cinq, pas quinze, et sous le bienfaiteur.
    //
    // Livrer un brigand est ce que tout le monde fait de ses prisonniers faute
    // de mieux : à quinze, le titre tombait dans une partie sur quatre quelle
    // que soit la façon de jouer — il nommait une habitude, pas un choix, et il
    // masquait des titres qu'on avait cherchés. Vingt-cinq est le neuvième
    // décile de ce qui arrive tout seul.
    quand: (f) => f.captifsLivres >= 25,
  },
  {
    key: 'batisseur',
    nom: 'Bâtisseur',
    dit: 'Quelque part, des gens dorment sous un toit que vous avez monté.',
    quand: (f) => f.habitants >= 12 && f.batiments >= 10,
  },
  {
    key: 'officier',
    nom: 'Officier',
    dit: 'Vous avez porté des couleurs, et on vous a confié des routes.',
    quand: (f) => f.grade >= 2,
  },
  {
    key: 'marchand',
    nom: 'Maison marchande',
    dit: 'Vous avez fait fortune sans qu’on ait à vous craindre.',
    quand: (f) => f.credits >= 6000 && f.combatsGagnes < 25,
  },
  {
    key: 'ferrailleur',
    nom: 'Ferrailleur',
    dit: 'Vous avez retourné ce désert pour ce qu’il restait dedans.',
    quand: (f) => f.recolte >= 3000 || f.sites >= 12,
  },
  {
    key: 'vagabond',
    nom: 'Vagabond',
    dit: 'Vous avez traversé le monde sans y laisser de trace. C’est une façon '
      + 'd’y survivre.',
    quand: () => true,
  },
];

/** Les chiffres bruts que la chronique relit. Rien n'est inventé ici. */
export function faitsDe(state) {
  const st = state.stats || {};
  const groupes = state.player.groupes || [];
  let grade = 0;
  let faction = null;
  for (const g of groupes) {
    if (!g.allegeance) continue;
    const r = rangDe(g.allegeance);
    if (r.index > grade) { grade = r.index; faction = g.allegeance.faction; }
  }
  const vivants = groupes.reduce(
    (n, g) => n + g.membres.filter(estVivant).length, 0
  );
  let combat = 0;
  let compte = 0;
  let meilleurCombat = 0;
  for (const g of groupes) {
    for (const c of g.membres) {
      if (!estVivant(c)) continue;
      const arme = Math.max(c.skills.melee || 0, c.skills.tir || 0);
      combat += arme;
      if (arme > meilleurCombat) meilleurCombat = arme;
      compte++;
    }
  }
  const base = state.base || {};
  let batiments = 0;
  for (const k of Object.keys(base.batiments || {})) batiments += base.batiments[k];
  return {
    jours: Math.floor(state.temps / 24),
    vivants,
    morts: (state.memorial || []).length,
    combat: compte ? Math.round(combat / compte) : 0,
    meilleurCombat,
    combats: st.combats || 0,
    combatsGagnes: st.combatsGagnes || 0,
    defaites: st.defaites || 0,
    credits: Math.round(state.player.credits || 0),
    recolte: Math.round(st.recolte || 0),
    sites: st.sitesFouilles || 0,
    contrats: st.contratsRemplis || 0,
    services: st.servicesRendus || 0,
    ordres: st.ordresRemplis || 0,
    caravanes: st.caravanesPillees || 0,
    captifsPris: st.captifsPris || 0,
    captifsLivres: st.captifsLivres || 0,
    captifsVendus: st.captifsVendus || 0,
    captifsRelaches: st.captifsRelaches || 0,
    prerogatives: st.prerogatives || 0,
    lois: st.loisPromulguees || 0,
    grade,
    faction,
    habitants: Math.round(base.pop || 0),
    batiments,
    villeReconnue: !!base.colonieId,
    nomVille: base.colonieId ? base.nom : null,
  };
}

/** Le titre qu'on porte, et ce qu'on en dit. */
export function titreDe(state) {
  const f = faitsDe(state);
  for (const t of RENOMMEES) if (t.quand(f)) return { ...t, faits: f };
  return { ...RENOMMEES[RENOMMEES.length - 1], faits: f };
}

/**
 * Ce qu'on retiendra, en quelques lignes. On ne liste que ce qui est arrivé :
 * une chronique qui énumère des zéros ne raconte rien.
 */
export function lignesDe(state) {
  const f = faitsDe(state);
  const out = [];
  const dire = (cond, texte) => { if (cond) out.push(texte); };

  dire(true, `${f.jours} jours dans les cendres.`);
  dire(f.vivants > 0, `${f.vivants} des vôtres tiennent encore debout.`);
  dire(f.morts > 0, `${f.morts} sont restés en route.`);
  dire(f.combats > 0,
    `${f.combats} affrontements, ${f.combatsGagnes} gagnés, ${f.defaites} perdus.`);
  dire(f.captifsPris > 0, `${f.captifsPris} hommes pris vivants — `
    + `${f.captifsLivres} livrés à la justice, ${f.captifsVendus} vendus, `
    + `${f.captifsRelaches} relâchés.`);
  // Une faction peut avoir disparu de la table entre-temps — un monde qui vit
  // n'a pas à garantir qu'une clé lue ailleurs existe encore.
  dire(f.grade >= 1 && f.faction && drapeauDe(state.world, f.faction) && RANGS[f.grade],
    `${RANGS[f.grade] ? RANGS[f.grade].nom : ''} `
    + `${drapeauDe(state.world, f.faction) ? drapeauDe(state.world, f.faction).genitif : ''}.`);
  dire(f.prerogatives > 0,
    `${f.prerogatives} ordres donnés au nom d’une faction`
    + `${f.lois > 0 ? `, dont ${f.lois} lois promulguées` : ''}.`);
  dire(f.habitants > 0,
    `${f.habitants} personnes vivent à ${state.base.nom}`
    + `${f.villeReconnue ? ', qui est écrite sur les cartes' : ''}.`);
  dire(f.contrats > 0, `${f.contrats} contrats honorés.`);
  dire(f.services > 0, `${f.services} services rendus à des gens qui s’en souviennent.`);
  dire(f.caravanes > 0, `${f.caravanes} caravanes pillées.`);
  dire(f.sites > 0, `${f.sites} sites fouillés jusqu’à l’os.`);
  dire(f.credits >= 1000, `${f.credits} crédits en poche.`);
  return out;
}
