/**
 * Plan de Coupe - Application principale
 * Gestion des pièces et génération du plan de coupe optimisé
 */

let pieces = [];
let cutPlan = null;
let panels = [];
let currentPanelIndex = 0;

/**
 * Charge l'historique depuis le localStorage
 */
function loadHistory() {
    const history = localStorage.getItem('cutPlanHistory');
    return history ? JSON.parse(history) : [];
}

/**
 * Sauvegarde l'historique dans le localStorage
 * @param {Array} history - L'historique à sauvegarder
 */
function saveHistory(history) {
    localStorage.setItem('cutPlanHistory', JSON.stringify(history));
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
});

/**
 * Ajoute une pièce à la liste
 */
function addPiece() {
    const width = parseInt(document.getElementById('pieceWidth').value);
    const height = parseInt(document.getElementById('pieceHeight').value);
    const quantity = parseInt(document.getElementById('pieceQuantity').value);

    if (!width || !height || !quantity) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    for (let i = 0; i < quantity; i++) {
        pieces.push({ width: width, height: height, id: Date.now() + i });
    }

    updatePiecesList();
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
        const key = piece.width + 'x' + piece.height;
        if (!acc[key]) {
            acc[key] = { width: piece.width, height: piece.height, count: 0, indices: [] };
        }
        acc[key].count++;
        acc[key].indices.push(index);
        return acc;
    }, {});

    list.innerHTML = Object.values(grouped).map(function(group) {
        return '<div class="piece-item">' +
                '<div>' +
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

    if (!panelWidth || !panelHeight) {
        alert('Veuillez définir les dimensions du panneau');
        return;
    }

    panels = optimizeMultiPanelCutPlan(pieces, panelWidth, panelHeight, bladeThickness);
    currentPanelIndex = 0;

    addToHistory(panels);
    displaySummary(panels);
    showPanel(currentPanelIndex);
}

/**
 * Optimise le placement des pièces sur plusieurs panneaux si nécessaire
 * Utilise une approche de Best Fit Decreasing pour minimiser le nombre de panneaux
 * @param {Array} pieces - Liste des pièces à placer
 * @param {number} panelWidth - Largeur du panneau
 * @param {number} panelHeight - Hauteur du panneau
 * @param {number} blade - Épaisseur de la lame de scie
 * @returns {Array} Liste des panneaux avec leurs pièces
 */
function optimizeMultiPanelCutPlan(pieces, panelWidth, panelHeight, blade) {
    const sortedPieces = pieces.slice().sort(function(a, b) {
        return (b.width * b.height) - (a.width * a.height);
    });

    const panels = [];

    for (let i = 0; i < sortedPieces.length; i++) {
        const piece = sortedPieces[i];
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
                panelNumber: panels.length + 1
            };
            const result = tryPlacePieceOnPanel(newPanel, piece, panelWidth, panelHeight, blade);
            if (result.success) {
                panels.push(result.panel);
            }
        }
    }

    return panels.map(function(p) {
        return {
            pieces: p.pieces,
            panelNumber: p.panelNumber
        };
    });
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

        if (piece.width <= space.width && piece.height <= space.height) {
            const fit = (space.width * space.height) - (piece.width * piece.height);
            if (fit < bestFit) {
                bestFit = fit;
                bestSpace = space;
                rotated = false;
            }
        }

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
        rotated: rotated,
        id: piece.id
    });

    const newSpaces = spaces.filter(function(s) { return s !== bestSpace; });

    // Utilisation améliorée de la découpe guillotine
    const rightSpace = {
        x: bestSpace.x + w + blade,
        y: bestSpace.y,
        width: bestSpace.width - w - blade,
        height: bestSpace.height
    };
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
 * @param {Array} plan - Plan de coupe du panneau
 * @param {number} panelWidth - Largeur du panneau
 * @param {number} panelHeight - Hauteur du panneau
 * @returns {HTMLCanvasElement} Canvas avec le plan de coupe
 */
function drawSinglePanel(plan, panelWidth, panelHeight) {
    const wrapper = document.getElementById('canvasWrapper');
    const maxWidth = wrapper.clientWidth - 32;
    const scale = Math.min(maxWidth / panelWidth, 600 / panelHeight);

    const canvas = document.createElement('canvas');
    canvas.width = panelWidth * scale;
    canvas.height = panelHeight * scale;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

    for (let i = 0; i < plan.length; i++) {
        const piece = plan[i];
        const x = piece.x * scale;
        const y = piece.y * scale;
        const w = piece.width * scale;
        const h = piece.height * scale;

        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, w, h);

        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#1e293b';
        ctx.font = Math.max(10, 12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = piece.originalWidth + '×' + piece.originalHeight + (piece.rotated ? ' ↻' : '');
        ctx.fillText(text, x + w / 2, y + h / 2);
    }

    return canvas;
}


/**
 * Génère la feuille de débit pour un panneau
 * @param {Array} pieces - Liste des pièces du panneau
 * @returns {string} HTML de la feuille de débit
 */
function generateCuttingList(pieces) {
    const grouped = {};
    let pieceCounter = 1;

    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        const key = piece.originalWidth + 'x' + piece.originalHeight;
        if (!grouped[key]) {
            grouped[key] = {
                width: piece.originalWidth,
                height: piece.originalHeight,
                count: 0,
                pieceNumbers: []
            };
        }
        grouped[key].count++;
        grouped[key].pieceNumbers.push(pieceCounter);
        pieceCounter++;
    }

    let html = '<div class="cutting-list">';
    html += '<h4>Feuille de débit</h4>';
    html += '<table class="cutting-table">';
    html += '<thead><tr><th>Pièce(s)</th><th>Largeur (mm)</th><th>Hauteur (mm)</th><th>Quantité</th></tr></thead>';
    html += '<tbody>';

    for (let key in grouped) {
        const item = grouped[key];
        html += '<tr>';
        html += '<td>' + item.pieceNumbers.join(', ') + '</td>';
        html += '<td>' + item.width + '</td>';
        html += '<td>' + item.height + '</td>';
        html += '<td>' + item.count + '</td>';
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
    const panelWidth = parseInt(document.getElementById('panelWidth').value);
    const panelHeight = parseInt(document.getElementById('panelHeight').value);

    const wrapper = document.getElementById('canvasWrapper');

    const canvas = drawSinglePanel(panel.pieces, panelWidth, panelHeight);

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

        const canvas = drawSinglePanel(panel.pieces, panelWidth, panelHeight);
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
