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

import { COMMODITIES } from './data.js';
import { loisDe } from './lois.js';
import { cibleStock, reserveVille, prixUnitaire } from './economy.js';
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
  return manque * prixUnitaire(col, 'rations');
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
        if (c) c.tresor += peut;
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
        // 4. On ne prête plus, et elle ne s'en sortira pas : on efface. La
        // monnaie disparaît avec la créance — un défaut est déflationniste, et
        // c'est correct.
        const perdu = col.dette;
        col.dette = 0;
        col.creancier = null;
        col.cession = null;
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
    }
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
