/**
 * Plan de Coupe - Application principale
 * Gestion des pièces et génération du plan de coupe optimisé
 */

let pieces = [];
let cutPlan = null;
let panels = [];
let currentPanelIndex = 0;
let allLayouts = [];
let currentLayoutIndex = 0;

/**
 * Charge l'historique depuis le localStorage
 */
function loadHistory() {
    try {
        const history = localStorage.getItem('cutPlanHistory');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
        return [];
    }
}

/**
 * Sauvegarde l'historique dans le localStorage
 * @param {Array} history - L'historique à sauvegarder
 */
function saveHistory(history) {
    try {
        localStorage.setItem('cutPlanHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'historique:', error);
        if (error.name === 'QuotaExceededError') {
            alert('L\'espace de stockage est plein. Certains projets anciens vont être supprimés.');
            // Garder seulement les 10 derniers projets
            const reducedHistory = history.slice(0, 10);
            try {
                localStorage.setItem('cutPlanHistory', JSON.stringify(reducedHistory));
            } catch (e) {
                alert('Impossible de sauvegarder l\'historique. Veuillez vider votre historique.');
            }
        }
    }
}

/**
 * Ajoute un plan à l'historique
 * @param {Object} planData - Les données du plan
 */
function addToHistory(planData) {
    const history = loadHistory();
    const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        projectTitle: document.getElementById('projectTitle').value || 'Projet sans titre',
        panelWidth: parseInt(document.getElementById('panelWidth').value),
        panelHeight: parseInt(document.getElementById('panelHeight').value),
        panelThickness: parseFloat(document.getElementById('panelThickness').value),
        bladeThickness: parseFloat(document.getElementById('bladeThickness').value),
        panelCost: parseFloat(document.getElementById('panelCost').value) || 0,
        safetyMargin: parseFloat(document.getElementById('safetyMargin').value) || 0,
        pieces: pieces.slice(),
        panels: planData,
        totalPanels: planData.length,
        totalPieces: planData.reduce(function(sum, p) { return sum + p.pieces.length; }, 0)
    };

    history.unshift(entry);

    if (history.length > 20) {
        history.pop();
    }

    saveHistory(history);
    displayHistory();
}

/**
 * Affiche l'historique
 */
