const mongoose = require("mongoose");
mongoose.connect("mongodb://192.168.178.99:27017/housnkuh")
  .then(() => {
    console.log("Verbindung zur MongoDB erfolgreich hergestellt!");
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("MongoDB-Verbindungsfehler:", err);
  });
