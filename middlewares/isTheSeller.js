// IMPORT MODELES
const User = require("../models/user.js");
const Offer = require("../models/offer.js");

const isTheSeller = async (req, res, next) => {
  try {
    // Si l'id de l'offre est enregistré
    if (req.params.id) {
      const foundOffer = await Offer.findById(req.params.id);
      if (foundOffer) {
        const seller = await User.findById(foundOffer.owner);

        // Si le vendeur et l'utilisateur sont la même personne
        if (req.user.token === seller.token) {
          req.offer = foundOffer;
          return next();
        } else {
          res.status(401).json({ error: "Unauthorized" });
        }
      } else {
        res.status(400).json({ message: "Offer not found" });
      }
    } else {
      res.status(400).json({ message: "Please, complete with an id" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = isTheSeller;
