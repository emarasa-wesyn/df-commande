// Points de fidélité des clients, calculés pour le relevé mensuel.
// Repris de l'ancien prestataire en 2022, jamais documenté. Il tourne.
const PLAFOND_POINTS = 5000;
const MULTIPLICATEUR_GRAND_COMPTE = 2;
const UNE_ANNEE_EN_MS = 365 * 24 * 60 * 60 * 1000;
const EUROS_PAR_POINT = 10;
const SEUIL_OR = 2000;
// Argent à partir de strictement plus de 500 points.
const SEUIL_ARGENT = 500;

function dateDeReference(dateCalcul) {
  let dateReference = new Date();
  if (dateCalcul) dateReference = new Date(dateCalcul);
  return dateReference;
}

function estDansLaFenetre(dateCommande, debutFenetre, dateReference) {
  return dateCommande > debutFenetre && dateCommande <= dateReference;
}

function estGrandCompte(client) {
  return client.grandCompte === true || client.grand_compte === 1;
}

function pointsDeLaCommande(commande, client) {
  if (estGrandCompte(client)) {
    return Math.floor(commande.totalHt / EUROS_PAR_POINT) * MULTIPLICATEUR_GRAND_COMPTE;
  }
  return Math.floor(commande.totalHt / EUROS_PAR_POINT);
}

function palierPour(points) {
  if (points >= SEUIL_OR) return 'Or';
  if (points > SEUIL_ARGENT) return 'Argent';
  return 'Bronze';
}

function calculerFidelite(commandes, client, dateCalcul) {
  const dateReference = dateDeReference(dateCalcul);
  const debutFenetre = new Date(dateReference.getTime() - UNE_ANNEE_EN_MS);
  let points = 0;
  for (let i = 0; i < commandes.length; i++) {
    const commande = commandes[i];
    if (commande.statut === 'annulee') continue;
    const dateCommande = new Date(commande.date);
    if (!estDansLaFenetre(dateCommande, debutFenetre, dateReference)) continue;
    points = points + pointsDeLaCommande(commande, client);
  }
  points = Math.min(points, PLAFOND_POINTS);
  return { points: points, palier: palierPour(points) };
}

module.exports = { calculerFidelite };