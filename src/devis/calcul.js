'use strict';

const TAUX_TVA = 0.2;
const SEUIL_PORT_GRATUIT = 500;
const FRAIS_PORT = 25;
const REMISE_GRAND_COMPTE = 0.05;
const PLAFOND_REMISE = 0.15;

function arrondir(montant) {
  // En virgule flottante, 1.005 * 100 vaut 100.49999999999999 : le produit est
  // ramené à 15 chiffres significatifs avant l'arrondi au centime le plus proche.
  return Math.round(Number((montant * 100).toPrecision(15))) / 100;
}

function tauxRemiseQuantite(quantite) {
  if (quantite >= 100) return 0.12;
  if (quantite >= 50) return 0.08;
  if (quantite >= 10) return 0.05;
  return 0;
}

function calculerLigne(produit, quantite) {
  if (!Number.isInteger(quantite) || quantite <= 0) {
    throw new Error('Quantité invalide');
  }
  const brut = produit.prix_ht * quantite;
  const remise = brut * tauxRemiseQuantite(quantite);
  return {
    reference: produit.reference,
    quantite,
    prixUnitaire: produit.prix_ht,
    brut: arrondir(brut),
    remise: arrondir(remise),
    net: arrondir(brut - remise),
  };
}

/**
 * Calcule un devis complet : lignes remisées, remise grand compte, frais de
 * port, TVA et totaux, selon les règles de calcul des devis.
 *
 * Tous les montants renvoyés sont en euros, arrondis au centime le plus proche.
 *
 * @param {{ grand_compte: (boolean|number) }} client Client du devis ; une
 *   valeur vraie de `grand_compte` ouvre droit à la remise grand compte.
 * @param {Array<{ produit: { reference: string, prix_ht: number }, quantite: number }>} lignes
 *   Lignes du devis, au moins une ; chaque quantité est un entier strictement positif.
 * @returns {{
 *   lignes: Array<{ reference: string, quantite: number, prixUnitaire: number, brut: number, remise: number, net: number }>,
 *   totalBrut: number,
 *   remiseClient: number,
 *   port: number,
 *   totalHT: number,
 *   tva: number,
 *   totalTTC: number
 * }} Le détail de chaque ligne et les totaux du devis. `remiseClient` vaut 0
 *   pour un client ordinaire ; le total des remises ne dépasse jamais 15 % de
 *   `totalBrut`. `totalHT` inclut le port, `tva` est calculée sur `totalHT`
 *   arrondi, et `totalTTC` vaut `totalHT + tva`.
 * @throws {Error} « Un devis contient au moins une ligne » si `lignes` est vide
 *   ou n'est pas un tableau.
 * @throws {Error} « Quantité invalide » si une quantité n'est pas un entier
 *   strictement positif.
 *
 * @example
 * // Client ordinaire, une ligne de 10 unités à 10 € HT
 * calculerDevis({ grand_compte: 0 }, [
 *   { produit: { reference: 'VIS', prix_ht: 10 }, quantite: 10 },
 * ]);
 * // => {
 * //   lignes: [{ reference: 'VIS', quantite: 10, prixUnitaire: 10, brut: 100, remise: 5, net: 95 }],
 * //   totalBrut: 100,
 * //   remiseClient: 0,
 * //   port: 25,
 * //   totalHT: 120,
 * //   tva: 24,
 * //   totalTTC: 144
 * // }
 *
 * @see docs/regles-remises.md, § 1 à § 7 (prix d'une ligne, remise sur
 *   quantité, remise grand compte, plafond de remise, frais de port, TVA et
 *   arrondis, devis vide).
 */
function calculerDevis(client, lignes) {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    throw new Error('Un devis contient au moins une ligne');
  }
  const details = lignes.map((l) => calculerLigne(l.produit, l.quantite));
  const totalBrut = details.reduce((somme, d) => somme + d.brut, 0);
  let totalNet = details.reduce((somme, d) => somme + d.net, 0);

  let remiseClient = 0;
  if (client.grand_compte) {
    const remisesLignes = totalBrut - totalNet;
    const plafond = totalBrut * PLAFOND_REMISE;
    remiseClient = Math.min(totalNet * REMISE_GRAND_COMPTE, Math.max(0, plafond - remisesLignes));
    totalNet -= remiseClient;
  }

  const port = totalNet >= SEUIL_PORT_GRATUIT ? 0 : FRAIS_PORT;
  const totalHT = arrondir(totalNet + port);
  const tva = arrondir(totalHT * TAUX_TVA);

  return {
    lignes: details,
    totalBrut: arrondir(totalBrut),
    remiseClient: arrondir(remiseClient),
    port,
    totalHT,
    tva,
    totalTTC: arrondir(totalHT + tva),
  };
}

module.exports = { calculerDevis, calculerLigne, tauxRemiseQuantite, arrondir };
