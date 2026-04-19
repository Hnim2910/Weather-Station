require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/db");

const port = process.env.PORT || 5000;
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  await connectDatabase();

  app.listen(port, host, () => {
    console.log(`Backend listening on http://${host}:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
