// Tests de caractérisation de calculerFidelite (src/legacy/fidelite.js).
// Ils figent le comportement ACTUEL du code, y compris ce qui paraît faux :
// un test qui casse signale un changement de comportement, pas forcément un bug.
const { describe, test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { calculerFidelite } = require('../../src/legacy/fidelite');

// Date de calcul fixe : la fenêtre glissante va de DEBUT (exclu) à DATE_CALCUL (inclus).
const DATE_CALCUL = '2026-06-15T12:00:00.000Z';
const T = new Date(DATE_CALCUL).getTime();
const UN_AN = 365 * 24 * 60 * 60 * 1000;
const DEBUT = T - UN_AN; // 2025-06-15T12:00:00.000Z
const iso = (ms) => new Date(ms).toISOString();

const CLIENT = { nom: 'Client standard' };
const DANS_LA_FENETRE = iso(T - 30 * 24 * 60 * 60 * 1000);

// Une commande valide, dans la fenêtre, modifiable au besoin.
const commande = (surcharges = {}) => ({
  statut: 'livree',
  date: DANS_LA_FENETRE,
  totalHt: 100,
  ...surcharges,
});

// Calcule pour une liste de commandes, client standard par défaut, à la date fixe.
const calculer = (commandes, client = CLIENT) => calculerFidelite(commandes, client, DATE_CALCUL);

describe('calculerFidelite — date de calcul', () => {
  test('avec dateCalcul fourni, la fenêtre est calculée à partir de cette date', () => {
    const r = calculer([commande({ date: iso(T - 1000) })]);
    // 100 € HT → 10 points, la commande d'une seconde avant la date fixe est comptée.
    assert.equal(r.points, 10);
  });

  test('sans dateCalcul, la date courante (new Date()) est utilisée', () => {
    mock.timers.enable({ apis: ['Date'], now: T });
    try {
      const r = calculerFidelite(
        [commande({ date: iso(T - 1000) }), commande({ date: iso(T + 1000) })],
        CLIENT,
      );
      // Seule la commande passée par rapport à « maintenant » est comptée : 10 points.
      assert.equal(r.points, 10);
    } finally {
      mock.timers.reset();
    }
  });

  test('dateCalcul falsy (chaîne vide) retombe aussi sur la date courante', () => {
    mock.timers.enable({ apis: ['Date'], now: T });
    try {
      const r = calculerFidelite([commande({ date: iso(T - 1000) })], CLIENT, '');
      // '' est ignoré comme undefined : la commande d'une seconde avant « maintenant » compte.
      assert.equal(r.points, 10);
    } finally {
      mock.timers.reset();
    }
  });
});

describe('calculerFidelite — statut de commande', () => {
  test("statut 'annulee' : la commande est ignorée", () => {
    const r = calculer([commande({ statut: 'annulee' })]);
    // Aucune commande comptée : 0 point.
    assert.equal(r.points, 0);
  });

  test("statut autre que 'annulee' ('livree') : la commande est comptée", () => {
    const r = calculer([commande({ statut: 'livree' })]);
    // 100 € HT → 10 points.
    assert.equal(r.points, 10);
  });

  test("statut 'en_cours' : la commande est comptée (seule 'annulee' est exclue)", () => {
    const r = calculer([commande({ statut: 'en_cours' })]);
    // Une commande non livrée rapporte quand même des points.
    assert.equal(r.points, 10);
  });

  test("statut 'Annulee' (majuscule) : comptée, la comparaison est sensible à la casse", () => {
    const r = calculer([commande({ statut: 'Annulee' })]);
    // Pas strictement égal à 'annulee' : la commande rapporte 10 points.
    assert.equal(r.points, 10);
  });

  test("statut 'annulée' (accentué) : comptée, seule l'orthographe sans accent est exclue", () => {
    const r = calculer([commande({ statut: 'annulée' })]);
    // L'accent fait échouer la comparaison : 10 points.
    assert.equal(r.points, 10);
  });

  test('statut absent : la commande est comptée', () => {
    const r = calculer([commande({ statut: undefined })]);
    // undefined !== 'annulee' : 10 points.
    assert.equal(r.points, 10);
  });
});

describe('calculerFidelite — borne basse de la fenêtre (date de calcul − 365 jours)', () => {
  test('1 ms avant le début : exclue', () => {
    const r = calculer([commande({ date: iso(DEBUT - 1) })]);
    // Hors fenêtre : 0 point.
    assert.equal(r.points, 0);
  });

  test('exactement au début : exclue (comparaison stricte dc > debut)', () => {
    const r = calculer([commande({ date: iso(DEBUT) })]);
    // La borne basse est exclue : 0 point.
    assert.equal(r.points, 0);
  });

  test('1 ms après le début : comptée', () => {
    const r = calculer([commande({ date: iso(DEBUT + 1) })]);
    // Dans la fenêtre : 10 points.
    assert.equal(r.points, 10);
  });

  test('365 jours fixes, pas « un an calendaire » : borne décalée sur une année bissextile', () => {
    // 2028 est bissextile : 2028-03-01T12:00Z − 365 jours = 2027-03-02T12:00Z (borne exclue).
    const r = calculerFidelite(
      [
        commande({ date: '2027-03-02T12:00:00.000Z' }), // sur la borne : exclue
        commande({ date: '2027-03-02T12:00:00.001Z', totalHt: 50 }), // 1 ms après : 5 points
      ],
      CLIENT,
      '2028-03-01T12:00:00.000Z',
    );
    // Seule la commande juste après la borne compte : 5 points.
    assert.equal(r.points, 5);
  });
});

describe('calculerFidelite — borne haute de la fenêtre (date de calcul)', () => {
  test('1 ms avant la date de calcul : comptée', () => {
    const r = calculer([commande({ date: iso(T - 1) })]);
    // Dans la fenêtre : 10 points.
    assert.equal(r.points, 10);
  });

  test('exactement à la date de calcul : comptée (comparaison dc <= d)', () => {
    const r = calculer([commande({ date: iso(T) })]);
    // La borne haute est incluse : 10 points.
    assert.equal(r.points, 10);
  });

  test('1 ms après la date de calcul : exclue', () => {
    const r = calculer([commande({ date: iso(T + 1) })]);
    // Commande future : 0 point.
    assert.equal(r.points, 0);
  });

  test('date sans heure (YYYY-MM-DD) le jour du calcul : comptée car lue à minuit UTC', () => {
    const r = calculer([commande({ date: '2026-06-15' })]);
    // 2026-06-15T00:00Z ≤ 2026-06-15T12:00Z : 10 points.
    assert.equal(r.points, 10);
  });

  test('date invalide : la commande est ignorée (comparaisons avec NaN fausses)', () => {
    const r = calculer([commande({ date: 'pas une date' })]);
    // Invalid Date n'est ni > debut ni ≤ d : 0 point.
    assert.equal(r.points, 0);
  });
});

describe('calculerFidelite — grand compte', () => {
  test('grandCompte === true : points doublés', () => {
    const r = calculer([commande()], { grandCompte: true });
    // floor(100 / 10) × 2 = 20 points.
    assert.equal(r.points, 20);
  });

  test('grandCompte === false : points simples', () => {
    const r = calculer([commande()], { grandCompte: false });
    // floor(100 / 10) = 10 points.
    assert.equal(r.points, 10);
  });

  test("grandCompte === 'true' (chaîne) : points simples, la comparaison est stricte", () => {
    const r = calculer([commande()], { grandCompte: 'true' });
    // La chaîne n'est pas le booléen true : 10 points.
    assert.equal(r.points, 10);
  });

  test('grandCompte === 1 : points simples (seul le booléen true compte pour ce champ)', () => {
    const r = calculer([commande()], { grandCompte: 1 });
    // 1 !== true : 10 points.
    assert.equal(r.points, 10);
  });

  test('grand_compte === 1 : points doublés', () => {
    const r = calculer([commande()], { grand_compte: 1 });
    // L'ancien champ numérique est aussi reconnu : 20 points.
    assert.equal(r.points, 20);
  });

  test('grand_compte === 0 : points simples', () => {
    const r = calculer([commande()], { grand_compte: 0 });
    // 10 points.
    assert.equal(r.points, 10);
  });

  test('grand_compte === true : points simples, ce champ n\'accepte que le nombre 1', () => {
    const r = calculer([commande()], { grand_compte: true });
    // true !== 1 : 10 points.
    assert.equal(r.points, 10);
  });

  test("grand_compte === '1' (chaîne) : points simples", () => {
    const r = calculer([commande()], { grand_compte: '1' });
    // '1' !== 1 : 10 points.
    assert.equal(r.points, 10);
  });

  test('client sans aucun des deux champs : points simples', () => {
    const r = calculer([commande()], {});
    // 10 points.
    assert.equal(r.points, 10);
  });

  test('grand compte : doublement appliqué après l\'arrondi par commande', () => {
    const r = calculer([commande({ totalHt: 19.99 })], { grandCompte: true });
    // floor(1.999) × 2 = 2 points, et non floor(3.998) = 3.
    assert.equal(r.points, 2);
  });
});

describe('calculerFidelite — montant (1 point par tranche entière de 10 € HT)', () => {
  test('9,99 € : 0 point (juste avant le premier point)', () => {
    // floor(0.999) = 0.
    assert.equal(calculer([commande({ totalHt: 9.99 })]).points, 0);
  });

  test('10 € : 1 point (sur la limite)', () => {
    // floor(1) = 1.
    assert.equal(calculer([commande({ totalHt: 10 })]).points, 1);
  });

  test('10,01 € : 1 point (juste après)', () => {
    // floor(1.001) = 1.
    assert.equal(calculer([commande({ totalHt: 10.01 })]).points, 1);
  });

  test('0 € : 0 point', () => {
    // floor(0) = 0.
    assert.equal(calculer([commande({ totalHt: 0 })]).points, 0);
  });

  test('montant négatif (avoir) : retire des points, arrondi vers le bas', () => {
    // floor(-0.5) = -1 : un avoir de 5 € enlève 1 point.
    assert.equal(calculer([commande({ totalHt: -5 })]).points, -1);
  });

  test("l'arrondi se fait par commande, pas sur le total", () => {
    const r = calculer([commande({ totalHt: 9 }), commande({ totalHt: 9 })]);
    // floor(0.9) + floor(0.9) = 0, alors que 18 € cumulés donneraient 1.
    assert.equal(r.points, 0);
  });

  test('totalHt absent : NaN propagé dans les points', () => {
    const r = calculer([commande({ totalHt: undefined })]);
    // floor(undefined / 10) = NaN ; Math.min(NaN, 5000) = NaN.
    assert.ok(Number.isNaN(r.points));
    // NaN n'atteint aucun seuil : palier Bronze.
    assert.equal(r.palier, 'Bronze');
  });

  test('aucune commande : 0 point, Bronze', () => {
    // Résultat par défaut.
    assert.deepEqual(calculer([]), { points: 0, palier: 'Bronze' });
  });
});

describe('calculerFidelite — plafond de 5000 points', () => {
  test('4999 points : non plafonné (juste avant)', () => {
    // 49 990 € → 4999 points.
    assert.equal(calculer([commande({ totalHt: 49990 })]).points, 4999);
  });

  test('5000 points : sur le plafond', () => {
    // 50 000 € → 5000 points.
    assert.equal(calculer([commande({ totalHt: 50000 })]).points, 5000);
  });

  test('5001 points : ramené à 5000 (juste après)', () => {
    // 50 010 € → 5001 points, plafonnés à 5000.
    assert.equal(calculer([commande({ totalHt: 50010 })]).points, 5000);
  });

  test('plafond appliqué après le doublement grand compte', () => {
    const r = calculer([commande({ totalHt: 30000 })], { grandCompte: true });
    // 3000 × 2 = 6000, plafonnés à 5000.
    assert.equal(r.points, 5000);
  });

  test('plafond appliqué sur le cumul, pas par commande', () => {
    const r = calculer([commande({ totalHt: 30000 }), commande({ totalHt: 30000 })]);
    // 3000 + 3000 = 6000, plafonnés à 5000.
    assert.equal(r.points, 5000);
  });
});

describe('calculerFidelite — paliers (statuts Bronze / Argent / Or)', () => {
  // totalHt = points × 10 pour un client standard.
  const palierPour = (points) => calculer([commande({ totalHt: points * 10 })]);

  test('499 points : Bronze', () => {
    // Sous le seuil Argent.
    assert.deepEqual(palierPour(499), { points: 499, palier: 'Bronze' });
  });

  test('500 points : Bronze (le seuil Argent est strict : > 500)', () => {
    // 500 n'est pas > 500.
    assert.deepEqual(palierPour(500), { points: 500, palier: 'Bronze' });
  });

  test('501 points : Argent', () => {
    // Premier palier Argent.
    assert.deepEqual(palierPour(501), { points: 501, palier: 'Argent' });
  });

  test('1999 points : Argent', () => {
    // Juste sous le seuil Or.
    assert.deepEqual(palierPour(1999), { points: 1999, palier: 'Argent' });
  });

  test('2000 points : Or (le seuil Or est inclusif : >= 2000)', () => {
    // Sur le seuil Or.
    assert.deepEqual(palierPour(2000), { points: 2000, palier: 'Or' });
  });

  test('2001 points : Or', () => {
    // Juste après le seuil Or.
    assert.deepEqual(palierPour(2001), { points: 2001, palier: 'Or' });
  });

  test('5000 points (plafond) : Or', () => {
    // Le maximum atteignable reste Or.
    assert.deepEqual(palierPour(6000), { points: 5000, palier: 'Or' });
  });

  test('points négatifs : Bronze', () => {
    // -1 point (avoir) : sous tous les seuils.
    assert.deepEqual(palierPour(-0.5), { points: -1, palier: 'Bronze' });
  });

  test('0 point : Bronze', () => {
    // Palier par défaut.
    assert.deepEqual(palierPour(0), { points: 0, palier: 'Bronze' });
  });
});

describe('calculerFidelite — combinaison', () => {
  test('mélange annulée, hors fenêtre, future et valides', () => {
    const r = calculer([
      commande({ totalHt: 1000 }), // 100 points
      commande({ totalHt: 2000, statut: 'annulee' }), // ignorée
      commande({ totalHt: 3000, date: iso(DEBUT) }), // sur la borne basse : ignorée
      commande({ totalHt: 4000, date: iso(T + 1) }), // future : ignorée
      commande({ totalHt: 4100, date: iso(T) }), // sur la borne haute : 410 points
    ]);
    // 100 + 410 = 510 points → Argent.
    assert.deepEqual(r, { points: 510, palier: 'Argent' });
  });

  test("le tableau de commandes et le client ne sont pas modifiés", () => {
    const commandes = [commande()];
    const client = { grandCompte: true };
    const copie = structuredClone({ commandes, client });
    calculerFidelite(commandes, client, DATE_CALCUL);
    // Aucun effet de bord sur les entrées.
    assert.deepEqual({ commandes, client }, copie);
  });
});
