<?php

/**
 * Récupère le contenu d'une requête POST
 */
function recupererRequete()
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST)) {
        }
        if (isset($_FILES['fichier']) && $_FILES['fichier']['error'] === UPLOAD_ERR_OK && isset($_POST['separateur'])) {
            $fichier = $_FILES['fichier']['tmp_name'];
            $nomFichier = $_FILES['fichier']['name'];
            $extension = pathinfo($nomFichier, PATHINFO_EXTENSION);
            $reponse = getReponse($fichier, stripcslashes($_POST['separateur']), $extension);
            echo json_encode($reponse);
        } else {
            echo json_encode(null);
        }
    }
}

/**
 * Renvoie la réponse de la requête
 * 
 * @param string $fichier Le chemin du fichier
 * @param string $delimiteur Le délimiteur à utiliser pour séparer les données
 * @param string $extension L'extension du fichier
 * @return mixed La réponse
 */
function getReponse(string $fichier, string $delimiteur, string $extension)
{
    if (!in_array(strtolower($extension), ['txt', 'csv'])) {
        return json_encode(["erreur" => "L'extension de ce fichier n'est pas autorisée !"]);
    }
    if (strlen($delimiteur) > 1) {
        return json_encode(["erreur" => "Le délimiteur doit être un seul caractère !"]);
    } else if ($message = verifierTableau(getTableauFromFichier($fichier, $delimiteur))) {
        return json_encode(["erreur" => $message]);
    } else return json_encode(getJsonFromTableau(getTableauFromFichier($fichier, $delimiteur)), JSON_NUMERIC_CHECK);
}

/**
 * Lit un fichier et renvoie le tableau correspondant à son contenu
 * 
 * @param string $cheminFichier Le chemin du fichier
 * @param string $delimiteur Le délimiteur des données
 * @return array Le tableau correspondant
 */
function getTableauFromFichier(string $cheminFichier, string $delimiteur): array
{
    $tab = array();

    if (($fichier = fopen($cheminFichier, 'r')) !== false) {
        $i = 0;
        while (($ligne = fgetcsv($fichier, 0, $delimiteur)) !== false) {
            if ($i !== 0) {
                $ligne = array_map(function ($v) {
                    switch (strtolower($v)) {
                        case "null":
                            return null;
                        case "true":
                            return true;
                        case "false":
                            return false;
                        default:
                            return $v;
                    }
                }, $ligne);
            }
            $tab[] = $ligne;
            $i++;
        }
        fclose($fichier);
    }

    return $tab;
}

/**
 * Vérifie si le tableau est exploitable
 * 
 * @param array tab Le tableau
 * @return string|false Faux si le tableau est bien formé, sinon renvoie le message d'erreur approprié
 */
function verifierTableau(array $tab): string | false
{
    $largeur = sizeof($tab[0]);
    $tab_id = array();
    for ($i = 1; $i < sizeof($tab); $i++) {
        $ligne = $tab[$i];
        if (!ctype_digit($ligne[0])) {
            $n = $i + 1;
            return "L'identifiant « {$ligne[0]} » (ligne $n) n'est pas un nombre !";
        }
        if (in_array($ligne[0], $tab_id)) {
            return "L'identifiant {$ligne[0]} est dupliqué !";
        }
        array_push($tab_id, $ligne[0]);
        if (sizeof($ligne) !== $largeur) {
            return "Le tableau comporte des valeurs manquantes.";
        }
    }
    return false;
}

/**
 * Retourne le tableau à renvoyer sous forme de JSON correspondant au tableau généré depuis le fichier
 * 
 * @param array $tab Le tableau contenant les données du fichier
 * @return array Le tableau correspondant à renvoyer à l'utilisateur sous forme de JSON
 */
function getJsonFromTableau(array $tab)
{
    $entete = $tab[0];
    $res = array();

    for ($i = 1; $i < sizeof($tab); $i++) {
        $ligne = array();

        for ($j = 1; $j < sizeof($tab[$i]); $j++) {
            $ligne["{$entete[$j]}"] = $tab[$i][$j];
        }

        $res[$tab[$i][0]] = $ligne;
    }

    return $res;
}

/**
 * Lance le script
 */
function lancerScript()
{
    recupererRequete();
}

lancerScript();
