// Le crédit. Une ville qui ne peut pas nourrir ses gens emprunte à sa faction ;
// la dette porte intérêt au taux directeur du créancier ; et quand l'intérêt
// dépasse ce que la ville peut rembourser, elle est insolvable.
//
// Ce module existe parce que le circuit fermé, seul, condamne les villes
// pauvres. Mesuré au lot A : la population tombait à deux tiers du témoin, non
// pas faute de récolte — le monde produit 12 % de plus qu'il ne consomme — mais
// faute de quoi la payer. Une ville en mauvaise passe n'a aucun moyen de
// traverser la mauvaise passe. Le crédit est ce moyen.
//
// Deux choses qu'on prend soin de ne pas confondre, et les confondre était
// l'erreur de la première conception :
//
//   l'insolvabilité est un ÉTAT, et il se calcule ;
//   le défaut est une DÉCISION, et c'est celle du créancier.
//
// D'où l'absence, ici, de tout plafond d'endettement et de toute durée avant
// chute. Ce qui borne un prêt, c'est le trésor du prêteur — qui est fini — et
// son intérêt — qui est calculable. Un plafond en crédits par habitant serait un
// décret : voir le principe de réglage en tête de METHODE.md.

import { COMMODITIES, COMMODITY_KEYS } from './data.js';
import { loisDe } from './lois.js';
import { transferer, convertirMasse, taux } from './monnaie.js';
import {
  cibleStock, reserveVille, prixUnitaire, productionColonie,
} from './economy.js';
import { FACTIONS } from './data.js';

/**
 * Les réglages du crédit. Tous décrivent un prix ou une durée ; aucun ne
 * décrète un interdit. Calibrés au banc — voir le tableau du lot B6 dans
 * CHANTIER.md.
 */
export const CREDIT = {
  /** Combien d'heures de vivres une ville cherche à se garantir en empruntant. */
  heuresCouvertes: 240,
  /** En dessous de ce ratio rations/population, la ville demande de l'aide. */
  seuilDetresse: 0.9,
  /** Ce qu'un défaut ajoute de grogne. */
  grogneDefaut: 0.25,
  /**
   * Ce qu'une faction accepte de risquer sur une seule ville, en part de son
   * trésor. Ce n'est pas un plafond d'endettement — c'est de la prudence de
   * prêteur, et elle suit la fortune du prêteur au lieu d'être un chiffre.
   */
  partDuTresor: 0.01,
  /**
   * La part de son excédent qu'une ville accepte de consacrer au service d'une
   * dette nouvelle. Au-delà, l'ouvrage attendra des jours meilleurs.
   */
  partServiceDette: 0.25,
};

/** Ce que la ville doit d'intérêt par heure, au taux de son créancier. */
export function interetHoraire(world, col) {
  if (!col.dette || !col.creancier) return 0;
  // Le taux est « par séance de conseil », soit environ soixante heures.
  return col.dette * loisDe(world, col.creancier).directeur / 60;
}

/**
 * Ce qu'une ville dégage pour rembourser : ce qui dépasse son fonds de
 * roulement. En dessous, elle a besoin de tout ce qu'elle a pour commercer.
 */
export function capaciteRemboursement(world, col) {
  if (!col.faction) return 0;
  return Math.max(0, (col.caisse || 0) - reserveVille(col, loisDe(world, col.faction).impot));
}

/**
 * Insolvable : l'intérêt court plus vite que ce qu'on peut rendre. C'est de
 * l'arithmétique, pas un seuil qu'on décrète — chaque ville a le sien, et il
 * bouge avec elle. Une ville prospère porte une dette énorme sans broncher ; un
 * bourg pauvre est ruiné pour trois cents crédits.
 *
 * Et c'est là que le taux directeur mord : le monter rend littéralement ses
 * débiteurs insolvables.
 */
export function insolvable(world, col) {
  if (!col.dette) return false;
  return interetHoraire(world, col) * 60 > capaciteRemboursement(world, col);
}

