const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/housnkuh")
  .then(() => {
    console.log("Verbindung zur MongoDB erfolgreich hergestellt!");
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("MongoDB-Verbindungsfehler:", err);
  });
