// La carte des leviers : quelle constante commande quelle métrique, et de
// combien.
//
// Ce fichier existe parce que trois calibrages du lot D ont échoué de la même
// façon — un levier choisi à l'intuition, balayé sur un ordre de grandeur, et
// un résultat parfaitement plat. `ETAT.parDefense` multiplié par dix laisse les
// factions écrasées à 1 sur 18 ; `CAISSE.partSalariale` de 0,05 à 0,98 laissait
// la population plafonnée à 27 000. Chaque fois : une hypothèse, un balayage,
// rien, et rien de capitalisé pour la fois d'après.
//
// Les fonctions ici sont pures et sans effet de bord : c'est `banc.js` qui joue
// les parties. Elles sont séparées et testées parce qu'un instrument de mesure
// qui se trompe fait tout mesurer faux — le banc a déjà rendu un tableau
// crédible avec une constante à NaN.

/** Un nom de constante : MAJUSCULES, chiffres et soulignés. */
const NOM_CONSTANTE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Recense les leviers d'un graphe de modules : `{ nomModule: exports }`.
 *
 * Un levier est un champ numérique direct d'un objet exporté en majuscules.
 * Trois refus, et chacun a sa raison :
 *
 * - **les objets imbriqués** (`COMMODITIES.rations.prix`, `BUILDINGS.*`) : la
 *   convention `module.OBJET.champ` du banc ne sait pas les atteindre. Les
 *   ignorer en silence serait mentir sur la couverture de la carte, alors ils
 *   sortent dans `ecartes` avec leur motif ;
 * - **les tableaux et les fonctions** : rien à multiplier ;
 * - **les champs à zéro** : ×0,7 et ×1,4 les laissent à zéro, la partie
 *   jouerait pour rien. Un zéro qui devrait être un levier se corrige à la
 *   main, en connaissance de cause.
 *
 * Rien à tenir à jour : la liste se déduit du code. Une liste qu'il faut penser
 * à compléter finit incomplète.
 */
export function recenser(modules, profondeurMax = 3) {
  const leviers = [];
  const ecartes = [];
  const descendre = (nomModule, objet, chemin, valeur) => {
    for (const [champ, v] of Object.entries(valeur)) {
      const sous = chemin.concat(champ);
      const ou = { module: nomModule, objet, champ: sous.slice(1).join('.'), chemin: sous };
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v === 0) ecartes.push({ ...ou, motif: 'à zéro — aucun facteur ne le déplace' });
        else leviers.push({ ...ou, valeur: v });
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (sous.length > profondeurMax) {
          ecartes.push({ ...ou, motif: `plus profond que ${profondeurMax} niveaux` });
        } else {
          descendre(nomModule, objet, sous, v);
        }
      } else {
        ecartes.push({ ...ou, motif: Array.isArray(v) ? 'un tableau' : 'pas un nombre' });
      }
    }
  };
  for (const [nomModule, exports] of Object.entries(modules)) {
    for (const [objet, valeur] of Object.entries(exports)) {
      if (!NOM_CONSTANTE.test(objet)) continue;
      if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) continue;
      descendre(nomModule, objet, [objet], valeur);
    }
  }
  return { leviers, ecartes };
}

/**
 * De combien de pour cent bouge la métrique pour un pour cent de levier.
 *
 * C'est la seule forme comparable d'un levier à l'autre : une différence brute
 * mélange des habitants avec des guerres, et une constante qui vaut 0,002 avec
 * une qui vaut 720. Rendu `null` quand la référence est nulle — on ne divise
 * pas par zéro, et l'appelant montre alors l'écart absolu.
 */
export function elasticite(reference, variante, dLevier) {
  if (!(Math.abs(reference) > 1e-12) || !(Math.abs(dLevier) > 1e-12)) return null;
  return ((variante - reference) / reference) / dLevier;
}

/**
 * Le plancher de bruit, métrique par métrique.
 *
 * Le moteur est déterministe : à réglage égal, deux parties de même graine sont
 * identiques au bit près. Mais multiplier une constante par 1,0001 ne change
 * rien d'économique et décale pourtant les tirages ; six mille heures plus tard
 * le monde a divergé. C'est du chaos, pas un effet, et une carte qui confond
 * les deux ferait exactement le mal qu'elle est censée réparer.
 *
 * Le placebo mesure ce chaos-là : même champ, même chemin de code, variation
 * mille fois trop petite pour signifier quoi que ce soit. On garde le pire
 * écart relevé sur chaque métrique. Tout ce qui reste dessous est déclaré nul.
 *
 * Le plancher varie énormément d'une métrique à l'autre, et c'est le résultat
 * le plus utile de l'affaire : la population est stable, les factions écrasées
 * se comptent sur les doigts d'une main et sautent au moindre souffle.
 */
