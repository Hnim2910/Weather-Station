require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/db");

const port = process.env.PORT || 5000;

async function bootstrap() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
