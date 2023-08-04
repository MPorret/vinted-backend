// IMPORT DES PACKAGES

// Initialisation du router
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);

// express-fileupload afin de récupérer les fichiers envoyer dans body
const fileUpload = require("express-fileupload");

// cloudinary et identification pour stocker les fichiers
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// IMPORT DES MIDDLEWARES
const isAuthenticated = require("../middlewares/isauthenticated.js");
const isTheSeller = require("../middlewares/isTheSeller.js");

// IMPORT DES MODELES
const User = require("../models/user.js");
const Offer = require("../models/offer.js");

// Fonctions
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

/*************************** ROUTES *********************/

// Route pour publier une offre
router.post("/offers", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    // Upload de la/des images
    const pictureToUpload = req.files.picture;
    const cloudinaryResponse = [];
    if (pictureToUpload.length) {
      // Si plusieurs images sont uploadées
      for (let i = 0; i < pictureToUpload.length; i++) {
        // cloudinaryResponse stock le ticket de cloudinary
        cloudinaryResponse.push(
          await cloudinary.uploader.upload(
            convertToBase64(pictureToUpload[i]),
            { folder: "/vinted/offers" }
          )
        );
      }
    } else {
      cloudinaryResponse.push(
        await cloudinary.uploader.upload(convertToBase64(pictureToUpload), {
          folder: "/vinted/offers",
        })
      );
    }

    // Création du nouveau produit
    const { title, description, price, condition, city, brand, size, color } =
      req.body;

    if (description.length <= 500 && title.length <= 50 && price <= 100000) {
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ETAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        product_image: cloudinaryResponse,
        owner: req.user,
      });

      // Sauvegarde de la nouvelle offre
      await newOffer.save();

      // Message renvoyé si tout a fonctionné
      return res.status(201).json(newOffer);
    }

    // Message d'erreur si les données sont trop longues
    const errorMessages = {};
    if (description.length > 500) {
      errorMessages.description =
        "Description is too long (max 500 characters)";
    }
    if (title.length > 50) {
      errorMessages.title = "Title is too long (max 50 characters)";
    }
    if (price > 100000) {
      errorMessages.price = "Prix is too expensive (max 100 000)";
    }

    return res.status(400).json({ "error message": errorMessages });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour modifier une annonce
router.put("/offers/:id", isAuthenticated, isTheSeller, async (req, res) => {
  try {
    const { title, description, price, condition, city, brand, size, color } =
      req.body;

    const offer = req.offer;

    // Message d'erreur si les données sont trop longues
    const errorMessages = {};

    if (title && title.length <= 50) {
      offer.product_name = title;
    } else if (title && title.length > 50) {
      errorMessages.title = "Title is too long (max 50 characters)";
    }
    if (description && description.length <= 500) {
      offer.product_description = description;
    } else if (description && description.length > 500) {
      errorMessages.description =
        "Description is too long (max 500 characters)";
    }
    if (price && price <= 100000) {
      offer.product_price = price;
    } else if (price && price > 100000) {
      errorMessages.price = "Prix is too expensive (max 100 000)";
    }
    if (condition) {
      offer.product_details[2].ETAT = condition;
    }
    if (city) {
      offer.product_details[4].EMPLACEMENT = city;
    }
    if (brand) {
      offer.product_details[0].MARQUE = brand;
    }
    if (size) {
      offer.product_details[1].TAILLE = size;
    }
    if (color) {
      offer.product_details[3].COULEUR = color;
    }

    if (
      errorMessages.title ||
      errorMessages.description ||
      errorMessages.price
    ) {
      return res.status(400).json({ "error message": errorMessages });
    } else {
      await offer.save();
      return res.status(200).json(offer);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour afficher les offres en fonction de filtres
router.get("/offers", async (req, res) => {
  try {
    const { sort, page } = req.query;

    if (!page) {
      let page = 1;
    }
    // Filtre pour nom exact
    const key = Object.keys(req.query);
    const userFilters = {};
    if (key.length) {
      // Si un filtre est fait par prix, nous initialisons la la clé "product_price" qui est un objet
      if (key.indexOf("priceMax") !== -1 || key.indexOf("priceMin") !== -1) {
        userFilters.product_price = {};
      }

      // Boucle afin de faire le tour de tous les filtres demandés
      for (let i = 0; i < key.length; i++) {
        if (req.query[key[i]]) {
          // Filtre du prix max
          if (key[i] === "priceMax") {
            userFilters.product_price.$lte = req.query[key[i]];

            // Filtre du prix min
          } else if (key[i] === "priceMin") {
            userFilters.product_price.$gte = req.query[key[i]];

            // filtre pour tous les autres filtres hors sort et page (filtre accepté : title, description)
          } else if (key[i] !== "sort" && key[i] !== "page") {
            const filterToAdd = new RegExp(req.query[key[i]], "i"); // valeur a chercher (acceptant la casse)
            const filterName = "product_" + key[i]; // clé de la valeur à chercher
            userFilters[filterName] = filterToAdd;
          }
        }
      }
    }

    // Recherche des produits en fonction des filtres
    const allOffers = await Offer.find(userFilters)
      .select("product_name product_price _id")
      .sort({ product_price: sort }) // Tri en fonction du tri demandé : ascendant ou descendant
      .limit(2) // Nombre d'articles par page
      .skip((page - 1) * 2); // Nombre d'articles à "skipper" en fonction de la page demandée

    // Renvoie des résultats
    res.status(200).json(allOffers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour supprimer une offre
router.delete("/offers/:id", isAuthenticated, isTheSeller, async (req, res) => {
  try {
    const offerToDelete = await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Offer deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour afficher les détails d'une offre demandée
router.get("/offers/:id", async (req, res) => {
  try {
    const offerToShow = await Offer.findById(req.params.id);
    res.status(201).json(offerToShow);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