export function planchers(placebos) {
  const sol = {};
  for (const p of placebos) {
    for (const [cle, ecart] of Object.entries(p)) {
      const a = Math.abs(ecart);
      if (!(sol[cle] >= a)) sol[cle] = a;
    }
  }
  return sol;
}

/** Au-dessus du plancher, ou rien. Un effet sous son plancher n'est pas petit. */
export function significatif(ecart, plancher) {
  return Math.abs(ecart) > (plancher || 0);
}

/**
 * Un levier qui ne pousse que dans un sens.
 *
 * « Une règle qui ne peut aller que dans un sens est probablement à moitié
 * écrite » — METHODE §5. Le cas se voit quand un côté déplace dix fois moins
 * que l'autre : borne atteinte, plancher dur, condition qui ne se déclenche que
 * vers le haut. La carte le signale, elle ne le juge pas.
 */
export function asymetrique({ bas, haut }) {
  const a = Math.abs(bas || 0);
  const b = Math.abs(haut || 0);
  const grand = Math.max(a, b);
  const petit = Math.min(a, b);
  return grand > 0 && petit < grand / 5;
}

/**
 * Les métriques cartographiées. Tirées d'une partie de `jouer()`, réduites à un
 * nombre par partie — une carte a besoin de scalaires comparables.
 *
 * La vitesse n'y est pas : elle dépend de la charge de la machine, pas du
 * monde, et la faire entrer ici mettrait du bruit d'ordinateur dans une carte
 * de règles de jeu. Elle se mesure ailleurs, au calme, avec ses deux gardes.
 */
export const METRIQUES = [
  ['pop', 'population'],
  ['villes', 'villes debout'],
  ['nourries', 'villes nourries'],
  ['affamees', 'villes affamées'],
  ['ecrasees', 'factions écrasées'],
  ['guerres', 'guerres'],
  ['convois', 'convois'],
  ['accords', 'accords'],
  ['bourses', 'bourses'],
  ['endettees', 'villes endettées'],
  ['dette', 'dette totale'],
  ['creances', 'villes cédées'],
  ['argent', 'masse monétaire'],
  ['enMenages', 'argent des ménages'],
  ['enTresors', 'argent des trésors'],
];

/** Un nombre par métrique et par partie, dont deux qui se dérivent. */
export function releve(partie) {
  const r = {};
  for (const [cle] of METRIQUES) r[cle] = partie[cle];
  r.argent = partie.enCaisses + partie.enMenages + partie.enTresors;
  return r;
}

/** La moyenne d'une métrique sur les graines d'une configuration. */
export function moyenne(parties, cle) {
  if (!parties.length) return 0;
  return parties.reduce((s, p) => s + releve(p)[cle], 0) / parties.length;
}

/**
 * Toutes les moyennes d'une configuration, en un objet.
 *
 * C'est ce qu'on écrit au journal de reprise : une campagne de mille neuf cents
 * configurations dure des heures, et une machine qui s'endort emportait tout.
 * Garder les parties entières ferait un fichier de plusieurs dizaines de
 * mégaoctets pour rien — les moyennes suffisent à tout ce qui suit.
 */
export function moyennes(parties) {
  const m = {};
  for (const [cle] of METRIQUES) m[cle] = moyenne(parties, cle);
  return m;
}

/** L'écart entre deux jeux de moyennes. Voir `ecarts` pour la règle du signe. */
export function ecartsDe(reference, variante) {
  const e = {};
  for (const [cle] of METRIQUES) {
    const r = reference[cle] || 0;
    e[cle] = ((variante[cle] || 0) - r) / Math.max(Math.abs(r), 1);
  }
  return e;
}

/**
 * L'écart d'une configuration à la référence, métrique par métrique.
 * Les graines sont les mêmes des deux côtés : la comparaison est appariée, ce
 * qui retire d'un coup toute la variabilité du tirage du monde.
 *
 * Relatif au-dessus de l'unité, absolu en dessous. « Factions écrasées » vaut
 * une pour six parties, parfois zéro : divisé par sa référence, l'écart part à
 * l'infini, le plancher part avec, et plus rien n'est jamais significatif. La
 * métrique s'éteint alors sans rien dire — et une métrique muette se lit comme
 * un monde sans levier, ce qui est le contraire de ce qu'on mesure. Sous
 * l'unité, un comptage se compare donc en unités, comme on le lirait à voix
 * haute : « une faction écrasée de plus ».
 */
export function ecarts(reference, variante) {
  const e = {};
  for (const [cle] of METRIQUES) {
    const r = moyenne(reference, cle);
    e[cle] = (moyenne(variante, cle) - r) / Math.max(Math.abs(r), 1);
  }
  return e;
}
