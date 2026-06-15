const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
// const uploadsDir = path.join('G:/Sharanainfo24/DraftEnrollmentApi', 'images');
const uploadsDir = path.join(process.env.UPLOADS_DIR, 'Images');

// Function to check if a path is a directory
function isDirectory(directory) {
    return fs.existsSync(directory) && fs.statSync(directory).isDirectory();
}

// Function to check if a path is a file
function isFile(filePath) {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

// Function to list subfolders
function listSubfolders(directory) {
    return fs.readdirSync(directory).filter(file => isDirectory(path.join(directory, file)));
}

// Function to list all images
function listImages(directory) {
    return fs.readdirSync(directory).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
}

// Route to list all folders
router.get('/productimages', (req, res) => {
    try {
        const subfolders = listSubfolders(uploadsDir);
        const folderLinks = subfolders.map(folder => 
            `<a href="/productimages/${folder}" style="font-size: 14px;"> ${folder}</a>`
        ).join('<br>');

        res.send(`<h1>Medusa Product Images</h1><hr>${folderLinks}`);
    } catch (err) {
        res.status(500).json({ error: 'Unable to list subfolders' });
    }
});

// Route to list contents of a folder (Supports nested subfolders)
router.get('/productimages/*', (req, res) => {
    const requestedPath = decodeURIComponent(req.params[0]); // Ensure slashes are correctly interpreted
    const folderPath = path.join(uploadsDir, requestedPath);

    if (!fs.existsSync(folderPath)) {
        return res.status(404).send('<h1>Folder not found</h1>');
    }

    if (isFile(folderPath)) {
        return res.sendFile(folderPath, err => {
            if (err) {
                res.status(500).json({ error: 'Error sending file' });
            }
        });
    }

    try {
        const subfolders = listSubfolders(folderPath);
        const images = listImages(folderPath);

        let content = `<h1>${requestedPath}</h1><hr>`;

        if (subfolders.length > 0) {
            content += `<h2>Subfolders</h2>`;
            content += subfolders.map(folder => 
                `<a href="/productimages/${requestedPath}/${folder}" style="font-size: 14px;"> ${folder}</a>`
            ).join('<br>') + "<hr>";
        }

        if (images.length > 0) {
            content += `<h2> Images</h2>`;
            content += images.map(image => 
                `<a href="/productimages/${requestedPath}/${image}" style="font-size: 14px;">${image}</a>`
            ).join('<br>');
        }

        res.send(content);
    } catch (err) {
        res.status(500).json({ error: 'Unable to list contents' });
    }
});

module.exports = router;
