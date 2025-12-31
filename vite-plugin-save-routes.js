import fs from 'fs';
import path from 'path';

export default function saveRoutesPlugin() {
    return {
        name: 'vite-plugin-save-routes',
        configureServer(server) {
            // Handle GET /api/get-all-routes
            server.middlewares.use('/api/get-all-routes', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const filePath = path.resolve(process.cwd(), 'src/data/routes.json');
                        const data = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '[]';
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(data);
                    } catch (error) {
                        console.error('Error reading routes:', error);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'Failed to read routes' }));
                    }
                } else {
                    next();
                }
            });

            // Handle POST /api/save-routes
            server.middlewares.use('/api/save-routes', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const filePath = path.resolve(process.cwd(), 'src/data/routes.json');

                            // Write prettified JSON
                            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, message: 'Routes saved successfully' }));
                        } catch (error) {
                            console.error('Error saving routes:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: 'Failed to write file' }));
                        }
                    });
                } else {
                    next();
                }
            });
        }
    };
}
