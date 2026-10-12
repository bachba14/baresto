# Monkomi : améliorations UX/UI du back-office

> **Contexte pour Claude** : ce fichier liste les points relevés lors d'un audit du back-office Monkomi (`https://monkomi.be/admin`). C'est un outil de réservation pour restaurants : tableau de bord, service, réservations, clients, statistiques, carte, plan de salle, réglages, import et intégration.
> Audit du 12/10/2026, sur desktop (~1050 px de large). La version mobile n'a pas été testée.
>
> **Comment traiter ce fichier**
> - Traite les points dans l'ordre des priorités : P0 → P1 → P2 → P3.
> - Pour chaque point, retrouve d'abord le composant ou la route concerné dans le code, corrige-le, puis vérifie les critères d'acceptation.
> - Coche la case `[x]` quand le point est fait, et note en dessous ce qui a été modifié (fichiers, décisions).
> - Si un point demande un arbitrage produit, ne le tranche pas toi-même : marque-le `⚠️ À valider` et passe au suivant.
> - Garde le style visuel existant : fond crème, cartes blanches arrondies, accent orange, boutons primaires noirs.

---

## P0 : bugs et incohérences de données

### [x] 1. Date désynchronisée dans la page Réservations
- **Où** : `/admin` → Réservations.
- **Constat** : quand on clique sur un jour du calendrier (par ex. le 23 octobre), le titre passe bien à « Vendredi 23 octobre 2026 », mais le sélecteur de date en haut reste sur `12-10-2026`.
- **Attendu** : une seule source de vérité pour la date sélectionnée. Le calendrier, le sélecteur, les flèches ←/→ et le titre doivent rester synchronisés.
- **Critères d'acceptation** :
  - Un clic sur un jour du calendrier met à jour le sélecteur de date.
  - Changer la date dans le sélecteur met en surbrillance le bon jour, et le calendrier change de mois si nécessaire.
  - Les flèches ←/→ font la même chose.

