// IMPORT DES PACKAGES
const express = require("express");
const uid = require("uid2"); // uid2 (générer un String aléatoire)
const SHA256 = require("crypto-js/sha256"); // SHA256 (encryptage)
const encBase64 = require("crypto-js/enc-base64"); // enc-Base64

const router = express.Router();

// express-fileupload afin de récupérer les fichiers envoyer dans body
const fileUpload = require("express-fileupload");

// cloudinary et identification pour stocker les fichiers
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// IMPORT DES MODELES
const User = require("../models/user.js");

// FONCTIONS
// Fonction pour envoyer l'image à cloudinary
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

// ROUTE SIGNUP : Inscription
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;

    // Vérification que toutes les informations ont été complétées
    if (username && email && password) {
      const isPresent = await User.findOne({ email: email });

      // Si l'email n'est pas déjà présent dans la base de données === si le compte n'existe pas
      if (!isPresent) {
        // Encryptage du mot de passe
        const salt = uid(16);
        const hash = SHA256(password + salt).toString(encBase64);
        const token = uid(16);

        // Création de l'avatar
        const avatar = {};
        if (req.files) {
          avatar = await cloudinary.uploader.upload(
            convertToBase64(req.files.picture),
            {
              folder: "/vinted/avatars",
            }
          );
        }

        // Création du nouvel utilisateur
        const newUser = new User({
          email,
          account: {
            username,
            avatar,
          },
          newsletter,
          token,
          hash,
          salt,
        });

        // Sauvegarde du nouvel utilisateur
        await newUser.save();

        // Informations à renvoyer
        const objectResponse = {
          _id: newUser._id,
          email: newUser.email,
          account: {
            username: newUser.account.username,
          },
        };
        return res.status(201).json(objectResponse);
      } else {
        return res.status(400).json({ message: "Email already existing" });
      }
    } else {
      return res.status(400).json({ message: "Please, complete the form" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ROUTE LOGIN : Connexion
router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email && password) {
      const isPresent = await User.findOne({ email: email }); // Nous cherchons le compte avec cet email
      if (isPresent) {
        // Nous vérifions que le compte existe
        const hashToTest = SHA256(password + isPresent.salt).toString(
          encBase64
        );
        if (hashToTest === isPresent.hash) {
          return res.status(201).json({ message: "You're logged" });
        } else {
          return res
            .status(400)
            .json({ message: `Incorrect password or email` });
        }
      } else {
        return res.status(400).json({ message: `Incorrect email or password` });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Please, complete email and password fields" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
