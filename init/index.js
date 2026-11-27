if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const mongoose = require("mongoose");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const data = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";
const geocodingClient = mbxGeocoding({ accessToken: process.env.MAP_TOKEN });

async function geocodeListing(listing) {
    const query = [listing.location, listing.country].filter(Boolean).join(", ");

    try {
        const response = await geocodingClient
            .forwardGeocode({ query, limit: 1 })
            .send();

        const feature = response.body.features[0];
        if (feature) {
            return { ...listing, geomentry: feature.geometry };
        }
    } catch (error) {
        console.error(`Geocoding failed for ${query}:`, error.message);
    }

    return listing;
}

async function main() {
    await mongoose.connect(MONGO_URL);
}

main()
    .then(async () => {
        console.log("Connected");

        await Listing.deleteMany({});

        const geocodedListings = [];
        for (const listing of data.data) {
            geocodedListings.push(await geocodeListing(listing));
        }

        await Listing.insertMany(geocodedListings);
        console.log("data was initialized with geocoded locations");
        await mongoose.connection.close();
    })
    .catch((err) => {
        console.log(err);
        mongoose.connection.close();
    });