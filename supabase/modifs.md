# Monkomi : points en attente de décision

> **Contexte pour Claude** : reste de l'audit UX/UI du back-office du 12/10/2026. Les 21 autres points sont faits et en ligne (historique dans git : commits « Corrections P0 / P1 / P2 / P3 de l'audit »).
>
> **Comment traiter ce fichier**
> - Ces points demandent un **arbitrage produit** : ne les développe qu'une fois la décision notée sous le point (`Décision : …`).
> - Une fois traité, coche la case `[x]` et note ce qui a été modifié (fichiers, décisions).
> - Garde le style visuel existant : fond crème, cartes blanches arrondies, accent orange, boutons primaires noirs.

---

### [x] 1. Réservations passées restées « Confirmée » (ex-point 3)
- **Fait le 22/10/2026, option (b)** : encart « À pointer » sur le tableau de bord (Venue / Non venue, « Tout marquer venues »), bouton « Non venu » dans la vue Service, demande d'avis réservée aux clients pointés venus (`0006_avis_clients_venus.sql`), historique importé « Confirmée » enregistré comme venu.
- **Constat** : les réservations passées restent « Confirmée » tant que personne ne les pointe. Le taux de no-show reste à 0 % et les statistiques sont faussées.
- **Options** :
  - (a) Après la fin du service, passer automatiquement les réservations « Confirmée » en « Partie ».
  - (b) Afficher sur le tableau de bord un encart « X réservations passées à pointer », avec deux boutons rapides : Venue / Non venue.
- **Recommandation** : **(b)**. L'option (a) marquerait comme venus des clients absents, et fausserait le taux de no-show dans l'autre sens.
- **Critère d'acceptation** : aucune réservation passée ne reste « Confirmée » ou « En attente » sans signalement visible.
- **Décision** : option (b).

### [ ] 2. Mettre en pause les réservations en ligne (ex-point 22)
- **Déjà fait** : le badge sous le nom du restaurant s'appelle maintenant « Mises à jour en direct » et a une infobulle. Il indique que le back-office se met à jour tout seul, pas que les réservations en ligne sont ouvertes.
- **À décider** : un interrupteur « Mettre en pause les réservations en ligne » (avec confirmation). C'est une nouvelle fonctionnalité :
  - un champ en base ;
  - la page publique et le widget afficheraient « Réservations en ligne momentanément fermées » avec le téléphone du restaurant ;
  - les réservations saisies par l'équipe resteraient possibles.
- **Questions** : où placer l'interrupteur (menu, Réglages) ? Faut-il une réouverture automatique à une date donnée ?
- **Décision** : _à compléter_

### [ ] 3. Importer la carte depuis un PDF ou une photo (ex-point 18)
- **Déjà fait** : carte vide guidée (modèles de catégories en un clic, carte d'exemple), lien « Voir le rendu public ».
- **À décider** : lire un PDF ou une photo de la carte pour créer automatiquement catégories, plats et prix. Cela demande un service de reconnaissance de texte ou d'IA :
  - un coût à l'usage ;
  - une relecture par le restaurateur avant l'import.
- **Décision** : _à compléter_

### [ ] 4. Responsive mobile et tablette (ex-point 25)
- **Déjà en place** :
  - menu en barre du haut avec liens qui défilent ;
  - panneau « Nouvelle réservation » en plein écran sur téléphone ;
  - calendrier compact (tient en 390 px) ;
  - plan qui s'adapte à la largeur, bouton plein écran pour tablette.
- **À vérifier sur un vrai téléphone (390 px) et une tablette (768 px)** : pas de défilement horizontal, lisibilité, taille des boutons.
- **À décider** : menu burger à la place de la barre de liens, zoom au pincement sur le plan de salle.
- **Décision** : _à compléter_
