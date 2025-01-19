console.log('JavaScript chargé !');

// Gestion de l'état de l'application
let objectifsMaster = [];
let semaineActuelle = null;
let dateSelectionnee = new Date().toISOString().split('T')[0];
let progressionChart = null;
let currentMonth = new Date();

// Fonction pour obtenir le lundi de la semaine courante
function getLundiCourant() {
    const aujourdhui = new Date();
    const jour = aujourdhui.getDay();
    const diff = aujourdhui.getDate() - jour + (jour === 0 ? -6 : 1);
    return new Date(aujourdhui.setDate(diff));
}

// Fonction pour obtenir le dimanche de la semaine courante
function getDimancheCourant() {
    const lundi = new Date(getLundiCourant());
    const dimanche = new Date(lundi);
    dimanche.setDate(dimanche.getDate() + 6);
    return dimanche.toISOString().split('T')[0];
}

// Fonction pour formater une date en français
function formaterDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Fonction pour sauvegarder les données
async function sauvegarderDonnees(file, data) {
    try {
        console.log('Sauvegarde des données:', { file, data });
        const response = await fetch('http://localhost:8080/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file: file,
                data: data
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
        }
        
        const result = await response.json();
        console.log('Sauvegarde réussie:', result);
        return result;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des données:', error);
        throw error;
    }
}

// Fonction pour mettre à jour le graphique de progression
function updateProgressionChart() {
    const ctx = document.getElementById('progressionChart');
    if (!ctx) return;
    
    if (progressionChart) {
        progressionChart.destroy();
    }
    
    const dates = [];
    const progres = [];
    
    if (semaineActuelle && semaineActuelle.progressionQuotidienne) {
        const debut = new Date(semaineActuelle.debut);
        const fin = new Date(semaineActuelle.fin);
        
        for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dates.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
            
            // Calculer la moyenne pour cette date
            let totalProgres = 0;
            const nbObjectifsTotal = objectifsMaster.length;

            objectifsMaster.forEach(objectif => {
                const progresJour = semaineActuelle.progressionQuotidienne[dateStr]?.[objectif.id] || 0;
                totalProgres += progresJour;
            });

            const moyenneProgres = nbObjectifsTotal > 0 ? Math.round(totalProgres / nbObjectifsTotal) : 0;
            progres.push(moyenneProgres);
        }
    }
    
    progressionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Progression quotidienne',
                data: progres,
                borderColor: 'rgb(99, 102, 241)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Fonction pour charger la semaine actuelle
async function chargerSemaineActuelle() {
    try {
        const response = await fetch('http://localhost:8080/load?file=semaines.json');
        const data = await response.json();
        semaineActuelle = data;

        // Charger aussi les détails des objectifs depuis objectifs_master
        const responseMaster = await fetch('http://localhost:8080/load?file=objectifs_master.json');
        const dataMaster = await responseMaster.json();
        objectifsMaster = dataMaster.objectifs || [];

        // Mettre à jour l'affichage
        afficherObjectifs();
        updateProgressionChart();
    } catch (error) {
        console.error('Erreur lors du chargement de la semaine:', error);
    }
}

