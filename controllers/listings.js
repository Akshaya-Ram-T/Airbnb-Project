const Listing=require("../models/listing");
const mbxGeocoding=require("@mapbox/mapbox-sdk/services/geocoding");
const geocodingClient=mbxGeocoding({ accessToken: process.env.MAP_TOKEN });

async function geocodeLocation(location, country) {
    if (!process.env.MAP_TOKEN) {
        console.error("MAP_TOKEN environment variable is missing");
        return { type: "Point", coordinates: [0, 0] };
    }

    try {
        const query=[location, country].filter(Boolean).join(", ");
        const response=await geocodingClient
            .forwardGeocode({ query, limit: 1 })
            .send();

        if (!response.body.features.length) {
            throw new Error("Could not find that location on the map");
        }

        return response.body.features[0].geometry;
    } catch (error) {
        console.error("Mapbox geocoding failed:", error.message);
        return { type: "Point", coordinates: [0, 0] };
    }
}

module.exports.index=async(req,res)=>{
    const allListings=await Listing.find({});
    res.render("listings/index.ejs",{allListings});
};

module.exports.renderNewForm=(req,res)=>{
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) =>{
    const geometry=await geocodeLocation(req.body.listing.location, req.body.listing.country);
    const newListing =new Listing(req.body.listing);
    newListing.geomentry=geometry;
    newListing.owner = req.user._id;
    newListing.image = {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
    };
    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) =>{
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    let orginalImageUrl=listing.image.url;
    let originalImageUrl=orginalImageUrl;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/h_300,w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};


module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    const geometry=await geocodeLocation(req.body.listing.location, req.body.listing.country);
    let listing=await Listing.findByIdAndUpdate(
        id,
        { ...req.body.listing, geomentry: geometry },
        { runValidators: true }
    );
    
    if (req.file){
        listing.image={
            url: `/uploads/${req.file.filename}`,
            filename: req.file.filename,
        };
        await listing.save();
    }
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) =>{
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};

