const fs = require('fs');
const path = require('path');

// Pre-generated penguin images
const penguinImages = {
    default: '/assets/penguin.png',
    red: '/assets/penguin-red.png',
    blue: '/assets/penguin-blue.png',
    green: '/assets/penguin-green.png'
};

// Pre-generated hat images
const hatImages = {
    none: null,
    santa: '/assets/hat-santa.png',
    party: '/assets/hat-party.png',
    wizard: '/assets/hat-wizard.png'
};

// Pre-generated clothes images
const clothesImages = {
    none: null,
    tuxedo: '/assets/clothes-tuxedo.png',
    sweater: '/assets/clothes-sweater.png',
    jacket: '/assets/clothes-jacket.png'
};

// Pre-generated accessories images
const accessoriesImages = {
    none: null,
    glasses: '/assets/accessories-glasses.png',
    scarf: '/assets/accessories-scarf.png',
    bowtie: '/assets/accessories-bowtie.png'
};

function getPenguinImage(color, hat, clothes, accessories) {
    // Return the appropriate image path based on customization
    return {
        base: penguinImages[color] || penguinImages.default,
        hat: hatImages[hat],
        clothes: clothesImages[clothes],
        accessories: accessoriesImages[accessories]
    };
}

module.exports = {
    getPenguinImage
}; 