// Fonction pour afficher les objectifs
async function afficherObjectifs() {
    const objectifsList = document.getElementById('objectifs-list');
    if (!objectifsList || !semaineActuelle) return;

    // Récupérer la date sélectionnée ou utiliser la date du jour
    const dateSelectionnee = new Date().toISOString().split('T')[0];
    const progressionDuJour = semaineActuelle.progressionQuotidienne[dateSelectionnee] || {};

    // Vider la liste
    objectifsList.innerHTML = '';

    // Pour chaque objectif du jour
    Object.entries(progressionDuJour).forEach(([objectifId, progres]) => {
        // Trouver les détails de l'objectif dans objectifsMaster
        const objectif = objectifsMaster.find(obj => obj.id === objectifId);
        if (!objectif) return;

        const li = document.createElement('li');
        li.className = 'mb-4 p-4 bg-white rounded-lg shadow flex items-center justify-between';
        li.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center space-x-2">
                    <span class="text-lg font-medium">${objectif.titre}</span>
                    <span class="px-2 py-1 text-xs rounded-full ${getCategoryClass(objectif.categorie)}">
                        ${objectif.categorie}
                    </span>
                </div>
                <div class="mt-2">
                    <input type="range" 
                           min="0" 
                           max="100" 
                           value="${progres}" 
                           class="w-full"
                           onchange="mettreAJourProgres('${objectifId}', this.value)">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>0%</span>
                        <span>${progres}%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>
        `;
        objectifsList.appendChild(li);
    });

    // Mettre à jour le progrès du jour
    afficherProgresJour();
}

// Fonction pour obtenir la classe CSS en fonction de la catégorie
function getCategoryClass(categorie) {
    switch (categorie) {
        case 'personnel':
            return 'bg-blue-100 text-blue-800';
        case 'professionnel':
            return 'bg-green-100 text-green-800';
        case 'sante':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Fonction pour mettre à jour la valeur du progrès en temps réel
function updateProgressValue(input, objectifId) {
    const progressValue = input.closest('.flex-1').querySelector('.progress-value');
    if (progressValue) {
        progressValue.textContent = `${input.value}%`;
    }
}

// Fonction pour mettre à jour le progrès d'un objectif
async function mettreAJourProgres(objectifId, nouvelleValeur) {
    const dateSelectionnee = new Date().toISOString().split('T')[0];
    if (!semaineActuelle.progressionQuotidienne[dateSelectionnee]) {
        semaineActuelle.progressionQuotidienne[dateSelectionnee] = {};
    }
    semaineActuelle.progressionQuotidienne[dateSelectionnee][objectifId] = parseInt(nouvelleValeur);

    try {
        await sauvegarderDonnees('semaines.json', semaineActuelle);
        afficherProgresJour();
        updateProgressionChart();
    } catch (error) {
        console.error('Erreur lors de la mise à jour du progrès:', error);
    }
}

// Fonction pour afficher le progrès du jour
function afficherProgresJour() {
    const dateSelectionnee = new Date().toISOString().split('T')[0];
    const progressionDuJour = semaineActuelle?.progressionQuotidienne[dateSelectionnee] || {};
    const objectifs = Object.values(progressionDuJour);
    
    if (objectifs.length === 0) {
        document.getElementById('progres-jour').textContent = '0%';
        return;
    }

    const progresMoyen = objectifs.reduce((sum, val) => sum + val, 0) / objectifs.length;
    document.getElementById('progres-jour').textContent = `${Math.round(progresMoyen)}%`;
}

// Fonction pour charger les objectifs
async function chargerObjectifsMaster() {
    try {
        const response = await fetch('http://localhost:8080/load?file=objectifs_master.json');
        const data = await response.json();
        objectifsMaster = data.objectifs || [];
    } catch (error) {
        console.error('Erreur lors du chargement des objectifs:', error);
        objectifsMaster = [];
    }
}

// Fonction pour initialiser les gestionnaires d'événements
function initEventListeners() {
    // Gestionnaire pour le formulaire d'ajout d'objectif
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('objectif-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Récupérer les valeurs du formulaire
                const titre = document.getElementById('objectif').value;
                const categorie = document.getElementById('categorie').value;
                
                // Créer un nouvel objectif
                const nouvelObjectif = {
                    id: 'obj_' + Date.now(),
                    titre: titre,
                    categorie: categorie,
                    date_creation: new Date().toISOString()
                };
                
                try {
                    // Charger les objectifs existants
                    const response = await fetch('http://localhost:8080/load?file=objectifs_master.json');
                    const data = await response.json();
                    
                    // Ajouter le nouvel objectif
                    data.objectifs = data.objectifs || [];
                    data.objectifs.push(nouvelObjectif);
                    
                    // Sauvegarder les changements dans objectifs_master.json
                    await fetch('http://localhost:8080/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file: 'objectifs_master.json',
                            data: data
                        })
                    });

                    // Ajouter l'objectif à la semaine actuelle
                    const responseSemaine = await fetch('http://localhost:8080/load?file=semaines.json');
                    const dataSemaine = await responseSemaine.json();
                    
                    // Pour chaque jour de la semaine
                    Object.keys(dataSemaine.progressionQuotidienne).forEach(date => {
                        dataSemaine.progressionQuotidienne[date][nouvelObjectif.id] = 0;
                    });

                    // Sauvegarder les changements dans semaines.json
                    await fetch('http://localhost:8080/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file: 'semaines.json',
                            data: dataSemaine
                        })
                    });

                    // Recharger les données et mettre à jour l'affichage
                    await chargerSemaineActuelle();
                    afficherObjectifs();
                    
                    // Réinitialiser le formulaire
                    form.reset();
                    
                    // Afficher un message de succès
                    alert('Objectif ajouté avec succès !');
                    
                } catch (error) {
                    console.error('Erreur lors de l\'ajout de l\'objectif:', error);
                    alert('Une erreur est survenue lors de l\'ajout de l\'objectif');
                }
            });
        }
    });
    
    // Gestionnaire pour le bouton de sauvegarde
    const saveButton = document.getElementById('save-button');
    if (saveButton) {
        saveButton.addEventListener('click', sauvegarderTousLesProgres);
    }
    
    // Gestionnaire pour le calendrier
    const calendarTrigger = document.getElementById('calendar-trigger');
    const calendarContainer = document.getElementById('calendar-container');
    if (calendarTrigger && calendarContainer) {
        calendarTrigger.addEventListener('click', () => {
            const calendar = document.getElementById('calendar');
            if (calendar) {
                calendar.classList.toggle('hidden');
            }
        });
    }
    
    // Gestionnaire pour les jours du calendrier
    const calendarDays = document.getElementById('calendar-days');
    if (calendarDays) {
        calendarDays.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (dayElement && dayElement.dataset.date) {
                dateSelectionnee = dayElement.dataset.date;
                document.getElementById('selected-date').textContent = formaterDate(dateSelectionnee);
                document.getElementById('calendar').classList.add('hidden');
                afficherObjectifs();
                afficherProgresJour();
            }
        });
    }
    
    // Gestionnaire pour les sliders de progression
    document.addEventListener('input', (e) => {
        if (e.target.type === 'range') {
            const objectifId = e.target.getAttribute('data-objectif-id');
            if (objectifId) {
                const valeur = parseInt(e.target.value);
                mettreAJourProgres(objectifId, valeur);
            }
        }
    });
}

// Fonction pour initialiser le calendrier
function initCalendar() {
    console.log('Initialisation du calendrier...');
    renderCalendar();
}

// Fonction pour afficher le calendrier
function renderCalendar() {
    console.log('Rendu du calendrier...');
    const monthYear = document.getElementById('month-year');
    const calendarDays = document.getElementById('calendar-days');
    
    if (!monthYear || !calendarDays) return;
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    monthYear.textContent = new Date(year, month).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let html = '';
    
    // Ajouter les jours du mois précédent
    const firstDayIndex = (firstDay.getDay() + 6) % 7; // Lundi = 0
    const prevLastDay = new Date(year, month, 0).getDate();
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const day = prevLastDay - i;
        html += `<div class="calendar-day text-gray-400">${day}</div>`;
    }
    
    // Ajouter les jours du mois actuel
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day).toISOString().split('T')[0];
        const isToday = date === new Date().toISOString().split('T')[0];
        const isSelected = date === dateSelectionnee;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        
        html += `<div class="${classes}" data-date="${date}">${day}</div>`;
    }
    
    // Ajouter les jours du mois suivant
    const lastDayIndex = (lastDay.getDay() + 6) % 7;
    const nextDays = 7 - lastDayIndex - 1;
    
    for (let i = 1; i <= nextDays; i++) {
        html += `<div class="calendar-day text-gray-400">${i}</div>`;
    }
    
    calendarDays.innerHTML = html;
}

// Ajouter les écouteurs d'événements pour les filtres
function initFiltres() {
    const filtreCategorie = document.getElementById('filtre-categorie');
    const filtreDate = document.getElementById('filtre-date');
    const filtreRecherche = document.getElementById('filtre-recherche');
    
    if (filtreCategorie) {
        filtreCategorie.addEventListener('change', afficherObjectifs);
    }
    
    if (filtreDate) {
        filtreDate.addEventListener('change', afficherObjectifs);
    }
    
    if (filtreRecherche) {
        filtreRecherche.addEventListener('input', afficherObjectifs);
    }
}

// Initialiser les filtres au chargement
document.addEventListener('DOMContentLoaded', () => {
    initFiltres();
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialiser la date sélectionnée à aujourd'hui
        const dateSelectionnee = new Date().toISOString().split('T')[0];
        
        // Charger la semaine actuelle
        await chargerSemaineActuelle();
        
        // Initialiser les filtres et le calendrier
        initFiltres();
        initCalendar();
        
        // Mettre à jour l'affichage
        afficherObjectifs();
        updateProgressionChart();

        // Gestionnaire pour le formulaire d'ajout d'objectif
        const form = document.getElementById('objectif-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Récupérer les valeurs du formulaire
                const titre = document.getElementById('objectif').value;
                const categorie = document.getElementById('categorie').value;
                
                // Créer un nouvel objectif
                const nouvelObjectif = {
                    id: 'obj_' + Date.now(),
                    titre: titre,
                    categorie: categorie,
                    date_creation: new Date().toISOString()
                };
                
                try {
                    // Charger les objectifs existants
                    const response = await fetch('http://localhost:8080/load?file=objectifs_master.json');
                    const data = await response.json();
                    
                    // Ajouter le nouvel objectif
                    data.objectifs = data.objectifs || [];
                    data.objectifs.push(nouvelObjectif);
                    
                    // Sauvegarder les changements dans objectifs_master.json
                    await fetch('http://localhost:8080/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file: 'objectifs_master.json',
                            data: data
                        })
                    });

                    // Ajouter l'objectif à la semaine actuelle
                    const responseSemaine = await fetch('http://localhost:8080/load?file=semaines.json');
                    const dataSemaine = await responseSemaine.json();
                    
                    // Pour chaque jour de la semaine
                    Object.keys(dataSemaine.progressionQuotidienne).forEach(date => {
                        dataSemaine.progressionQuotidienne[date][nouvelObjectif.id] = 0;
                    });

                    // Sauvegarder les changements dans semaines.json
                    await fetch('http://localhost:8080/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file: 'semaines.json',
                            data: dataSemaine
                        })
                    });

                    // Recharger les données et mettre à jour l'affichage
                    await chargerSemaineActuelle();
                    afficherObjectifs();
                    
                    // Réinitialiser le formulaire
                    form.reset();
                    
                    // Afficher un message de succès
                    alert('Objectif ajouté avec succès !');
                    
                } catch (error) {
                    console.error('Erreur lors de l\'ajout de l\'objectif:', error);
                    alert('Une erreur est survenue lors de l\'ajout de l\'objectif');
                }
            });
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
});