/** Ce qu'il manque à une ville pour tenir, en crédits. Zéro si elle tient. */
export function detresse(world, col) {
  const parTete = (col.stock.rations || 0) / Math.max(1, col.pop);
  if (parTete >= CREDIT.seuilDetresse) return 0;
  const manque = (CREDIT.seuilDetresse - parTete) * col.pop;
  // Au prix qu'elle paierait, pas au prix du catalogue : c'est ce qu'il lui
  // faut réellement en poche.
  return manque * prixUnitaire(col, 'rations', undefined, world);
}

/**
 * Le conseil se penche sur ses villes en difficulté.
 *
 * Trois issues par ville, et ce sont trois décisions, pas trois règles :
 * prêter, laisser courir, ou laisser tomber. Une faction rechigne à laisser
 * défaillir sa propre ville — un défaut, c'est la révolte — donc elle jette de
 * l'argent par la fenêtre tant qu'elle peut, et son trésor s'en ressent. C'est
 * ce qui la rend abattable.
 */
export function tickCredit(world, key, colonies, heures, log) {
  const f = world.factions[key];
  if (!f) return;

  for (const col of colonies) {
    if (col.avantPoste) continue;

    // 1. L'intérêt court.
    if (col.dette > 0 && col.creancier) {
      const du = interetHoraire(world, col) * heures;
      col.dette += du;
      const c = world.factions[col.creancier];
      // L'intérêt est une créance de plus, pas de l'argent qui apparaît : le
      // créancier ne l'encaisse qu'au remboursement. Le noter ici le
      // créditerait deux fois.
      if (!c) col.creancier = key;
    }

    // 2. Le remboursement, prioritaire sur tout le reste.
    if (col.dette > 0) {
      const peut = Math.min(col.dette, capaciteRemboursement(world, col));
      if (peut > 0) {
        col.caisse -= peut;
        col.dette -= peut;
        const c = world.factions[col.creancier];
        if (c) {
          // Un créancier étranger encaisse dans sa monnaie : on rembourse au
          // cours du jour. Verser le même nombre d'unités des deux côtés
          // fabriquait de l'argent à chaque échéance.
          const recu = col.creancier === col.faction
            ? peut : peut * taux(world, col.faction, col.creancier);
          c.tresor += recu;
          convertirMasse(world, col.faction, col.creancier, peut, recu);
        }
        if (col.dette < 0.5) { col.dette = 0; col.creancier = null; col.cession = null; }
      }
    }

    // 3. Le prêt, si la ville est en détresse et qu'on veut bien.
    const besoin = detresse(world, col);
    if (besoin > 0) {
      const prudence = Math.max(0, f.tresor * CREDIT.partDuTresor - (col.dette || 0));
      const pret = Math.min(besoin, f.tresor, prudence);
      if (pret > 1) {
        f.tresor -= pret;
        // Chez les gens, et non dans la caisse de la ville. C'est la nuance qui
        // décide de tout : une ville affamée a de la marchandise, ce sont ses
        // habitants qui n'ont pas de quoi l'acheter. Prêter à la caisse
        // permettait d'importer du grain qui restait sur l'étal. Nourrir son
        // peuple, c'est lui donner de quoi manger — soupe populaire, travaux de
        // secours, peu importe le nom : l'argent va dans les poches, et il
        // revient à la ville dès la première course.
        col.menages = (col.menages || 0) + pret;
        col.dette = (col.dette || 0) + pret;
        if (!col.creancier) col.creancier = key;
      } else if ((col.dette || 0) > 0 && insolvable(world, col)) {
        // 4. On ne prête plus, et elle ne s'en sortira pas. Ce qui arrive alors
        // dépend de qui la tenait — et c'est la seule différence entre une
        // faillite et une conquête par l'argent.
        const perdu = col.dette;
        const porteur = col.creancier;
        const etranger = porteur && porteur !== key ? porteur : null;
        col.dette = 0;
        col.creancier = null;
        if (etranger) saisir(world, col, key, etranger, log);
        else {
          col.unrest = Math.min(1, col.unrest + CREDIT.grogneDefaut);
          if (log) {
            log({
              type: 'faillite',
              texte: `${col.nom} fait défaut : ${Math.round(perdu)} crédits partis en fumée, `
                + `et ${FACTIONS[key].nom} ${FACTIONS[key].pluriel ? 'n’en verront' : 'n’en verra'} `
                + `jamais la couleur. La ville gronde.`,
              regionId: col.regionId,
              factions: [key],
              important: true,
            });
          }
        }
        col.cession = null;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Le rachat de créance, et la conquête par l'argent
// ---------------------------------------------------------------------------

/**
 * Ce qu'une ville vaut à celui qui la tient, par conseil.
 *
 * Négative, c'est une charge — et son propriétaire a intérêt à s'en défaire.
 * C'est ce qui retourne le mécanisme : la conquête par la dette n'est pas
 * toujours une agression, c'est parfois un service qu'on rend à un pays trop
 * grand pour ses marges. Le frein de surextension nourrit directement ce
 * calcul, puisqu'une ville loin de sa capitale coûte plus cher à tenir.
 */
export function valeurNette(world, col, faction) {
  if (!col || !faction) return 0;
  const impot = loisDe(world, faction).impot;
  // Ce qu'elle rapporte : l'impôt sur ce qu'elle produit, plus l'intérêt de sa
  // dette si on la porte. La première version prenait sa capacité de
  // remboursement pour mesure de son rendement — mais une ville dont la caisse
  // est sous son fonds de roulement a une capacité nulle, si bien que toutes
  // les villes du monde passaient pour des boulets et que le prix de leur
  // créance restait collé à son plancher.
  let production = 0;
  const p = productionColonie(world, col);
  for (const k of COMMODITY_KEYS) production += (p[k] || 0) * COMMODITIES[k].prix;
  const rapporte = production * impot * 60
    + (col.creancier === faction ? interetHoraire(world, col) * 60 : 0);
  const coute = (col.defense * ETAT_PAR_DEFENSE + col.murs * ETAT_PAR_MUR) * 60
    + (col.creancier === faction ? detresse(world, col) * 0.25 : 0);
  return rapporte - coute;
}

// Les deux coûts d'entretien, recopiés ici plutôt qu'importés de factions.js :
// ce module est lu par factions.js, et le bundler refuse les cycles. Ils sont
// du même ordre de grandeur que ETAT, et servent à *juger* une ville, pas à la
// facturer — l'écart éventuel ne change rien à ce qu'on encaisse.
const ETAT_PAR_DEFENSE = 0.002;
const ETAT_PAR_MUR = 0.05;

/**
 * Ce que le porteur d'une créance demande pour la céder.
 *
 * Le prix n'est pas une constante, c'est sa décision — et c'est le principe de
 * réglage appliqué à la lettre : on ne bride pas la conquête par l'argent avec
 * un multiple choisi à la main, on la bride par quelqu'un qui a ses raisons.
 *
 * Trois issues, et elles sortent toutes de l'état du monde :
 *   — une faction en paix, à l'aise, dont la ville rapporte : elle refuse ;
 *   — une faction à sec, ou qu'une ville encombre : elle brade ;
 *   — un ennemi qui demande : il paie plein tarif, ou se voit éconduire.
 */
export function prixCession(world, col, acheteur) {
  const porteur = col.creancier;
  if (!porteur || !col.dette || porteur === acheteur) return null;
  const f = world.factions[porteur];
  if (!f) return null;

  const valeur = valeurNette(world, col, porteur);
  // Normalisée par la dette : on compare ce que la ville rapporte à ce qu'elle
  // doit, ce qui met les deux dans la même unité.
  // Les trois termes sont bornés à l'unité chacun : sans ça, un seul d'entre eux
  // — le rendement, qui peut valoir des milliers — écrase les deux autres et la
  // prime reste collée à une borne quelle que soit la situation.
  const rendement = Math.max(-1, Math.min(1, valeur / Math.max(1, col.dette)));
  const besoinLiquide = f.tresor < col.dette ? 1 : Math.max(0, 1 - f.tresor / (col.dette * 20));
  const hostilite = Math.max(0, -(f.relations[acheteur] ?? 0)) / 100;

  let prime = 1 + rendement * 1.5 - besoinLiquide * 0.5 + hostilite * 1.5;
  // Une faction en paix, à l'aise, dont la ville rapporte, ne vend pas du tout.
  if (valeur > 0 && besoinLiquide < 0.2 && hostilite < 0.2) return null;
  prime = Math.max(CESSION.primeMin, Math.min(CESSION.primeMax, prime));
  return Math.round(col.dette * prime);
}

export const CESSION = {
  /** On ne brade pas en dessous : même un boulet a coûté quelque chose. */
  primeMin: 0.4,
  /** Et au-delà, ce n'est plus un prix, c'est un refus déguisé. */
  primeMax: 4,
  /**
   * L'échelle de l'effet diplomatique, ramenée dans l'ordre de grandeur des
   * autres mouvements du jeu — une déclaration de guerre coûte soixante points.
   */
  echelleRancune: 45,
};

/**
 * Racheter la créance d'une ville. Rend `{ ok, prix }` ou un motif de refus.
 * On enregistre qui a vendu et combien il a touché : l'effet diplomatique ne
 * s'applique qu'à la reprise, quand l'ancien porteur voit à quoi son argent a
 * servi. Pas de reprise, pas de grief — racheter une créance peut être un
 * placement parfaitement honnête.
 */
export function racheterCreance(world, col, acheteur, t) {
  const prix = prixCession(world, col, acheteur);
  if (prix === null) return { ok: false, motif: 'Le porteur ne cède pas.' };
  const a = world.factions[acheteur];
  const porteur = col.creancier;
  if (!a || a.tresor < prix) {
    return { ok: false, motif: `Il faut ${prix} cr, il y en a ${Math.round(a ? a.tresor : 0)}.` };
  }
  // On paie dans sa monnaie, le porteur encaisse dans la sienne : c'est un
  // change, pas un virement. L'écrire comme un transfert à montant égal cassait
  // l'invariant de trois mille crédits par partie.
  a.tresor -= prix;
  const recu = prix * taux(world, acheteur, porteur);
  world.factions[porteur].tresor += recu;
  convertirMasse(world, acheteur, porteur, prix, recu);
  col.cession = { de: porteur, prix, quand: t };
  col.creancier = acheteur;
  return { ok: true, prix, porteur };
}

/**
 * Ce que la reprise d'une ville fait aux relations : `prix encaissé − valeur
 * perdue`. Une seule formule, deux signes, aucun cas particulier.
 *
 * Le signe positif n'est pas une bizarrerie. Celui qui traînait une ville à
 * charge s'en trouve soulagé *et* payé pour ça : il n'y a aucune raison
 * d'écrire « et pourtant sa relation ne bouge pas ». C'est ce qui ouvre le
 * profil de faction qu'aucune règle n'a eu à décrire — celle qui se fait bien
 * voir de toute la carte en absorbant les mauvaises villes de tout le monde.
 */
export function effetCession(world, col) {
  if (!col.cession) return 0;
  // La valeur perdue, sur l'horizon d'un an de conseils — c'est ce qu'on perd
  // vraiment en cédant une ville, contre ce qu'on en a tiré une fois.
  const perdue = valeurNette(world, col, col.cession.de) * 6;
  const total = Math.abs(perdue) + col.cession.prix;
  const brut = total > 1 ? (col.cession.prix - perdue) / total : 0;
  return Math.max(-1, Math.min(1, brut)) * CESSION.echelleRancune;
}

/**
 * Le créancier étranger saisit : la ville passe sous son drapeau.
 *
 * On prend la ville entière. Pas un habitant perdu, murs et défense intacts,
 * une grogne à +0,15 au lieu des +0,35 d'un assaut — prendre une ville debout
 * est précisément l'intérêt de l'acheter. Et la grogne peut même baisser si le
 * repreneur nourrit mieux que l'ancien pays : les gens se moquent de savoir sur
 * quel registre ils figurent.
 *
 * Côté relations, aucun chiffre écrit ici : c'est `effetCession` qui décide,
 * selon ce que la ville valait et ce que son porteur en a tiré. Deux versions
 * antérieures posaient des constantes — d'abord −45 et −10 à toute la carte,
 * puis −25 par symétrie avec la prise par les armes — et toutes deux faisaient
 * payer un contrat consenti plus cher qu'une guerre d'extermination.
 */
export function saisir(world, col, ancien, repreneur, log) {
  const effet = effetCession(world, col);
  const fa = world.factions[ancien];
  const fr = world.factions[repreneur];
  if (fa && fr) {
    const v = Math.max(-100, Math.min(100, (fa.relations[repreneur] ?? 0) + effet));
    fa.relations[repreneur] = v;
    fr.relations[ancien] = v;
    fa.colonies = fa.colonies.filter((id) => id !== col.id);
    if (fa.capitale === col.id) fa.capitale = fa.colonies[0] || null;
    if (!fr.colonies.includes(col.id)) fr.colonies.push(col.id);
    if (!fr.capitale) fr.capitale = col.id;
  }
  // Les comptes de la ville changent de monnaie avec elle, au cours du jour.
  const avoir = (col.caisse || 0) + (col.menages || 0);
  const converti = avoir * taux(world, ancien, repreneur);
  convertirMasse(world, ancien, repreneur, avoir, converti);
  if (avoir > 0) {
    const f2 = converti / avoir;
    col.caisse = (col.caisse || 0) * f2;
    col.menages = (col.menages || 0) * f2;
  }
  col.faction = repreneur;
  world.regions[col.regionId].controle = repreneur;
  col.unrest = Math.min(1, col.unrest + 0.15);
  if (log) {
    log({
      type: 'cession',
      texte: `${col.nom} passe ${FACTIONS[repreneur].datif} : `
        + `${FACTIONS[repreneur].nom} ${FACTIONS[repreneur].pluriel ? 'en détenaient' : 'en détenait'} `
        + `la dette, et personne n’a levé une colonne. `
        + `${FACTIONS[ancien].nom} ${effet < -5 ? 'ne l’oublieront pas' : 'y perd peu'}.`,
      regionId: col.regionId,
      factions: [ancien, repreneur],
      important: true,
    });
  }
}

/**
 * Emprunter pour bâtir, quand l'argent est bon marché.
 *
 * Comparaison, pas seuil : la ville emprunte si elle peut porter l'intérêt sans
 * s'étrangler — le service de la dette contre ce qu'elle dégage réellement au
 * delà de son fonds de roulement.
 *
 * Une première version comparait la valeur du mur à l'intérêt : on mettait en
 * face du loyer le stock que le mur protège, soit des milliers de crédits
 * contre quelques dizaines. La réponse était « oui » à tous les taux, ce qui
 * revenait à n'avoir pas de règle. Comparer un gain hypothétique à un coût
 * certain demande une probabilité d'assaut, qu'il aurait fallu inventer ;
 * comparer une charge à une capacité ne demande rien à personne.
 */
export function veutBatir(world, col) {
  if (!col.faction || col.avantPoste) return false;
  if (col.murs >= col.taille * 6) return false;
  const service = COUT_MUR * loisDe(world, col.faction).directeur;
  return service <= capaciteRemboursement(world, col) * CREDIT.partServiceDette;
}

/** Ce qu'un niveau de mur coûte à une ville qui se le paie elle-même. */
export const COUT_MUR = 400;