> **Fait.** Nouveau composant `src/components/date-nav.tsx` (flèches, sélecteur, « Aujourd'hui ») utilisé sur Réservations et Service. La date vient uniquement de l'URL (`?date=`) : le sélecteur est contrôlé, donc un clic sur le calendrier, les flèches ou le sélecteur mettent tout à jour ensemble, et le calendrier suit le mois de la date choisie.

### [x] 2. La position de défilement n'est pas remise à zéro
- **Où** : navigation dans le menu latéral, entre toutes les pages.
- **Constat** : en arrivant sur une nouvelle page, celle-ci est déjà défilée. Les titres d'Importer et d'Intégration étaient coupés en haut.
- **Attendu** : chaque changement de route ramène en haut (`scrollTo(0,0)` sur le conteneur principal), sauf si on utilise le bouton retour du navigateur.

> **Fait.** `src/app/admin/(app)/scroll-reset.tsx`, monté dans le layout : remonte en haut à chaque changement de page (y compris Clients → fiche client), sauf avec le bouton retour/avance du navigateur. Un simple changement de date (`?date=`) ne fait pas remonter.

### [ ] 3. Le statut des réservations passées n'évolue pas
- **Où** : Réservations et Statistiques (bloc « Statuts »).
- **Constat** : les réservations du 8/10, donc passées, sont toujours « Confirmée ». Résultat : le taux de no-show est toujours de 0 % et les statistiques sont faussées.
- **Attendu** (⚠️ à valider) : l'une de ces deux options.
  - (a) Après la fin du service, passer automatiquement les réservations « Confirmée » en « Partie » ou « Terminée ».
  - (b) Afficher sur le tableau de bord un encart « X réservations d'hier à pointer », avec deux actions rapides : Venue / Non venue.
- **Critères d'acceptation** : il n'y a plus de réservation passée au statut « Confirmée » ou « En attente » sans signalement visible.

> ⚠️ **À valider.** Recommandation : **(b)**, un encart « X réservations passées à pointer » sur le tableau de bord avec Venue / Non venue, sans changement automatique. L'option (a) marquerait comme venus des clients qui ne sont peut-être pas venus, ce qui fausserait le taux de no-show dans l'autre sens.

### [x] 4. Indicateurs statistiques incohérents
- **Où** : Statistiques et bloc Statistiques du tableau de bord.
- **Constats** :
  - « Remplissage moyen : 0 % » alors que 8 couverts ont été réservés sur la période (44 places).
  - « Réservé en moyenne : 0,0 j avant » : la valeur paraît fausse, ou n'est pas calculée.
  - Le sous-titre annonce « comparé aux 30 jours précédents », mais aucune évolution n'est affichée.
  - « En ligne 100 % » s'affiche avec le sous-texte « 0 par téléphone / sur place », ce qui crée de la confusion.
- **Attendu** :
  - Vérifier les formules de remplissage et de délai moyen.
  - Afficher pour chaque indicateur une variation par rapport à la période précédente (▲/▼ + %, en vert ou en rouge), ou retirer la mention « comparé à… ».
  - Reformuler le sous-texte « En ligne » : « 4 en ligne · 0 par téléphone / sur place ».

> **Fait.** (`src/app/admin/(app)/stats/page.tsx`, `stats.tsx`)
> - Remplissage : nouvelle formule = couverts servis ÷ places offertes (places × services ouverts, services passés), affichée avec une décimale sous 10 % et le détail « X couverts sur Y places offertes ». L'ancien 0 % venait de la moyenne de tous les services, vides compris, arrondie.
> - Délai moyen : la valeur 0 était juste (réservations faites le jour même) ; elle s'affiche maintenant « Le jour même ».
> - Comparaison : chaque indicateur clé affiche ▲/▼ (vert/rouge), « = stable » ou « pas de comparaison » ; le sous-titre dit explicitement quand la période précédente est vide.
> - « En ligne » : « 4 en ligne · 0 par téléphone / sur place » (page Statistiques et tableau de bord).

### [x] 5. Jours fériés : la France est sélectionnée par défaut pour un restaurant belge
- **Où** : Réglages → Jours fériés à venir.
- **Constat** : l'adresse est à Beauraing (5570, Belgique), mais l'onglet « France » est actif. La liste contient le 8 mai et le 14 juillet.
- **Attendu** : déduire le pays par défaut de l'adresse ou du préfixe téléphonique, et mémoriser le choix. Vérifier que la liste belge contient bien le 21 juillet (fête nationale), le 15 août, le 1er et le 11 novembre, etc.

> **Fait.** `countryOf()` dans `src/lib/holidays.ts` déduit le pays de l'adresse (pays écrit, code postal à 4 ou 5 chiffres) puis du téléphone (+32/+33, 04xx/06-07) ; testé : Beauraing 5570 → Belgique. Le choix Belgique/France est mémorisé (cookie, 1 an). Liste belge vérifiée : 21 juillet, 15 août, 1er et 11 novembre, Pâques/Ascension/Pentecôte.

### [x] 6. Débordements de texte
- **Statistiques → carte « Midi / soir »** : « 0 couverts » et « 8 couverts » sortent de leur cadre. Réduire la taille de police, autoriser le retour à la ligne ou utiliser `min-width: 0` et `overflow-wrap`.
- **Intégration → blocs de code** : le bouton « Copier » recouvre le code (`</div>`). Il faut réserver un `padding-right` ou placer le bouton au-dessus du bloc. Supprimer aussi la barre de défilement horizontale si c'est possible (retour à la ligne avec `white-space: pre-wrap`).
- **Réservations → liste du jour** : « test 2 · 7 / pers. » se coupe au milieu, et l'e-mail est tronqué sans infobulle.

> **Fait.**
> - Statistiques, carte Midi / soir : le nombre seul en grand, « couverts · % · résa » en dessous, avec retour à la ligne.
> - Intégration : le bouton « Copier » est dans une barre au-dessus du code (il ne le recouvre plus), code renvoyé à la ligne (plus de barre de défilement).
> - Réservations : nom, « 7 pers. » et statut ne se coupent plus au milieu ; coordonnées tronquées avec infobulle complète.

---

## P1 : flux du service (le cœur de l'usage)

### [x] 7. « + Réservation » doit ouvrir une fenêtre ou un panneau, sans quitter la page
- **Constat** : le bouton du tableau de bord renvoie vers le bas de la page Réservations, sur un formulaire en accordéon. On perd le contexte, ce qui est gênant pendant un appel téléphonique.
- **Attendu** :
  - Un panneau latéral (ou une fenêtre modale) réutilisable, accessible depuis toutes les pages via un bouton global dans le header.
  - Un raccourci clavier optionnel : `N`.
  - Après l'enregistrement : un toast de confirmation, et on reste sur la page en cours.

> **Fait.** Panneau latéral `src/app/admin/(app)/new-reservation.tsx`, monté une fois dans le layout : bouton « + Réservation » en haut du menu (et « + Résa » sur mobile), bouton du tableau de bord et de la page Réservations, raccourci **N** (ignoré pendant la saisie dans un champ), fermeture par Échap. Après l'enregistrement : notification (`src/components/toaster.tsx`) et on reste sur la page. L'ancien formulaire en accordéon est supprimé.

### [x] 8. Améliorer le formulaire de réservation manuelle
- **Constat** : l'heure se saisit librement (`--:--`), sans voir les créneaux disponibles, et on ne peut pas choisir de table. L'ordre des champs n'est pas adapté au téléphone.
- **Attendu** :
  - Ordre des champs : Date → Couverts → Créneaux cliquables (avec capacité restante ou grisés si complet) → Nom → Téléphone → E-mail → Remarques.
  - Table suggérée automatiquement, modifiable.
  - Autocomplétion sur le nom et le téléphone à partir des clients existants (afficher le badge « Habitué »).
  - Validation inline (téléphone requis si pas d'e-mail, etc.).

> **Fait.** Ordre Date → Couverts (− / +) → Créneaux cliquables (places restantes, « complet », grisés si passés ou fermés ; « Autre heure » reste possible) → Table (suggestion automatique de la plus petite table libre, modifiable, tables occupées désactivées) → Nom → Téléphone → E-mail → Remarques. Autocomplétion sur le nom et le téléphone depuis les fiches clients, avec badges « Habitué » et no-show. Validation : téléphone ou e-mail obligatoire, message sous les champs. Actions serveur dans `new-reservation-actions.ts`.

### [x] 9. Réduire le nombre d'actions par ligne de réservation
- **Constat** : chaque ligne propose 5 actions (Modifier, Installer, Non venue, Annuler, ×). La différence entre « Annuler » et « × » n'est pas claire.
- **Attendu** :
  - Un bouton principal qui dépend du statut : Confirmée → **Installer** ; Installée → **Partie** ; En attente → **Confirmer**.
  - Les autres actions dans un menu `⋯` : Modifier, Non venue, Annuler, Supprimer.
  - Une confirmation (avec annulation possible via un toast « Annuler ») pour Annuler, Supprimer et Non venue.
  - Clarifier dans le libellé la différence entre « Annuler la réservation » (le client prévenu) et « Supprimer » (effacement).

> **Fait.** `RowActions` (`reservations/reservation-editor.tsx`) : un seul bouton principal selon le statut (En attente → Confirmer, Confirmée → Installer, Installée → Partie, Partie → Réinstaller, Annulée / Non venue → Réactiver) et un menu « ⋯ » : Modifier, Non venue, « Annuler la réservation » (sous-titre : le client est prévenu par e-mail), « Supprimer définitivement » (effacée, sans e-mail). Confirmation pour Annuler et Supprimer ; les changements de statut affichent une notification avec « Annuler » pour revenir en arrière (pas pour l'annulation, dont l'e-mail est déjà parti).

### [x] 10. Rapprocher le détail du jour du calendrier
- **Constat** : il faut faire défiler toute la page sous le calendrier pour voir les réservations du jour sélectionné.
- **Attendu** : sur desktop, une disposition en 2 colonnes (calendrier compact à gauche, liste du jour à droite). Ou alors une bascule « Calendrier / Liste » avec la liste par défaut.

> **Fait.** Page Réservations en 2 colonnes sur ordinateur : calendrier compact à gauche (reste visible au défilement), réservations du jour à droite avec le résumé (résa, couverts, ☀ midi / ☾ soir), puis la liste d'attente. Recherche et outils (Imprimer, Exporter) regroupés sur une ligne.

### [x] 11. Simplifier la navigation par date
- **Constat** : flèches + sélecteur + bouton « Voir » en haut, plus des flèches de mois dans le calendrier. Le bouton « Voir » est inutile.
- **Attendu** : supprimer « Voir » (la date s'applique au changement) et toujours afficher le bouton « Aujourd'hui ».

> **Fait** avec le point 1 : plus de bouton « Voir » (la date s'applique dès qu'on la change), « Aujourd'hui » toujours affiché (désactivé quand on y est déjà).

### [x] 12. Rendre la vue Service exploitable en salle
- **Constat** : le plan occupe environ la moitié de la largeur, et les numéros et capacités des tables sont minuscules.
- **Attendu** :
  - Le plan prend tout l'espace disponible, avec un bouton « Plein écran » pensé pour tablette.
  - Les tables occupées affichent directement le nom du client, l'heure et le nombre de couverts.
  - Les cibles tactiles font au moins 44 px.
  - La légende des couleurs reste visible.

> **Fait.** Liste réduite à 280 px, le plan prend le reste ; bouton « ⛶ Plein écran » (API du navigateur, ou affichage sur toute la fenêtre si elle est refusée, ex. iPhone). Les tables occupées affichent numéro, prénom du client, heure et couverts sur deux lignes. Couleurs des états assombries pour un texte blanc lisible (WCAG AA). Onglets de salle et boutons à 44 px. La légende reste au-dessus du plan.

---

## P2 : lisibilité et données

### [ ] 13. Distinguer les clients et ouvrir une fiche
- **Constat** : dans Clients et dans « Meilleurs clients », tous les noms s'affichent comme « test ». On ne les distingue pas, et aucune fiche ne s'ouvre au clic.
- **Attendu** : afficher le téléphone ou l'e-mail en deuxième ligne partout. Ajouter une fiche client au clic : historique, nombre de visites, no-shows, notes, allergies et préférences.

### [ ] 14. Axes des graphiques tronqués
- **Constat** : libellés « 1.. », « 2.. », « Jo… », « S… ».
- **Attendu** : format court (`12/10`, `L M M J V S D`), moins de graduations quand la place manque, et une infobulle au survol avec la valeur complète.

### [ ] 15. Calendrier : notation « M 0 · S 8 » trop cryptique
- **Attendu** : déplacer la légende au-dessus du calendrier ou la remplacer par une infobulle (« Midi : 0 couvert · Soir : 8 couverts »). Utiliser des icônes ☀︎ / ☾ ou des libellés clairs.

### [ ] 16. Le tableau de bord n'affiche que des zéros
- **Attendu** :
  - Si rien n'est prévu aujourd'hui, afficher la **prochaine réservation à venir**.
  - Pour un nouveau compte, ajouter une **checklist d'onboarding** (horaires, plan de salle, carte, intégration du widget, lien d'avis Google), avec une progression.
- La carte « À confirmer » apparaît deux fois (une carte indicateur et un bloc). Les fusionner quand la confirmation automatique est active.

### [ ] 17. Rééquilibrer la grille des statistiques
- **Constat** : 5 cartes puis 4 cartes avec un vide, et des libellés sur 3 lignes (« Taille moyenne des tables »).
- **Attendu** : une rangée de 4 à 5 indicateurs clés (Réservations, Couverts, Remplissage, No-show, Annulations), puis les indicateurs secondaires dans une rangée plus discrète. Des libellés courts sur une ligne, avec une infobulle « ⓘ » pour la définition.

---

## P3 : pages de configuration et finitions

### [ ] 18. Page Carte : état vide guidé
- **Constat** : la page ne contient qu'un champ « Nouvelle catégorie ».
- **Attendu** : un état vide avec une illustration, une explication, un bouton « Créer ma première catégorie » et des modèles (Entrées / Plats / Desserts / Vins). Si possible, prévoir un import depuis un PDF ou une photo de la carte. Ajouter aussi un aperçu du rendu public.

### [ ] 19. Éditeur de plan de salle : contraste et espace
- **Constat** : les tables sont gris clair avec du texte blanc (illisible), le plan est petit, et le panneau de droite « Cliquez sur une table » reste vide la plupart du temps.
- **Attendu** :
  - Contraste conforme WCAG AA pour les tables et leurs libellés.
  - Plan sur toute la largeur, avec un panneau de propriétés qui n'apparaît qu'à la sélection d'une table.
  - Boutons d'ajout de tables regroupés dans une barre d'outils au-dessus du plan.
  - Bouton « Enregistrer le plan » actif seulement s'il y a des modifications (avec l'indicateur « Modifications non enregistrées ») et avertissement si on quitte la page.

### [ ] 20. Réglages : enregistrement et navigation
- **Constat** : la page est longue. Le bouton « Enregistrer les réglages » est au milieu, et certaines sections (Fermetures) s'enregistrent séparément.
- **Attendu** :
  - Une barre d'enregistrement fixe en bas (« Modifications non enregistrées · Annuler · Enregistrer »), qui apparaît dès qu'un champ change.
  - Un avertissement `beforeunload` s'il y a des changements non sauvegardés.
  - Une navigation par ancres ou onglets : Établissement · Réservations en ligne · E-mails · Horaires · Fermetures.
  - Des unités visibles dans les champs (min, h, jours) plutôt que seulement dans les libellés.

### [ ] 21. Champ « Accroche » sans exemple
- **Attendu** : un placeholder (ex. « Cuisine de saison au cœur de Beauraing »), un compteur de caractères et un aperçu du rendu sur la page publique.

### [ ] 22. Badge « En direct » ambigu
- **Constat** : le badge sous le nom du restaurant n'explique pas ce qu'il signifie.
- **Attendu** : afficher « Réservations en ligne actives », et transformer le badge en interrupteur « Mettre en pause les réservations en ligne », avec une confirmation.

### [ ] 23. Lien « Page publique » en double
- Il apparaît dans le header du tableau de bord **et** en bas du menu. N'en garder qu'un (le menu), ou le placer dans le header global.

### [ ] 24. Accessibilité générale
- Plusieurs textes gris clair sont sous le ratio de contraste 4.5:1 : sous-titres, légendes de graphiques, texte d'aide, grille du plan.
- Vérifier : focus clavier visible, `aria-label` sur les boutons-icônes (×, ←, →), ordre de tabulation, champs associés à leur `label`.

### [ ] 25. Responsive mobile et tablette (à auditer)
- Non testé pendant l'audit. Vérifier à 390 px et 768 px de large :
  - menu latéral repliable en menu burger ;
  - calendrier transformé en liste ;
  - fenêtre de réservation en plein écran ;
  - plan de salle zoomable ;
  - pas de défilement horizontal.

---

## Récapitulatif

| Priorité | Points | Thème |
|---|---|---|
| P0 | 1 → 6 | Bugs, données fausses, débordements |
| P1 | 7 → 12 | Flux de service et de réservation |
| P2 | 13 → 17 | Lisibilité, clients, statistiques |
| P3 | 18 → 25 | Configuration, finitions, accessibilité, mobile |