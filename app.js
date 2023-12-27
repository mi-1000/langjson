var $nomFichier = 'langjson';

$(document).ready(() => {
    verifierTailleEcran();
    window.onresize = verifierTailleEcran;
    gererMenusDeroulants();
    gererFormulaires();
    document.ondragover = document.ondragleave = document.ondrop = (e) => { e.preventDefault(); };
    gererEffets();
    gererCopieTexteJSON();
    gererSauvegardeJSON();
    gererChangementTheme();
});

/**
 * Envoie une requête POST
 * 
 * @param {Array} donnees Les données à envoyer
 * @param {String} url L'url vers laquelle envoyer la requête
 * @return {Promise} Une promesse
 */
async function envoyerRequete(donnees, url) {
    let config = {
        method: "POST",
        dataType: "text/plain",
        body: donnees,
    };
    let reponse = await fetch(url, config);
    return await reponse.json();
}

/**
 * Vérifie la taille de l'écran
 */
function verifierTailleEcran() {
    let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const tailleMax = 500;
    const erreurTailleEcran = document.getElementById('erreur_taille_ecran');
    const contenu = document.getElementById('contenu');
    if (vw < tailleMax) {
        erreurTailleEcran.style.display = 'unset';
        contenu.style.display = 'none';
    } else {
        erreurTailleEcran.style.display = 'none';
        contenu.style.display = 'unset';
    }
}

/**
 * Gère les menus déroulants
 */
function gererMenusDeroulants() {
    $('.dropdown-toggle').dropdown();

    $('.dropdown').mouseenter(function () {
        $(this).toggleClass('show');
        $(this).toggleClass('fade');
        var menu = $(this).children('.dropdown-menu');
        var arial = $(this).children('#navbarDropdown');
        arial.attr('aria-expanded', 'true');
        menu.toggleClass('show');
    });

    $('.dropdown').mouseleave(function () {
        var menu = $(this).children('.dropdown-menu');
        var arial = $(this).children('#navbarDropdown');
        setTimeout(() => {
            $(this).removeClass('show fade');
            arial.attr('aria-expanded', 'false');
            menu.removeClass('show');
        }, 250);
    });
}

/**
 * Gère le comportement des formulaires de la page
 */
function gererFormulaires() {
    $('form').submit((e) => { e.preventDefault(); });
    gererFormulaireSelectionFichier();
}

/**
 * Gère le comportement du formulaire permettant de sélectionner un fichier
 */
function gererFormulaireSelectionFichier() {
    const inputFichier = document.getElementById('fichier');
    const formulaire = document.getElementById('formulaire-envoi-fichier');

    $("#formulaire-envoi-fichier #fichier, #formulaire-envoi-fichier #separateur").on('change', (e) => { reinitialiserFormulaireChoixFichier(); });

    formulaire.ondragover = (e) => {
        e.preventDefault();
        formulaire.classList.add('deposer');
    };
    formulaire.ondragleave = (e) => {
        e.preventDefault();
        formulaire.classList.remove('deposer');
    };
    formulaire.ondrop = (e) => {
        e.preventDefault();
        formulaire.classList.remove('deposer');
        inputFichier.files = e.dataTransfer.files;
        if (!['txt', 'csv'].includes(inputFichier.files[0].name.split('.').pop().toLowerCase())) {
            alert(`Cette extension de fichier n'est pas autorisée !`);
            return;
        }
        reinitialiserFormulaireChoixFichier();
    }

    $('#formulaire-envoi-fichier').submit(async (e) => {
        let formulaire = e.target;
        let fichier = document.getElementById('fichier');
        let separateur = (!!document.getElementById('separateur').value) ? document.getElementById('separateur').value : ';';
        let donnees = new FormData(formulaire);
        donnees.append("fichier", fichier.files[0]);
        donnees.append("separateur", separateur);
        $nomFichier = fichier.files[0].name.split('.')[0];
        let reponse = await envoyerRequete(donnees, 'api.php');
        let indentation = (!!document.getElementById('indentation').value) ? Number.parseInt(document.getElementById('indentation').value) : 4;
        let json = JSON.parse(reponse);
        if (!!json["erreur"]) {
            alert(`Erreur : \n${json["erreur"]}`);
        } else afficherJSON(json, indentation);
        formulaire.reset();
        reinitialiserFormulaireChoixFichier();
    });
}

/**
 * Réinitialise l'état du formulaire permettant de choisir un fichier
 */
async function reinitialiserFormulaireChoixFichier() {
    const inputFichier = document.getElementById('fichier');
    let separateur = await detecterDelimiteur(inputFichier.files[0]);
    if (separateur !== null) {
        document.getElementById('separateur').value = separateur;
    }
    if (!!inputFichier.files[0]) {
        try {
            afficherTableauCSV(inputFichier.files[0], separateur);
        } catch (err) {
            alert("Erreur : \nLe fichier n'a pas pu être lu correctement.");
        }
    }
    const nomFichier = document.getElementById('fichier').files[0]?.name;
    const label = document.querySelector("label[for=fichier]");
    label.innerHTML = nomFichier ?? `<span data-idlang="1">Sélectionner un fichier</span>`;
    const bouton = document.getElementById('bouton-envoyer-fichier');
    if (!!nomFichier) { bouton.disabled = false; } else { bouton.disabled = true; }
}

