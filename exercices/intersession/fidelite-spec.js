// Tests de calculerFidelite (src/legacy/fidelite.js) déduits uniquement de
// docs/programme-fidelite.md : chaque valeur attendue découle d'une règle de la spec,
// citée dans le titre du test. Pour chaque limite : un cas juste avant, sur, juste après.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { calculerFidelite } = require('../../src/legacy/fidelite');

// Date de calcul fixe.
const DATE_CALCUL = '2026-06-15T12:00:00.000Z';
const T = new Date(DATE_CALCUL).getTime();
const UN_JOUR = 24 * 60 * 60 * 1000;
const ilYa = (jours) => new Date(T - jours * UN_JOUR).toISOString();

const CLIENT = { nom: 'Client standard' };
const GRAND_COMPTE = { nom: 'Grand compte', grandCompte: true };

// Commande livrée, 30 jours avant la date de calcul, 100 € HT (10 points).
const commande = (surcharges = {}) => ({
  statut: 'livree',
  date: ilYa(30),
  totalHt: 100,
  ...surcharges,
});

const calculer = (commandes, client = CLIENT) => calculerFidelite(commandes, client, DATE_CALCUL);
const points = (commandes, client) => calculer(commandes, client).points;

describe('règle 1 : seules les commandes livrées rapportent des points', () => {
  test('règle 1 : une commande livrée de 100 € HT rapporte 10 points', () => {
    assert.equal(points([commande()]), 10);
  });

  for (const statut of ['en_cours', 'en_preparation', 'expediee']) {
    test(`règle 1 : une commande au statut « ${statut} » ne rapporte aucun point`, { todo: 'écart à trancher' }, () => {
      assert.equal(points([commande({ statut })]), 0);
    });
  }

  test('règle 1 : une commande au statut « annulee » ne rapporte aucun point', () => {
    assert.equal(points([commande({ statut: 'annulee' })]), 0);
  });

  test('règle 1 : seules les commandes livrées comptent dans un mélange de statuts', { todo: 'écart à trancher' }, () => {
    const commandes = [
      commande(),
      commande({ statut: 'annulee' }),
      commande({ statut: 'expediee' }),
      commande(),
    ];
    assert.equal(points(commandes), 20);
  });
});

describe('règle 2 : période des 365 jours précédant la date de calcul, date incluse', () => {
  // Limite basse : exactement 365 jours avant ne compte plus.
  test('règle 2 : une commande de 364 jours avant la date de calcul compte', () => {
    assert.equal(points([commande({ date: ilYa(364) })]), 10);
  });

  test('règle 2 : une commande d’exactement 365 jours avant la date de calcul ne compte plus', () => {
    assert.equal(points([commande({ date: ilYa(365) })]), 0);
  });

  test('règle 2 : une commande de 366 jours avant la date de calcul ne compte pas', () => {
    assert.equal(points([commande({ date: ilYa(366) })]), 0);
  });

  // Limite haute : la date du calcul est incluse, ce qui la suit ne précède pas le calcul.
  test('règle 2 : une commande de la veille de la date de calcul compte', () => {
    assert.equal(points([commande({ date: ilYa(1) })]), 10);
  });

  test('règle 2 : une commande datée de la date de calcul compte (date incluse)', () => {
    assert.equal(points([commande({ date: DATE_CALCUL })]), 10);
  });

  test('règle 2 : une commande du lendemain de la date de calcul ne compte pas', () => {
    assert.equal(points([commande({ date: ilYa(-1) })]), 0);
  });
});

describe('règle 3 : 1 point par tranche entière de 10 € HT, commande par commande', () => {
  test('règle 3 : 9,99 € HT, juste avant la première tranche, rapporte 0 point', () => {
    assert.equal(points([commande({ totalHt: 9.99 })]), 0);
  });

  test('règle 3 : 10 € HT, sur la première tranche, rapporte 1 point', () => {
    assert.equal(points([commande({ totalHt: 10 })]), 1);
  });

  test('règle 3 : 10,01 € HT, juste après la première tranche, rapporte 1 point', () => {
    assert.equal(points([commande({ totalHt: 10.01 })]), 1);
  });

  test('règle 3 : 19,99 € HT, juste avant la deuxième tranche, rapporte 1 point', () => {
    assert.equal(points([commande({ totalHt: 19.99 })]), 1);
  });

  test('règle 3 : 20 € HT, sur la deuxième tranche, rapporte 2 points', () => {
    assert.equal(points([commande({ totalHt: 20 })]), 2);
  });

  test('règle 3 : 20,01 € HT, juste après la deuxième tranche, rapporte 2 points', () => {
    assert.equal(points([commande({ totalHt: 20.01 })]), 2);
  });

  test('règle 3 : 59,90 € HT rapporte 5 points (exemple de la spec)', () => {
    assert.equal(points([commande({ totalHt: 59.9 })]), 5);
  });

  test('règle 3 : 0 € HT rapporte 0 point', () => {
    assert.equal(points([commande({ totalHt: 0 })]), 0);
  });

  test('règle 3 : deux commandes de 9,99 € HT rapportent 0 point (tranches par commande, pas sur le cumul)', () => {
    assert.equal(points([commande({ totalHt: 9.99 }), commande({ totalHt: 9.99 })]), 0);
  });

  test('règle 3 : deux commandes de 59,90 € HT rapportent 10 points, et non 11 sur le cumul de 119,80 €', () => {
    assert.equal(points([commande({ totalHt: 59.9 }), commande({ totalHt: 59.9 })]), 10);
  });
});