function displayHistory() {
    const historyList = document.getElementById('historyList');
    const history = loadHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Aucun plan enregistré</div>';
        return;
    }

    historyList.innerHTML = history.map(function(entry) {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return '<div class="history-item">' +
            '<div class="history-date">' + dateStr + '</div>' +
            '<div class="history-info" style="font-weight: 600; color: var(--primary);">' + (entry.projectTitle || 'Projet sans titre') + '</div>' +
            '<div class="history-details">' + entry.totalPanels + ' panneau(x) - ' + entry.totalPieces + ' pièces</div>' +
            '<div class="history-details">Panneau: ' + entry.panelWidth + '×' + entry.panelHeight + '×' + (entry.panelThickness || 18) + 'mm' +
            (entry.panelCost > 0 ? ' - ' + (entry.totalPanels * entry.panelCost).toFixed(2) + '€' : '') +
            '</div>' +
            '<div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">' +
                '<button type="button" class="btn-primary" style="width: auto; padding: 0.375rem 0.75rem; font-size: 0.75rem;" onclick="event.stopPropagation(); loadFromHistory(' + entry.id + ')">Charger</button>' +
                '<button type="button" class="btn-primary" style="width: auto; padding: 0.375rem 0.75rem; font-size: 0.75rem;" onclick="event.stopPropagation(); editFromHistory(' + entry.id + ')">Éditer</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

/**
 * Charge un plan depuis l'historique (affiche directement le résultat)
 * @param {number} id - L'ID du plan à charger
 */
function loadFromHistory(id) {
    const history = loadHistory();
    const entry = history.find(function(e) { return e.id === id; });

    if (!entry) return;

    document.getElementById('projectTitle').value = entry.projectTitle || '';
    document.getElementById('panelWidth').value = entry.panelWidth;
    document.getElementById('panelHeight').value = entry.panelHeight;
    document.getElementById('panelThickness').value = entry.panelThickness || 18;
    document.getElementById('bladeThickness').value = entry.bladeThickness;
    document.getElementById('panelCost').value = entry.panelCost || '';
    document.getElementById('safetyMargin').value = entry.safetyMargin || 0;

    pieces = entry.pieces.slice();
    panels = entry.panels;
    currentPanelIndex = 0;

    updatePiecesList();
    displaySummary(panels);
    showPanel(currentPanelIndex);
}

/**
 * Charge un plan depuis l'historique en mode édition (permet de modifier les pièces)
 * @param {number} id - L'ID du plan à éditer
 */
function editFromHistory(id) {
    const history = loadHistory();
    const entry = history.find(function(e) { return e.id === id; });

    if (!entry) return;

    document.getElementById('projectTitle').value = entry.projectTitle || '';
    document.getElementById('panelWidth').value = entry.panelWidth;
    document.getElementById('panelHeight').value = entry.panelHeight;
    document.getElementById('panelThickness').value = entry.panelThickness || 18;
    document.getElementById('bladeThickness').value = entry.bladeThickness;
    document.getElementById('panelCost').value = entry.panelCost || '';
    document.getElementById('safetyMargin').value = entry.safetyMargin || 0;

    pieces = entry.pieces.slice();
    updatePiecesList();

    const summary = document.getElementById('summary');
    summary.style.display = 'none';

    const cutList = document.getElementById('cutList');
    cutList.style.display = 'none';

    const canvasWrapper = document.getElementById('canvasWrapper');
    canvasWrapper.innerHTML = '<div class="empty-state">' +
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>' +
        '</svg>' +
        '<p>Modifiez les pièces puis générez à nouveau le plan</p>' +
    '</div>';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Efface l'historique
 */
function clearHistory() {
    if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
        localStorage.removeItem('cutPlanHistory');
        displayHistory();
    }
}

// Charger l'historique au démarrage
window.addEventListener('DOMContentLoaded', function() {
    displayHistory();

    // Ajouter des écouteurs pour les options d'affichage
    const showCutLines = document.getElementById('showCutLines');
    const showWaste = document.getElementById('showWaste');

    if (showCutLines) {
        showCutLines.addEventListener('change', function() {
            if (panels && panels.length > 0) {
                showPanel(currentPanelIndex);
            }
        });
    }

    if (showWaste) {
        showWaste.addEventListener('change', function() {
            if (panels && panels.length > 0) {
                showPanel(currentPanelIndex);
            }
        });
    }
});

/**
 * Ajoute une pièce à la liste
 */
function addPiece() {
    const name = document.getElementById('pieceName').value.trim();
    const width = parseInt(document.getElementById('pieceWidth').value);
    const height = parseInt(document.getElementById('pieceHeight').value);
    const quantity = parseInt(document.getElementById('pieceQuantity').value);

    if (!width || !height || !quantity) {
        alert('Veuillez remplir tous les champs obligatoires (dimensions et quantité)');
        return;
    }

    if (width <= 0 || height <= 0 || quantity <= 0) {
        alert('Les dimensions et la quantité doivent être supérieures à 0');
        return;
    }

    if (quantity > 1000) {
        alert('La quantité ne peut pas dépasser 1000 pièces');
        return;
    }

    if (pieces.length + quantity > 5000) {
        alert('Nombre maximum de pièces atteint (5000). Veuillez générer le plan actuel avant d\'ajouter plus de pièces.');
        return;
    }

    for (let i = 0; i < quantity; i++) {
        const pieceName = name ? (quantity > 1 ? name + '.' + (i + 1) : name) : null;
        pieces.push({
            width: width,
            height: height,
            name: pieceName,
            id: Date.now() + i
        });
    }

    updatePiecesList();
    document.getElementById('pieceName').value = '';
    document.getElementById('pieceWidth').value = '';
    document.getElementById('pieceHeight').value = '';
    document.getElementById('pieceQuantity').value = '1';
}

/**
 * Supprime une pièce de la liste
 * @param {number} index - Index de la pièce à supprimer
 */
function removePiece(index) {
    pieces.splice(index, 1);
    updatePiecesList();
}

/**
 * Met à jour l'affichage de la liste des pièces
 */
function updatePiecesList() {
    const list = document.getElementById('piecesList');
    if (pieces.length === 0) {
        list.innerHTML = '';
        return;
    }

    const grouped = pieces.reduce(function(acc, piece, index) {
        // Extraire le nom de base sans le suffixe numérique
        let baseName = piece.name;
        if (baseName && baseName.match(/\.\d+$/)) {
            baseName = baseName.replace(/\.\d+$/, '');
        }
        const key = (baseName || '') + '_' + piece.width + 'x' + piece.height;
        if (!acc[key]) {
            acc[key] = {
                width: piece.width,
                height: piece.height,
                name: baseName,
                count: 0,
                indices: []
            };
        }
        acc[key].count++;
        acc[key].indices.push(index);
        return acc;
    }, {});

    list.innerHTML = Object.values(grouped).map(function(group) {
        const nameLabel = group.name ? '<div style="font-weight: 600; color: var(--primary); font-size: 0.8125rem;">' + group.name + '</div>' : '';
        return '<div class="piece-item">' +
                '<div>' +
                    nameLabel +
                    '<div class="piece-info">' + group.width + ' × ' + group.height + ' mm</div>' +
                    '<div class="piece-count">' + group.count + ' pièce(s)</div>' +
                '</div>' +
                '<button class="btn-danger" onclick="removePiece(' + group.indices[0] + ')">Supprimer</button>' +
            '</div>';
    }).join('');
}

/**
 * Génère le plan de coupe optimisé
 */
function generateCutPlan() {
    if (pieces.length === 0) {
        alert('Ajoutez au moins une pièce');
        return;
    }

    const panelWidth = parseInt(document.getElementById('panelWidth').value);
    const panelHeight = parseInt(document.getElementById('panelHeight').value);
    const bladeThickness = parseFloat(document.getElementById('bladeThickness').value);

    if (!panelWidth || !panelHeight || bladeThickness === null || bladeThickness === undefined || isNaN(bladeThickness)) {
        alert('Veuillez définir toutes les dimensions du panneau et l\'épaisseur de lame');
        return;
    }

    if (panelWidth <= 0 || panelHeight <= 0) {
        alert('Les dimensions du panneau doivent être supérieures à 0');
        return;
    }

    if (bladeThickness < 0) {
        alert('L\'épaisseur de lame ne peut pas être négative');
        return;
    }

    if (bladeThickness > 20) {
        alert('L\'épaisseur de lame semble anormalement élevée (>20mm). Veuillez vérifier.');
        return;
    }

    const safetyMargin = parseFloat(document.getElementById('safetyMargin').value) || 0;

    if (safetyMargin < 0 || safetyMargin > 15) {
        alert('La marge de sécurité doit être entre 0 et 15mm');
        return;
    }

    // Appliquer la marge de sécurité aux dimensions du panneau
    const effectivePanelWidth = panelWidth - (2 * safetyMargin);
    const effectivePanelHeight = panelHeight - (2 * safetyMargin);

    if (effectivePanelWidth <= 0 || effectivePanelHeight <= 0) {
        alert('La marge de sécurité est trop grande par rapport aux dimensions du panneau');
        return;
    }

    // Vérifier que toutes les pièces rentrent dans le panneau
    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        const fitsNormally = piece.width <= effectivePanelWidth && piece.height <= effectivePanelHeight;
        const fitsRotated = piece.height <= effectivePanelWidth && piece.width <= effectivePanelHeight;

        if (!fitsNormally && !fitsRotated) {
            const pieceName = piece.name ? ' "' + piece.name + '"' : '';
            alert('La pièce' + pieceName + ' (' + piece.width + '×' + piece.height + 'mm) est trop grande pour le panneau effectif (' + effectivePanelWidth + '×' + effectivePanelHeight + 'mm avec marge)');
            return;
        }
    }

    try {
        // Générer plusieurs dispositions avec différentes stratégies
        allLayouts = generateMultipleLayouts(pieces, effectivePanelWidth, effectivePanelHeight, bladeThickness, safetyMargin, panelWidth, panelHeight);
        currentLayoutIndex = 0;

        // Utiliser la meilleure disposition par défaut
        panels = allLayouts[0].panels;
        currentPanelIndex = 0;

        addToHistory(panels);
        displaySummary(panels);
        showPanel(currentPanelIndex);
        updateLayoutNavigation();
    } catch (error) {
        alert('Erreur lors de la génération du plan : ' + error.message);
        console.error(error);
    }
}

/**
 * Génère plusieurs dispositions avec différentes stratégies
 * @param {Array} pieces - Liste des pièces
 * @param {number} panelWidth - Largeur effective
 * @param {number} panelHeight - Hauteur effective
 * @param {number} blade - Épaisseur de lame
 * @param {number} safetyMargin - Marge de sécurité
 * @param {number} fullPanelWidth - Largeur totale
 * @param {number} fullPanelHeight - Hauteur totale
 * @returns {Array} Liste de layouts avec score
 */
function generateMultipleLayouts(pieces, panelWidth, panelHeight, blade, safetyMargin, fullPanelWidth, fullPanelHeight) {
    const strategies = [
        { name: 'Surface décroissante', sorter: function(a, b) { return (b.width * b.height) - (a.width * a.height); } },
        { name: 'Largeur décroissante', sorter: function(a, b) { return b.width - a.width; } },
        { name: 'Hauteur décroissante', sorter: function(a, b) { return b.height - a.height; } },
        { name: 'Périmètre décroissant', sorter: function(a, b) { return (b.width + b.height) - (a.width + a.height); } },
        { name: 'Ratio L/H optimal', sorter: function(a, b) {
            const ratioA = Math.max(a.width, a.height) / Math.min(a.width, a.height);
            const ratioB = Math.max(b.width, b.height) / Math.min(b.width, b.height);
            return ratioB - ratioA;
        }}
    ];

    const layouts = [];

    for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i];
        const sortedPieces = pieces.slice().sort(strategy.sorter);

        try {
            const panels = optimizeMultiPanelCutPlan(sortedPieces, panelWidth, panelHeight, blade, safetyMargin, fullPanelWidth, fullPanelHeight);
            const score = evaluateLayout(panels, panelWidth, panelHeight);

            layouts.push({
                panels: panels,
                strategy: strategy.name,
                score: score,
                wastePercentage: score.wastePercentage,
                usableWasteCount: score.usableWasteCount,
                totalWasteArea: score.totalWasteArea
            });
        } catch (error) {
            console.error('Erreur avec stratégie ' + strategy.name + ':', error);
        }
    }

    // Trier par score (meilleur en premier)
    layouts.sort(function(a, b) {
        // Priorité 1: Moins de panneaux
        if (a.panels.length !== b.panels.length) {
            return a.panels.length - b.panels.length;
        }
        // Priorité 2: Plus de chutes exploitables
        if (a.usableWasteCount !== b.usableWasteCount) {
            return b.usableWasteCount - a.usableWasteCount;
        }
        // Priorité 3: Moins de déchets total
        return a.wastePercentage - b.wastePercentage;
    });

    // Filtrer les dispositions uniques (éviter les doublons)
    const uniqueLayouts = [];
    for (let i = 0; i < layouts.length; i++) {
        const layout = layouts[i];
        let isDuplicate = false;

        for (let j = 0; j < uniqueLayouts.length; j++) {
            if (areLayoutsIdentical(layout.panels, uniqueLayouts[j].panels)) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            uniqueLayouts.push(layout);
        }
    }

    return uniqueLayouts;
}

