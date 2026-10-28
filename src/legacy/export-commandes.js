// Export comptable des commandes, lancé chaque nuit par le cabinet comptable.
// Ne pas toucher : ça marche. (JM, 2021)
const TVA = 0.2;

function requete(db, sql, params, cb) {
  setImmediate(function () {
    let resultat;
    try {
      const stmt = db.prepare(sql);
      resultat = stmt.all.apply(stmt, params);
    } catch (e) {
      cb(e);
      return;
    }
    cb(null, resultat);
  });
}

// Nombre de lignes et total HT par commande, en un seul passage sur les lignes.
// Les lignes sont additionnées dans l'ordre de la table, comme avant, pour
// garder exactement les mêmes arrondis.
function cumulerLignes(lignes) {
  const parCommande = new Map();
  for (const ligne of lignes) {
    let cumul = parCommande.get(ligne.commande_id);
    if (!cumul) {
      cumul = { nb: 0, tot: 0 };
      parCommande.set(ligne.commande_id, cumul);
    }
    cumul.nb = cumul.nb + 1;
    cumul.tot = cumul.tot + ligne.quantite * ligne.prix_unitaire;
  }
  return parCommande;
}

// Parcourt toute la liste sans s'arrêter : si deux clients ont le même id,
// c'est le dernier qui l'emporte, comme dans la version d'origine.
function trouverClient(clients, id) {
  let trouve = null;
  for (const client of clients) {
    if (client.id === id) {
      trouve = client;
    }
  }
  return trouve;
}

// Arrondi au centime puis écriture à la française : virgule et deux décimales.
function formaterMontant(montant) {
  const texte = String(Math.round(montant * 100) / 100);
  if (texte.indexOf('.') === -1) {
    return texte + ',00';
  }
  const parties = texte.split('.');
  if (parties[1].length === 1) {
    parties[1] = parties[1] + '0';
  }
  return parties[0] + ',' + parties[1];
}

// Le ";" est le séparateur du CSV : on le remplace par "," dans les textes libres.
function nettoyerChamp(texte) {
  return texte.replace(/;/g, ',');
}

function ligneCsv(commande, client, cumul) {
  const nb = cumul ? cumul.nb : 0;
  const tot = cumul ? cumul.tot : 0;
  const nom = nettoyerChamp(client ? client.nom : 'INCONNU');
  const ville = nettoyerChamp(client ? client.ville : '');
  return commande.id + ';' + commande.date + ';' + nom + ';' + ville + ';' + nb + ';'
    + formaterMontant(tot) + ';' + formaterMontant(tot * (1 + TVA)) + '\n';
}

function ajouterActif(actifs, clientId) {
  if (actifs.indexOf(clientId) === -1) {
    actifs.push(clientId);
  }
}

function construireCsv(commandes, lignes, clients) {
  const parCommande = cumulerLignes(lignes);
  const actifs = [];
  let csv = 'numero;date;client;ville;nb_lignes;total_ht;total_ttc\n';
  for (const commande of commandes) {
    if (commande.statut === 'annulee') {
      continue;
    }
    const client = trouverClient(clients, commande.client_id);
    csv = csv + ligneCsv(commande, client, parCommande.get(commande.id));
    ajouterActif(actifs, commande.client_id);
  }
  return csv + '# clients actifs;' + actifs.length + '\n';
}

function exporterCommandes(db, depuis, callback) {
  requete(db, 'SELECT * FROM commandes WHERE date >= ? ORDER BY date, id', [depuis], function (err, commandes) {
    if (err) {
      callback(err);
      return;
    }
    requete(db, 'SELECT * FROM lignes_commande', [], function (err2, lignes) {
      if (err2) {
        callback(err2);
        return;
      }
      requete(db, 'SELECT * FROM clients', [], function (err3, clients) {
        if (err3) {
          callback(err3);
          return;
        }
        callback(null, construireCsv(commandes, lignes, clients));
      });
    });
  });
}

module.exports = { exporterCommandes: exporterCommandes };
