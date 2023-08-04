// IMPORT DES PACKAGES
require("dotenv").config(); // Permet d'activer les variables d'environnement qui se trouvent dans le fichier `.env`
const express = require("express"); // Import du package express
const mongoose = require("mongoose"); // Import du package mongoose
const cors = require("cors");

const app = express(); // Création du serveur
app.use(express.json()); // middleware
app.use(cors());
mongoose.connect(process.env.MONGODB_URI); // Connexion à la base de données

// IMPORT DES ROUTES
const signUpInRoute = require("./routes/signup-login.js");
app.use(signUpInRoute);
const offerRoute = require("./routes/offer.js");
app.use(offerRoute);

app.get("/", (req, res) => {
  try {
    res.status(400).json({ message: "Homepage" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("*", (req, res) => {
  try {
    res.status(404).json({ message: "Page not found" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server alive on port ${PORT}`);
});