/**
 * Vérifie si deux dispositions sont identiques
 * @param {Array} panels1 - Première disposition
 * @param {Array} panels2 - Deuxième disposition
 * @returns {boolean} True si identiques
 */
function areLayoutsIdentical(panels1, panels2) {
    if (panels1.length !== panels2.length) return false;

    for (let p = 0; p < panels1.length; p++) {
        const panel1 = panels1[p];
        const panel2 = panels2[p];

        if (panel1.pieces.length !== panel2.pieces.length) return false;

        // Comparer les positions des pièces
        for (let i = 0; i < panel1.pieces.length; i++) {
            const piece1 = panel1.pieces[i];
            const piece2 = panel2.pieces[i];

            if (piece1.x !== piece2.x || piece1.y !== piece2.y ||
                piece1.width !== piece2.width || piece1.height !== piece2.height) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Optimise le placement des pièces sur plusieurs panneaux si nécessaire
 * Utilise une approche de Best Fit Decreasing pour minimiser le nombre de panneaux
 * @param {Array} pieces - Liste des pièces à placer (déjà triées)
 * @param {number} panelWidth - Largeur effective du panneau
 * @param {number} panelHeight - Hauteur effective du panneau
 * @param {number} blade - Épaisseur de la lame de scie
 * @param {number} safetyMargin - Marge de sécurité
 * @param {number} fullPanelWidth - Largeur totale du panneau
 * @param {number} fullPanelHeight - Hauteur totale du panneau
 * @returns {Array} Liste des panneaux avec leurs pièces
 */
function optimizeMultiPanelCutPlan(pieces, panelWidth, panelHeight, blade, safetyMargin, fullPanelWidth, fullPanelHeight) {
    // Les pièces sont déjà triées, ne pas re-trier
    const panels = [];

    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        let bestPanelIndex = -1;
        let bestResult = null;
        let bestWaste = Infinity;

        for (let p = 0; p < panels.length; p++) {
            const result = tryPlacePieceOnPanel(panels[p], piece, panelWidth, panelHeight, blade);
            if (result.success) {
                const waste = calculateWaste(result.panel, panelWidth, panelHeight);
                if (waste < bestWaste) {
                    bestWaste = waste;
                    bestPanelIndex = p;
                    bestResult = result;
                }
            }
        }

        if (bestPanelIndex !== -1) {
            panels[bestPanelIndex] = bestResult.panel;
        } else {
            const newPanel = {
                pieces: [],
                spaces: [{ x: 0, y: 0, width: panelWidth, height: panelHeight }],
                panelNumber: panels.length + 1,
                safetyMargin: safetyMargin,
                fullWidth: fullPanelWidth,
                fullHeight: fullPanelHeight
            };
            const result = tryPlacePieceOnPanel(newPanel, piece, panelWidth, panelHeight, blade);
            if (result.success) {
                panels.push(result.panel);
            } else {
                throw new Error('Impossible de placer la pièce ' + (piece.name || piece.width + 'x' + piece.height));
            }
        }
    }

    return panels.map(function(p) {
        return {
            pieces: p.pieces,
            panelNumber: p.panelNumber,
            safetyMargin: safetyMargin,
            fullWidth: fullPanelWidth,
            fullHeight: fullPanelHeight,
            effectiveWidth: panelWidth,
            effectiveHeight: panelHeight
        };
    });
}

/**
 * Évalue la qualité d'une disposition
 * @param {Array} panels - Liste des panneaux
 * @param {number} panelWidth - Largeur effective
 * @param {number} panelHeight - Hauteur effective
 * @returns {Object} Score avec métriques
 */
function evaluateLayout(panels, panelWidth, panelHeight) {
    let totalArea = 0;
    let usedArea = 0;
    let usableWasteCount = 0;
    const minUsableSize = 200; // Taille minimale pour qu'une chute soit exploitable (200x200mm)

    for (let p = 0; p < panels.length; p++) {
        const panel = panels[p];
        const panelArea = panelWidth * panelHeight;
        totalArea += panelArea;

        let panelUsedArea = 0;
        for (let i = 0; i < panel.pieces.length; i++) {
            panelUsedArea += panel.pieces[i].width * panel.pieces[i].height;
        }
        usedArea += panelUsedArea;

        // Calculer les chutes exploitables
        const wasteArea = panelArea - panelUsedArea;
        if (wasteArea > 0) {
            // Analyser les espaces disponibles pour voir s'il y a des chutes exploitables
            const usedZones = panel.pieces.map(function(p) {
                return { x: p.x, y: p.y, width: p.width, height: p.height };
            });

            // Chercher des rectangles exploitables dans les espaces libres
            const exploitableWastes = findExploitableWaste(usedZones, panelWidth, panelHeight, minUsableSize);
            usableWasteCount += exploitableWastes.length;
        }
    }

    const wastePercentage = ((totalArea - usedArea) / totalArea) * 100;

    return {
        wastePercentage: wastePercentage,
        usableWasteCount: usableWasteCount,
        totalWasteArea: totalArea - usedArea,
        totalArea: totalArea,
        usedArea: usedArea
    };
}

/**
 * Trouve les chutes exploitables dans un panneau
 * @param {Array} usedZones - Zones occupées
 * @param {number} panelWidth - Largeur du panneau
 * @param {number} panelHeight - Hauteur du panneau
 * @param {number} minSize - Taille minimale exploitable
 * @returns {Array} Liste des chutes exploitables
 */
function findExploitableWaste(usedZones, panelWidth, panelHeight, minSize) {
    const exploitable = [];

    // Tester des zones potentielles (simplifié)
    const testZones = [
        { x: 0, y: 0, width: panelWidth, height: panelHeight }
    ];

    for (let t = 0; t < testZones.length; t++) {
        const zone = testZones[t];
        let isUsable = zone.width >= minSize && zone.height >= minSize;

        // Vérifier si la zone chevauche une pièce
        for (let u = 0; u < usedZones.length; u++) {
            const used = usedZones[u];
            if (!(zone.x + zone.width <= used.x ||
                  zone.x >= used.x + used.width ||
                  zone.y + zone.height <= used.y ||
                  zone.y >= used.y + used.height)) {
                isUsable = false;
                break;
            }
        }

        if (isUsable) {
            exploitable.push(zone);
        }
    }

    return exploitable;
}

/**
 * Calcule le déchet (espace perdu) sur un panneau
 * @param {Object} panel - Le panneau
 * @param {number} panelWidth - Largeur du panneau
 * @param {number} panelHeight - Hauteur du panneau
 * @returns {number} Pourcentage de déchet
 */
function calculateWaste(panel, panelWidth, panelHeight) {
    const totalArea = panelWidth * panelHeight;
    let usedArea = 0;
    for (let i = 0; i < panel.pieces.length; i++) {
        usedArea += panel.pieces[i].width * panel.pieces[i].height;
    }
    return (totalArea - usedArea) / totalArea;
}

/**
 * Essaie de placer une pièce sur un panneau existant
 * @param {Object} panel - Le panneau sur lequel placer la pièce
 * @param {Object} piece - La pièce à placer
 * @param {number} panelWidth - Largeur du panneau
 * @param {number} panelHeight - Hauteur du panneau
 * @param {number} blade - Épaisseur de la lame
 * @returns {Object} Résultat avec succès et panneau mis à jour
 */
function tryPlacePieceOnPanel(panel, piece, panelWidth, panelHeight, blade) {
    const spaces = panel.spaces.slice();
    let bestSpace = null;
    let bestFit = Infinity;
    let rotated = false;

    const pieceArea = piece.width * piece.height;
    const availableArea = calculateAvailableArea(spaces);

    if (pieceArea > availableArea) {
        return { success: false };
    }

    for (let j = 0; j < spaces.length; j++) {
        const space = spaces[j];

        // Essai sans rotation
        if (piece.width <= space.width && piece.height <= space.height) {
            const fit = (space.width * space.height) - (piece.width * piece.height);
            if (fit < bestFit) {
                bestFit = fit;
                bestSpace = space;
                rotated = false;
            }
        }

        // Essai avec rotation
        if (piece.height <= space.width && piece.width <= space.height) {
            const fit = (space.width * space.height) - (piece.height * piece.width);
            if (fit < bestFit) {
                bestFit = fit;
                bestSpace = space;
                rotated = true;
            }
        }
    }

    if (!bestSpace) {
        return { success: false };
    }

    const w = rotated ? piece.height : piece.width;
    const h = rotated ? piece.width : piece.height;

    const newPieces = panel.pieces.slice();
    newPieces.push({
        x: bestSpace.x,
        y: bestSpace.y,
        width: w,
        height: h,
        originalWidth: piece.width,
        originalHeight: piece.height,
        name: piece.name,
        rotated: rotated,
        id: piece.id
    });

    const newSpaces = spaces.filter(function(s) { return s !== bestSpace; });

    // Découpe guillotine améliorée
    // Créer l'espace à droite (même hauteur que la pièce)
    const rightSpace = {
        x: bestSpace.x + w + blade,
        y: bestSpace.y,
        width: bestSpace.width - w - blade,
        height: h
    };

    // Créer l'espace en bas (toute la largeur de l'espace original)
    const bottomSpace = {
        x: bestSpace.x,
        y: bestSpace.y + h + blade,
        width: bestSpace.width,
        height: bestSpace.height - h - blade
    };

    if (rightSpace.width > 0 && rightSpace.height > 0) {
        newSpaces.push(rightSpace);
    }
    if (bottomSpace.width > 0 && bottomSpace.height > 0) {
        newSpaces.push(bottomSpace);
    }

    const mergedSpaces = mergeAdjacentSpaces(newSpaces);

    return {
        success: true,
        panel: {
            pieces: newPieces,
            spaces: mergedSpaces,
            panelNumber: panel.panelNumber
        }
    };
}

/**
 * Fusionne les espaces adjacents pour réduire la fragmentation
 * @param {Array} spaces - Liste des espaces
 * @returns {Array} Liste des espaces fusionnés
 */
function mergeAdjacentSpaces(spaces) {
    if (spaces.length <= 1) return spaces;

    const merged = [];
    const used = new Array(spaces.length).fill(false);

    for (let i = 0; i < spaces.length; i++) {
        if (used[i]) continue;

        let current = spaces[i];
        let didMerge = true;

        while (didMerge) {
            didMerge = false;
            for (let j = 0; j < spaces.length; j++) {
                if (i === j || used[j]) continue;
                const other = spaces[j];

                // Fusion horizontale
                if (current.y === other.y && current.height === other.height) {
                    if (current.x + current.width === other.x) {
                        current = {
                            x: current.x,
                            y: current.y,
                            width: current.width + other.width,
                            height: current.height
                        };
                        used[j] = true;
                        didMerge = true;
                    } else if (other.x + other.width === current.x) {
                        current = {
                            x: other.x,
                            y: current.y,
                            width: current.width + other.width,
                            height: current.height
                        };
                        used[j] = true;
                        didMerge = true;
                    }
                }

                // Fusion verticale
                if (current.x === other.x && current.width === other.width) {
                    if (current.y + current.height === other.y) {
                        current = {
                            x: current.x,
                            y: current.y,
                            width: current.width,
                            height: current.height + other.height
                        };
                        used[j] = true;
                        didMerge = true;
                    } else if (other.y + other.height === current.y) {
                        current = {
                            x: current.x,
                            y: other.y,
                            width: current.width,
                            height: current.height + other.height
                        };
                        used[j] = true;
                        didMerge = true;
                    }
                }
            }
        }

        merged.push(current);
        used[i] = true;
    }

    return merged;
}

/**
 * Calcule la surface totale disponible dans les espaces
 * @param {Array} spaces - Liste des espaces disponibles
 * @returns {number} Surface totale disponible
 */
function calculateAvailableArea(spaces) {
    return spaces.reduce(function(sum, space) {
        return sum + (space.width * space.height);
    }, 0);
}



/**
 * Dessine un seul panneau
 * @param {Object} panel - Panneau avec pièces et métadonnées
 * @param {number} panelWidth - Largeur du panneau
 * @param {number} panelHeight - Hauteur du panneau
 * @returns {HTMLCanvasElement} Canvas avec le plan de coupe
 */
function drawSinglePanel(panel, panelWidth, panelHeight) {
    const wrapper = document.getElementById('canvasWrapper');
    const maxWidth = wrapper.clientWidth - 32;
    const maxHeight = 600;

    // Calculer le scale pour que le panneau rentre dans l'espace disponible
    // panelWidth = Longueur (dimension la plus grande, affichée horizontalement)
    // panelHeight = Largeur (dimension la plus petite, affichée verticalement)
    const scaleWidth = maxWidth / panelWidth;
    const scaleHeight = maxHeight / panelHeight;
    const scale = Math.min(scaleWidth, scaleHeight);

    const canvas = document.createElement('canvas');
    // Arrondir aux pixels entiers pour éviter le flou
    canvas.width = Math.round(panelWidth * scale);
    canvas.height = Math.round(panelHeight * scale);

    const ctx = canvas.getContext('2d');

    const showWaste = document.getElementById('showWaste') ? document.getElementById('showWaste').checked : true;
    const showCutLines = document.getElementById('showCutLines') ? document.getElementById('showCutLines').checked : true;

    // Fond du panneau
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Marge de sécurité (si présente)
    const safetyMargin = panel.safetyMargin || 0;
    if (safetyMargin > 0) {
        const marginScaled = Math.round(safetyMargin * scale);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(0, 0, canvas.width, marginScaled); // Top
        ctx.fillRect(0, canvas.height - marginScaled, canvas.width, marginScaled); // Bottom
        ctx.fillRect(0, 0, marginScaled, canvas.height); // Left
        ctx.fillRect(canvas.width - marginScaled, 0, marginScaled, canvas.height); // Right
    }

    // Bordure du panneau
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

    const plan = panel.pieces || panel;
    const effectiveWidth = panel.effectiveWidth || panelWidth;
    const effectiveHeight = panel.effectiveHeight || panelHeight;

    // Dessiner les chutes (espaces non utilisés) en premier
    if (showWaste) {
        // Calculer les zones utilisées
        const usedAreas = [];
        for (let i = 0; i < plan.length; i++) {
            const piece = plan[i];
            usedAreas.push({
                x: Math.round((piece.x + safetyMargin) * scale),
                y: Math.round((piece.y + safetyMargin) * scale),
                width: Math.round(piece.width * scale),
                height: Math.round(piece.height * scale)
            });
        }

        // Afficher la zone effective disponible
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(
            Math.round(safetyMargin * scale),
            Math.round(safetyMargin * scale),
            Math.round(effectiveWidth * scale),
            Math.round(effectiveHeight * scale)
        );

        // Masquer les zones utilisées
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < usedAreas.length; i++) {
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.fillRect(usedAreas[i].x, usedAreas[i].y, usedAreas[i].width, usedAreas[i].height);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // Dessiner les pièces
    for (let i = 0; i < plan.length; i++) {
        const piece = plan[i];
        const x = Math.round((piece.x + safetyMargin) * scale);
        const y = Math.round((piece.y + safetyMargin) * scale);
        const w = Math.round(piece.width * scale);
        const h = Math.round(piece.height * scale);

        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, w, h);

        ctx.globalAlpha = 1;

        if (showCutLines) {
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
        }

        ctx.fillStyle = '#1e293b';
        ctx.font = Math.max(10, 12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const dimensionText = piece.originalWidth + '×' + piece.originalHeight + (piece.rotated ? ' ↻' : '');

        if (piece.name) {
            // Afficher le nom et les dimensions sur deux lignes
            ctx.font = 'bold ' + Math.max(10, 13 * scale) + 'px sans-serif';
            ctx.fillText(piece.name, x + w / 2, y + h / 2 - Math.max(8, 10 * scale));
            ctx.font = Math.max(9, 11 * scale) + 'px sans-serif';
            ctx.fillText(dimensionText, x + w / 2, y + h / 2 + Math.max(8, 10 * scale));
        } else {
            // Afficher seulement les dimensions
            ctx.fillText(dimensionText, x + w / 2, y + h / 2);
        }
    }

    return canvas;
}


/**
 * Génère la feuille de débit pour un panneau
 * @param {Array} pieces - Liste des pièces du panneau
 * @returns {string} HTML de la feuille de débit
 */
function generateCuttingList(pieces) {
    let html = '<div class="cutting-list">';
    html += '<h4>Feuille de débit</h4>';
    html += '<table class="cutting-table">';
    html += '<thead><tr><th>N°</th><th>Nom</th><th>Longueur (mm)</th><th>Largeur (mm)</th></tr></thead>';
    html += '<tbody>';

    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        html += '<tr>';
        html += '<td>' + (i + 1) + '</td>';
        html += '<td>' + (piece.name || '-') + '</td>';
        html += '<td>' + piece.originalWidth + '</td>';
        html += '<td>' + piece.originalHeight + '</td>';
        html += '</tr>';
    }

    html += '</tbody></table></div>';
    return html;
}

/**
 * Affiche le récapitulatif en haut de page
 * @param {Array} panels - Liste des panneaux
 */
function displaySummary(panels) {
    const summaryContainer = document.getElementById('summary');
    const panelCost = parseFloat(document.getElementById('panelCost').value) || 0;

    let totalPieces = 0;
    let totalCuts = 0;

    for (let i = 0; i < panels.length; i++) {
        totalPieces += panels[i].pieces.length;
        totalCuts += panels[i].pieces.length;
    }

    let summaryHTML = '<div class="summary-grid">';
    summaryHTML += '<div class="summary-item"><div class="summary-value">' + panels.length + '</div><div class="summary-label">Panneau(x)</div></div>';
    summaryHTML += '<div class="summary-item"><div class="summary-value">' + totalPieces + '</div><div class="summary-label">Pièces</div></div>';
    summaryHTML += '<div class="summary-item"><div class="summary-value">' + totalCuts + '</div><div class="summary-label">Découpes</div></div>';

    if (panelCost > 0) {
        const totalCost = (panels.length * panelCost).toFixed(2);
        summaryHTML += '<div class="summary-item"><div class="summary-value">' + totalCost + ' €</div><div class="summary-label">Coût total</div></div>';
    }

    summaryHTML += '</div>';
    summaryContainer.innerHTML = summaryHTML;
    summaryContainer.style.display = 'block';
}

/**
 * Affiche un panneau spécifique avec animation
 * @param {number} index - Index du panneau à afficher
 * @param {string} direction - Direction de la transition ('next' ou 'prev')
 */
function showPanel(index, direction) {
    if (index < 0 || index >= panels.length) return;

    const previousIndex = currentPanelIndex;
    currentPanelIndex = index;
    const panel = panels[index];
    const panelWidth = panel.fullWidth || parseInt(document.getElementById('panelWidth').value);
    const panelHeight = panel.fullHeight || parseInt(document.getElementById('panelHeight').value);

    const wrapper = document.getElementById('canvasWrapper');

    const canvas = drawSinglePanel(panel, panelWidth, panelHeight);

    if (direction) {
        const animationClass = direction === 'next' ? 'panel-transition' : 'panel-transition-reverse';
        canvas.classList.add(animationClass);

        canvas.addEventListener('animationend', function() {
            canvas.classList.remove(animationClass);
        }, { once: true });
    }

    wrapper.innerHTML = '';
    wrapper.appendChild(canvas);

    updateNavigation();
    displayPanelInstructions(panel, direction);
}

/**
 * Met à jour la navigation entre panneaux
 */
function updateNavigation() {
    const navigation = document.getElementById('panelNavigation');

    if (panels.length <= 1) {
        navigation.style.display = 'none';
        return;
    }

    navigation.style.display = 'flex';
    navigation.innerHTML =
        '<button type="button" class="nav-button" onclick="previousPanel()" ' + (currentPanelIndex === 0 ? 'disabled' : '') + '>← Précédent</button>' +
        '<span class="panel-indicator">Panneau ' + (currentPanelIndex + 1) + ' / ' + panels.length + '</span>' +
        '<button type="button" class="nav-button" onclick="nextPanel()" ' + (currentPanelIndex === panels.length - 1 ? 'disabled' : '') + '>Suivant →</button>';
}

/**
 * Passe au panneau précédent
 */
function previousPanel() {
    if (currentPanelIndex > 0) {
        showPanel(currentPanelIndex - 1, 'prev');
    }
}

/**
 * Passe au panneau suivant
 */
function nextPanel() {
    if (currentPanelIndex < panels.length - 1) {
        showPanel(currentPanelIndex + 1, 'next');
    }
}

/**
 * Met à jour la navigation entre dispositions
 */
function updateLayoutNavigation() {
    const navigation = document.getElementById('layoutNavigation');

    if (!allLayouts || allLayouts.length <= 1) {
        navigation.style.display = 'none';
        return;
    }

    navigation.style.display = 'flex';
    navigation.style.alignItems = 'center';
    navigation.style.gap = '0.5rem';
    navigation.style.padding = '0.5rem';
    navigation.style.background = '#f1f5f9';
    navigation.style.borderRadius = '6px';
    navigation.style.fontSize = '0.8125rem';

    const currentLayout = allLayouts[currentLayoutIndex];

    navigation.innerHTML =
        '<button type="button" class="nav-button" style="padding: 0.375rem 0.625rem; font-size: 0.75rem;" onclick="previousLayout()" ' + (currentLayoutIndex === 0 ? 'disabled' : '') + '>←</button>' +
        '<div style="display: flex; flex-direction: column; align-items: center; min-width: 200px;">' +
            '<div style="font-weight: 600; color: var(--primary);">Disposition ' + (currentLayoutIndex + 1) + '/' + allLayouts.length + '</div>' +
            '<div style="font-size: 0.75rem; color: var(--text-light);">' + currentLayout.strategy + '</div>' +
            '<div style="font-size: 0.75rem; margin-top: 0.25rem;">' +
                '<span style="color: var(--text-light);">Chutes: </span>' +
                '<span style="font-weight: 600; color: ' + (currentLayout.wastePercentage < 10 ? 'var(--success)' : currentLayout.wastePercentage < 20 ? 'var(--primary)' : 'var(--danger)') + ';">' + currentLayout.wastePercentage.toFixed(1) + '%</span>' +
                (currentLayout.usableWasteCount > 0 ? ' <span style="color: var(--success);">• ' + currentLayout.usableWasteCount + ' exploitables</span>' : '') +
            '</div>' +
        '</div>' +
        '<button type="button" class="nav-button" style="padding: 0.375rem 0.625rem; font-size: 0.75rem;" onclick="nextLayout()" ' + (currentLayoutIndex === allLayouts.length - 1 ? 'disabled' : '') + '>→</button>';
}

/**
 * Passe à la disposition précédente
 */
function previousLayout() {
    if (currentLayoutIndex > 0) {
        currentLayoutIndex--;
        switchToLayout(currentLayoutIndex);
    }
}

/**
 * Passe à la disposition suivante
 */
function nextLayout() {
    if (currentLayoutIndex < allLayouts.length - 1) {
        currentLayoutIndex++;
        switchToLayout(currentLayoutIndex);
    }
}

/**
 * Change la disposition affichée
 * @param {number} index - Index de la disposition
 */
function switchToLayout(index) {
    if (index < 0 || index >= allLayouts.length) return;

    currentLayoutIndex = index;
    panels = allLayouts[index].panels;
    currentPanelIndex = 0;

    displaySummary(panels);
    showPanel(currentPanelIndex);
    updateLayoutNavigation();
}

/**
 * Affiche les instructions pour un panneau spécifique avec animation
 * @param {Object} panel - Le panneau à afficher
 * @param {string} direction - Direction de la transition
 */
function displayPanelInstructions(panel, direction) {
    const cutList = document.getElementById('cutList');
    const cutSteps = document.getElementById('cutSteps');

    const sorted = panel.pieces.slice().sort(function(a, b) {
        return a.y === b.y ? a.x - b.x : a.y - b.y;
    });

    let instructionsHTML = '<h3 style="margin-bottom: 1rem; font-size: 1.1rem; font-weight: 600;">Panneau ' + panel.panelNumber + '</h3>';
    instructionsHTML += generateCuttingList(sorted);

    if (direction) {
        cutSteps.classList.add('instructions-transition');
        cutSteps.addEventListener('animationend', function() {
            cutSteps.classList.remove('instructions-transition');
        }, { once: true });
    }

    cutSteps.innerHTML = instructionsHTML;
    cutList.style.display = 'block';
}

/**
 * Génère un PDF du plan de coupe avec page de garde
 */
function generatePDF() {
    if (!panels || panels.length === 0) {
        alert('Veuillez d\'abord générer un plan de coupe');
        return;
    }

    const projectTitle = document.getElementById('projectTitle').value || 'Projet sans titre';
    const panelWidth = parseInt(document.getElementById('panelWidth').value);
    const panelHeight = parseInt(document.getElementById('panelHeight').value);
    const panelThickness = parseFloat(document.getElementById('panelThickness').value);
    const panelCost = parseFloat(document.getElementById('panelCost').value) || 0;

    const printContainer = document.createElement('div');
    printContainer.id = 'printContainer';
    printContainer.style.display = 'none';

    const coverPage = createCoverPage(projectTitle, panelWidth, panelHeight, panelThickness, panelCost);
    printContainer.appendChild(coverPage);

    for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const panelDiv = document.createElement('div');
        panelDiv.className = 'panel-for-print';

        const title = document.createElement('h2');
        title.textContent = 'Panneau ' + panel.panelNumber;
        title.style.marginBottom = '1rem';
        title.style.fontSize = '1.5rem';
        title.style.fontWeight = '700';
        title.style.color = '#2563eb';
        panelDiv.appendChild(title);

        const canvasContainer = document.createElement('div');
        canvasContainer.style.marginBottom = '1.5rem';
        canvasContainer.style.textAlign = 'center';

        const canvas = drawSinglePanel(panel, panelWidth, panelHeight);
        canvas.style.display = 'block';
        canvas.style.maxWidth = '600px';
        canvas.style.margin = '0 auto';
        canvas.style.height = 'auto';
        canvasContainer.appendChild(canvas);
        panelDiv.appendChild(canvasContainer);

        const sorted = panel.pieces.slice().sort(function(a, b) {
            return a.y === b.y ? a.x - b.x : a.y - b.y;
        });

        const cuttingListHTML = generateCuttingList(sorted);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cuttingListHTML;
        panelDiv.appendChild(tempDiv.firstChild);

        printContainer.appendChild(panelDiv);
    }

    document.body.appendChild(printContainer);

    const mainContainer = document.querySelector('.container > .grid');
    const summary = document.getElementById('summary');

    mainContainer.style.display = 'none';
    summary.style.display = 'none';
    printContainer.style.display = 'block';

    window.print();

    mainContainer.style.display = '';
    summary.style.display = 'block';
    printContainer.style.display = 'none';
    document.body.removeChild(printContainer);
}

/**
 * Crée la page de garde du PDF
 */
function createCoverPage(projectTitle, panelWidth, panelHeight, panelThickness, panelCost) {
    const coverPage = document.createElement('div');
    coverPage.className = 'cover-page';
    coverPage.style.pageBreakAfter = 'always';
    coverPage.style.display = 'flex';
    coverPage.style.flexDirection = 'column';
    coverPage.style.justifyContent = 'center';
    coverPage.style.alignItems = 'center';
    coverPage.style.minHeight = '100vh';
    coverPage.style.textAlign = 'center';
    coverPage.style.padding = '2rem';

    const mainTitle = document.createElement('h1');
    mainTitle.textContent = projectTitle;
    mainTitle.style.fontSize = '3rem';
    mainTitle.style.fontWeight = '700';
    mainTitle.style.color = '#2563eb';
    mainTitle.style.marginBottom = '1rem';
    coverPage.appendChild(mainTitle);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Plan de Coupe - Menuiserie';
    subtitle.style.fontSize = '1.5rem';
    subtitle.style.color = '#64748b';
    subtitle.style.marginBottom = '3rem';
    coverPage.appendChild(subtitle);

    const date = document.createElement('p');
    date.textContent = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    date.style.fontSize = '1.1rem';
    date.style.color = '#64748b';
    date.style.marginBottom = '3rem';
    coverPage.appendChild(date);

    const summaryBox = document.createElement('div');
    summaryBox.style.background = '#f8fafc';
    summaryBox.style.border = '2px solid #2563eb';
    summaryBox.style.borderRadius = '12px';
    summaryBox.style.padding = '2rem';
    summaryBox.style.maxWidth = '600px';
    summaryBox.style.width = '100%';

    const summaryTitle = document.createElement('h2');
    summaryTitle.textContent = 'Récapitulatif';
    summaryTitle.style.fontSize = '1.5rem';
    summaryTitle.style.fontWeight = '600';
    summaryTitle.style.marginBottom = '1.5rem';
    summaryTitle.style.color = '#2563eb';
    summaryBox.appendChild(summaryTitle);

    let totalPieces = 0;
    for (let i = 0; i < panels.length; i++) {
        totalPieces += panels[i].pieces.length;
    }

    const summaryStats = [
        { label: 'Nombre de panneaux', value: panels.length },
        { label: 'Nombre de pièces', value: totalPieces },
        { label: 'Dimensions panneau', value: panelWidth + ' × ' + panelHeight + ' × ' + panelThickness + ' mm' }
    ];

    if (panelCost > 0) {
        summaryStats.push({ label: 'Coût total', value: (panels.length * panelCost).toFixed(2) + ' €' });
    }

    for (let i = 0; i < summaryStats.length; i++) {
        const statLine = document.createElement('div');
        statLine.style.display = 'flex';
        statLine.style.justifyContent = 'space-between';
        statLine.style.padding = '0.75rem 0';
        statLine.style.borderBottom = i < summaryStats.length - 1 ? '1px solid #e2e8f0' : 'none';

        const label = document.createElement('span');
        label.textContent = summaryStats[i].label;
        label.style.fontWeight = '500';
        label.style.color = '#1e293b';
        statLine.appendChild(label);

        const value = document.createElement('span');
        value.textContent = summaryStats[i].value;
        value.style.fontWeight = '700';
        value.style.color = '#2563eb';
        value.style.fontSize = '1.1rem';
        statLine.appendChild(value);

        summaryBox.appendChild(statLine);
    }

    coverPage.appendChild(summaryBox);

    return coverPage;
}