/**
 * Gère les effets de la page
 */
function gererEffets() {
    let icones = document.querySelectorAll('.copier-texte, .sauvegarder-texte, .changer-theme');
    const zoneJson = document.getElementById('contenu-json');
    zoneJson.onmouseenter = (e) => {
        icones.forEach(icone => icone.style.opacity = '1');
    }
    zoneJson.onmouseleave = (e) => {
        icones.forEach(icone => icone.style.opacity = '0');
    }
    icones.forEach(icone => {
        icone.onmouseenter = zoneJson.onmouseenter;
        icone.onmouseleave = zoneJson.onmouseleave;
    });

    let choixLangues = document.querySelectorAll("[data-drapeau]");
    choixLangues.forEach(cl => {
        let drapeau = cl.getAttribute('data-drapeau');
        let html = cl.innerHTML;
        cl.innerHTML = `<span class="fi fi-${drapeau}"></span>${html}`;
        cl.addEventListener('click', (e) => {
            changerLangue(cl.getAttribute('data-lang'));
        });
    });
}

/**
 * Change de langue
 */
async function changerLangue(langue = "fr") {
    const nomFichier = "lang.json";
    let json = await envoyerRequete(null, nomFichier);
    for (const cle in json) {
        let span = document.querySelector(`span[data-idlang="${cle}"]`);
        if (!!span) {
            span.innerHTML = json[cle][langue];
        }
    }
    document.documentElement.lang = langue;
}

/**
 * Gère la copie du texte
 */
function gererCopieTexteJSON() {
    const boutonCopieTexte = document.querySelector('.copier-texte');
    const iconeCopie = document.querySelector('.bi-clipboard');
    const iconeTexteCopie = document.querySelector('.bi-clipboard-check-fill');

    iconeCopie.style.display = 'unset';
    iconeCopie.style.opacity = '1';
    iconeTexteCopie.style.display = 'none';
    iconeTexteCopie.style.opacity = '0';

    boutonCopieTexte.addEventListener('click', async (e) => {
        iconeCopie.style.opacity = '0';
        iconeTexteCopie.style.opacity = '1';
        await new Promise(r => setTimeout(r, 500));
        navigator.clipboard.writeText(document.getElementById('contenu-json').innerText);
        iconeCopie.style.display = 'none';
        iconeTexteCopie.style.display = 'unset';
        await new Promise(r => setTimeout(r, 2000));
        iconeCopie.style.opacity = '1';
        iconeTexteCopie.style.opacity = '0';
        await new Promise(r => setTimeout(r, 500));
        iconeCopie.style.display = 'unset';
        iconeTexteCopie.style.display = 'none';
    });
}

/**
 * Gère la sauvegarde du texte vers un fichier JSON
 */
function gererSauvegardeJSON() {
    const boutonSauvegardeTexte = document.querySelector('.sauvegarder-texte');

    boutonSauvegardeTexte.addEventListener('click', async (e) => {
        let json = document.getElementById('contenu-json').innerText;
        let blob = new Blob([json], { type: 'application/json' });
        let urlBlob = URL.createObjectURL(blob);

        if ('showSaveFilePicker' in window) {
            let options = {
                excludeAcceptAllOption: true, startIn: 'downloads', suggestedName: `${$nomFichier}.json`, types: [{
                    description: "Fichier JSON",
                    accept: { "application/json": [".json"] },
                }]
            };

            try {
                let gestionnaire = await window.showSaveFilePicker(options);
                let flux = await gestionnaire.createWritable();
                await flux.write(blob);
                await flux.close();
            } catch { }
        } else {
            const boutonTelechargementAuto = document.createElement('a');
            boutonTelechargementAuto.href = urlBlob;
            boutonTelechargementAuto.download = `${$nomFichier}.json`;
            boutonSauvegardeTexte.parentElement.appendChild(boutonTelechargementAuto);
            boutonTelechargementAuto.click();
            URL.revokeObjectURL(urlBlob);
            boutonSauvegardeTexte.parentElement.removeChild(boutonTelechargementAuto);
        }
    });
}

/**
 * Gère le changement de thème
 */
