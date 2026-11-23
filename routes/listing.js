const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const router = express.Router();
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const listingController = require("../controllers/listings.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const multer=require("multer");
const path = require("path");
const crypto = require("crypto");
const storage = multer.diskStorage({
    destination: path.join(__dirname, "../uploads"),
    filename: (req, file, callback) => {
        callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
});
const upload=multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
            callback(null, true);
        } else {
            callback(new ExpressError(400, "Please upload an image file."));
        }
    },
});
const uploadListingImage = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "listing[image]", maxCount: 1 },
]);


const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

const requireListingImage = (req, res, next) => {
    if (!req.file) {
        return next(new ExpressError(400, "Please upload a listing image."));
    }
    next();
};

const normalizeListingImage = (req, res, next) => {
    const files = req.files || {};
    req.file = (files.image || files["listing[image]"] || [])[0];
    next();
};

router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        uploadListingImage,
        normalizeListingImage,
        requireListingImage,
        validateListing,
        wrapAsync(listingController.createListing)
    );


//New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

//Index Route
//router.get("/", wrapAsync(listingController.index));

router
    .route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        uploadListingImage,
        normalizeListingImage,
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));



//edit route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));


module.exports = router;