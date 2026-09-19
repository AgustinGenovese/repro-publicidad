import app from './app.js';
import { connectDB } from './db.js';
import { config } from './config.js';

async function main() {
  await connectDB();
  console.log(`MongoDB conectado: ${config.mongoUrl}`);
  app.listen(config.port, () => {
    console.log(`Server on http://localhost:${config.port}`);
  });
}

main();