describe('règle 4 : pour un grand compte, les points de chaque commande sont doublés', () => {
  test('règle 4 : un grand compte gagne 20 points pour 100 € HT', () => {
    assert.equal(points([commande()], GRAND_COMPTE), 20);
  });

  test('règle 4 : un client standard gagne 10 points pour 100 € HT', () => {
    assert.equal(points([commande()], CLIENT), 10);
  });

  test('règles 3 et 4 : un grand compte gagne 0 point pour 9,99 € HT (juste avant la tranche)', () => {
    assert.equal(points([commande({ totalHt: 9.99 })], GRAND_COMPTE), 0);
  });

  test('règles 3 et 4 : un grand compte gagne 2 points pour 10 € HT (sur la tranche)', () => {
    assert.equal(points([commande({ totalHt: 10 })], GRAND_COMPTE), 2);
  });

  test('règles 3 et 4 : un grand compte gagne 2 points pour 10,01 € HT (juste après la tranche)', () => {
    assert.equal(points([commande({ totalHt: 10.01 })], GRAND_COMPTE), 2);
  });

  test('règles 3 et 4 : un grand compte gagne 10 points pour 59,90 € HT (5 points doublés)', () => {
    assert.equal(points([commande({ totalHt: 59.9 })], GRAND_COMPTE), 10);
  });

  test('règles 1 et 4 : une commande annulée ne rapporte rien, même à un grand compte', () => {
    assert.equal(points([commande({ statut: 'annulee' })], GRAND_COMPTE), 0);
  });

  test('règles 2 et 4 : une commande d’exactement 365 jours ne rapporte rien, même à un grand compte', () => {
    assert.equal(points([commande({ date: ilYa(365) })], GRAND_COMPTE), 0);
  });
});

describe('règle 5 : total plafonné à 5 000 points, bonus grand compte compris', () => {
  test('règle 5 : 4 999 points (49 990 € HT), juste avant le plafond, ne sont pas plafonnés', () => {
    assert.equal(points([commande({ totalHt: 49990 })]), 4999);
  });

  test('règle 5 : 5 000 points (50 000 € HT), sur le plafond, restent 5 000', () => {
    assert.equal(points([commande({ totalHt: 50000 })]), 5000);
  });

  test('règle 5 : 5 001 points (50 010 € HT), juste après le plafond, sont ramenés à 5 000', () => {
    assert.equal(points([commande({ totalHt: 50010 })]), 5000);
  });

  test('règle 5 : le plafond s’applique au total de plusieurs commandes (3 × 20 000 € HT → 5 000)', () => {
    const commandes = [commande({ totalHt: 20000 }), commande({ totalHt: 20000 }), commande({ totalHt: 20000 })];
    assert.equal(points(commandes), 5000);
  });

  test('règles 4 et 5 : un grand compte à 4 998 points (24 990 € HT doublés) n’est pas plafonné', () => {
    assert.equal(points([commande({ totalHt: 24990 })], GRAND_COMPTE), 4998);
  });

  test('règles 4 et 5 : un grand compte à 5 000 points (25 000 € HT doublés) reste à 5 000', () => {
    assert.equal(points([commande({ totalHt: 25000 })], GRAND_COMPTE), 5000);
  });

  test('règles 4 et 5 : un grand compte à 5 002 points (25 010 € HT doublés) est ramené à 5 000', () => {
    assert.equal(points([commande({ totalHt: 25010 })], GRAND_COMPTE), 5000);
  });
});

describe('règle 6 : paliers Bronze (< 500), Argent (500 à 1 999), Or (2 000 et plus)', () => {
  // Une commande de points × 10 € HT rapporte exactement ce nombre de points (règle 3).
  const palierPour = (nbPoints) => calculer([commande({ totalHt: nbPoints * 10 })]);

  test('règle 6 : 0 point → Bronze', () => {
    assert.deepEqual(calculer([]), { points: 0, palier: 'Bronze' });
  });

  test('règle 6 : 499 points, juste avant 500 → Bronze', () => {
    assert.deepEqual(palierPour(499), { points: 499, palier: 'Bronze' });
  });

  test('règle 6 : 500 points, sur la limite → Argent', { todo: 'écart à trancher' }, () => {
    assert.deepEqual(palierPour(500), { points: 500, palier: 'Argent' });
  });

  test('règle 6 : 501 points, juste après 500 → Argent', () => {
    assert.deepEqual(palierPour(501), { points: 501, palier: 'Argent' });
  });

  test('règle 6 : 1 999 points, juste avant 2 000 → Argent', () => {
    assert.deepEqual(palierPour(1999), { points: 1999, palier: 'Argent' });
  });

  test('règle 6 : 2 000 points, sur la limite → Or', () => {
    assert.deepEqual(palierPour(2000), { points: 2000, palier: 'Or' });
  });

  test('règle 6 : 2 001 points, juste après 2 000 → Or', () => {
    assert.deepEqual(palierPour(2001), { points: 2001, palier: 'Or' });
  });

  test('règles 4 et 6 : un grand compte à 2 500 € HT (250 points doublés = 500) → Argent', { todo: 'écart à trancher' }, () => {
    assert.deepEqual(calculer([commande({ totalHt: 2500 })], GRAND_COMPTE), { points: 500, palier: 'Argent' });
  });

  test('règles 5 et 6 : un total plafonné à 5 000 points → Or', () => {
    assert.deepEqual(palierPour(6000), { points: 5000, palier: 'Or' });
  });
});
