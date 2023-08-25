// IMPORT MODELES
const User = require("../models/user.js");

const isAuthenticated = async (req, res, next) => {
  // Vérification d'authentification
  let userToken = "";

  // Si le token a été renseigné
  if (req.headers.authorization) {
    userToken = req.headers.authorization.replace("Bearer ", "");
    console.log(userToken);
    //Renvoie le token de l'utilisateur
    const foundUser = await User.findOne({ token: userToken });

    // Si un utilisateur correspond au token
    if (foundUser) {
      req.user = foundUser;
      return next();
    } else {
      res.status(401).json({ error: "Unathorized" });
    }
  } else {
    res.status(401).json({ error: "Unathorized" });
  }
};

module.exports = isAuthenticated;
