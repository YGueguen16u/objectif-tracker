import http.server
import socketserver
import json
import os
from datetime import datetime
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        logger.info(f"GET request reçue: {self.path}")
        if self.path.startswith('/load'):
            try:
                # Extraire le nom du fichier
                file_name = self.path.split('=')[1]
                file_path = os.path.join('data', file_name)
                
                logger.info(f"Chargement du fichier: {file_path}")
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(data).encode())
                    logger.info(f"Fichier {file_path} envoyé avec succès")
                else:
                    logger.error(f"Fichier non trouvé: {file_path}")
                    self.send_response(404)
                    self.end_headers()
            except Exception as e:
                logger.error(f"Erreur lors du chargement du fichier: {str(e)}")
                self.send_response(500)
                self.end_headers()
        else:
            super().do_GET()

    def do_POST(self):
        logger.info(f"POST request reçue: {self.path}")
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            logger.info(f"Données reçues: {data}")
            
            if self.path == '/save':
                # Vérifier le fichier à sauvegarder
                if 'file' not in data or 'data' not in data:
                    logger.error("Le fichier et les données sont requis")
                    raise ValueError("Le fichier et les données sont requis")
                
                # S'assurer que le fichier est autorisé
                allowed_files = ['objectifs_master.json', 'semaines.json']
                if data['file'] not in allowed_files:
                    logger.error(f"Fichier non autorisé: {data['file']}")
                    raise ValueError(f"Fichier non autorisé: {data['file']}")
                
                # Créer le dossier data s'il n'existe pas
                os.makedirs('data', exist_ok=True)
                
                # Sauvegarder les données
                file_path = os.path.join('data', data['file'])
                logger.info(f"Sauvegarde dans {file_path}: {json.dumps(data['data'], indent=2)}")
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data['data'], f, ensure_ascii=False, indent=4)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode())
                logger.info(f"Données sauvegardées avec succès dans {file_path}")
            else:
                logger.error(f"Endpoint non trouvé: {self.path}")
                self.send_response(404)
                self.end_headers()
        except Exception as e:
            logger.error(f"Erreur lors du traitement de la requête: {str(e)}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

PORT = 8080  # Changé de 8000 à 8080
Handler = RequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    logger.info(f"Serveur démarré sur le port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Arrêt du serveur")
        httpd.server_close()