function gererChangementTheme() {
    const boutonChangementTheme = document.querySelector('.changer-theme');
    const iconeSoleil = document.querySelector('.bi-sun');
    const iconeLune = document.querySelector('.bi-moon');
    const zoneJson = document.getElementById('contenu-json');

    iconeSoleil.style.display = 'unset';
    iconeSoleil.style.opacity = '1';
    iconeLune.style.display = 'none';
    iconeLune.style.opacity = '0';

    boutonChangementTheme.addEventListener('click', async (e) => {

        if (iconeLune.style.display == 'none') {
            iconeSoleil.style.opacity = '0';
            iconeLune.style.opacity = '1';
        } else {
            iconeSoleil.style.opacity = '1';
            iconeLune.style.opacity = '0';
        }
        await new Promise(r => setTimeout(r, 500));
        zoneJson.classList.toggle('theme-clair');
        zoneJson.classList.toggle('theme-sombre');

        if (iconeLune.style.opacity == '0') {
            iconeSoleil.style.display = 'unset';
            iconeLune.style.display = 'none';
        } else {
            iconeSoleil.style.display = 'none';
            iconeLune.style.display = 'unset';
        }
    });
}

/**
 * Permet d'afficher un objet JSON sous forme de chaîne de caractères dans la page
 * 
 * @param {any} json L'objet JSON à afficher
 * @param {Number} indentation Le nombre d'espaces à indenter
 */
function afficherJSON(json, indentation) {
    let conteneur = document.getElementById('contenu-json');
    let json_str = JSON.stringify(json, undefined, indentation);
    conteneur.innerHTML = colorationSyntaxique(json_str);
}

/**
 * Ajoute des classes HTML à un objet JSON pour pouvoir le colorer
 * 
 * @see https://stackoverflow.com/a/7220510 Le lien du post StackOverflow
 * 
 * @param {String} json La chaîne de caractères représentant l'objet JSON
 * @returns {String} Un code HTML permettant de colorer syntaxiquement le JSON
 */
function colorationSyntaxique(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var classe = 'json-nombre';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                classe = 'json-cle';
            } else {
                classe = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            classe = 'json-booleen';
        } else if (/null/.test(match)) {
            classe = 'json-null';
        }
        return '<span class="' + classe + '">' + match + '</span>';
    });
}

/**
 * Renvoie le contenu textuel d'un fichier sous forme de promesse
 * 
 * @param {File} fichier Le fichier à lire
 * @returns {Promise<String>} Le contenu du fichier
 */
function lireContenuFichier(fichier) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const contenu = event.target.result;
            resolve(contenu);
        };

        reader.onerror = (event) => {
            reject(new Error());
        };

        reader.readAsText(fichier);
    });
}

/**
 * Affiche l'aperçu d'un fichier de données textuel sous forme de tableau
 * 
 * @param {File} csv Le fichier CSV ou TXT contenant les données
 * @param {String} separateur Le séparateur des données
 */
async function afficherTableauCSV(csv, separateur) {
    contenuCSV = await lireContenuFichier(csv);

    const lignes = contenuCSV.split('\n');
    const tableauDonnees = lignes.map(ligne => ligne.split(separateur));
    const popupContenu = document.createElement('div');
    const tableauHTML = document.createElement('table');

    const thead = document.createElement('thead');
    const entetes = tableauDonnees.shift();
    const ligneEntetes = document.createElement('tr');
    entetes.forEach(entete => {
        const th = document.createElement('th');
        th.textContent = entete;
        ligneEntetes.appendChild(th);
    });
    thead.appendChild(ligneEntetes);
    tableauHTML.appendChild(thead);

    const tbody = document.createElement('tbody');
    tableauDonnees.forEach(ligne => {
        const tr = document.createElement('tr');
        ligne.forEach(cellule => {
            const td = document.createElement('td');
            td.textContent = cellule;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    tableauHTML.appendChild(tbody);
    popupContenu.appendChild(tableauHTML);

    const popup = document.querySelector('#fenetreConfirmation .modal-body');
    popup.innerHTML = '';
    popup.appendChild(popupContenu);

    $("#fenetreConfirmation").modal("show");
}

/**
 * Détecte le délimiteur d'un fichier de données
 * 
 * @see https://stackoverflow.com/a/19070276 Le lien du post StackOverflow
 * 
 * @param {File} fichier Le fichier dont il faut détecter le délimiteur
 * @param {Array<String>} delimiteursPossibles Les délimiteurs possibles
 * @returns {Promise<String|null>} Le délimiteur détecté, ou null si rien n'a été trouvé
 */
async function detecterDelimiteur(fichier, delimiteursPossibles = [',', ';', ' ', '\t']) {
    var contenu = await lireContenuFichier(fichier);

    var res = delimiteursPossibles.filter(filtrerDelimiteur)
    return res.length == 1 ? res[0] : null;

    function filtrerDelimiteur(delimiteur) {
        var cache = -1;
        return contenu.split('\n').every(verifierLongueur);

        function verifierLongueur(ligne) {
            if (!ligne) {
                return true;
            }

            var longueur = ligne.split(delimiteur).length;
            if (cache < 0) {
                cache = longueur;
            }
            return cache === longueur && longueur > 1;
        }
    }
}