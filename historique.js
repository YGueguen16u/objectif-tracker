// Variables globales
let objectifsMaster = [];
let semaines = [];

// Charger les données au démarrage
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([
            chargerObjectifsMaster(),
            chargerSemaines()
        ]);
        afficherObjectifs();
    } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
    }
});

// Charger les objectifs depuis objectifs_master.json
async function chargerObjectifsMaster() {
    try {
        const response = await fetch('/data/objectifs_master.json');
        const data = await response.json();
        objectifsMaster = data.objectifs || [];
        console.log('Objectifs master chargés:', objectifsMaster);
    } catch (error) {
        console.error('Erreur lors du chargement des objectifs:', error);
        objectifsMaster = [];
    }
}

// Charger les semaines depuis semaines.json
async function chargerSemaines() {
    try {
        const response = await fetch('/data/semaines.json');
        const data = await response.json();
        semaines = data.semaines || [];
        console.log('Semaines chargées:', semaines);
    } catch (error) {
        console.error('Erreur lors du chargement des semaines:', error);
        semaines = [];
    }
}

// Fonction pour afficher les objectifs
function afficherObjectifs() {
    const container = document.getElementById('objectifs-container');
    if (!container) {
        console.error('Container des objectifs non trouvé');
        return;
    }

    container.innerHTML = '';
    console.log('Affichage des objectifs:', objectifsMaster);

    objectifsMaster.forEach(objectif => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg p-6 mb-4 cursor-pointer hover:bg-gray-50 transition-colors';
        card.onclick = () => afficherHistoriqueObjectif(objectif);

        const dateCreation = new Date(objectif.date_creation);
        const dateFormatee = dateCreation.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-semibold mb-2">${objectif.titre}</h3>
                    <p class="text-gray-600">Catégorie: ${objectif.categorie}</p>
                    <p class="text-gray-600">Créé le: ${dateFormatee}</p>
                </div>
                <span class="text-sm text-gray-500">Cliquez pour voir l'historique</span>
            </div>
        `;

        container.appendChild(card);
    });
}

// Fonction pour afficher l'historique d'un objectif
function afficherHistoriqueObjectif(objectif) {
    const modal = document.getElementById('historique-modal');
    const titre = document.getElementById('modal-titre');
    const calendrier = document.getElementById('modal-calendrier');
    
    if (!modal || !titre || !calendrier) {
        console.error('Éléments du modal non trouvés');
        return;
    }
    
    titre.textContent = objectif.titre;
    
    // Créer le calendrier
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = maintenant.getMonth();
    
    // Créer le tableau du calendrier
    let html = `
        <table class="w-full">
            <thead>
                <tr>
                    <th>Lun</th>
                    <th>Mar</th>
                    <th>Mer</th>
                    <th>Jeu</th>
                    <th>Ven</th>
                    <th>Sam</th>
                    <th>Dim</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Trouver le premier jour du mois
    const premierJour = new Date(annee, mois, 1);
    let jourCourant = new Date(premierJour);
    jourCourant.setDate(jourCourant.getDate() - ((jourCourant.getDay() + 6) % 7)); // Commencer par lundi
    
    // Créer les semaines
    for (let semaine = 0; semaine < 6; semaine++) {
        html += '<tr>';
        
        for (let jour = 0; jour < 7; jour++) {
            const dateStr = jourCourant.toISOString().split('T')[0];
            let classe = 'text-center p-2';
            let statut = '';
            
            // Vérifier si le jour est dans le mois actuel
            if (jourCourant.getMonth() !== mois) {
                classe += ' text-gray-300';
            }
            
            // Vérifier le statut de l'objectif pour ce jour
            const semaineData = semaines.find(s => {
                const debut = new Date(s.debut);
                const fin = new Date(s.fin);
                const jour = new Date(dateStr);
                return jour >= debut && jour <= fin;
            });
            
            if (semaineData) {
                const objectifData = semaineData.objectifs.find(o => o.id === objectif.id);
                if (objectifData && objectifData.progres[dateStr] !== undefined) {
                    statut = objectifData.progres[dateStr] > 0 ? '✓' : '×';
                    classe += objectifData.progres[dateStr] > 0 ? ' text-green-500' : ' text-red-500';
                }
            }
            
            html += `
                <td class="${classe}">
                    ${jourCourant.getDate()}
                    ${statut ? `<div class="text-sm font-bold">${statut}</div>` : ''}
                </td>
            `;
            
            jourCourant.setDate(jourCourant.getDate() + 1);
        }
        
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    calendrier.innerHTML = html;
    
    // Afficher le modal
    modal.classList.remove('hidden');
}

// Initialiser les gestionnaires d'événements une fois que le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    const fermerModalBtn = document.getElementById('fermer-modal');
    if (fermerModalBtn) {
        fermerModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('historique-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }
});
